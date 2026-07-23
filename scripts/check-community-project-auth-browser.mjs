#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {
  CdpClient,
  chromeExecutable,
  waitForWebSocketUrl,
} from './measure-html-artifacts.mjs'
import {
  isExpectedLocalActivationFailure,
  isExpectedLocalFaviconFailure,
  isExpectedLocalVercelScriptFailure,
} from './browser-guard-errors.mjs'

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000, mobile: false },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
]
const COMMUNITY_ARTIFACT_FIXTURE_ID = '10000000-0000-4000-8000-000000000001'
const COMMUNITY_ARTIFACT_FIXTURE_HTML = '<!doctype html><html><head><style>html,body{margin:0;background:#fff;color:#111;font:700 24px system-ui}main{padding:24px}</style></head><body><main><h1>Community artifact viewer fixture</h1></main><script>document.body.replaceChildren()</script></body></html>'

function parseArgs(argv) {
  const options = { baseUrl: 'http://127.0.0.1:3012', screenshotDir: '' }
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!value) throw new Error(`Missing value after ${key}.`)
    if (key === '--base-url') options.baseUrl = new URL(value).origin
    else if (key === '--screenshot-dir') options.screenshotDir = path.resolve(value)
    else throw new Error(`Unknown argument: ${key}`)
    index += 1
  }
  if (options.screenshotDir) mkdirSync(options.screenshotDir, { recursive: true })
  return options
}

async function evaluate(client, sessionId, expression) {
  const { result, exceptionDetails } = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }, sessionId)
  if (exceptionDetails) throw new Error(exceptionDetails.text ?? 'Browser evaluation failed.')
  return result.value
}

async function navigate(client, sessionId, url) {
  const loaded = client.waitFor('Page.loadEventFired', sessionId)
  await client.send('Page.navigate', { url }, sessionId)
  await loaded
  await new Promise((resolve) => setTimeout(resolve, 250))
}

async function waitForHeading(client, sessionId, expected, label, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  let lastValue = null
  while (Date.now() < deadline) {
    lastValue = await evaluate(client, sessionId, `({ href: location.href, heading: document.querySelector('h1')?.textContent?.trim() || '' })`)
    if (lastValue.heading.includes(expected)) return lastValue
    await new Promise((resolve) => setTimeout(resolve, 75))
  }
  throw new Error(`${label} timed out; last browser state was ${JSON.stringify(lastValue)}.`)
}

async function capture(client, sessionId, outputPath) {
  const { contentSize } = await client.send('Page.getLayoutMetrics', {}, sessionId)
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: {
      x: 0,
      y: 0,
      width: Math.ceil(contentSize.width),
      height: Math.ceil(contentSize.height),
      scale: 1,
    },
  }, sessionId)
  writeFileSync(outputPath, Buffer.from(data, 'base64'))
}

function assertPageFits(snapshot, viewport) {
  if (snapshot.viewportWidth > viewport.width || snapshot.viewportWidth < viewport.width - 20) {
    throw new Error(`${viewport.name} reported an unexpected ${snapshot.viewportWidth}px document viewport for a ${viewport.width}px browser window.`)
  }
  if (snapshot.scrollWidth > snapshot.viewportWidth + 1) {
    throw new Error(`${viewport.name} overflowed horizontally: ${snapshot.scrollWidth}px content in a ${snapshot.viewportWidth}px viewport. Offenders: ${JSON.stringify(snapshot.overflowingElements)}`)
  }
}

function relativeLuminance(color) {
  const channel = (value) => {
    const normalized = value / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(color.red) + 0.7152 * channel(color.green) + 0.0722 * channel(color.blue)
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
}

async function artifactRenderedContrast(client, sessionId, containerSelector = '[data-artifact-fit-mode]') {
  const serializedSelector = JSON.stringify(containerSelector)
  const rect = await evaluate(client, sessionId, `(() => {
    const iframe = document.querySelector(${serializedSelector} + ' [data-artifact-fit-mode] iframe, ' + ${serializedSelector} + '[data-artifact-fit-mode] iframe');
    if (!iframe) return null;
    const bounds = iframe.getBoundingClientRect();
    return { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height };
  })()`)
  if (!rect || rect.width < 40 || rect.height < 40) {
    throw new Error(`Artifact frame had no measurable rendered area: ${JSON.stringify(rect)}.`)
  }

  // The nested sandbox is intentionally an opaque-origin OOPIF, so browser JS
  // cannot inspect its DOM. Sample the pixels Chrome actually composited instead.
  const width = Math.max(1, Math.min(640, Math.floor(rect.width - 4)))
  const height = Math.max(1, Math.min(140, Math.floor(rect.height - 4)))
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    // getBoundingClientRect() is viewport-relative. Capture the current
    // viewport and crop locally so a scrolled card is sampled at the same
    // coordinates the browser just rendered, rather than at document origin.
    captureBeyondViewport: false,
  }, sessionId)
  const screenshot = sharp(Buffer.from(data, 'base64'))
  const screenshotInfo = await screenshot.metadata()
  const cropLeft = Math.max(0, Math.min(
    Math.max(0, (screenshotInfo.width ?? 1) - width),
    Math.floor(rect.left + 2),
  ))
  const cropTop = Math.max(0, Math.min(
    Math.max(0, (screenshotInfo.height ?? 1) - height),
    Math.floor(rect.top + 2),
  ))
  const { data: pixels, info } = await screenshot
    .extract({ left: cropLeft, top: cropTop, width, height })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const colors = []
  const counts = new Map()
  for (let offset = 0; offset < pixels.length; offset += info.channels) {
    const color = {
      red: pixels[offset],
      green: pixels[offset + 1],
      blue: pixels[offset + 2],
      alpha: 1,
    }
    colors.push(color)
    const key = `${color.red},${color.green},${color.blue}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const [backgroundKey] = [...counts.entries()].toSorted((left, right) => right[1] - left[1])[0] ?? []
  if (!backgroundKey || colors.length === 0) throw new Error('Artifact pixel sample was empty.')
  const [red, green, blue] = backgroundKey.split(',').map(Number)
  const background = { red, green, blue, alpha: 1 }
  const sorted = colors.toSorted((left, right) => relativeLuminance(left) - relativeLuminance(right))
  const foreground = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.01))]
  return {
    bounds: {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    sample: `${info.width}x${info.height}`,
    foreground: `rgb(${foreground.red}, ${foreground.green}, ${foreground.blue})`,
    background: `rgb(${background.red}, ${background.green}, ${background.blue})`,
    ratio: contrastRatio(foreground, background),
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found for the community-project auth browser guard.')

  const profile = mkdtempSync(path.join(tmpdir(), 'pathforge-community-project-auth-browser-'))
  const chrome = spawn(executable, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  let client
  try {
    client = new CdpClient(await waitForWebSocketUrl(chrome))
    await client.ready()
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
    const consoleErrors = []
    const listener = (message) => {
      if (message.sessionId !== sessionId) return
      if (message.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(message.params.exceptionDetails?.text ?? 'Uncaught runtime exception')
      }
      if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') {
        const entry = message.params.entry
        if (
          !isExpectedLocalActivationFailure(options.baseUrl, entry) &&
          !isExpectedLocalFaviconFailure(options.baseUrl, entry) &&
          !isExpectedLocalVercelScriptFailure(options.baseUrl, entry)
        ) consoleErrors.push(entry.text)
      }
      if (
        message.method === 'Fetch.requestPaused' &&
        message.params.request?.url.endsWith(`/api/community-artifacts/${COMMUNITY_ARTIFACT_FIXTURE_ID}`)
      ) {
        void client.send('Fetch.fulfillRequest', {
          requestId: message.params.requestId,
          responseCode: 200,
          responseHeaders: [
            { name: 'Content-Type', value: 'text/plain; charset=utf-8' },
            { name: 'Cache-Control', value: 'private, no-store' },
          ],
          body: Buffer.from(COMMUNITY_ARTIFACT_FIXTURE_HTML).toString('base64'),
        }, sessionId).catch((error) => consoleErrors.push(`Artifact fixture interception failed: ${error.message}`))
      }
    }
    client.listeners.add(listener)

    try {
      await Promise.all([
        client.send('Page.enable', {}, sessionId),
        client.send('Runtime.enable', {}, sessionId),
        client.send('Log.enable', {}, sessionId),
        client.send('Network.enable', {}, sessionId),
        client.send('Fetch.enable', {
          patterns: [{ urlPattern: '*/api/community-artifacts/*', requestStage: 'Request' }],
        }, sessionId),
      ])

      for (const viewport of VIEWPORTS) {
        await client.send('Emulation.setDeviceMetricsOverride', {
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: 1,
          mobile: viewport.mobile,
        }, sessionId)

        await navigate(client, sessionId, `${options.baseUrl}/build`)
        await waitForHeading(client, sessionId, 'Submit the finished project', `${viewport.name} anonymous build page`)
        const build = await evaluate(client, sessionId, `(() => {
          const root = document.documentElement;
          const body = document.body;
          const viewportWidth = root.clientWidth;
          const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0);
          return {
            heading: document.querySelector('h1')?.textContent?.trim() || '',
            signInHref: [...document.querySelectorAll('a')].find((link) => link.textContent?.includes('Invited already'))?.getAttribute('href') || '',
            hasUpload: Boolean(document.querySelector('input[type="file"]')),
            viewportWidth,
            scrollWidth,
            overflowingElements: [...document.querySelectorAll('*')]
              .map((element) => {
                const rect = element.getBoundingClientRect();
                return { tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className.slice(0, 90) : '', left: Math.round(rect.left), right: Math.round(rect.right) };
              })
              .filter((entry) => entry.right > viewportWidth + 1 || entry.left < -1)
              .slice(0, 8),
          };
        })()`)
        assertPageFits(build, viewport)
        if (!build.heading.includes('Submit the finished project')) throw new Error(`${viewport.name} anonymous /build explanation did not render.`)
        if (build.signInHref !== '/auth/login?next=%2Fbuild') throw new Error(`${viewport.name} /build sign-in handoff lost its exact return path.`)
        if (build.hasUpload) throw new Error(`${viewport.name} anonymous /build exposed an upload control.`)
        if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, `build-anonymous-${viewport.name}.png`))

        await navigate(client, sessionId, `${options.baseUrl}/auth/signup?next=%2Fbuild`)
        await waitForHeading(client, sessionId, 'Start your forge.', `${viewport.name} signup page`)
        const signup = await evaluate(client, sessionId, `(() => {
          const root = document.documentElement;
          const body = document.body;
          const viewportWidth = root.clientWidth;
          const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0);
          const form = document.querySelector('form');
          return {
            heading: document.querySelector('h1')?.textContent?.trim() || '',
            href: location.pathname + location.search,
            loginHref: [...document.querySelectorAll('a')].find((link) => link.textContent?.trim() === 'Log in' && link.closest('.form-foot'))?.getAttribute('href') || '',
            fields: ['username', 'email', 'password'].every((name) => Boolean(form?.querySelector('[name="' + name + '"]'))),
            viewportWidth,
            scrollWidth,
            overflowingElements: [...document.querySelectorAll('*')]
              .map((element) => {
                const rect = element.getBoundingClientRect();
                return { tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className.slice(0, 90) : '', left: Math.round(rect.left), right: Math.round(rect.right) };
              })
              .filter((entry) => entry.right > viewportWidth + 1 || entry.left < -1)
              .slice(0, 8),
          };
        })()`)
        assertPageFits(signup, viewport)
        if (signup.heading !== 'Start your forge.') throw new Error(`${viewport.name} signup heading did not render; received ${JSON.stringify(signup.heading)}.`)
        if (signup.href !== '/auth/signup?next=%2Fbuild') throw new Error(`${viewport.name} signup page lost the /build return target.`)
        if (signup.loginHref !== '/auth/login?next=%2Fbuild') throw new Error(`${viewport.name} signup-to-login handoff lost the /build return target.`)
        if (!signup.fields) throw new Error(`${viewport.name} signup form is missing a required account field.`)
        if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, `signup-${viewport.name}.png`))

        const viewerQuery = new URLSearchParams({
          path: `/api/community-artifacts/${COMMUNITY_ARTIFACT_FIXTURE_ID}`,
          title: 'Community artifact fixture',
          provider: 'Fixture provider',
        })
        await navigate(client, sessionId, `${options.baseUrl}/artifact-viewer?${viewerQuery.toString()}`)
        await waitForHeading(client, sessionId, 'Protected artifact viewer', `${viewport.name} community artifact shell`)
        const artifactDeadline = Date.now() + 15_000
        let artifactState = null
        while (Date.now() < artifactDeadline) {
          artifactState = await evaluate(client, sessionId, `(() => {
            const frame = document.querySelector('[data-artifact-fit-mode]');
            const iframe = frame?.querySelector('iframe');
            return {
              settled: Boolean(frame && frame.dataset.artifactFitMode !== 'loading'),
              mode: frame?.dataset.artifactFitMode || '',
              error: frame?.querySelector('[data-artifact-load-error]')?.getAttribute('data-artifact-load-error') || '',
              fixtureLoaded: Boolean(iframe?.srcdoc?.includes('Community artifact viewer fixture')),
              staticExecution: Boolean(
                iframe?.srcdoc?.includes('data-pathforge-execution-mode="static-untrusted"') &&
                iframe?.srcdoc?.includes('sandbox=""'),
              ),
            };
          })()`)
          if (artifactState?.settled) break
          await new Promise((resolve) => setTimeout(resolve, 75))
        }
        if (!artifactState?.settled || artifactState.error || !artifactState.fixtureLoaded || !artifactState.staticExecution) {
          throw new Error(`${viewport.name} community artifact did not load inside the protected viewer: ${JSON.stringify(artifactState)}.`)
        }
        const artifactContrast = await artifactRenderedContrast(client, sessionId)
        if (artifactContrast.ratio < 4.5) {
          throw new Error(`${viewport.name} community artifact default-canvas contrast was ${artifactContrast.ratio.toFixed(2)}:1: ${JSON.stringify(artifactContrast)}.`)
        }
        const viewer = await evaluate(client, sessionId, `(() => {
          const root = document.documentElement;
          const body = document.body;
          const viewportWidth = root.clientWidth;
          const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0);
          return {
            heading: document.querySelector('h1')?.textContent?.trim() || '',
            hasDownload: [...document.querySelectorAll('a')].some((link) => link.textContent?.includes('Download HTML')),
            isNotFound: document.body.innerText?.includes('This page could not be found') || false,
            staticPreviewCopy: document.body.innerText?.includes('script-disabled, visual-only previews') || false,
            executionMode: document.querySelector('[data-artifact-fit-mode]')?.closest('[data-artifact-execution-mode]')?.getAttribute('data-artifact-execution-mode') || '',
            viewportWidth,
            scrollWidth,
            overflowingElements: [...document.querySelectorAll('*')]
              .map((element) => {
                const rect = element.getBoundingClientRect();
                return { tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className.slice(0, 90) : '', left: Math.round(rect.left), right: Math.round(rect.right) };
              })
              .filter((entry) => entry.right > viewportWidth + 1 || entry.left < -1)
              .slice(0, 8),
          };
        })()`)
        assertPageFits(viewer, viewport)
        if (viewer.heading !== 'Protected artifact viewer' || viewer.isNotFound) throw new Error(`${viewport.name} community artifact viewer routed to a not-found state.`)
        if (viewer.hasDownload) throw new Error(`${viewport.name} community artifact viewer exposed a download action despite view-only permission.`)
        if (!viewer.staticPreviewCopy || viewer.executionMode !== 'static-untrusted') {
          throw new Error(`${viewport.name} community artifact viewer did not expose its script-disabled preview boundary: ${JSON.stringify(viewer)}.`)
        }
        if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, `community-artifact-viewer-${viewport.name}.png`))

        await navigate(client, sessionId, `${options.baseUrl}/qa/community-static-preview`)
        await waitForHeading(client, sessionId, 'Community static preview fixture', `${viewport.name} community card fixture`)
        for (const surface of ['explore', 'profile']) {
          const selector = `[data-community-preview-surface="${surface}"]`
          await evaluate(client, sessionId, `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: 'center' })`)
          const previewDeadline = Date.now() + 15_000
          let previewState = null
          while (Date.now() < previewDeadline) {
            previewState = await evaluate(client, sessionId, `(() => {
              const surface = document.querySelector(${JSON.stringify(selector)});
              const preview = surface?.querySelector('[data-project-preview-mode]');
              const frame = preview?.querySelector('[data-artifact-fit-mode]');
              const iframe = frame?.querySelector('iframe');
              return {
                mounted: Boolean(preview),
                settled: Boolean(frame && frame.dataset.artifactFitMode !== 'loading'),
                mode: preview?.getAttribute('data-project-preview-mode') || '',
                executionMode: frame?.closest('[data-artifact-execution-mode]')?.getAttribute('data-artifact-execution-mode') || '',
                staticExecution: Boolean(
                  iframe?.srcdoc?.includes('data-pathforge-execution-mode="static-untrusted"') &&
                  iframe?.srcdoc?.includes('sandbox=""'),
                ),
                visualOnlyCopy: surface?.textContent?.includes('Visual-only community preview') || false,
              };
            })()`)
            if (previewState?.settled) break
            await new Promise((resolve) => setTimeout(resolve, 75))
          }
          if (
            !previewState?.mounted ||
            !previewState.settled ||
            previewState.mode !== 'static-untrusted' ||
            previewState.executionMode !== 'static-untrusted' ||
            !previewState.staticExecution ||
            !previewState.visualOnlyCopy
          ) {
            throw new Error(`${viewport.name} ${surface} community card did not preserve the visual-only boundary: ${JSON.stringify(previewState)}.`)
          }
          if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, `community-static-${surface}-${viewport.name}.png`))
          const previewContrast = await artifactRenderedContrast(client, sessionId, selector)
          if (previewContrast.ratio < 4.5) {
            throw new Error(`${viewport.name} ${surface} community preview did not retain the rendered fixture: ${JSON.stringify(previewContrast)}.`)
          }
        }
        if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, `community-static-cards-${viewport.name}.png`))

        console.log(`${viewport.name}: anonymous build, fresh-account signup handoff, protected viewer, and Explore/profile static community cards passed at ${signup.viewportWidth}px with ${artifactContrast.ratio.toFixed(2)}:1 default-canvas contrast.`)
      }

      if (consoleErrors.length > 0) {
        throw new Error(`Community-project auth pages logged errors: ${[...new Set(consoleErrors)].join(' | ')}`)
      }
      console.log('Community-project fresh-account browser guard passed.')
    } finally {
      client.listeners.delete(listener)
      await client.send('Target.closeTarget', { targetId })
    }
  } finally {
    client?.close()
    chrome.kill('SIGTERM')
    rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
