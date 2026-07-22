#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  CdpClient,
  chromeExecutable,
  waitForWebSocketUrl,
} from './measure-html-artifacts.mjs'
import {
  isExpectedLocalActivationFailure,
  isExpectedLocalActivationResponseFailure,
  isExpectedLocalVercelScriptFailure,
  isExpectedLocalVercelScriptResponseFailure,
} from './browser-guard-errors.mjs'

const SEARCHED_FILTER_SCENARIO = {
  name: 'searched',
  initialPath: '/paths?q=booking&sort=models',
  filteredPath: '/paths?q=booking&model=gemini-3-1-pro&sort=models',
  requiresScrollCompensation: false,
  interruptDuringPending: false,
}
const UNFILTERED_FILTER_SCENARIO = {
  name: 'unfiltered',
  initialPath: '/paths',
  filteredPath: '/paths?model=gemini-3-1-pro',
  requiresScrollCompensation: true,
  interruptDuringPending: false,
}
const UNFILTERED_INTERRUPTED_SCENARIO = {
  ...UNFILTERED_FILTER_SCENARIO,
  name: 'unfiltered-interrupted',
  requiresScrollCompensation: false,
  interruptDuringPending: true,
}
const TARGET_MODEL = 'Gemini 3.1 Pro'
const VIEWPORTS = [
  { name: 'mobile-390', width: 390, height: 844, mobile: true, summaryTop: 220 },
  { name: 'desktop', width: 1440, height: 900, mobile: false, summaryTop: 260 },
]

function parseArgs(argv) {
  const options = { baseUrl: 'http://127.0.0.1:3011', screenshotDir: '' }
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

async function evaluate(client, sessionId, expression, awaitPromise = false) {
  const { result, exceptionDetails } = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise,
  }, sessionId)
  if (exceptionDetails) throw new Error(exceptionDetails.text ?? 'Browser evaluation failed.')
  return result.value
}

async function waitForValue(client, sessionId, expression, predicate, label, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  let value
  while (Date.now() < deadline) {
    value = await evaluate(client, sessionId, expression)
    if (predicate(value)) return value
    await new Promise((resolve) => setTimeout(resolve, 40))
  }
  throw new Error(`${label} timed out; last value was ${JSON.stringify(value)}.`)
}

const SNAPSHOT_EXPRESSION = `(() => {
  const normalize=(value)=>value.replace(/\\s+/g,' ').trim();
  const rect=(element)=>{
    if (!element) return null;
    const value=element.getBoundingClientRect();
    return {top:value.top,bottom:value.bottom,left:value.left,right:value.right,width:value.width,height:value.height};
  };
  const details=document.querySelector('.path-filter-menu');
  const summary=details?.querySelector('summary');
  const links=[...(details?.querySelectorAll('.path-filter-popover a') || [])];
  const target=links.find((link)=>normalize(link.querySelector('span')?.textContent || link.textContent || '') === '${TARGET_MODEL}');
  const header=document.querySelector('header');
  const pending=details?.querySelector('[data-discovery-navigation-pending="true"]');
  return {
    ready:Boolean(
      details && summary && target &&
      Object.keys(target).some((key)=>key.startsWith('__reactProps$')) &&
      document.querySelectorAll('.path-catalog-grid .path-card').length > 0
    ),
    url:location.pathname+location.search,
    scrollY:window.scrollY,
    historyLength:history.length,
    menuOpen:Boolean(details?.open),
    summary:rect(summary),
    target:rect(target),
    targetActive:Boolean(target?.classList.contains('is-active')),
    pending:Boolean(pending),
    pendingHref:pending?.getAttribute('href') || '',
    headerBottom:header?.getBoundingClientRect().bottom ?? 0,
    overflow:Math.max(0,document.documentElement.scrollWidth-window.innerWidth),
    viewportWidth:window.innerWidth,
    viewportHeight:window.innerHeight,
  };
})()`

async function navigate(client, sessionId, url, expectedPath) {
  const loaded = client.waitFor('Page.loadEventFired', sessionId, 20_000)
  await client.send('Page.navigate', { url }, sessionId)
  await loaded
  return waitForValue(
    client,
    sessionId,
    SNAPSHOT_EXPRESSION,
    (value) => value?.ready && value.url === expectedPath && !value.pending,
    'hydrated Explore catalog',
  )
}

async function positionSummary(client, sessionId, top) {
  await evaluate(client, sessionId, `(async () => {
    const summary=document.querySelector('.path-filter-menu summary');
    if (!summary) throw new Error('Missing Filters summary.');
    const desiredTop=${JSON.stringify(top)};
    window.scrollTo(0, window.scrollY + summary.getBoundingClientRect().top - desiredTop);
    await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  })()`, true)
  return waitForValue(
    client,
    sessionId,
    SNAPSHOT_EXPRESSION,
    (value) => Math.abs((value?.summary?.top ?? Number.POSITIVE_INFINITY) - top) <= 1,
    `Filters summary positioned at ${top}px`,
  )
}

async function pointFor(client, sessionId, selector, targetModel = false) {
  return evaluate(client, sessionId, `(() => {
    const normalize=(value)=>value.replace(/\\s+/g,' ').trim();
    const element=${targetModel
      ? `[...document.querySelectorAll('.path-filter-popover a')].find((link)=>normalize(link.querySelector('span')?.textContent || link.textContent || '') === '${TARGET_MODEL}')`
      : `document.querySelector(${JSON.stringify(selector)})`};
    if (!(element instanceof HTMLElement)) return null;
    const rect=element.getBoundingClientRect();
    const x=rect.left+rect.width/2;
    const y=rect.top+rect.height/2;
    const hit=document.elementFromPoint(x,y);
    return {x,y,hit:Boolean(hit && (hit === element || element.contains(hit))),top:rect.top,bottom:rect.bottom};
  })()`)
}

async function pointerClick(client, sessionId, selector, targetModel = false) {
  const point = await pointFor(client, sessionId, selector, targetModel)
  if (!point?.hit) {
    throw new Error(`Physical pointer hit-testing failed for ${targetModel ? TARGET_MODEL : selector}: ${JSON.stringify(point)}.`)
  }
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: point.x, y: point.y,
  }, sessionId)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: point.x, y: point.y, button: 'left', buttons: 1, clickCount: 1,
  }, sessionId)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: point.x, y: point.y, button: 'left', buttons: 0, clickCount: 1,
  }, sessionId)
}

function assertClose(label, actual, expected, tolerance = 1) {
  const delta = Math.abs((actual ?? Number.NaN) - (expected ?? Number.NaN))
  if (!Number.isFinite(delta) || delta > tolerance) {
    throw new Error(`${label} moved by ${Number.isFinite(delta) ? delta.toFixed(2) : 'NaN'}px; expected at most ${tolerance}px.`)
  }
}

function assertAnchorStable(label, before, after, allowScrollCompensation = false) {
  if (!allowScrollCompensation) {
    assertClose(`${label} page scroll`, after.scrollY, before.scrollY)
  }
  assertClose(`${label} Filters summary`, after.summary?.top, before.summary?.top)
  assertClose(`${label} exact model link`, after.target?.top, before.target?.top)
  if (!after.menuOpen) throw new Error(`${label} closed the Filters disclosure.`)
  if ((after.summary?.top ?? -1) < after.headerBottom) {
    throw new Error(`${label} left the Filters summary under the fixed header.`)
  }
  if ((after.target?.top ?? -1) < after.headerBottom || (after.target?.bottom ?? Number.POSITIVE_INFINITY) > after.viewportHeight) {
    throw new Error(`${label} left the exact model link outside the usable viewport.`)
  }
  if (after.overflow !== 0) throw new Error(`${label} introduced ${after.overflow}px of horizontal overflow.`)
}

async function screenshot(client, sessionId, destination) {
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  }, sessionId)
  writeFileSync(destination, Buffer.from(data, 'base64'))
}

async function settleNavigation(client, sessionId, expectedPath, expectedActive, label) {
  return waitForValue(
    client,
    sessionId,
    SNAPSHOT_EXPRESSION,
    (value) => (
      value?.url === expectedPath &&
      value.targetActive === expectedActive &&
      !value.pending &&
      value.menuOpen
    ),
    label,
  )
}

async function activateFilter(
  client,
  sessionId,
  before,
  expectedPath,
  expectedActive,
  label,
  slow,
  allowScrollCompensation,
  interruptDuringPending,
) {
  let interruptedPosition = null
  if (slow) {
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 900,
      downloadThroughput: 750_000,
      uploadThroughput: 250_000,
      connectionType: 'cellular3g',
    }, sessionId)
  }

  await pointerClick(client, sessionId, '', true)
  if (slow) {
    const acknowledged = await waitForValue(
      client,
      sessionId,
      SNAPSHOT_EXPRESSION,
      (value) => value?.pending && value.pendingHref.includes('model=gemini-3-1-pro'),
      `${label} immediate pending acknowledgement`,
      1_500,
    )
    assertAnchorStable(`${label} pending render`, before, acknowledged)
    if (interruptDuringPending) {
      await client.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: acknowledged.viewportWidth - 4,
        y: Math.round(acknowledged.viewportHeight / 2),
        deltaX: 0,
        deltaY: 80,
      }, sessionId)
      interruptedPosition = await waitForValue(
        client,
        sessionId,
        SNAPSHOT_EXPRESSION,
        (value) => value?.pending && value.scrollY >= acknowledged.scrollY + 60,
        `${label} user-chosen interrupted position`,
      )
    }
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
      connectionType: 'none',
    }, sessionId)
  }
  const settled = await settleNavigation(client, sessionId, expectedPath, expectedActive, `${label} settled navigation`)
  if (interruptedPosition) {
    assertClose(`${label} user scroll after settle`, settled.scrollY, interruptedPosition.scrollY)
    if (Math.abs((settled.summary?.top ?? 0) - (before.summary?.top ?? 0)) < 40) {
      throw new Error(`${label} overrode the user's interrupted viewport with the click-time anchor.`)
    }
    if (!settled.menuOpen || !settled.targetActive) {
      throw new Error(`${label} lost the open panel or selected model after interrupted navigation.`)
    }
    if (
      (settled.target?.top ?? -1) < settled.headerBottom ||
      (settled.target?.bottom ?? Number.POSITIVE_INFINITY) > settled.viewportHeight
    ) {
      throw new Error(`${label} left the selected model outside the usable viewport.`)
    }
    if (settled.overflow !== 0) {
      throw new Error(`${label} introduced ${settled.overflow}px of horizontal overflow.`)
    }
  } else {
    assertAnchorStable(`${label} settled render`, before, settled, allowScrollCompensation)
  }
  return settled
}

async function verifyViewport(client, options, viewport, scenario) {
  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
  const consoleErrors = []
  const httpFailures = []
  const listener = (message) => {
    if (message.sessionId !== sessionId) return
    if (message.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(message.params.exceptionDetails?.exception?.description ?? message.params.exceptionDetails?.text ?? 'Runtime exception')
    }
    if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') {
      const entry = message.params.entry
      if (
        !isExpectedLocalActivationFailure(options.baseUrl, entry) &&
        !isExpectedLocalVercelScriptFailure(options.baseUrl, entry)
      ) {
        consoleErrors.push(entry.text)
      }
    }
    if (message.method === 'Network.responseReceived' && message.params.response?.status >= 400) {
      const response = message.params.response
      if (
        !isExpectedLocalActivationResponseFailure(options.baseUrl, response) &&
        !isExpectedLocalVercelScriptResponseFailure(options.baseUrl, response)
      ) {
        httpFailures.push(`${response.status} ${response.url}`)
      }
    }
  }
  client.listeners.add(listener)

  try {
    await Promise.all([
      client.send('Page.enable', {}, sessionId),
      client.send('Runtime.enable', {}, sessionId),
      client.send('Log.enable', {}, sessionId),
      client.send('Network.enable', {}, sessionId),
      client.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId),
      client.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      }, sessionId),
    ])

    await navigate(client, sessionId, `${options.baseUrl}${scenario.initialPath}`, scenario.initialPath)
    const positioned = await positionSummary(client, sessionId, viewport.summaryTop)
    if (positioned.viewportWidth !== viewport.width || positioned.viewportHeight !== viewport.height) {
      throw new Error(`${viewport.name} measured ${positioned.viewportWidth}x${positioned.viewportHeight} instead of ${viewport.width}x${viewport.height}.`)
    }

    await pointerClick(client, sessionId, '.path-filter-menu summary')
    const opened = await waitForValue(
      client,
      sessionId,
      SNAPSHOT_EXPRESSION,
      (value) => value?.menuOpen && value.target?.bottom <= value.viewportHeight,
      `${viewport.name} open Filters disclosure`,
    )
    assertClose(`${viewport.name} disclosure page scroll`, opened.scrollY, positioned.scrollY)
    assertClose(`${viewport.name} disclosure summary`, opened.summary?.top, positioned.summary?.top)

    if (options.screenshotDir) {
      await screenshot(client, sessionId, path.join(options.screenshotDir, `${viewport.name}-${scenario.name}-before-filter-navigation.png`))
    }

    const selected = await activateFilter(
      client,
      sessionId,
      opened,
      scenario.filteredPath,
      true,
      `${viewport.name} ${scenario.name} slow filter selection`,
      true,
      scenario.requiresScrollCompensation,
      scenario.interruptDuringPending,
    )
    if (selected.historyLength !== opened.historyLength + 1) {
      throw new Error(`${viewport.name} filter selection did not add exactly one history entry.`)
    }

    if (options.screenshotDir) {
      await screenshot(client, sessionId, path.join(options.screenshotDir, `${viewport.name}-${scenario.name}-after-filter-navigation.png`))
    }

    if (scenario.interruptDuringPending) {
      if (consoleErrors.length > 0) {
        throw new Error(`${viewport.name} logged browser errors: ${[...new Set(consoleErrors)].join(' | ')}`)
      }
      if (httpFailures.length > 0) {
        throw new Error(`${viewport.name} received failed HTTP responses: ${[...new Set(httpFailures)].join(' | ')}`)
      }
      return {
        viewport: `${viewport.name}-${scenario.name}`,
        scrollY: selected.scrollY,
        summaryTop: selected.summary.top,
        targetTop: selected.target.top,
        headerBottom: selected.headerBottom,
        historyLength: selected.historyLength,
        overflow: selected.overflow,
      }
    }

    await evaluate(client, sessionId, 'history.back()')
    const backed = await settleNavigation(client, sessionId, scenario.initialPath, false, `${viewport.name} ${scenario.name} Back navigation`)
    assertAnchorStable(`${viewport.name} ${scenario.name} Back restoration`, opened, backed)

    await evaluate(client, sessionId, 'history.forward()')
    const forwarded = await settleNavigation(client, sessionId, scenario.filteredPath, true, `${viewport.name} ${scenario.name} Forward navigation`)
    assertAnchorStable(
      `${viewport.name} ${scenario.name} Forward restoration`,
      opened,
      forwarded,
      scenario.requiresScrollCompensation,
    )

    for (let cycle = 1; cycle <= 2; cycle += 1) {
      await pointerClick(client, sessionId, '.path-filter-menu summary')
      const closed = await waitForValue(
        client,
        sessionId,
        SNAPSHOT_EXPRESSION,
        (value) => value && !value.menuOpen,
        `${viewport.name} Filters close cycle ${cycle}`,
      )
      assertClose(`${viewport.name} close cycle ${cycle} scroll`, closed.scrollY, forwarded.scrollY)
      assertClose(`${viewport.name} close cycle ${cycle} summary`, closed.summary?.top, opened.summary?.top)
      await pointerClick(client, sessionId, '.path-filter-menu summary')
      const reopened = await waitForValue(
        client,
        sessionId,
        SNAPSHOT_EXPRESSION,
        (value) => value?.menuOpen && value.target?.bottom <= value.viewportHeight,
        `${viewport.name} Filters open cycle ${cycle}`,
      )
      assertAnchorStable(
        `${viewport.name} open cycle ${cycle}`,
        opened,
        reopened,
        scenario.requiresScrollCompensation,
      )
    }

    const cleared = await activateFilter(
      client,
      sessionId,
      forwarded,
      scenario.initialPath,
      false,
      `${viewport.name} ${scenario.name} fast filter clear`,
      false,
      scenario.requiresScrollCompensation,
      false,
    )
    assertAnchorStable(`${viewport.name} fast settled render`, opened, cleared)

    if (consoleErrors.length > 0) {
      throw new Error(`${viewport.name} logged browser errors: ${[...new Set(consoleErrors)].join(' | ')}`)
    }
    if (httpFailures.length > 0) {
      throw new Error(`${viewport.name} received failed HTTP responses: ${[...new Set(httpFailures)].join(' | ')}`)
    }

    return {
      viewport: `${viewport.name}-${scenario.name}`,
      scrollY: opened.scrollY,
      summaryTop: opened.summary.top,
      targetTop: opened.target.top,
      headerBottom: opened.headerBottom,
      historyLength: selected.historyLength,
      overflow: selected.overflow,
    }
  } finally {
    client.listeners.delete(listener)
    await client.send('Target.closeTarget', { targetId })
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found for the mobile anchor stability browser guard.')

  const profile = mkdtempSync(path.join(tmpdir(), 'pathforge-mobile-anchor-browser-'))
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
    const results = []
    for (const viewport of VIEWPORTS) {
      results.push(await verifyViewport(client, options, viewport, SEARCHED_FILTER_SCENARIO))
      if (viewport.mobile) {
        results.push(await verifyViewport(client, options, viewport, UNFILTERED_FILTER_SCENARIO))
        results.push(await verifyViewport(client, options, viewport, UNFILTERED_INTERRUPTED_SCENARIO))
      }
    }
    for (const result of results) {
      console.log(
        `${result.viewport}: scrollY=${result.scrollY}, summary=${result.summaryTop.toFixed(1)}, ` +
        `target=${result.targetTop.toFixed(1)}, header=${result.headerBottom.toFixed(1)}, overflow=${result.overflow}.`,
      )
    }
    console.log('Explore panel filter anchors, pending and settled renders, repeated disclosure cycles, and Back/Forward browser guard passed.')
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
