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
const COMMUNITY_ARTIFACT_FIXTURE_HTML = '<!doctype html><html><head><style>html,body{margin:0;background:#fff;color:#111;font:700 24px system-ui}main{min-height:1800px;padding:24px;background:linear-gradient(#fff,#eef6ff)}#community-preview-middle{margin-top:650px;padding:24px;background:#dbeafe;color:#111827}#community-preview-bottom{margin-top:650px;padding:24px;background:#111827;color:#fff}</style></head><body><main><h1>Community artifact viewer fixture</h1><p>This readable result exists before scripts run.</p><p id="community-preview-middle">Static preview midpoint</p><p id="community-preview-bottom">Static preview bottom marker</p></main><script>document.body.replaceChildren()</script></body></html>'
const COMMUNITY_UPLOAD_FIXTURE = path.join(process.cwd(), 'test-fixtures', 'community-project', 'valid.html')
const LEGACY_FORK_PATH = `/prompt/new?${new URLSearchParams({
  fork: 'qa-source-project',
  forkTitle: 'QA source project',
  forkStep: 'qa-source-project:qa-run:step:2',
  forkStepNumber: '2',
  forkDepth: '1',
  forkBranch: '3',
  promptFamily: 'qa-source-project:family',
}).toString()}`
const LEGACY_FORK_NEXT = encodeURIComponent(LEGACY_FORK_PATH)

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

async function evaluateInContext(client, sessionId, contextId, expression, label) {
  const params = {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }
  if (contextId !== undefined) params.contextId = contextId
  const { result, exceptionDetails } = await client.send('Runtime.evaluate', params, sessionId)
  if (exceptionDetails) throw new Error(`${label} raised ${exceptionDetails.text ?? 'an evaluation exception'}.`)
  return result.value
}

function deepestFrame(frameTree, depth = 0) {
  let deepest = { frame: frameTree.frame, depth }
  for (const child of frameTree.childFrames ?? []) {
    const candidate = deepestFrame(child, depth + 1)
    if (candidate.depth > deepest.depth) deepest = candidate
  }
  return deepest
}

async function artifactDocumentContext(client, sessionId, requiredSelector, label) {
  const deadline = Date.now() + 15_000
  let lastDepth = 0
  let lastIframeTargetCount = 0
  while (Date.now() < deadline) {
    const { frameTree } = await client.send('Page.getFrameTree', {}, sessionId)
    const candidate = deepestFrame(frameTree)
    lastDepth = candidate.depth
    if (candidate.depth >= 2) {
      const { executionContextId } = await client.send('Page.createIsolatedWorld', {
        frameId: candidate.frame.id,
        worldName: `pathforge-community-static-${Date.now()}`,
      }, sessionId)
      const matches = await evaluateInContext(
        client,
        sessionId,
        executionContextId,
        `document.readyState === 'complete' && Boolean(document.querySelector(${JSON.stringify(requiredSelector)}))`,
        label,
      )
      if (matches) return { sessionId, contextId: executionContextId }
    }

    const { targetInfos } = await client.send('Target.getTargets')
    const iframeTargets = targetInfos.filter((target) => target.type === 'iframe')
    lastIframeTargetCount = iframeTargets.length
    for (const target of iframeTargets) {
      let attachedSessionId
      try {
        const attached = await client.send('Target.attachToTarget', {
          targetId: target.targetId,
          flatten: true,
        })
        attachedSessionId = attached.sessionId
        await Promise.all([
          client.send('Page.enable', {}, attachedSessionId),
          client.send('Runtime.enable', {}, attachedSessionId),
        ])
        const matches = await evaluateInContext(
          client,
          attachedSessionId,
          undefined,
          `document.readyState === 'complete' && Boolean(document.querySelector(${JSON.stringify(requiredSelector)}))`,
          `${label} isolated iframe probe`,
        )
        if (matches) return { sessionId: attachedSessionId, contextId: undefined }

        const { frameTree: isolatedFrameTree } = await client.send(
          'Page.getFrameTree',
          {},
          attachedSessionId,
        )
        const isolatedCandidate = deepestFrame(isolatedFrameTree)
        if (isolatedCandidate.depth >= 1) {
          const { executionContextId } = await client.send('Page.createIsolatedWorld', {
            frameId: isolatedCandidate.frame.id,
            worldName: `pathforge-community-static-inner-${Date.now()}`,
          }, attachedSessionId)
          const nestedMatches = await evaluateInContext(
            client,
            attachedSessionId,
            executionContextId,
            `document.readyState === 'complete' && Boolean(document.querySelector(${JSON.stringify(requiredSelector)}))`,
            `${label} nested isolated iframe probe`,
          )
          if (nestedMatches) {
            return { sessionId: attachedSessionId, contextId: executionContextId }
          }
        }
      } catch {
        // Opaque iframe targets can be replaced while the protected document settles.
      }
      if (attachedSessionId) {
        try {
          await client.send('Target.detachFromTarget', { sessionId: attachedSessionId })
        } catch {
          // A navigated or destroyed target is already detached.
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 75))
  }
  throw new Error(`${label} did not expose the inner artifact document; frame depth ${lastDepth}, iframe targets ${lastIframeTargetCount}.`)
}

async function waitForContextValue(
  client,
  sessionId,
  contextId,
  expression,
  predicate,
  label,
  timeoutMs = 15_000,
) {
  const deadline = Date.now() + timeoutMs
  let lastValue
  while (Date.now() < deadline) {
    lastValue = await evaluateInContext(client, sessionId, contextId, expression, label)
    if (predicate(lastValue)) return lastValue
    await new Promise((resolve) => setTimeout(resolve, 75))
  }
  throw new Error(`${label} timed out; last state was ${JSON.stringify(lastValue)}.`)
}

async function dispatchWheel(client, sessionId, frame, deltaY) {
  const x = Math.round((frame.left + frame.right) / 2)
  const y = Math.round((frame.top + frame.bottom) / 2)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
    buttons: 0,
  }, sessionId)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel',
    x,
    y,
    deltaX: 0,
    deltaY,
  }, sessionId)
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

function isExpectedFixtureInterceptionCancellation(error) {
  const message = error instanceof Error ? error.message : String(error)
  // Fetch pauses requests asynchronously. A navigation can legitimately cancel
  // a request after its pause event has arrived but before the fulfil command
  // reaches Chrome. The rendered assertion below proves the fixture that did
  // settle; a stale cancellation must not make that completed browser proof
  // report a false failure.
  return /Invalid InterceptionId|Invalid requestId|Target closed|Session closed/i.test(message)
}

async function waitForProcessExit(child, timeoutMs) {
  if (child.exitCode !== null) return true
  return new Promise((resolve) => {
    const onExit = () => {
      clearTimeout(timeout)
      resolve(true)
    }
    const timeout = setTimeout(() => {
      child.off('exit', onExit)
      resolve(child.exitCode !== null)
    }, timeoutMs)
    child.once('exit', onExit)
    if (child.exitCode !== null) onExit()
  })
}

function signalChromeProcessGroup(child, signal) {
  if (typeof child.pid !== 'number') return
  if (process.platform !== 'win32') {
    try {
      // Chrome starts renderer and crash-handler children. On Unix, use the
      // detached process group so those children cannot retain the disposable
      // profile after the browser parent has exited.
      process.kill(-child.pid, signal)
      return
    } catch {
      // The group may already be gone; fall through to the direct child.
    }
  }
  if (child.exitCode === null) child.kill(signal)
}

async function closeChrome(child) {
  signalChromeProcessGroup(child, 'SIGTERM')
  if (await waitForProcessExit(child, 5_000)) return
  signalChromeProcessGroup(child, 'SIGKILL')
  if (!await waitForProcessExit(child, 5_000)) {
    throw new Error('Chrome did not exit before temporary-profile cleanup.')
  }
}

async function capture(client, sessionId, outputPath) {
  await client.send('Runtime.evaluate', {
    expression: `(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return true;
    })()`,
    returnByValue: true,
    awaitPromise: true,
  }, sessionId)
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

async function captureViewport(client, sessionId, outputPath) {
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  }, sessionId)
  writeFileSync(outputPath, Buffer.from(data, 'base64'))
}

async function clickRenderedElement(client, sessionId, selector, label) {
  const { root } = await client.send('DOM.getDocument', {
    depth: -1,
    pierce: true,
  }, sessionId)
  const { nodeId } = await client.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector,
  }, sessionId)
  if (!nodeId) throw new Error(`${label} could not resolve ${selector}.`)
  await evaluate(client, sessionId, `(async () => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element || element.hidden || element.disabled) {
        throw new Error('Rendered click target is unavailable.');
      }
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return true;
    })()`)
  const { model } = await client.send('DOM.getBoxModel', { nodeId }, sessionId)
  const quad = model.border
  const x = (quad[0] + quad[2] + quad[4] + quad[6]) / 4
  const y = (quad[1] + quad[3] + quad[5] + quad[7]) / 4
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
  }, sessionId)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  }, sessionId)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  }, sessionId)
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
  ], {
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'ignore', 'pipe'],
  })

  let client
  try {
    client = new CdpClient(await waitForWebSocketUrl(chrome))
    await client.ready()
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
    const consoleErrors = []
    const pendingFixtureFulfills = new Set()
    let fixtureInterceptionActive = true
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
        const fulfillment = client.send('Fetch.fulfillRequest', {
          requestId: message.params.requestId,
          responseCode: 200,
          responseHeaders: [
            { name: 'Content-Type', value: 'text/plain; charset=utf-8' },
            { name: 'Cache-Control', value: 'private, no-store' },
          ],
          body: Buffer.from(COMMUNITY_ARTIFACT_FIXTURE_HTML).toString('base64'),
        }, sessionId).catch((error) => {
          if (fixtureInterceptionActive && !isExpectedFixtureInterceptionCancellation(error)) {
            consoleErrors.push(`Artifact fixture interception failed: ${error.message}`)
          }
        }).finally(() => {
          pendingFixtureFulfills.delete(fulfillment)
        })
        pendingFixtureFulfills.add(fulfillment)
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
            signUpHref: [...document.querySelectorAll('a')].find((link) => link.textContent?.includes('New here?'))?.getAttribute('href') || '',
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
        if (build.signUpHref !== '/auth/signup?next=%2Fbuild') throw new Error(`${viewport.name} /build signup handoff lost its exact return path.`)
        if (build.hasUpload) throw new Error(`${viewport.name} anonymous /build exposed an upload control.`)
        if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, `build-anonymous-${viewport.name}.png`))

        const openedSignup = await evaluate(client, sessionId, `(() => {
          const link = [...document.querySelectorAll('a')].find((item) => item.textContent?.includes('New here?'))
          if (!link) return false
          link.click()
          return true
        })()`)
        if (!openedSignup) throw new Error(`${viewport.name} anonymous /build had no usable signup link.`)
        await new Promise((resolve) => setTimeout(resolve, 250))
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
            passwordMinLength: Number(form?.querySelector('[name="password"]')?.getAttribute('minlength') || 0),
            hasTwelveCharacterRule: form?.querySelector('#signup-password-help')?.textContent?.includes('12+ characters') || false,
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
        if (signup.passwordMinLength !== 12 || !signup.hasTwelveCharacterRule) {
          throw new Error(`${viewport.name} signup password policy does not match the 12-character production minimum.`)
        }
        if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, `signup-${viewport.name}.png`))

        await navigate(client, sessionId, `${options.baseUrl}${LEGACY_FORK_PATH}`)
        await waitForHeading(client, sessionId, 'Sign in to continue this build', `${viewport.name} legacy fork sign-in handoff`)
        const legacyFork = await evaluate(client, sessionId, `(() => {
          const root = document.documentElement;
          const body = document.body;
          const viewportWidth = root.clientWidth;
          const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0);
          return {
            heading: document.querySelector('h1')?.textContent?.trim() || '',
            href: location.pathname + location.search,
            signInHref: [...document.querySelectorAll('a')].find((link) => link.textContent?.trim() === 'Sign in')?.getAttribute('href') || '',
            signUpHref: [...document.querySelectorAll('a')].find((link) => link.textContent?.trim() === 'Create account')?.getAttribute('href') || '',
            hasUpload: Boolean(document.querySelector('form, input[type="file"]')),
            preservesQueueBoundary: document.body.innerText?.includes('Nothing publishes when you submit this review record.') || false,
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
        assertPageFits(legacyFork, viewport)
        if (
          legacyFork.heading !== 'Sign in to continue this build' ||
          legacyFork.href !== LEGACY_FORK_PATH ||
          legacyFork.signInHref !== `/auth/login?next=${LEGACY_FORK_NEXT}` ||
          legacyFork.signUpHref !== `/auth/signup?next=${LEGACY_FORK_NEXT}` ||
          legacyFork.hasUpload ||
          !legacyFork.preservesQueueBoundary
        ) {
          throw new Error(`${viewport.name} legacy fork handoff lost its private queue or exact return path: ${JSON.stringify(legacyFork)}.`)
        }
        if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, `legacy-fork-signin-${viewport.name}.png`))

        await navigate(client, sessionId, `${options.baseUrl}/qa/community-release-controls`)
        await waitForHeading(
          client,
          sessionId,
          'Community release controls fixture',
          `${viewport.name} community release controls fixture`,
        )
        const releaseControls = await evaluate(client, sessionId, `(() => {
          const root = document.documentElement;
          const body = document.body;
          const viewportWidth = root.clientWidth;
          const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0);
          const reference = document.querySelector('input[name="launch_readiness_reference"]');
          const confirmation = document.querySelector('input[name="launch_readiness_confirmed"]');
          const reportReasons = [...document.querySelectorAll('select[name="reason"] option')]
            .map((option) => option.value);
          return {
            heading: document.querySelector('h1')?.textContent?.trim() || '',
            referenceMinLength: Number(reference?.getAttribute('minlength') || 0),
            referenceMaxLength: Number(reference?.getAttribute('maxlength') || 0),
            confirmationRequired: Boolean(confirmation?.required && confirmation?.value === 'yes'),
            invitationButton: [...document.querySelectorAll('button')]
              .find((button) => button.textContent?.includes('Verify gates and enable invited-builder submissions'))
              ?.textContent?.trim() || '',
            publicationButton: [...document.querySelectorAll('button')]
              .find((button) => button.textContent?.includes('Verify readiness and enable publication'))
              ?.textContent?.trim() || '',
            reportReasons,
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
        assertPageFits(releaseControls, viewport)
        if (
          releaseControls.heading !== 'Community release controls fixture'
          || releaseControls.referenceMinLength !== 8
          || releaseControls.referenceMaxLength !== 200
          || !releaseControls.confirmationRequired
          || !releaseControls.invitationButton
          || !releaseControls.publicationButton
          || !['privacy', 'copyright', 'malware', 'exploitation', 'credentials', 'imminent_harm', 'abuse', 'misleading', 'other']
            .every((reason) => releaseControls.reportReasons.includes(reason))
        ) {
          throw new Error(`${viewport.name} community release controls were incomplete: ${JSON.stringify(releaseControls)}.`)
        }
        if (options.screenshotDir) {
          await capture(
            client,
            sessionId,
            path.join(options.screenshotDir, `community-release-controls-${viewport.name}.png`),
          )
        }

        await navigate(client, sessionId, `${options.baseUrl}/qa/community-project-submission`)
        await waitForHeading(client, sessionId, 'Submit a project', `${viewport.name} admitted project-submission fixture`)
        const submission = await evaluate(client, sessionId, `(() => {
          const root = document.documentElement;
          const body = document.body;
          const viewportWidth = root.clientWidth;
          const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0);
          const requiredChecks = [...document.querySelectorAll('input[type="checkbox"][required]')];
          const form = document.querySelector('form[enctype="multipart/form-data"]');
          const submitButton = form?.querySelector('button[type="submit"]');
          const continueButton = form?.querySelector('button[data-community-submission-continue]');
          return {
            mounted: Boolean(document.querySelector('[data-community-project-submission-fixture]')),
            heading: document.querySelector('h1')?.textContent?.trim() || '',
            hasForm: Boolean(form),
            artifactInput: document.querySelector('input[type="file"]')?.id || '',
            requiredChecks: requiredChecks.length,
            hasFirstSection: document.body.innerText?.includes('1. Show the result') || false,
            hasConsentSection: document.body.textContent?.includes('6. Consent and submit for private review') || false,
            activeStep: form?.getAttribute('data-active-community-submission-step') || '',
            visibleSections: form?.querySelectorAll('[data-community-submission-step]:not([hidden])').length || 0,
            continueLabel: continueButton?.textContent?.trim() || '',
            submitLabel: submitButton?.textContent?.trim() || '',
            submitHidden: Boolean(submitButton?.hidden),
            scrollHeight: Math.max(root.scrollHeight, body?.scrollHeight ?? 0),
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
        assertPageFits(submission, viewport)
        const maximumInitialFormHeight = viewport.mobile ? 3200 : 2200
        if (
          !submission.mounted ||
          submission.heading !== 'Submit a project' ||
          !submission.hasForm ||
          submission.artifactInput !== 'community-project-artifact' ||
          submission.requiredChecks < 4 ||
          !submission.hasFirstSection ||
          !submission.hasConsentSection ||
          submission.activeStep !== '1' ||
          submission.visibleSections !== 1 ||
          !submission.continueLabel.includes('Continue to build evidence') ||
          !submission.submitLabel.includes('Submit private review bundle') ||
          !submission.submitHidden ||
          submission.scrollHeight > maximumInitialFormHeight
        ) {
          throw new Error(`${viewport.name} admitted project-submission form was incomplete: ${JSON.stringify(submission)}.`)
        }
        if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, `project-upload-admitted-${viewport.name}.png`))

        const { root: uploadRoot } = await client.send('DOM.getDocument', {
          depth: -1,
          pierce: true,
        }, sessionId)
        const { nodeId: uploadNodeId } = await client.send('DOM.querySelector', {
          nodeId: uploadRoot.nodeId,
          selector: '#community-project-artifact',
        }, sessionId)
        if (!uploadNodeId) {
          throw new Error(`${viewport.name} guided upload fixture could not resolve the artifact input.`)
        }
        await client.send('DOM.setFileInputFiles', {
          nodeId: uploadNodeId,
          files: [COMMUNITY_UPLOAD_FIXTURE],
        }, sessionId)
        await evaluate(client, sessionId, `(() => {
          const setControl = (selector, value) => {
            const element = document.querySelector(selector);
            if (!element) throw new Error('Missing guided upload control ' + selector);
            const prototype = element instanceof HTMLSelectElement
              ? HTMLSelectElement.prototype
              : element instanceof HTMLTextAreaElement
                ? HTMLTextAreaElement.prototype
                : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          };
          setControl('input[name="title"]', 'Guided upload browser fixture');
          setControl('textarea[name="summary"]', 'A safe local project proving that every guided upload step remains complete and usable.');
          setControl('select[name="category_slug"]', 'personal');
          setControl('select[name="difficulty"]', 'beginner');
          setControl('select[name="provider"]', 'ChatGPT');
          setControl('input[name="model"]', 'Browser fixture model');
          setControl('select[name="evidence_scope"]', 'selected_excerpts');
          setControl('select[name="reuse_permission"]', 'view_only');
          const checkpoint = [...document.querySelectorAll('fieldset')]
            .find((item) => item.querySelector('legend')?.textContent?.trim() === 'Checkpoint 1');
          const checkpointInput = checkpoint?.querySelector('input');
          const checkpointTextareas = checkpoint?.querySelectorAll('textarea') ?? [];
          if (!checkpointInput || checkpointTextareas.length !== 2) {
            throw new Error('Guided upload checkpoint controls are incomplete.');
          }
          const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          inputSetter.call(checkpointInput, 'Browser checkpoint');
          checkpointInput.dispatchEvent(new Event('input', { bubbles: true }));
          checkpointInput.dispatchEvent(new Event('change', { bubbles: true }));
          const textareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
          textareaSetter.call(checkpointTextareas[0], 'Create a safe self-contained browser fixture.');
          checkpointTextareas[0].dispatchEvent(new Event('input', { bubbles: true }));
          textareaSetter.call(checkpointTextareas[1], 'Created the fixture without network access.');
          checkpointTextareas[1].dispatchEvent(new Event('input', { bubbles: true }));
          for (const checkbox of document.querySelectorAll('input[type="checkbox"][required]')) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          }
          document.querySelector('#community-project-artifact')
            ?.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        })()`)
        for (let guidedStep = 1; guidedStep < 6; guidedStep += 1) {
          await waitForContextValue(
            client,
            sessionId,
            undefined,
            `(() => {
              const form = document.querySelector('form[enctype="multipart/form-data"]');
              const section = form?.querySelector('[data-community-submission-step="${guidedStep}"]');
              return {
                activeStep: form?.getAttribute('data-active-community-submission-step') || '',
                invalidCount: section?.querySelectorAll(':invalid').length ?? -1,
              };
            })()`,
            (value) => value?.activeStep === String(guidedStep) && value?.invalidCount === 0,
            `${viewport.name} guided upload step ${guidedStep}`,
          )
          await clickRenderedElement(
            client,
            sessionId,
            'button[data-community-submission-continue]',
            `${viewport.name} guided upload continue control`,
          )
          await waitForContextValue(
            client,
            sessionId,
            undefined,
            `document.querySelector('form[enctype="multipart/form-data"]')
              ?.getAttribute('data-active-community-submission-step') || ''`,
            (value) => value === String(guidedStep + 1),
            `${viewport.name} guided upload transition ${guidedStep + 1}`,
          )
        }
        await waitForContextValue(
          client,
          sessionId,
          undefined,
          `(() => ({
            isStepHeading: document.activeElement
              ?.hasAttribute('data-community-submission-step-heading') || false,
            text: document.activeElement?.textContent?.trim().slice(0, 120) || '',
          }))()`,
          (value) => value?.isStepHeading && value?.text.startsWith('6.'),
          `${viewport.name} guided upload final-step focus`,
        )
        const guidedConsent = await evaluate(client, sessionId, `(() => {
          const root = document.documentElement;
          const body = document.body;
          const form = document.querySelector('form[enctype="multipart/form-data"]');
          const submitButton = form?.querySelector('button[type="submit"]');
          return {
            activeStep: form?.getAttribute('data-active-community-submission-step') || '',
            valid: form?.checkValidity() || false,
            visibleSections: form?.querySelectorAll('[data-community-submission-step]:not([hidden])').length || 0,
            consentVisible: document.body.innerText.includes('6. Consent and submit for private review'),
            submitVisible: Boolean(submitButton && !submitButton.hidden && !submitButton.disabled),
            focusedStepHeading: document.activeElement
              ?.hasAttribute('data-community-submission-step-heading') || false,
            focusedStepHeadingText: document.activeElement?.textContent?.trim().slice(0, 120) || '',
            viewportWidth: root.clientWidth,
            scrollWidth: Math.max(root.scrollWidth, body?.scrollWidth ?? 0),
          };
        })()`)
        assertPageFits(guidedConsent, viewport)
        if (
          guidedConsent.activeStep !== '6'
          || !guidedConsent.valid
          || guidedConsent.visibleSections !== 1
          || !guidedConsent.consentVisible
          || !guidedConsent.submitVisible
          || !guidedConsent.focusedStepHeading
          || !guidedConsent.focusedStepHeadingText.startsWith('6.')
        ) {
          throw new Error(`${viewport.name} guided upload did not reach a valid explicit-consent step: ${JSON.stringify(guidedConsent)}.`)
        }
        if (options.screenshotDir) {
          await new Promise((resolve) => setTimeout(resolve, 200))
          await evaluate(client, sessionId, `(() => {
            window.scrollTo(0, 0);
            return true;
          })()`)
          await waitForContextValue(
            client,
            sessionId,
            undefined,
            `(() => {
              const skipLink = document.querySelector('.site-skip-link');
              const rect = skipLink?.getBoundingClientRect();
              return {
                scrollY,
                skipLinkBottom: rect?.bottom ?? -100,
              };
            })()`,
            (value) => value?.scrollY === 0 && value?.skipLinkBottom <= -6,
            `${viewport.name} guided upload settled visual state`,
          )
          await capture(client, sessionId, path.join(options.screenshotDir, `project-upload-consent-${viewport.name}.png`))
        }

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
                iframe?.srcdoc?.includes('sandbox=""') &&
                iframe?.srcdoc?.includes('data-pathforge-interaction-mode="reader-enabled"') &&
                !iframe?.srcdoc?.includes(' tabindex="-1"') &&
                !iframe?.srcdoc?.includes(' inert'),
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
            staticPreviewCopy: document.body.innerText?.includes('script-disabled static previews') || false,
            executionMode: document.querySelector('[data-artifact-fit-mode]')?.closest('[data-artifact-execution-mode]')?.getAttribute('data-artifact-execution-mode') || '',
            interactionMode: document.querySelector('[data-artifact-fit-mode]')?.closest('[data-artifact-interaction-mode]')?.getAttribute('data-artifact-interaction-mode') || '',
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
        if (
          !viewer.staticPreviewCopy ||
          viewer.executionMode !== 'static-untrusted' ||
          viewer.interactionMode !== 'reader-enabled'
        ) {
          throw new Error(`${viewport.name} community artifact viewer did not expose its script-disabled preview boundary: ${JSON.stringify(viewer)}.`)
        }
        if (options.screenshotDir) await capture(client, sessionId, path.join(options.screenshotDir, `community-artifact-viewer-${viewport.name}.png`))

        const artifactFrame = await evaluate(client, sessionId, `(() => {
          const iframe = document.querySelector('[data-artifact-fit-mode] iframe');
          if (!iframe) return null;
          const rect = iframe.getBoundingClientRect();
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
        })()`)
        if (!artifactFrame) throw new Error(`${viewport.name} community artifact frame was missing before the scroll proof.`)
        const artifactRuntime = await artifactDocumentContext(
          client,
          sessionId,
          '#community-preview-bottom',
          `${viewport.name} static community artifact`,
        )
        const initialArtifactScroll = await evaluateInContext(
          client,
          artifactRuntime.sessionId,
          artifactRuntime.contextId,
          `(() => {
            const root = document.scrollingElement;
            return { top: root?.scrollTop || 0, max: root ? root.scrollHeight - root.clientHeight : 0 };
          })()`,
          `${viewport.name} initial static artifact scroll`,
        )
        if (initialArtifactScroll.top > 1 || initialArtifactScroll.max < 500) {
          throw new Error(`${viewport.name} static artifact did not begin as a tall, top-aligned reader: ${JSON.stringify(initialArtifactScroll)}.`)
        }
        await dispatchWheel(client, sessionId, artifactFrame, 700)
        const scrolledArtifact = await waitForContextValue(
          client,
          artifactRuntime.sessionId,
          artifactRuntime.contextId,
          `(() => {
            const root = document.scrollingElement;
            const middle = document.querySelector('#community-preview-middle')?.getBoundingClientRect();
            return {
              top: root?.scrollTop || 0,
              max: root ? root.scrollHeight - root.clientHeight : 0,
              viewport: root?.clientHeight || 0,
              middleTop: middle?.top ?? -1,
              middleBottom: middle?.bottom ?? -1,
            };
          })()`,
          (value) => (
            value?.top >= 100 &&
            value.middleTop < value.viewport &&
            value.middleBottom > 0
          ),
          `${viewport.name} user-wheel static artifact scroll`,
        )
        if (options.screenshotDir) await captureViewport(client, sessionId, path.join(options.screenshotDir, `community-artifact-viewer-scrolled-${viewport.name}.png`))
        await evaluateInContext(
          client,
          artifactRuntime.sessionId,
          artifactRuntime.contextId,
          'window.scrollTo(0, 0); true',
          `${viewport.name} static artifact scroll reset`,
        )
        await waitForContextValue(
          client,
          artifactRuntime.sessionId,
          artifactRuntime.contextId,
          'document.scrollingElement?.scrollTop || 0',
          (value) => value <= 1,
          `${viewport.name} static artifact scroll reset`,
        )
        if (artifactRuntime.sessionId !== sessionId) {
          try {
            await client.send('Target.detachFromTarget', { sessionId: artifactRuntime.sessionId })
          } catch {
            // A frame replaced during cleanup is already detached.
          }
        }

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
                interactionMode: frame?.closest('[data-artifact-interaction-mode]')?.getAttribute('data-artifact-interaction-mode') || '',
                staticExecution: Boolean(
                  iframe?.srcdoc?.includes('data-pathforge-execution-mode="static-untrusted"') &&
                  iframe?.srcdoc?.includes('sandbox=""') &&
                  iframe?.srcdoc?.includes('data-pathforge-interaction-mode="visual-only"') &&
                  iframe?.srcdoc?.includes(' tabindex="-1"') &&
                  iframe?.srcdoc?.includes(' inert'),
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
            previewState.interactionMode !== 'visual-only' ||
            !previewState.staticExecution ||
            !previewState.visualOnlyCopy
          ) {
            throw new Error(`${viewport.name} ${surface} community card did not preserve the visual-only boundary: ${JSON.stringify(previewState)}.`)
          }
          await evaluate(client, sessionId, 'document.activeElement instanceof HTMLElement && document.activeElement.blur(); true')
          if (options.screenshotDir) await captureViewport(client, sessionId, path.join(options.screenshotDir, `community-static-${surface}-${viewport.name}.png`))
          const previewContrast = await artifactRenderedContrast(client, sessionId, selector)
          if (previewContrast.ratio < 4.5) {
            throw new Error(`${viewport.name} ${surface} community preview did not retain the rendered fixture: ${JSON.stringify(previewContrast)}.`)
          }
        }
        await evaluate(client, sessionId, 'window.scrollTo(0, 0); document.activeElement instanceof HTMLElement && document.activeElement.blur(); true')
        // Give opaque-origin OOPIF previews one paint after returning them to
        // the viewport. An immediate captureBeyondViewport call can otherwise
        // record the frame's host background even though the visible surface
        // assertions above already observed the rendered document.
        await new Promise((resolve) => setTimeout(resolve, 250))
        if (options.screenshotDir) await captureViewport(client, sessionId, path.join(options.screenshotDir, `community-static-cards-${viewport.name}.png`))

        console.log(`${viewport.name}: anonymous build, signup and exact legacy-fork handoffs, admitted upload form, protected static reader (${Math.round(scrolledArtifact.top)}px wheel scroll), and Explore/profile visual-only cards passed at ${signup.viewportWidth}px with ${artifactContrast.ratio.toFixed(2)}:1 default-canvas contrast.`)
      }

      await Promise.all([...pendingFixtureFulfills])
      if (consoleErrors.length > 0) {
        throw new Error(`Community-project auth pages logged errors: ${[...new Set(consoleErrors)].join(' | ')}`)
      }
      console.log('Community-project auth and upload UI browser guard passed.')
    } finally {
      fixtureInterceptionActive = false
      client.listeners.delete(listener)
      await client.send('Target.closeTarget', { targetId })
    }
  } finally {
    if (client) {
      try {
        await client.send('Browser.close')
      } catch {
        // A browser that already exited does not need another close command.
      }
      client.close()
    }
    await closeChrome(chrome)
    rmSync(profile, { recursive: true, force: true, maxRetries: 12, retryDelay: 50 })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
