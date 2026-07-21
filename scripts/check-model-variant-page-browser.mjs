#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { isExpectedLocalActivationFailure } from './browser-guard-errors.mjs'
import {
  CdpClient,
  chromeExecutable,
  waitForWebSocketUrl,
} from './measure-html-artifacts.mjs'

const BOOKING_ARTIFACT_BY_RUN = {
  '4fcd2293646af036': '/artifacts/booking-flow-handoff-simulator-gemini-31-pro-repair-2.html',
  c42eebed94a0395e: '/artifacts/booking-flow-handoff-simulator-chatgpt-gpt56-luna-final.html',
}

const CDP_COMMAND_TIMEOUT_MS = 8_000
const CHROME_BOOT_TIMEOUT_MS = 15_000
const SELECTOR_PHASE_TIMEOUT_MS = 30_000
const COMPARISON_PHASE_TIMEOUT_MS = 75_000
const OVERALL_ASSERTION_TIMEOUT_MS = 165_000

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

async function withTimeout(label, timeoutMs, operation) {
  let timer
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} exceeded its ${timeoutMs}ms deadline.`))
        }, timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function runPhase(label, timeoutMs, operation) {
  const startedAt = Date.now()
  process.stdout.write(`[model-variant-browser] ${label} started.\n`)
  try {
    const result = await withTimeout(label, timeoutMs, operation)
    process.stdout.write(
      `[model-variant-browser] ${label} passed in ${Date.now() - startedAt}ms.\n`,
    )
    return result
  } catch (error) {
    throw new Error(
      `${label} failed after ${Date.now() - startedAt}ms: ${errorMessage(error)}`,
      { cause: error },
    )
  }
}

function parseArgs(argv) {
  let baseUrl = 'http://127.0.0.1:3011'
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== '--base-url') throw new Error(`Unknown argument: ${argv[index]}`)
    baseUrl = argv[++index] ?? ''
  }
  return new URL(baseUrl).origin
}

function isExpectedLocalFaviconFailure(baseUrl, entry) {
  if (!/\b404\b/.test(entry?.text ?? '') || !entry?.url) return false
  const base = new URL(baseUrl)
  if (base.hostname !== 'localhost' && base.hostname !== '127.0.0.1') return false
  const request = new URL(entry.url, base)
  return request.origin === base.origin && request.pathname === '/favicon.ico'
}

async function waitForValue(client, sessionId, expression, predicate, label, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs
  let lastValue
  while (Date.now() < deadline) {
    const remainingMs = Math.max(1, deadline - Date.now())
    const { result } = await withTimeout(
      `${label} CDP evaluation`,
      Math.min(CDP_COMMAND_TIMEOUT_MS, remainingMs),
      () => client.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      }, sessionId),
    )
    lastValue = result.value
    if (predicate(lastValue)) return lastValue
    await new Promise((resolve) => setTimeout(resolve, 75))
  }
  throw new Error(`${label} timed out; last value was ${JSON.stringify(lastValue)}.`)
}

async function navigate(client, sessionId, url) {
  const loaded = client.waitFor('Page.loadEventFired', sessionId)
  await withTimeout(
    `navigation dispatch for ${url}`,
    CDP_COMMAND_TIMEOUT_MS,
    () => client.send('Page.navigate', { url }, sessionId),
  )
  await withTimeout(`page load for ${url}`, 15_000, () => loaded)
  await waitForValue(
    client,
    sessionId,
    `Boolean(document.querySelector('[data-model-variant-selector]'))`,
    Boolean,
    'model selector',
  )
}

async function stopChrome(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  const exitPromise = once(child, 'exit')
  child.kill('SIGTERM')
  const exited = await Promise.race([
    exitPromise.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ])
  if (exited || child.exitCode !== null || child.signalCode !== null) return
  child.kill('SIGKILL')
  await Promise.race([
    exitPromise,
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ])
}

const COMPARISON_SNAPSHOT_EXPRESSION = `(() => {
  const cards=[...document.querySelectorAll('[data-model-variant-comparison]')];
  const artifact=document.getElementById('final-result');
  const frame=document.querySelector('[data-artifact-package-id]');
  const selectorRows=[...document.querySelectorAll('[data-model-variant-run]')];
  const params=new URLSearchParams(location.search);
  const artifactRect=artifact?.getBoundingClientRect();
  const frameRect=frame?.getBoundingClientRect();
  return {
    cards: cards.map((card)=>({
      label: card.dataset.modelVariantComparison ?? '',
      runId: card.dataset.modelVariantSourceRun ?? '',
      current: Boolean(card.querySelector('[data-model-variant-preview-current]')),
      currentHref: card.querySelector('[data-model-variant-preview-current]')?.href ?? '',
      href: card.querySelector('[data-model-variant-preview-link]')?.href ?? '',
    })),
    artifact: artifactRect ? {
      top: artifactRect.top,
      width: artifactRect.width,
      height: artifactRect.height,
    } : null,
    frame: frameRect ? {
      top: frameRect.top,
      width: frameRect.width,
      height: frameRect.height,
    } : null,
    hash: location.hash,
    historyLength: history.length,
    scrollY: window.scrollY,
    maxScrollY: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    url: location.href,
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    queryRun: params.get('run') ?? '',
    queryCompare: params.get('compare') ?? '',
    selectorActiveId: selectorRows.find((row)=>row.querySelector('[aria-current="page"]'))?.dataset.modelVariantRun ?? '',
    packageId: frame?.dataset.artifactPackageId ?? '',
    artifactPath: frame?.dataset.artifactPath ?? '',
    artifactReady: Boolean(frame?.querySelector('iframe[srcdoc]')),
    destinationHydrated: Boolean(
      artifact?.querySelector('[data-artifact-package-id] iframe[srcdoc], [data-artifact-load-error]')
    ),
    controlsHydrated: Boolean(
      document.querySelector('[data-model-variant-preview-link][data-model-variant-preview-hydrated="true"]')
    ),
  };
})()`

function assertComparisonGeometry(label, before, after) {
  for (const region of ['artifact', 'frame']) {
    for (const measurement of ['top', 'width', 'height']) {
      const delta = Math.abs(after?.[region]?.[measurement] - before?.[region]?.[measurement])
      if (!Number.isFinite(delta) || delta > 2) {
        throw new Error(
          `${label} changed ${region} ${measurement} by ${Number.isFinite(delta) ? delta.toFixed(2) : 'an invalid amount'}px.`,
        )
      }
    }
  }
}

function assertComparisonScrollPosition(label, before, after) {
  const delta = Math.abs((after?.scrollY ?? Number.NaN) - (before?.scrollY ?? Number.NaN))
  if (!Number.isFinite(delta) || delta > 1) {
    throw new Error(
      `${label} changed window.scrollY by ${Number.isFinite(delta) ? delta.toFixed(2) : 'an invalid amount'}px.`,
    )
  }
}

function assertComparisonCardOrder(label, expectedIds, snapshot) {
  const actualIds = snapshot.cards.map((card) => card.runId)
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    throw new Error(`${label} changed the Run A / Run B identities.`)
  }
}

function assertComparisonTruth(label, snapshot, expected) {
  const currentRunId = snapshot.cards.find((card) => card.current)?.runId
  const actual = {
    currentRunId,
    selectorActiveId: snapshot.selectorActiveId,
    queryRun: snapshot.queryRun,
    queryCompare: snapshot.queryCompare,
    packageId: snapshot.packageId,
    artifactPath: snapshot.artifactPath,
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (actual[field] !== expectedValue) {
      throw new Error(`${label} expected ${field}=${expectedValue}, received ${actual[field] ?? ''}.`)
    }
  }
}

async function positionArtifact(client, sessionId, desiredTop) {
  await client.send('Runtime.evaluate', {
    expression: `(() => {
      const artifact=document.getElementById('final-result');
      if (!artifact) return false;
      window.scrollTo(0, window.scrollY + artifact.getBoundingClientRect().top - ${desiredTop});
      return true;
    })()`,
  }, sessionId)
  return waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => Math.abs((value?.artifact?.top ?? Number.POSITIVE_INFINITY) - desiredTop) <= 2,
    `artifact positioned ${desiredTop}px below the viewport top`,
  )
}

async function positionDeepInBuildPath(client, sessionId) {
  const { result } = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const artifact=document.getElementById('final-result');
      if (!artifact) return null;
      const artifactBottom=window.scrollY + artifact.getBoundingClientRect().bottom;
      const maxScroll=Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const target=Math.min(maxScroll, Math.ceil(artifactBottom + window.innerHeight * 0.75));
      window.scrollTo(0, target);
      return target;
    })()`,
    returnByValue: true,
  }, sessionId)
  const target = result.value
  if (!Number.isFinite(target) || target <= 0) {
    throw new Error('Could not calculate a deep build-path scroll position.')
  }
  return waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => Math.abs((value?.scrollY ?? Number.POSITIVE_INFINITY) - target) <= 1,
    'deep build-path scroll position',
  )
}

async function clickVisibleControl(client, sessionId, selector, label) {
  const pointExpression = `(async () => {
      const element=document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      const first=element.getBoundingClientRect();
      await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const rect=element.getBoundingClientRect();
      const x=rect.left+rect.width/2;
      const y=rect.top+rect.height/2;
      const hit=document.elementFromPoint(x,y);
      return {
        x,
        y,
        visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight,
        stable: Math.abs(first.x-rect.x) <= 0.5 && Math.abs(first.y-rect.y) <= 0.5 &&
          Math.abs(first.width-rect.width) <= 0.5 && Math.abs(first.height-rect.height) <= 0.5,
        hit: Boolean(hit && (hit === element || element.contains(hit))),
      };
    })()`
  let point = await waitForValue(
    client,
    sessionId,
    pointExpression,
    (value) => value?.visible && value.stable && value.hit,
    `${label} stable pointer target`,
  )

  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: point.x,
    y: point.y,
  }, sessionId)
  point = await waitForValue(
    client,
    sessionId,
    pointExpression,
    (value) => value?.visible && value.stable && value.hit,
    `${label} pointer target after hover`,
  )
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  }, sessionId)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  }, sessionId)
}

async function settledComparisonSnapshot(client, sessionId, settleMs = 1_800) {
  await withTimeout(
    'comparison settle delay',
    settleMs + CDP_COMMAND_TIMEOUT_MS,
    () => client.send('Runtime.evaluate', {
      expression: `new Promise((resolve)=>setTimeout(resolve, ${settleMs}))`,
      awaitPromise: true,
    }, sessionId),
  )
  const { result } = await withTimeout(
    'comparison settled snapshot',
    CDP_COMMAND_TIMEOUT_MS,
    () => client.send('Runtime.evaluate', {
      expression: COMPARISON_SNAPSHOT_EXPRESSION,
      returnByValue: true,
    }, sessionId),
  )
  return result.value
}

async function verifyComparisonPreviewFlow(client, sessionId, baseUrl, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  }, sessionId)

  await navigate(client, sessionId, `${baseUrl}/booking-flow-handoff-simulator-demo`)
  const compareHref = await waitForValue(
    client,
    sessionId,
    `document.querySelector('[data-model-variant-compare]')?.href ?? ''`,
    Boolean,
    `${viewport.label} model comparison link`,
  )
  await navigate(client, sessionId, `${compareHref}#final-result`)
  await waitForValue(
    client,
    sessionId,
    `Boolean(document.querySelector('[data-model-variant-comparison-panel]'))`,
    Boolean,
    `${viewport.label} model comparison panel`,
  )

  const initialControls = await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => {
      const currentRunId = value?.cards?.find((card) => card.current)?.runId
      return (
        value?.cards?.length === 2 &&
        value.cards.filter((card) => card.current).length === 1 &&
        value.cards.filter((card) => card.href).length === 1 &&
        Boolean(value.artifact) &&
        Boolean(value.frame) &&
        value.artifactReady &&
        value.destinationHydrated &&
        value.controlsHydrated &&
        value.selectorActiveId === currentRunId &&
        value.queryRun === currentRunId &&
        value.artifactPath === BOOKING_ARTIFACT_BY_RUN[currentRunId]
      )
    },
    `${viewport.label} truthful comparison preview controls`,
  )
  const initialCardIds = initialControls.cards.map((card) => card.runId)
  const initialCurrentId = initialControls.cards.find((card) => card.current)?.runId
  const switchCard = initialControls.cards.find((card) => !card.current)
  if (!initialCurrentId || !switchCard?.runId || !switchCard.href) {
    throw new Error(`${viewport.label} comparison did not expose one current run and one destination run.`)
  }

  if (viewport.checkPageTop) {
    await client.send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' }, sessionId)
    const pageTopInitial = await waitForValue(
      client,
      sessionId,
      COMPARISON_SNAPSHOT_EXPRESSION,
      (value) => (
        value?.scrollY === 0 &&
        value.artifact?.top > 2 &&
        value.frame?.top > value.artifact.top &&
        (
          !viewport.requirePartiallyVisibleArtifact ||
          (value.artifact.top < viewport.height && value.frame.top < viewport.height)
        )
      ),
      `${viewport.label} artifact geometry at page top`,
    )

    if (viewport.realPageTopClick) {
      await clickVisibleControl(
        client,
        sessionId,
        '[data-model-variant-preview-link]',
        `${viewport.label} inactive comparison control`,
      )
    } else {
      await client.send('Runtime.evaluate', {
        expression: `document.querySelector('[data-model-variant-preview-link]')?.click()`,
      }, sessionId)
    }
    await waitForValue(
      client,
      sessionId,
      COMPARISON_SNAPSHOT_EXPRESSION,
      (value) => (
        value?.cards?.find((card) => card.current)?.runId === switchCard.runId &&
        value.selectorActiveId === switchCard.runId &&
        value.queryRun === switchCard.runId &&
        value.queryCompare === initialCurrentId &&
        value.packageId !== pageTopInitial.packageId &&
        value.artifactPath === BOOKING_ARTIFACT_BY_RUN[switchCard.runId] &&
        value.artifactReady
      ),
      `${viewport.label} page-top preview switch`,
    )
    const pageTopSwitched = await settledComparisonSnapshot(client, sessionId)
    assertComparisonCardOrder(`${viewport.label} page-top switch`, initialCardIds, pageTopSwitched)
    assertComparisonGeometry(`${viewport.label} page-top switch`, pageTopInitial, pageTopSwitched)
    assertComparisonScrollPosition(`${viewport.label} page-top switch`, pageTopInitial, pageTopSwitched)
    if (pageTopSwitched.historyLength !== pageTopInitial.historyLength + 1) {
      throw new Error(`${viewport.label} page-top switch did not add exactly one history entry.`)
    }

    if (viewport.realPageTopClick) {
      await clickVisibleControl(
        client,
        sessionId,
        '[data-model-variant-preview-link]',
        `${viewport.label} return comparison control`,
      )
    } else {
      await client.send('Runtime.evaluate', {
        expression: `document.querySelector('[data-model-variant-preview-link]')?.click()`,
      }, sessionId)
    }
    await waitForValue(
      client,
      sessionId,
      COMPARISON_SNAPSHOT_EXPRESSION,
      (value) => (
        value?.cards?.find((card) => card.current)?.runId === initialCurrentId &&
        value.selectorActiveId === initialCurrentId &&
        value.queryRun === initialCurrentId &&
        value.queryCompare === switchCard.runId &&
        value.packageId === pageTopInitial.packageId &&
        value.artifactPath === BOOKING_ARTIFACT_BY_RUN[initialCurrentId] &&
        value.artifactReady
      ),
      `${viewport.label} page-top preview return`,
    )
    const pageTopReturned = await settledComparisonSnapshot(client, sessionId)
    assertComparisonCardOrder(`${viewport.label} page-top return`, initialCardIds, pageTopReturned)
    assertComparisonGeometry(`${viewport.label} page-top return`, pageTopInitial, pageTopReturned)
    assertComparisonScrollPosition(`${viewport.label} page-top return`, pageTopInitial, pageTopReturned)
    if (pageTopReturned.historyLength !== pageTopInitial.historyLength + 2) {
      throw new Error(`${viewport.label} page-top return did not add exactly one additional history entry.`)
    }
  }

  const positionedForCurrentAction = await positionArtifact(client, sessionId, 200)
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-model-variant-preview-current]')?.click()`,
  }, sessionId)
  const currentAction = await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => Math.abs(value?.artifact?.top ?? Number.POSITIVE_INFINITY) <= 2,
    `${viewport.label} current preview reveal`,
  )
  const expectedCurrentActionHistoryLength = positionedForCurrentAction.hash === '#final-result'
    ? positionedForCurrentAction.historyLength
    : positionedForCurrentAction.historyLength + 1
  if (
    currentAction.hash !== '#final-result' ||
    currentAction.historyLength !== expectedCurrentActionHistoryLength
  ) {
    throw new Error(`${viewport.label} current preview action did not reveal the artifact predictably.`)
  }
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-model-variant-preview-current]')?.click()`,
  }, sessionId)
  const repeatedCurrentAction = await settledComparisonSnapshot(client, sessionId)
  if (
    repeatedCurrentAction.url !== currentAction.url ||
    repeatedCurrentAction.historyLength !== currentAction.historyLength
  ) {
    throw new Error(`${viewport.label} repeated current preview action mutated URL history.`)
  }

  await client.send('Runtime.evaluate', { expression: 'history.back()' }, sessionId)
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.hash === positionedForCurrentAction.hash &&
      Math.abs((value.scrollY ?? Number.POSITIVE_INFINITY) - positionedForCurrentAction.scrollY) <= 1
    ),
    `${viewport.label} hash-only Back restoration`,
  )
  const currentActionBack = await settledComparisonSnapshot(client, sessionId)
  assertComparisonGeometry(`${viewport.label} hash-only Back`, positionedForCurrentAction, currentActionBack)
  assertComparisonScrollPosition(`${viewport.label} hash-only Back`, positionedForCurrentAction, currentActionBack)
  if (currentActionBack.historyLength !== currentAction.historyLength) {
    throw new Error(`${viewport.label} hash-only Back changed history length.`)
  }

  await client.send('Runtime.evaluate', { expression: 'history.forward()' }, sessionId)
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.hash === '#final-result' &&
      Math.abs((value.scrollY ?? Number.POSITIVE_INFINITY) - currentAction.scrollY) <= 1
    ),
    `${viewport.label} hash-only Forward restoration`,
  )
  const currentActionForward = await settledComparisonSnapshot(client, sessionId)
  assertComparisonGeometry(`${viewport.label} hash-only Forward`, currentAction, currentActionForward)
  assertComparisonScrollPosition(`${viewport.label} hash-only Forward`, currentAction, currentActionForward)
  if (currentActionForward.historyLength !== currentAction.historyLength) {
    throw new Error(`${viewport.label} hash-only Forward changed history length.`)
  }

  const comparisonInitial = await positionArtifact(client, sessionId, 200)
  if (comparisonInitial.overflow > 1) {
    throw new Error(`${viewport.label} comparison overflowed horizontally by ${comparisonInitial.overflow}px.`)
  }
  assertComparisonTruth(`${viewport.label} initial comparison`, comparisonInitial, {
    currentRunId: initialCurrentId,
    selectorActiveId: initialCurrentId,
    queryRun: initialCurrentId,
    queryCompare: switchCard.runId,
    packageId: comparisonInitial.packageId,
    artifactPath: comparisonInitial.artifactPath,
  })

  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-model-variant-preview-link]')?.click()`,
  }, sessionId)
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.cards?.find((card) => card.current)?.runId === switchCard.runId &&
      value.cards.filter((card) => card.href).length === 1 &&
      value.hash === '' &&
      value.selectorActiveId === switchCard.runId &&
      value.queryRun === switchCard.runId &&
      value.queryCompare === initialCurrentId &&
      value.packageId !== comparisonInitial.packageId &&
      value.artifactPath !== comparisonInitial.artifactPath &&
      value.artifactReady &&
      Math.abs((value.artifact?.top ?? Number.POSITIVE_INFINITY) - comparisonInitial.artifact.top) <= 2
    ),
    `${viewport.label} switched preview at preserved artifact position`,
  )
  const comparisonSwitched = await settledComparisonSnapshot(client, sessionId)
  assertComparisonCardOrder(`${viewport.label} preview switch`, initialCardIds, comparisonSwitched)
  assertComparisonGeometry(`${viewport.label} preview switch`, comparisonInitial, comparisonSwitched)
  assertComparisonScrollPosition(`${viewport.label} preview switch`, comparisonInitial, comparisonSwitched)
  if (comparisonSwitched.historyLength !== comparisonInitial.historyLength + 1) {
    throw new Error(`${viewport.label} preview switch did not add exactly one history entry.`)
  }
  assertComparisonTruth(`${viewport.label} preview switch`, comparisonSwitched, {
    currentRunId: switchCard.runId,
    selectorActiveId: switchCard.runId,
    queryRun: switchCard.runId,
    queryCompare: initialCurrentId,
    packageId: comparisonSwitched.packageId,
    artifactPath: comparisonSwitched.artifactPath,
  })

  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-model-variant-preview-link]')?.click()`,
  }, sessionId)
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.cards?.find((card) => card.current)?.runId === initialCurrentId &&
      value.cards.filter((card) => card.href).length === 1 &&
      value.hash === '' &&
      value.selectorActiveId === initialCurrentId &&
      value.queryRun === initialCurrentId &&
      value.queryCompare === switchCard.runId &&
      value.packageId === comparisonInitial.packageId &&
      value.artifactPath === comparisonInitial.artifactPath &&
      value.artifactReady &&
      Math.abs((value.artifact?.top ?? Number.POSITIVE_INFINITY) - comparisonInitial.artifact.top) <= 2
    ),
    `${viewport.label} returned preview at preserved artifact position`,
  )
  const comparisonReturned = await settledComparisonSnapshot(client, sessionId)
  assertComparisonCardOrder(`${viewport.label} preview return`, initialCardIds, comparisonReturned)
  assertComparisonGeometry(`${viewport.label} preview return`, comparisonInitial, comparisonReturned)
  assertComparisonScrollPosition(`${viewport.label} preview return`, comparisonInitial, comparisonReturned)
  if (comparisonReturned.historyLength !== comparisonInitial.historyLength + 2) {
    throw new Error(`${viewport.label} preview return did not add exactly one additional history entry.`)
  }
  assertComparisonTruth(`${viewport.label} preview return`, comparisonReturned, {
    currentRunId: initialCurrentId,
    selectorActiveId: initialCurrentId,
    queryRun: initialCurrentId,
    queryCompare: switchCard.runId,
    packageId: comparisonInitial.packageId,
    artifactPath: comparisonInitial.artifactPath,
  })

  await client.send('Runtime.evaluate', { expression: 'history.back()' }, sessionId)
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.cards?.find((card) => card.current)?.runId === switchCard.runId &&
      value.selectorActiveId === switchCard.runId &&
      value.queryRun === switchCard.runId &&
      value.queryCompare === initialCurrentId &&
      value.packageId === comparisonSwitched.packageId &&
      value.artifactPath === comparisonSwitched.artifactPath &&
      value.artifactReady &&
      Math.abs((value.artifact?.top ?? Number.POSITIVE_INFINITY) - comparisonInitial.artifact.top) <= 2
    ),
    `${viewport.label} browser Back comparison preview`,
  )
  const comparisonBack = await settledComparisonSnapshot(client, sessionId)
  assertComparisonCardOrder(`${viewport.label} browser Back`, initialCardIds, comparisonBack)
  assertComparisonGeometry(`${viewport.label} browser Back`, comparisonInitial, comparisonBack)
  assertComparisonScrollPosition(`${viewport.label} browser Back`, comparisonInitial, comparisonBack)
  if (comparisonBack.historyLength !== comparisonReturned.historyLength) {
    throw new Error(`${viewport.label} browser Back changed the history length.`)
  }
  assertComparisonTruth(`${viewport.label} browser Back`, comparisonBack, {
    currentRunId: switchCard.runId,
    selectorActiveId: switchCard.runId,
    queryRun: switchCard.runId,
    queryCompare: initialCurrentId,
    packageId: comparisonSwitched.packageId,
    artifactPath: comparisonSwitched.artifactPath,
  })

  await client.send('Runtime.evaluate', { expression: 'history.forward()' }, sessionId)
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.cards?.find((card) => card.current)?.runId === initialCurrentId &&
      value.selectorActiveId === initialCurrentId &&
      value.queryRun === initialCurrentId &&
      value.queryCompare === switchCard.runId &&
      value.packageId === comparisonInitial.packageId &&
      value.artifactPath === comparisonInitial.artifactPath &&
      value.artifactReady &&
      Math.abs((value.artifact?.top ?? Number.POSITIVE_INFINITY) - comparisonInitial.artifact.top) <= 2
    ),
    `${viewport.label} browser Forward comparison preview`,
  )
  const comparisonForward = await settledComparisonSnapshot(client, sessionId)
  assertComparisonCardOrder(`${viewport.label} browser Forward`, initialCardIds, comparisonForward)
  assertComparisonGeometry(`${viewport.label} browser Forward`, comparisonInitial, comparisonForward)
  assertComparisonScrollPosition(`${viewport.label} browser Forward`, comparisonInitial, comparisonForward)
  if (comparisonForward.historyLength !== comparisonReturned.historyLength) {
    throw new Error(`${viewport.label} browser Forward changed the history length.`)
  }
  assertComparisonTruth(`${viewport.label} browser Forward`, comparisonForward, {
    currentRunId: initialCurrentId,
    selectorActiveId: initialCurrentId,
    queryRun: initialCurrentId,
    queryCompare: switchCard.runId,
    packageId: comparisonInitial.packageId,
    artifactPath: comparisonInitial.artifactPath,
  })

  const deepInitial = await positionDeepInBuildPath(client, sessionId)
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-model-variant-preview-link]')?.click()`,
  }, sessionId)
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.cards?.find((card) => card.current)?.runId === switchCard.runId &&
      value.queryRun === switchCard.runId &&
      value.queryCompare === initialCurrentId &&
      value.packageId === comparisonSwitched.packageId &&
      value.artifactPath === comparisonSwitched.artifactPath &&
      value.artifactReady
    ),
    `${viewport.label} deep build-path preview switch`,
  )
  const deepSwitched = await settledComparisonSnapshot(client, sessionId)
  assertComparisonCardOrder(`${viewport.label} deep build-path switch`, initialCardIds, deepSwitched)
  assertComparisonGeometry(`${viewport.label} deep build-path switch`, deepInitial, deepSwitched)
  assertComparisonScrollPosition(`${viewport.label} deep build-path switch`, deepInitial, deepSwitched)
  if (deepSwitched.historyLength !== deepInitial.historyLength + 1) {
    throw new Error(`${viewport.label} deep build-path switch did not add exactly one history entry.`)
  }
  assertComparisonTruth(`${viewport.label} deep build-path switch`, deepSwitched, {
    currentRunId: switchCard.runId,
    selectorActiveId: switchCard.runId,
    queryRun: switchCard.runId,
    queryCompare: initialCurrentId,
    packageId: comparisonSwitched.packageId,
    artifactPath: comparisonSwitched.artifactPath,
  })

  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-model-variant-preview-link]')?.click()`,
  }, sessionId)
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.cards?.find((card) => card.current)?.runId === initialCurrentId &&
      value.queryRun === initialCurrentId &&
      value.queryCompare === switchCard.runId &&
      value.packageId === comparisonInitial.packageId &&
      value.artifactPath === comparisonInitial.artifactPath &&
      value.artifactReady
    ),
    `${viewport.label} deep build-path preview return`,
  )
  const deepReturned = await settledComparisonSnapshot(client, sessionId)
  assertComparisonCardOrder(`${viewport.label} deep build-path return`, initialCardIds, deepReturned)
  assertComparisonGeometry(`${viewport.label} deep build-path return`, deepInitial, deepReturned)
  assertComparisonScrollPosition(`${viewport.label} deep build-path return`, deepInitial, deepReturned)
  if (deepReturned.historyLength !== deepInitial.historyLength + 2) {
    throw new Error(`${viewport.label} deep build-path return did not add exactly one additional history entry.`)
  }
  assertComparisonTruth(`${viewport.label} deep build-path return`, deepReturned, {
    currentRunId: initialCurrentId,
    selectorActiveId: initialCurrentId,
    queryRun: initialCurrentId,
    queryCompare: switchCard.runId,
    packageId: comparisonInitial.packageId,
    artifactPath: comparisonInitial.artifactPath,
  })

  await client.send('Runtime.evaluate', { expression: 'history.back()' }, sessionId)
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.cards?.find((card) => card.current)?.runId === switchCard.runId &&
      value.queryRun === switchCard.runId &&
      value.queryCompare === initialCurrentId &&
      value.packageId === comparisonSwitched.packageId &&
      value.artifactReady
    ),
    `${viewport.label} deep build-path browser Back`,
  )
  const deepBack = await settledComparisonSnapshot(client, sessionId)
  assertComparisonCardOrder(`${viewport.label} deep build-path browser Back`, initialCardIds, deepBack)
  assertComparisonGeometry(`${viewport.label} deep build-path browser Back`, deepInitial, deepBack)
  assertComparisonScrollPosition(`${viewport.label} deep build-path browser Back`, deepInitial, deepBack)
  if (deepBack.historyLength !== deepReturned.historyLength) {
    throw new Error(`${viewport.label} deep build-path browser Back changed the history length.`)
  }

  await client.send('Runtime.evaluate', { expression: 'history.forward()' }, sessionId)
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.cards?.find((card) => card.current)?.runId === initialCurrentId &&
      value.queryRun === initialCurrentId &&
      value.queryCompare === switchCard.runId &&
      value.packageId === comparisonInitial.packageId &&
      value.artifactReady
    ),
    `${viewport.label} deep build-path browser Forward`,
  )
  const deepForward = await settledComparisonSnapshot(client, sessionId)
  assertComparisonCardOrder(`${viewport.label} deep build-path browser Forward`, initialCardIds, deepForward)
  assertComparisonGeometry(`${viewport.label} deep build-path browser Forward`, deepInitial, deepForward)
  assertComparisonScrollPosition(`${viewport.label} deep build-path browser Forward`, deepInitial, deepForward)
  if (deepForward.historyLength !== deepReturned.historyLength) {
    throw new Error(`${viewport.label} deep build-path browser Forward changed the history length.`)
  }

  if (viewport.checkInterruptedRestoration) {
    await navigate(client, sessionId, `${baseUrl}/booking-flow-handoff-simulator-demo`)
    const interruptedRoute = new URL(initialControls.url)
    interruptedRoute.hash = ''
    await navigate(client, sessionId, interruptedRoute.href)
    await waitForValue(
      client,
      sessionId,
      COMPARISON_SNAPSHOT_EXPRESSION,
      (value) => (
        value?.cards?.find((card) => card.current)?.runId === initialCurrentId &&
        value.packageId === comparisonInitial.packageId &&
        value.artifactReady &&
        value.controlsHydrated
      ),
      `${viewport.label} clean interrupted-restoration source`,
    )
    await waitForValue(
      client,
      sessionId,
      `(() => {
        const link=document.querySelector('[data-model-variant-preview-link]');
        link?.focus({preventScroll:true});
        return document.activeElement === link;
      })()`,
      Boolean,
      `${viewport.label} focused interrupted-restoration control`,
    )
    const interruptedInitial = await waitForValue(
      client,
      sessionId,
      `(() => {
        const maxScrollY=Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo(0, maxScrollY);
        return ${COMPARISON_SNAPSHOT_EXPRESSION};
      })()`,
      (value) => value?.scrollY > 1_500 && Math.abs(value.scrollY - value.maxScrollY) <= 1,
      `${viewport.label} interrupted-restoration source position`,
    )
    await client.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
    }, sessionId)
    await client.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
    }, sessionId)
    const afterInterruptedActivation = await waitForValue(
      client,
      sessionId,
      COMPARISON_SNAPSHOT_EXPRESSION,
      (value) => value?.historyLength === interruptedInitial.historyLength + 1,
      `${viewport.label} interrupted-restoration key activation history entry`,
    )
    if (afterInterruptedActivation.queryRun !== switchCard.runId) {
      const navigationHistory = await client.send('Page.getNavigationHistory', {}, sessionId)
      throw new Error(
        `${viewport.label} interrupted key activation landed on ${afterInterruptedActivation.url}; ` +
        `navigation history ${JSON.stringify(navigationHistory)}.`,
      )
    }
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 10,
      y: 10,
      deltaX: 0,
      deltaY: -1,
    }, sessionId)
    await client.send('Runtime.evaluate', { expression: 'window.scrollTo(0, 1000)' }, sessionId)
    await waitForValue(
      client,
      sessionId,
      COMPARISON_SNAPSHOT_EXPRESSION,
      (value) => (
        value?.cards?.find((card) => card.current)?.runId === switchCard.runId &&
        value.packageId === comparisonSwitched.packageId &&
        value.artifactReady &&
        Math.abs((value.scrollY ?? Number.POSITIVE_INFINITY) - 1000) <= 1
      ),
      `${viewport.label} user-chosen interrupted-restoration position`,
    )
    const interruptedDestination = await settledComparisonSnapshot(client, sessionId)
    if (Math.abs(interruptedDestination.scrollY - 1000) > 1) {
      throw new Error(`${viewport.label} interrupted restoration overrode the user's scroll position.`)
    }
    if (interruptedDestination.historyLength !== interruptedInitial.historyLength + 1) {
      throw new Error(`${viewport.label} interrupted restoration did not add exactly one history entry.`)
    }

    await client.send('Runtime.evaluate', { expression: 'history.back()' }, sessionId)
    await waitForValue(
      client,
      sessionId,
      COMPARISON_SNAPSHOT_EXPRESSION,
      (value) => (
        value?.cards?.find((card) => card.current)?.runId === initialCurrentId &&
        value.packageId === comparisonInitial.packageId &&
        value.artifactReady &&
        Math.abs((value.scrollY ?? Number.POSITIVE_INFINITY) - interruptedInitial.scrollY) <= 1
      ),
      `${viewport.label} interrupted-restoration browser Back`,
    )
    const interruptedBack = await settledComparisonSnapshot(client, sessionId)
    assertComparisonScrollPosition(
      `${viewport.label} interrupted-restoration browser Back`,
      interruptedInitial,
      interruptedBack,
    )
    if (interruptedBack.historyLength !== interruptedDestination.historyLength) {
      throw new Error(`${viewport.label} interrupted-restoration browser Back changed history length.`)
    }

    await client.send('Runtime.evaluate', { expression: 'history.forward()' }, sessionId)
    await waitForValue(
      client,
      sessionId,
      COMPARISON_SNAPSHOT_EXPRESSION,
      (value) => (
        value?.cards?.find((card) => card.current)?.runId === switchCard.runId &&
        value.packageId === comparisonSwitched.packageId &&
        value.artifactReady &&
        Math.abs((value.scrollY ?? Number.POSITIVE_INFINITY) - interruptedDestination.scrollY) <= 1
      ),
      `${viewport.label} interrupted-restoration browser Forward`,
    )
    const interruptedForward = await settledComparisonSnapshot(client, sessionId)
    assertComparisonScrollPosition(
      `${viewport.label} interrupted-restoration browser Forward`,
      interruptedDestination,
      interruptedForward,
    )
    if (interruptedForward.historyLength !== interruptedDestination.historyLength) {
      throw new Error(`${viewport.label} interrupted-restoration browser Forward changed history length.`)
    }
  }
}

async function main() {
  const baseUrl = parseArgs(process.argv.slice(2))
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found for the model-variant browser guard.')

  const profile = mkdtempSync(path.join(tmpdir(), 'pathforge-model-variant-browser-'))
  const child = spawn(executable, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  let client
  let targetId
  try {
    const bootstrap = await runPhase('Chrome and CDP bootstrap', CHROME_BOOT_TIMEOUT_MS, async () => {
      client = new CdpClient(await waitForWebSocketUrl(child))
      await client.ready()
      const createdTarget = await client.send('Target.createTarget', { url: 'about:blank' })
      const attachedTarget = await client.send('Target.attachToTarget', {
        targetId: createdTarget.targetId,
        flatten: true,
      })
      return {
        targetId: createdTarget.targetId,
        sessionId: attachedTarget.sessionId,
      }
    })
    targetId = bootstrap.targetId
    const { sessionId } = bootstrap
    const consoleErrors = []
    const listener = (message) => {
      if (message.sessionId !== sessionId) return
      if (message.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(message.params.exceptionDetails?.text ?? 'Uncaught runtime exception')
      }
      if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') {
        if (isExpectedLocalActivationFailure(baseUrl, message.params.entry)) return
        if (isExpectedLocalFaviconFailure(baseUrl, message.params.entry)) return
        consoleErrors.push([
          message.params.entry.text,
          message.params.entry.url ? `at ${message.params.entry.url}` : null,
        ].filter(Boolean).join(' '))
      }
    }
    client.listeners.add(listener)

    try {
      await runPhase('overall browser assertion suite', OVERALL_ASSERTION_TIMEOUT_MS, async () => {
        await runPhase('CDP instrumentation', CHROME_BOOT_TIMEOUT_MS, () => Promise.all([
          client.send('Page.enable', {}, sessionId),
          client.send('Runtime.enable', {}, sessionId),
          client.send('Log.enable', {}, sessionId),
          client.send('Emulation.setDeviceMetricsOverride', {
            width: 1440,
            height: 1000,
            deviceScaleFactor: 1,
            mobile: false,
          }, sessionId),
        ]))

        await runPhase('model selector and rapid artifact switch', SELECTOR_PHASE_TIMEOUT_MS, async () => {
          const route = `${baseUrl}/t-shirt-print-alignment-press-game-demo`
          await navigate(client, sessionId, route)
          const selectorSnapshotExpression = `(() => {
        const rows=[...document.querySelectorAll('[data-model-variant-run]')];
        return {
          ids: rows.map((row)=>row.dataset.modelVariantRun),
          activeId: rows.find((row)=>row.querySelector('[aria-current="page"]'))?.dataset.modelVariantRun ?? '',
          viewHref: rows.find((row)=>!row.querySelector('[aria-current="page"]'))?.querySelector('[data-model-variant-view]')?.href ?? '',
        };
      })()`
          const initial = await waitForValue(
            client,
            sessionId,
            selectorSnapshotExpression,
            (value) => value?.ids?.length === 3 && Boolean(value.viewHref),
            'three model selector rows',
          )
          if (new Set(initial.ids).size !== initial.ids.length) {
            throw new Error('Model selector rendered duplicate run identities.')
          }

          await navigate(client, sessionId, initial.viewHref)
          const afterModelChange = await waitForValue(
            client,
            sessionId,
            selectorSnapshotExpression,
            (value) => value?.activeId && value.activeId !== initial.activeId,
            'changed active model',
          )
          if (JSON.stringify(afterModelChange.ids) !== JSON.stringify(initial.ids)) {
            throw new Error('Changing the selected model reordered the selector.')
          }

          const packageIds = await waitForValue(
            client,
            sessionId,
            `[...document.querySelectorAll('[data-artifact-package-select]')].map((button)=>button.dataset.artifactPackageSelect)`,
            (value) => Array.isArray(value) && value.length >= 2,
            'multiple selectable artifact packages',
          )
          const rapidSequence = [packageIds[0], packageIds[1], packageIds.at(-1)]
          const expectedPackageId = rapidSequence.at(-1)
          await client.send('Runtime.evaluate', {
            expression: `(() => {
          for (const id of ${JSON.stringify(rapidSequence)}) {
            document.querySelector('[data-artifact-package-select="'+CSS.escape(id)+'"]')?.click();
          }
        })()`,
          }, sessionId)
          const mountedPackage = await waitForValue(
            client,
            sessionId,
            `(() => {
          const frame=document.querySelector('[data-artifact-package-id]');
          return {
            id: frame?.dataset.artifactPackageId ?? '',
            path: frame?.dataset.artifactPath ?? '',
            loading: Boolean(document.querySelector('[data-artifact-loading]')),
            error: document.querySelector('[data-artifact-load-error]')?.getAttribute('data-artifact-load-error') ?? '',
            iframe: Boolean(frame?.querySelector('iframe[srcdoc]')),
            sandbox: frame?.querySelector('iframe')?.getAttribute('sandbox') ?? '',
          };
        })()`,
            (value) => value?.id === expectedPackageId && !value.loading && value.iframe,
            'final rapidly selected artifact',
          )
          if (mountedPackage.error) throw new Error(`Artifact switch rendered ${mountedPackage.error}.`)
          if (!mountedPackage.path.startsWith('/artifacts/')) {
            throw new Error(`Artifact switch mounted an invalid path: ${mountedPackage.path}.`)
          }
          if (mountedPackage.sandbox !== 'allow-scripts allow-pointer-lock') {
            throw new Error(`Artifact frame has unexpected sandbox tokens: ${mountedPackage.sandbox}.`)
          }
        })

        await runPhase('desktop comparison flow', COMPARISON_PHASE_TIMEOUT_MS, () => (
          verifyComparisonPreviewFlow(client, sessionId, baseUrl, {
            label: 'desktop',
            width: 1440,
            height: 1000,
            mobile: false,
            checkPageTop: true,
            realPageTopClick: true,
            requirePartiallyVisibleArtifact: true,
          })
        ))
        await runPhase('390px comparison flow', COMPARISON_PHASE_TIMEOUT_MS, () => (
          verifyComparisonPreviewFlow(client, sessionId, baseUrl, {
            label: '390px',
            width: 390,
            height: 844,
            mobile: true,
            checkPageTop: true,
            checkInterruptedRestoration: true,
          })
        ))

        if (consoleErrors.length > 0) {
          throw new Error(`Model-variant browser flow logged errors: ${[...new Set(consoleErrors)].join(' | ')}`)
        }
      })
    } finally {
      client.listeners.delete(listener)
      if (targetId) {
        try {
          await withTimeout(
            'CDP target cleanup',
            CDP_COMMAND_TIMEOUT_MS,
            () => client.send('Target.closeTarget', { targetId }),
          )
        } catch (error) {
          process.stderr.write(
            `[model-variant-browser] CDP target cleanup warning: ${errorMessage(error)}\n`,
          )
        }
      }
    }
  } finally {
    try {
      client?.close()
    } finally {
      try {
        await stopChrome(child)
      } finally {
        rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
      }
    }
  }

  console.log('Model selector, comparison, and artifact-switch browser guard passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
