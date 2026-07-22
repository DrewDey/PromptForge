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

const CALMING_SLEEP_RUNS = {
  claude: {
    id: '5a9ad307-177d-4939-b3ed-cabecb236deb',
    artifactPath: '/artifacts/sleep-sound-mixer-claude-fable-5-high-final.html',
  },
  chatgpt: {
    id: 'cf73efd5-2fb6-48fe-a9fd-a1a0df336d18',
    artifactPath: '/artifacts/sleep-sound-mixer-chatgpt-56-luna-extra-high.html',
  },
  gemini: {
    id: '7d9524c0ede185b2',
    artifactPath: '/artifacts/sleep-sound-mixer-gemini-31-pro-final.html',
  },
}

const PROTECTED_VIEWER_ARTIFACTS = {
  tripPacking: {
    artifactPath: '/artifacts/trip-packing-gemini-pro.html',
    title: 'Trip Packing Planner final',
    provider: 'Gemini',
  },
  pomodoro: {
    artifactPath: '/artifacts/pomodoro-focus-timer-gpt55-instant.html',
    title: 'Pomodoro Focus Timer final',
    provider: 'ChatGPT',
  },
  pocketRally: {
    artifactPath: '/artifacts/pocket-rally-chatgpt.html',
    title: 'Pocket Rally Time Trial final',
    provider: 'ChatGPT',
  },
  airlock: {
    artifactPath: '/artifacts/airlock-zero-gpt-56-sol-max-step-2.html',
    title: 'Airlock Zero: Reactor Run',
    provider: 'ChatGPT',
  },
}

const CDP_COMMAND_TIMEOUT_MS = 8_000
const CHROME_BOOT_TIMEOUT_MS = 15_000
const SELECTOR_PHASE_TIMEOUT_MS = 55_000
const COMPARISON_PHASE_TIMEOUT_MS = 75_000
const OVERALL_ASSERTION_TIMEOUT_MS = 300_000

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

function isExpectedLocalMissingArtifactFailure(baseUrl, entry) {
  if (!/\b404\b/.test(entry?.text ?? '') || !entry?.url) return false
  const base = new URL(baseUrl)
  if (base.hostname !== 'localhost' && base.hostname !== '127.0.0.1') return false
  const request = new URL(entry.url, base)
  return (
    request.origin === base.origin &&
    request.pathname === '/qa/artifact-height-guards/missing'
  )
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

async function waitForContextValue(
  client,
  sessionId,
  contextId,
  expression,
  predicate,
  label,
  timeoutMs = 12_000,
) {
  const deadline = Date.now() + timeoutMs
  let lastValue
  while (Date.now() < deadline) {
    const remainingMs = Math.max(1, deadline - Date.now())
    const params = {
      expression,
      returnByValue: true,
      awaitPromise: true,
    }
    if (contextId !== undefined) params.contextId = contextId
    const evaluation = await withTimeout(
      `${label} CDP evaluation`,
      Math.min(CDP_COMMAND_TIMEOUT_MS, remainingMs),
      () => client.send('Runtime.evaluate', params, sessionId),
    )
    if (evaluation.exceptionDetails) {
      throw new Error(
        `${label} raised ${evaluation.exceptionDetails.text ?? 'an evaluation exception'}.`,
      )
    }
    lastValue = evaluation.result.value
    if (predicate(lastValue)) return lastValue
    await new Promise((resolve) => setTimeout(resolve, 75))
  }
  throw new Error(`${label} timed out; last value was ${JSON.stringify(lastValue)}.`)
}

async function evaluateInContext(client, sessionId, contextId, expression, label) {
  const params = {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }
  if (contextId !== undefined) params.contextId = contextId
  const evaluation = await client.send('Runtime.evaluate', params, sessionId)
  if (evaluation.exceptionDetails) {
    throw new Error(`${label} raised ${evaluation.exceptionDetails.text ?? 'an evaluation exception'}.`)
  }
  return evaluation.result.value
}

function deepestFrame(frameTree, depth = 0) {
  let deepest = { frame: frameTree.frame, depth }
  for (const child of frameTree.childFrames ?? []) {
    const candidate = deepestFrame(child, depth + 1)
    if (candidate.depth > deepest.depth) deepest = candidate
  }
  return deepest
}

async function artifactDocumentContext(client, sessionId, label, requiredSelector) {
  const deadline = Date.now() + 12_000
  let lastDepth = 0
  let lastIframeTargetCount = 0
  while (Date.now() < deadline) {
    const { frameTree } = await client.send('Page.getFrameTree', {}, sessionId)
    const candidate = deepestFrame(frameTree)
    lastDepth = candidate.depth
    if (candidate.depth >= 2) {
      const { executionContextId } = await client.send('Page.createIsolatedWorld', {
        frameId: candidate.frame.id,
        worldName: `pathforge-artifact-browser-${Date.now()}`,
      }, sessionId)
      await waitForContextValue(
        client,
        sessionId,
        executionContextId,
        `document.readyState === 'complete' && Boolean(document.querySelector(${JSON.stringify(requiredSelector)}))`,
        Boolean,
        `${label} inner artifact document`,
      )
      return { sessionId, contextId: executionContextId }
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
            worldName: `pathforge-inner-artifact-browser-${Date.now()}`,
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
        // The iframe target may be replaced while the protected document loads.
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
  throw new Error(
    `${label} did not expose its protected artifact document; frame depth ${lastDepth}, iframe targets ${lastIframeTargetCount}.`,
  )
}

async function navigateRaw(client, sessionId, url) {
  const loaded = client.waitFor('Page.loadEventFired', sessionId)
  await withTimeout(
    `navigation dispatch for ${url}`,
    CDP_COMMAND_TIMEOUT_MS,
    () => client.send('Page.navigate', { url }, sessionId),
  )
  await withTimeout(`page load for ${url}`, 15_000, () => loaded)
}

async function replaceRaw(client, sessionId, url) {
  const loaded = client.waitFor('Page.loadEventFired', sessionId)
  await withTimeout(
    `replacement navigation dispatch for ${url}`,
    CDP_COMMAND_TIMEOUT_MS,
    () => client.send('Runtime.evaluate', {
      expression: `location.replace(${JSON.stringify(url)})`,
    }, sessionId),
  )
  await withTimeout(`replacement page load for ${url}`, 15_000, () => loaded)
}

async function navigate(client, sessionId, url) {
  await navigateRaw(client, sessionId, url)
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
  const iframe=frame?.querySelector('iframe');
  const sourceRunPath=document.getElementById('source-run-path');
  const selectorRows=[...document.querySelectorAll('[data-model-variant-run]')];
  const params=new URLSearchParams(location.search);
  const artifactRect=artifact?.getBoundingClientRect();
  const frameRect=frame?.getBoundingClientRect();
  const iframeRect=iframe?.getBoundingClientRect();
  const sourceRunPathRect=sourceRunPath?.getBoundingClientRect();
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
      bottom: artifactRect.bottom,
      width: artifactRect.width,
      height: artifactRect.height,
    } : null,
    frame: frameRect ? {
      top: frameRect.top,
      bottom: frameRect.bottom,
      width: frameRect.width,
      height: frameRect.height,
    } : null,
    iframe: iframeRect ? {
      top: iframeRect.top,
      bottom: iframeRect.bottom,
      width: iframeRect.width,
      height: iframeRect.height,
      scrolling: iframe?.getAttribute('scrolling') ?? '',
    } : null,
    sourceRunPath: sourceRunPathRect ? {
      top: sourceRunPathRect.top,
      bottom: sourceRunPathRect.bottom,
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
    heightMode: frame?.dataset.artifactHeightMode ?? '',
    heightGuard: frame?.dataset.artifactHeightGuard ?? '',
    fitMode: frame?.dataset.artifactFitMode ?? '',
    fitScale: Number(frame?.dataset.artifactScale ?? Number.NaN),
    measuredHeight: Number(frame?.dataset.artifactMeasuredHeight ?? Number.NaN),
    measuredWidth: Number(frame?.dataset.artifactMeasuredWidth ?? Number.NaN),
    renderedHeight: Number(frame?.dataset.artifactRenderedHeight ?? Number.NaN),
    heightPending: frame?.dataset.artifactHeightPending === 'true',
    artifactReady: Boolean(frame?.querySelector('iframe[srcdoc]')),
    destinationHydrated: Boolean(
      artifact?.querySelector('[data-artifact-package-id] iframe[srcdoc], [data-artifact-load-error]')
    ),
    controlsHydrated: Boolean(
      document.querySelector('[data-model-variant-preview-link][data-model-variant-preview-hydrated="true"]')
    ),
    viewControlsHydrated: Boolean(
      document.querySelector('[data-model-variant-view][data-model-variant-view-hydrated="true"]')
    ),
    documentHeight: document.documentElement.scrollHeight,
  };
})()`

function assertComparisonGeometry(label, before, after) {
  for (const region of ['artifact', 'frame']) {
    for (const measurement of ['top', 'width']) {
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

function assertNear(label, actual, expected, tolerance = 2) {
  const delta = Math.abs(actual - expected)
  if (!Number.isFinite(delta) || delta > tolerance) {
    throw new Error(
      `${label} expected ${expected.toFixed(2)}, received ${Number.isFinite(actual) ? actual.toFixed(2) : 'an invalid value'}.`,
    )
  }
}

function assertNormalMeasuredArtifact(label, snapshot) {
  if (snapshot.heightMode !== 'measured-content' || snapshot.heightGuard !== 'none') {
    throw new Error(
      `${label} expected unguarded measured-content height, received ${snapshot.heightMode}/${snapshot.heightGuard}.`,
    )
  }
  if (!['native', 'scaled'].includes(snapshot.fitMode)) {
    throw new Error(`${label} did not settle into a normal fit mode: ${snapshot.fitMode}.`)
  }
  if (!snapshot.artifactReady || !snapshot.frame || !snapshot.iframe) {
    throw new Error(`${label} did not mount a ready protected artifact frame.`)
  }

  const expectedScale = Math.min(1, snapshot.frame.width / snapshot.measuredWidth)
  const expectedHeight = Math.ceil(snapshot.measuredHeight * expectedScale)
  assertNear(`${label} width-only fit scale`, snapshot.fitScale, expectedScale, 0.002)
  assertNear(`${label} rendered-height marker`, snapshot.renderedHeight, expectedHeight)
  assertNear(`${label} frame height`, snapshot.frame.height, expectedHeight)
  assertNear(`${label} iframe bottom`, snapshot.iframe.bottom, snapshot.frame.bottom)
  if (snapshot.iframe.scrolling !== 'no') {
    throw new Error(`${label} unexpectedly enabled internal artifact scrolling.`)
  }
  if (snapshot.overflow > 1) {
    throw new Error(`${label} introduced ${snapshot.overflow}px of page-level horizontal overflow.`)
  }
}

function assertBuildPathAttachment(label, before, after) {
  const beforeGap = before.sourceRunPath?.top - before.artifact?.bottom
  const afterGap = after.sourceRunPath?.top - after.artifact?.bottom
  assertNear(`${label} artifact-to-Build-Path gap`, afterGap, beforeGap)

  const sourceRunDelta = after.sourceRunPath?.top - before.sourceRunPath?.top
  const artifactBottomDelta = after.artifact?.bottom - before.artifact?.bottom
  assertNear(`${label} Build Path movement`, sourceRunDelta, artifactBottomDelta)
}

function assertBuildPathViewportGeometry(label, before, after) {
  assertNear(`${label} artifact width`, after.artifact?.width, before.artifact?.width)
  assertNear(`${label} frame width`, after.frame?.width, before.frame?.width)
  assertNear(
    `${label} Build Path viewport anchor`,
    after.sourceRunPath?.top,
    before.sourceRunPath?.top,
  )
}

function assertVisibleCameraGeometry(label, before, after, viewportHeight) {
  const seamTop = before.sourceRunPath?.top
  if (Number.isFinite(seamTop) && seamTop >= 0 && seamTop <= viewportHeight) {
    assertBuildPathViewportGeometry(label, before, after)
    return
  }
  if (before.scrollY <= 1 && after.scrollY <= 1) {
    assertNear(`${label} artifact width`, after.artifact?.width, before.artifact?.width)
    assertNear(`${label} frame width`, after.frame?.width, before.frame?.width)
    assertBuildPathAttachment(label, before, after)
    return
  }
  assertComparisonGeometry(label, before, after)
  assertComparisonScrollPosition(label, before, after)
}

async function openModelMenuAndClickRun(client, sessionId, runId, label) {
  await clickVisibleControl(
    client,
    sessionId,
    '[data-model-variant-selector] summary',
    `${label} Change menu`,
  )
  const selector = `[data-model-variant-run="${runId}"] [data-model-variant-view]`
  await waitForValue(
    client,
    sessionId,
    `(() => {
      const link=document.querySelector(${JSON.stringify(selector)});
      const scroller=link?.closest('[data-model-variant-menu]')?.querySelector('.overflow-y-auto');
      if (!link || !scroller) return false;
      const row=link.closest('[data-model-variant-run]');
      if (row) scroller.scrollTop=Math.max(0, row.offsetTop-scroller.clientHeight/2);
      return true;
    })()`,
    Boolean,
    `${label} destination control`,
  )
  await clickVisibleControl(client, sessionId, selector, `${label} View run`)
}

async function verifyCalmingArtifactFrameFlow(client, sessionId, baseUrl, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  }, sessionId)

  const route = `${baseUrl}/calming-sleep-sound-mixer-demo`
  await navigate(client, sessionId, route)
  await client.send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' }, sessionId)
  await openModelMenuAndClickRun(
    client,
    sessionId,
    CALMING_SLEEP_RUNS.gemini.id,
    `${viewport.label} Claude-to-Gemini`,
  )

  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.selectorActiveId === CALMING_SLEEP_RUNS.gemini.id &&
      value.queryRun === CALMING_SLEEP_RUNS.gemini.id &&
      value.artifactPath === CALMING_SLEEP_RUNS.gemini.artifactPath &&
      value.artifactReady &&
      value.viewControlsHydrated &&
      value.fitMode !== 'loading'
    ),
    `${viewport.label} settled Gemini artifact`,
  )
  const geminiSettled = await settledComparisonSnapshot(client, sessionId)
  assertNormalMeasuredArtifact(`${viewport.label} Gemini artifact`, geminiSettled)

  await client.send('Runtime.evaluate', { expression: 'history.back()' }, sessionId)
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.selectorActiveId === CALMING_SLEEP_RUNS.claude.id &&
      value.artifactPath === CALMING_SLEEP_RUNS.claude.artifactPath &&
      value.artifactReady &&
      value.fitMode !== 'loading'
    ),
    `${viewport.label} browser Back to Claude`,
  )
  const claudeSettled = await settledComparisonSnapshot(client, sessionId)
  assertNormalMeasuredArtifact(`${viewport.label} Claude artifact`, claudeSettled)
  assertComparisonGeometry(`${viewport.label} Claude-to-Gemini viewport anchor`, claudeSettled, geminiSettled)
  assertBuildPathAttachment(`${viewport.label} Claude-to-Gemini`, claudeSettled, geminiSettled)
  if (Math.abs(claudeSettled.frame.height - geminiSettled.frame.height) < 400) {
    throw new Error(`${viewport.label} Claude and Gemini frames did not resize materially.`)
  }

  await client.send('Runtime.evaluate', { expression: 'history.forward()' }, sessionId)
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.selectorActiveId === CALMING_SLEEP_RUNS.gemini.id &&
      value.artifactPath === CALMING_SLEEP_RUNS.gemini.artifactPath &&
      value.artifactReady &&
      value.fitMode !== 'loading'
    ),
    `${viewport.label} browser Forward to Gemini`,
  )
  const geminiForwardSettled = await settledComparisonSnapshot(client, sessionId)
  assertComparisonGeometry(
    `${viewport.label} Gemini browser Forward anchor`,
    geminiSettled,
    geminiForwardSettled,
  )

  if (viewport.mobile) {
    await navigate(
      client,
      sessionId,
      `${route}?run=${CALMING_SLEEP_RUNS.chatgpt.id}`,
    )
    await client.send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' }, sessionId)
    const pageTopChatGpt = await settledComparisonSnapshot(client, sessionId)
    assertNormalMeasuredArtifact(`${viewport.label} page-top ChatGPT artifact`, pageTopChatGpt)
    await openModelMenuAndClickRun(
      client,
      sessionId,
      CALMING_SLEEP_RUNS.claude.id,
      `${viewport.label} page-top boundary`,
    )
    await waitForValue(
      client,
      sessionId,
      COMPARISON_SNAPSHOT_EXPRESSION,
      (value) => (
        value?.selectorActiveId === CALMING_SLEEP_RUNS.claude.id &&
        value.artifactPath === CALMING_SLEEP_RUNS.claude.artifactPath &&
        value.artifactReady &&
        value.fitMode !== 'loading'
      ),
      `${viewport.label} page-top boundary destination`,
    )
    const pageTopClaudeSettled = await settledComparisonSnapshot(client, sessionId)
    if (pageTopClaudeSettled.scrollY !== 0) {
      throw new Error(`${viewport.label} page-top boundary attempted to overscroll above the document.`)
    }
    if (pageTopClaudeSettled.artifact.top >= pageTopChatGpt.artifact.top - 50) {
      throw new Error(`${viewport.label} did not expose the truthful page-top upstream-content boundary.`)
    }
    assertBuildPathAttachment(
      `${viewport.label} page-top ChatGPT-to-Claude`,
      pageTopChatGpt,
      pageTopClaudeSettled,
    )
  }

  return { claude: claudeSettled, gemini: geminiSettled }
}

async function verifyArtifactHeightGuardFixtures(client, sessionId, baseUrl) {
  for (const fixture of [
    { name: 'feedback', expectedGuard: 'feedback-loop' },
    { name: 'limits', expectedGuard: 'measurement-limit' },
  ]) {
    await navigateRaw(client, sessionId, `${baseUrl}/qa/artifact-height-guards?case=${fixture.name}`)
    const ready = await waitForValue(
      client,
      sessionId,
      COMPARISON_SNAPSHOT_EXPRESSION,
      (value) => (
        value?.heightMode === 'measured-content' &&
        value.heightGuard === fixture.expectedGuard &&
        value.fitMode === 'guarded-scroll' &&
        value.artifactReady
      ),
      `${fixture.name} artifact-height guard`,
    )
    const first = await settledComparisonSnapshot(client, sessionId, 600)
    const second = await settledComparisonSnapshot(client, sessionId, 1_000)
    if (ready.iframe?.scrolling !== 'auto' || second.iframe?.scrolling !== 'auto') {
      throw new Error(`${fixture.name} guard did not enable bounded internal scrolling.`)
    }
    if (second.frame.height < 500 || second.frame.height > 761) {
      throw new Error(`${fixture.name} guard escaped its fixed fallback frame: ${second.frame.height}px.`)
    }
    assertNear(`${fixture.name} stable guarded frame`, second.frame.height, first.frame.height, 1)
    assertNear(`${fixture.name} stable document height`, second.documentHeight, first.documentHeight, 1)
    assertNear(
      `${fixture.name} guarded artifact-to-Build-Path gap`,
      second.sourceRunPath.top - second.artifact.bottom,
      first.sourceRunPath.top - first.artifact.bottom,
      1,
    )
    if (fixture.name === 'limits' && (second.measuredHeight <= 6_000 || second.measuredWidth <= 14_000)) {
      throw new Error('Raw measurement fixture did not exceed both protected limits.')
    }
  }
}

function assertContinuousViewportSamples(label, transition, expectedAnchors, {
  requirePending = true,
  maxElapsedMs = 6_000,
} = {}) {
  if (!transition?.samples?.length) {
    throw new Error(`${label} did not record any transition frames.`)
  }
  if (requirePending && !transition.samples.some((sample) => sample.heightPending)) {
    throw new Error(`${label} never exposed the deliberately delayed pending state.`)
  }
  for (const sample of transition.samples) {
    for (const [field, expected] of Object.entries(expectedAnchors)) {
      assertNear(`${label} ${field} at ${sample.elapsed.toFixed(0)}ms`, sample[field], expected)
    }
  }
  if (!transition.settled) {
    throw new Error(
      `${label} did not settle before the browser deadline. ` +
      `Last frame: ${JSON.stringify(transition.final ?? null)}`,
    )
  }
  if (transition.elapsed > maxElapsedMs) {
    throw new Error(`${label} took ${transition.elapsed.toFixed(0)}ms to settle.`)
  }
}

function assertDelayedPostPaintMeasurement(label, transition, artifactPath) {
  const measuredSamples = transition.samples.filter((sample) => (
    sample.artifactPath === artifactPath &&
    Number.isFinite(sample.measuredHeight) &&
    sample.measuredHeight > 0
  ))
  const firstMeasurement = measuredSamples[0]
  const changedMeasurement = measuredSamples.find((sample) => (
    Math.abs(sample.measuredHeight - firstMeasurement?.measuredHeight) >= 100
  ))
  if (!firstMeasurement || !changedMeasurement) {
    throw new Error(`${label} did not expose the delayed post-paint height change.`)
  }
  if (!changedMeasurement.heightPending) {
    throw new Error(`${label} released its pending state before the post-paint height change.`)
  }
  if ((transition.final?.frameHeight ?? 0) < 890) {
    throw new Error(`${label} did not render the final post-paint artifact height.`)
  }
}

async function positionQaSelectionControl(client, sessionId, packageId, label) {
  return waitForValue(
    client,
    sessionId,
    `(async () => {
      const selector='[data-artifact-package-select="'+CSS.escape(${JSON.stringify(packageId)})+'"]';
      const control=document.querySelector(selector);
      if (!control) return null;
      control.scrollIntoView({block:'center'});
      await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const row=control.closest('[data-source-run-response-row]');
      return {
        controlTop: control.getBoundingClientRect().top,
        rowTop: row?.getBoundingClientRect().top ?? null,
        sourceRunPathTop: document.getElementById('source-run-path')?.getBoundingClientRect().top ?? null,
      };
    })()`,
    (value) => (
      Number.isFinite(value?.controlTop) &&
      Number.isFinite(value?.rowTop) &&
      Number.isFinite(value?.sourceRunPathTop)
    ),
    label,
  )
}

async function sampleQaSelectionTransition(
  client,
  sessionId,
  { packageId, artifactPath, expectedFitMode, label },
) {
  const { result } = await withTimeout(
    label,
    8_000,
    () => client.send('Runtime.evaluate', {
      expression: `(async () => {
        const packageId=${JSON.stringify(packageId)};
        const artifactPath=${JSON.stringify(artifactPath)};
        const expectedFitMode=${JSON.stringify(expectedFitMode)};
        const selector='[data-artifact-package-select="'+CSS.escape(packageId)+'"]';
        const initialControl=document.querySelector(selector);
        const initialRow=initialControl?.closest('[data-source-run-response-row]');
        if (!initialControl || !initialRow) return {error:'missing-control', samples:[]};
        const initial={
          controlTop: initialControl.getBoundingClientRect().top,
          rowTop: initialRow.getBoundingClientRect().top,
          sourceRunPathTop: document.getElementById('source-run-path')?.getBoundingClientRect().top ?? null,
          frameHeight: document.querySelector('[data-artifact-package-id]')?.getBoundingClientRect().height ?? null,
        };
        const samples=[];
        const startedAt=performance.now();
        let settledFrames=0;
        initialControl.click();
        while (performance.now()-startedAt < 7_000) {
          await new Promise((resolve)=>requestAnimationFrame(resolve));
          const control=document.querySelector(selector);
          const row=control?.closest('[data-source-run-response-row]');
          const frame=document.querySelector('[data-artifact-package-id]');
          const fitMode=frame?.dataset.artifactFitMode ?? '';
          const heightGuard=frame?.dataset.artifactHeightGuard ?? '';
          const heightPending=frame?.dataset.artifactHeightPending === 'true';
          const settled=Boolean(
            frame?.dataset.artifactPackageId === packageId &&
            frame?.dataset.artifactPath === artifactPath &&
            !heightPending &&
            (fitMode === expectedFitMode || (!expectedFitMode && (
              fitMode === 'native' || fitMode === 'scaled' || fitMode === 'blocked' || heightGuard !== 'none'
            )))
          );
          samples.push({
            elapsed: performance.now()-startedAt,
            controlTop: control?.getBoundingClientRect().top ?? null,
            rowTop: row?.getBoundingClientRect().top ?? null,
            sourceRunPathTop: document.getElementById('source-run-path')?.getBoundingClientRect().top ?? null,
            frameHeight: frame?.getBoundingClientRect().height ?? null,
            artifactPath: frame?.dataset.artifactPath ?? '',
            heightPending,
            fitMode,
            heightGuard,
            measuredHeight: Number(frame?.dataset.artifactMeasuredHeight ?? Number.NaN),
            measuredWidth: Number(frame?.dataset.artifactMeasuredWidth ?? Number.NaN),
            loadError: frame?.querySelector('[data-artifact-load-error]')?.getAttribute('data-artifact-load-error') ?? '',
          });
          settledFrames=settled ? settledFrames+1 : 0;
          if (settledFrames >= 3) {
            return {
              initial,
              samples,
              settled:true,
              elapsed:performance.now()-startedAt,
              final:samples.at(-1),
            };
          }
        }
        return {
          initial,
          samples,
          settled:false,
          elapsed:performance.now()-startedAt,
          final:samples.at(-1),
        };
      })()`,
      returnByValue: true,
      awaitPromise: true,
    }, sessionId),
  )
  return result.value
}

async function sampleQaRapidReturnTransition(
  client,
  sessionId,
  { packageId, slowPackageId, artifactPath, expectedFitMode, label },
) {
  const { result } = await withTimeout(
    label,
    8_000,
    () => client.send('Runtime.evaluate', {
      expression: `(async () => {
        const packageId=${JSON.stringify(packageId)};
        const slowPackageId=${JSON.stringify(slowPackageId)};
        const artifactPath=${JSON.stringify(artifactPath)};
        const expectedFitMode=${JSON.stringify(expectedFitMode)};
        const selector='[data-artifact-package-select="'+CSS.escape(packageId)+'"]';
        const slowSelector='[data-artifact-package-select="'+CSS.escape(slowPackageId)+'"]';
        const initialControl=document.querySelector(selector);
        const slowControl=document.querySelector(slowSelector);
        if (!initialControl || !slowControl) return {error:'missing-rapid-return-control', samples:[]};

        slowControl.click();
        let intermediateSeen=false;
        const intermediateStartedAt=performance.now();
        while (performance.now()-intermediateStartedAt < 1_500) {
          await new Promise((resolve)=>requestAnimationFrame(resolve));
          const frame=document.querySelector('[data-artifact-package-id]');
          if (
            frame?.dataset.artifactPackageId === slowPackageId &&
            frame.dataset.artifactHeightPending === 'true' &&
            frame.dataset.artifactFitMode === 'loading'
          ) {
            intermediateSeen=true;
            break;
          }
        }
        if (!intermediateSeen) return {error:'slow-intermediate-did-not-mount', samples:[]};

        const initialRow=initialControl.closest('[data-source-run-response-row]');
        const initial={
          controlTop:initialControl.getBoundingClientRect().top,
          rowTop:initialRow?.getBoundingClientRect().top ?? null,
          sourceRunPathTop:document.getElementById('source-run-path')?.getBoundingClientRect().top ?? null,
          frameHeight:document.querySelector('[data-artifact-package-id]')?.getBoundingClientRect().height ?? null,
        };
        const samples=[];
        const startedAt=performance.now();
        let settledFrames=0;
        initialControl.click();
        while (performance.now()-startedAt < 7_000) {
          await new Promise((resolve)=>requestAnimationFrame(resolve));
          const control=document.querySelector(selector);
          const row=control?.closest('[data-source-run-response-row]');
          const frame=document.querySelector('[data-artifact-package-id]');
          const fitMode=frame?.dataset.artifactFitMode ?? '';
          const heightGuard=frame?.dataset.artifactHeightGuard ?? '';
          const heightPending=frame?.dataset.artifactHeightPending === 'true';
          const settled=Boolean(
            frame?.dataset.artifactPackageId === packageId &&
            frame?.dataset.artifactPath === artifactPath &&
            !heightPending &&
            (fitMode === expectedFitMode || (!expectedFitMode && (
              fitMode === 'native' || fitMode === 'scaled' || fitMode === 'blocked' || heightGuard !== 'none'
            )))
          );
          samples.push({
            elapsed:performance.now()-startedAt,
            controlTop:control?.getBoundingClientRect().top ?? null,
            rowTop:row?.getBoundingClientRect().top ?? null,
            sourceRunPathTop:document.getElementById('source-run-path')?.getBoundingClientRect().top ?? null,
            frameHeight:frame?.getBoundingClientRect().height ?? null,
            artifactPath:frame?.dataset.artifactPath ?? '',
            heightPending,
            fitMode,
            heightGuard,
            measuredHeight:Number(frame?.dataset.artifactMeasuredHeight ?? Number.NaN),
            loadError:frame?.querySelector('[data-artifact-load-error]')?.getAttribute('data-artifact-load-error') ?? '',
          });
          settledFrames=settled ? settledFrames+1 : 0;
          if (settledFrames >= 3) {
            return {
              initial,
              samples,
              settled:true,
              intermediateSeen,
              elapsed:performance.now()-startedAt,
              final:samples.at(-1),
            };
          }
        }
        return {
          initial,
          samples,
          settled:false,
          intermediateSeen,
          elapsed:performance.now()-startedAt,
          final:samples.at(-1),
        };
      })()`,
      returnByValue: true,
      awaitPromise: true,
    }, sessionId),
  )
  return result.value
}

async function sampleQaRouteTransition(
  client,
  sessionId,
  { runId, artifactPath, expectedFitMode, label },
) {
  const { result } = await withTimeout(
    label,
    8_000,
    () => client.send('Runtime.evaluate', {
      expression: `(async () => {
        const runId=${JSON.stringify(runId)};
        const artifactPath=${JSON.stringify(artifactPath)};
        const expectedFitMode=${JSON.stringify(expectedFitMode)};
        const link=document.querySelector('[data-qa-route-run="'+CSS.escape(runId)+'"] [data-model-variant-view]');
        const artifact=document.getElementById('final-result');
        if (!link || !artifact) return {error:'missing-route-control', samples:[]};
        const initial={
          packageId:document.querySelector('[data-artifact-package-id]')?.dataset.artifactPackageId ?? '',
          artifactPath:document.querySelector('[data-artifact-package-id]')?.dataset.artifactPath ?? '',
          artifactTop:artifact.getBoundingClientRect().top,
          artifactBottom:artifact.getBoundingClientRect().bottom,
          sourceRunPathTop:document.getElementById('source-run-path')?.getBoundingClientRect().top ?? null,
          scrollY:window.scrollY,
          frameHeight:document.querySelector('[data-artifact-package-id]')?.getBoundingClientRect().height ?? null,
        };
        const samples=[];
        const startedAt=performance.now();
        let settledFrames=0;
        let outgoingFrameAfterTwoFrames=false;
        link.click();
        while (performance.now()-startedAt < 7_000) {
          await new Promise((resolve)=>requestAnimationFrame(()=>setTimeout(resolve, 0)));
          const currentArtifact=document.getElementById('final-result');
          const sourceRunPath=document.getElementById('source-run-path');
          const frame=currentArtifact?.querySelector('[data-artifact-package-id]');
          const fitMode=frame?.dataset.artifactFitMode ?? '';
          const heightGuard=frame?.dataset.artifactHeightGuard ?? '';
          const heightPending=frame?.dataset.artifactHeightPending === 'true';
          const elapsed=performance.now()-startedAt;
          if (elapsed >= 64 && frame?.dataset.artifactPath === initial.artifactPath) {
            outgoingFrameAfterTwoFrames=true;
          }
          const settled=Boolean(
            new URLSearchParams(location.search).get('run') === runId &&
            frame?.dataset.artifactPath === artifactPath &&
            !heightPending &&
            (fitMode === expectedFitMode || (!expectedFitMode && (
              fitMode === 'native' || fitMode === 'scaled' || fitMode === 'blocked' || heightGuard !== 'none'
            )))
          );
          samples.push({
            elapsed,
            artifactTop:currentArtifact?.getBoundingClientRect().top ?? null,
            artifactBottom:currentArtifact?.getBoundingClientRect().bottom ?? null,
            sourceRunPathTop:sourceRunPath?.getBoundingClientRect().top ?? null,
            scrollY:window.scrollY,
            frameHeight:frame?.getBoundingClientRect().height ?? null,
            packageId:frame?.dataset.artifactPackageId ?? '',
            artifactPath:frame?.dataset.artifactPath ?? '',
            heightPending,
            fitMode,
            measuredHeight: Number(frame?.dataset.artifactMeasuredHeight ?? Number.NaN),
            loadError:frame?.querySelector('[data-artifact-load-error]')?.getAttribute('data-artifact-load-error') ?? '',
          });
          settledFrames=settled ? settledFrames+1 : 0;
          if (settledFrames >= 3) {
            return {
              initial,
              samples,
              settled:true,
              outgoingFrameAfterTwoFrames,
              elapsed:performance.now()-startedAt,
              final:samples.at(-1),
            };
          }
        }
        return {
          initial,
          samples,
          settled:false,
          outgoingFrameAfterTwoFrames,
          elapsed:performance.now()-startedAt,
          final:samples.at(-1),
        };
      })()`,
      returnByValue: true,
      awaitPromise: true,
    }, sessionId),
  )
  return result.value
}

async function positionQaArtifactPathSeam(client, sessionId, viewport, label) {
  const desiredTop = viewport.height + 24
  return waitForValue(
    client,
    sessionId,
    `(() => {
      const sourceRunPath=document.getElementById('source-run-path');
      const artifact=document.getElementById('final-result');
      if (!sourceRunPath || !artifact) return null;
      window.scrollTo(0, window.scrollY + sourceRunPath.getBoundingClientRect().top - ${desiredTop});
      return {
        sourceRunPathTop:sourceRunPath.getBoundingClientRect().top,
        artifactBottom:artifact.getBoundingClientRect().bottom,
      };
    })()`,
    (value) => (
      Math.abs((value?.sourceRunPathTop ?? Number.POSITIVE_INFINITY) - desiredTop) <= 2 &&
      value.sourceRunPathTop > viewport.height &&
      value?.artifactBottom > 0 &&
      value.artifactBottom < viewport.height
    ),
    label,
  )
}

async function verifyPendingArtifactViewportFixtures(client, sessionId, baseUrl, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  }, sessionId)

  await navigateRaw(client, sessionId, `${baseUrl}/qa/artifact-height-guards?case=pending`)
  const initialSelection = await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.artifactPath === '/qa/artifact-height-guards/tall' &&
      value.fitMode === 'native' &&
      !value.heightPending &&
      value.frame?.height >= 1_490
    ),
    `${viewport.label} tall selection fixture`,
  )

  await positionQaSelectionControl(
    client,
    sessionId,
    'qa-pending:delayed',
    `${viewport.label} delayed selection control`,
  )
  const delayedSelection = await sampleQaSelectionTransition(client, sessionId, {
    packageId: 'qa-pending:delayed',
    artifactPath: '/qa/artifact-height-guards/delayed',
    expectedFitMode: 'native',
    label: `${viewport.label} delayed same-page selection`,
  })
  assertContinuousViewportSamples(
    `${viewport.label} delayed same-page selection`,
    delayedSelection,
    {
      controlTop: delayedSelection.initial?.controlTop,
      rowTop: delayedSelection.initial?.rowTop,
      sourceRunPathTop: delayedSelection.initial?.sourceRunPathTop,
    },
  )
  assertDelayedPostPaintMeasurement(
    `${viewport.label} delayed same-page selection`,
    delayedSelection,
    '/qa/artifact-height-guards/delayed',
  )
  if (Math.abs(delayedSelection.final.frameHeight - initialSelection.frame.height) < 500) {
    throw new Error(`${viewport.label} delayed fixture did not exercise a material height contraction.`)
  }

  await positionQaSelectionControl(
    client,
    sessionId,
    'qa-pending:remount',
    `${viewport.label} remount selection control`,
  )
  const remountSelection = await sampleQaSelectionTransition(client, sessionId, {
    packageId: 'qa-pending:remount',
    artifactPath: '/qa/artifact-height-guards/remount',
    expectedFitMode: 'native',
    label: `${viewport.label} initial remount selection`,
  })
  assertContinuousViewportSamples(
    `${viewport.label} initial remount selection`,
    remountSelection,
    {
      controlTop: remountSelection.initial?.controlTop,
      rowTop: remountSelection.initial?.rowTop,
      sourceRunPathTop: remountSelection.initial?.sourceRunPathTop,
    },
  )
  assertDelayedPostPaintMeasurement(
    `${viewport.label} initial remount selection`,
    remountSelection,
    '/qa/artifact-height-guards/remount',
  )

  const rapidReturn = await sampleQaRapidReturnTransition(client, sessionId, {
    packageId: 'qa-pending:remount',
    slowPackageId: 'qa-pending:slow',
    artifactPath: '/qa/artifact-height-guards/remount',
    expectedFitMode: 'native',
    label: `${viewport.label} rapid remount return`,
  })
  assertContinuousViewportSamples(
    `${viewport.label} rapid remount return`,
    rapidReturn,
    {
      controlTop: rapidReturn.initial?.controlTop,
      rowTop: rapidReturn.initial?.rowTop,
      sourceRunPathTop: rapidReturn.initial?.sourceRunPathTop,
    },
  )
  assertDelayedPostPaintMeasurement(
    `${viewport.label} rapid remount return`,
    rapidReturn,
    '/qa/artifact-height-guards/remount',
  )
  if (!rapidReturn.intermediateSeen || (rapidReturn.final?.frameHeight ?? 0) < 1_090) {
    throw new Error(`${viewport.label} rapid remount return did not prove a fresh document generation.`)
  }

  await positionQaSelectionControl(
    client,
    sessionId,
    'qa-pending:missing',
    `${viewport.label} missing selection control`,
  )
  const missingSelection = await sampleQaSelectionTransition(client, sessionId, {
    packageId: 'qa-pending:missing',
    artifactPath: '/qa/artifact-height-guards/missing',
    expectedFitMode: 'blocked',
    label: `${viewport.label} missing same-page selection`,
  })
  assertContinuousViewportSamples(
    `${viewport.label} missing same-page selection`,
    missingSelection,
    {
      controlTop: missingSelection.initial?.controlTop,
      rowTop: missingSelection.initial?.rowTop,
      sourceRunPathTop: missingSelection.initial?.sourceRunPathTop,
    },
    { requirePending: false, maxElapsedMs: 2_000 },
  )
  if (!missingSelection.final.loadError) {
    throw new Error(`${viewport.label} missing selection did not render a protected load error.`)
  }

  await navigateRaw(client, sessionId, `${baseUrl}/qa/artifact-height-guards?case=route&run=tall`)
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.artifactPath === '/qa/artifact-height-guards/tall' &&
      value.fitMode === 'native' &&
      !value.heightPending &&
      value.viewControlsHydrated
    ),
    `${viewport.label} tall route fixture`,
  )
  const visibleSeam = await positionQaArtifactPathSeam(
    client,
    sessionId,
    viewport,
    `${viewport.label} bottom-visible artifact-path seam`,
  )
  const delayedSeamRoute = await sampleQaRouteTransition(client, sessionId, {
    runId: 'delayed',
    artifactPath: '/qa/artifact-height-guards/delayed',
    expectedFitMode: 'native',
    label: `${viewport.label} bottom-visible seam contraction route`,
  })
  if (!delayedSeamRoute.outgoingFrameAfterTwoFrames) {
    throw new Error(`${viewport.label} delayed route did not keep the outgoing artifact mounted beyond two frames.`)
  }
  assertContinuousViewportSamples(
    `${viewport.label} bottom-visible seam contraction route`,
    delayedSeamRoute,
    {
      sourceRunPathTop: visibleSeam.sourceRunPathTop,
      artifactBottom: visibleSeam.artifactBottom,
    },
  )
  assertDelayedPostPaintMeasurement(
    `${viewport.label} bottom-visible seam contraction route`,
    delayedSeamRoute,
    '/qa/artifact-height-guards/delayed',
  )
  const tallSeamReturn = await sampleQaRouteTransition(client, sessionId, {
    runId: 'tall',
    artifactPath: '/qa/artifact-height-guards/tall',
    expectedFitMode: 'native',
    label: `${viewport.label} bottom-visible seam expansion route`,
  })
  assertContinuousViewportSamples(
    `${viewport.label} bottom-visible seam expansion route`,
    tallSeamReturn,
    {
      sourceRunPathTop: visibleSeam.sourceRunPathTop,
      artifactBottom: visibleSeam.artifactBottom,
    },
    { requirePending: false },
  )
  await waitForValue(
    client,
    sessionId,
    `(() => {
      const sourceRunPath=document.getElementById('source-run-path');
      if (!sourceRunPath) return null;
      window.scrollTo(0, window.scrollY + sourceRunPath.getBoundingClientRect().top + 20);
      const artifact=document.getElementById('final-result');
      return {
        sourceRunPathTop:sourceRunPath.getBoundingClientRect().top,
        artifactBottom:artifact?.getBoundingClientRect().bottom ?? null,
      };
    })()`,
    (value) => (
      Math.abs((value?.sourceRunPathTop ?? Number.POSITIVE_INFINITY) + 20) <= 2 &&
      (value?.artifactBottom ?? Number.POSITIVE_INFINITY) < 0
    ),
    `${viewport.label} deep pending route position`,
  )
  const delayedRoute = await sampleQaRouteTransition(client, sessionId, {
    runId: 'delayed',
    artifactPath: '/qa/artifact-height-guards/delayed',
    expectedFitMode: 'native',
    label: `${viewport.label} delayed model route`,
  })
  assertContinuousViewportSamples(
    `${viewport.label} delayed model route`,
    delayedRoute,
    { sourceRunPathTop: delayedRoute.initial?.sourceRunPathTop },
  )
  assertDelayedPostPaintMeasurement(
    `${viewport.label} delayed model route`,
    delayedRoute,
    '/qa/artifact-height-guards/delayed',
  )
  if (
    delayedRoute.initial?.packageId !== 'artifact-height-route:shared' ||
    delayedRoute.final?.packageId !== delayedRoute.initial.packageId
  ) {
    throw new Error(`${viewport.label} delayed model route did not exercise shared package IDs.`)
  }

  const missingRoute = await sampleQaRouteTransition(client, sessionId, {
    runId: 'missing',
    artifactPath: '/qa/artifact-height-guards/missing',
    expectedFitMode: 'blocked',
    label: `${viewport.label} missing model route`,
  })
  assertContinuousViewportSamples(
    `${viewport.label} missing model route`,
    missingRoute,
    { sourceRunPathTop: missingRoute.initial?.sourceRunPathTop },
    { requirePending: false, maxElapsedMs: 2_000 },
  )
  if (!missingRoute.final.loadError) {
    throw new Error(`${viewport.label} missing model route did not render a protected load error.`)
  }
}

const PROTECTED_VIEWER_SNAPSHOT_EXPRESSION = `(() => {
  const root=document.querySelector('[data-artifact-viewer-mode]');
  const frame=root?.querySelector('[data-artifact-package-id]');
  const iframe=frame?.querySelector('iframe');
  const rootRect=root?.getBoundingClientRect();
  const frameRect=frame?.getBoundingClientRect();
  const iframeRect=iframe?.getBoundingClientRect();
  const controlsRect=document.querySelector('[aria-label="Artifact display size"]')?.getBoundingClientRect();
  const viewerHeaderRect=frame?.previousElementSibling?.getBoundingClientRect();
  const protectedHeading=[...document.querySelectorAll('h1')]
    .find((node)=>node.textContent?.trim()==='Protected artifact viewer');
  const protectedHeaderRect=protectedHeading?.closest('header')?.getBoundingClientRect();
  const scroller=root?.parentElement;
  return {
    mode:root?.dataset.artifactViewerMode ?? '',
    navigationTimeOrigin:performance.timeOrigin,
    rootTop:rootRect?.top ?? null,
    rootBottom:rootRect?.bottom ?? null,
    rootLeft:rootRect?.left ?? null,
    rootRight:rootRect?.right ?? null,
    rootWidth:rootRect?.width ?? null,
    protectedHeaderBottom:protectedHeaderRect?.bottom ?? null,
    viewerHeaderTop:viewerHeaderRect?.top ?? null,
    viewerHeaderBottom:viewerHeaderRect?.bottom ?? null,
    frameLeft:frameRect?.left ?? null,
    frameRight:frameRect?.right ?? null,
    frameTop:frameRect?.top ?? null,
    frameBottom:frameRect?.bottom ?? null,
    frameWidth:frameRect?.width ?? null,
    frameHeight:frameRect?.height ?? null,
    iframeWidth:iframeRect?.width ?? null,
    iframeHeight:iframeRect?.height ?? null,
    scale:Number(frame?.dataset.artifactScale ?? Number.NaN),
    heightMode:frame?.dataset.artifactHeightMode ?? '',
    fitMode:frame?.dataset.artifactFitMode ?? '',
    heightPending:frame?.dataset.artifactHeightPending === 'true',
    measurementRefreshPending:frame?.dataset.artifactMeasurementRefresh === 'true',
    measuredWidth:Number(frame?.dataset.artifactMeasuredWidth ?? Number.NaN),
    measuredHeight:Number(frame?.dataset.artifactMeasuredHeight ?? Number.NaN),
    virtualWidth:Number(frame?.dataset.artifactVirtualWidth ?? Number.NaN),
    artifactReady:Boolean(iframe?.srcdoc),
    scrolling:iframe?.getAttribute('scrolling') ?? '',
    documentWidth:document.documentElement.scrollWidth,
    viewportWidth:window.innerWidth,
    viewportHeight:window.innerHeight,
    controlsTop:controlsRect?.top ?? null,
    controlsBottom:controlsRect?.bottom ?? null,
    controlsLeft:controlsRect?.left ?? null,
    controlsRight:controlsRect?.right ?? null,
    scrollerWidth:scroller?.clientWidth ?? null,
    scrollerScrollWidth:scroller?.scrollWidth ?? null,
    scrollerHeight:scroller?.clientHeight ?? null,
    scrollerScrollHeight:scroller?.scrollHeight ?? null,
    scrollerScrollTop:scroller?.scrollTop ?? null,
    scrollerScrollLeft:scroller?.scrollLeft ?? null,
    readablePressed:document.querySelector('[data-artifact-viewer-mode-control="readable"]')?.getAttribute('aria-pressed') ?? '',
    fitWholePressed:document.querySelector('[data-artifact-viewer-mode-control="fit-whole"]')?.getAttribute('aria-pressed') ?? '',
    iframeSameAsTracked:window.__pathforgeResponsiveIframe
      ? window.__pathforgeResponsiveIframe === iframe
      : null,
    artifactFitsFrame:Boolean(
      frameRect && iframeRect &&
      iframeRect.width <= frameRect.width + 2 &&
      iframeRect.height <= frameRect.height + 2
    ),
  };
})()`

async function verifyProtectedArtifactViewerModes(
  client,
  sessionId,
  baseUrl,
  viewport,
  artifact = {
    artifactPath: CALMING_SLEEP_RUNS.claude.artifactPath,
    title: 'Calming sleep sound mixer',
    provider: 'Claude',
  },
) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  }, sessionId)

  const viewerUrl = new URL('/artifact-viewer', baseUrl)
  viewerUrl.searchParams.set('path', artifact.artifactPath)
  viewerUrl.searchParams.set('title', artifact.title)
  viewerUrl.searchParams.set('provider', artifact.provider)
  await replaceRaw(client, sessionId, viewerUrl.href)
  const label = `${viewport.label} ${artifact.title}`

  const readable = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.mode === 'readable' &&
      value.heightMode === 'fixed-viewport' &&
      value.fitMode === 'readable-scroll' &&
      !value.heightPending &&
      value.artifactReady &&
      value.readablePressed === 'true' &&
      value.fitWholePressed === 'false' &&
      value.scale >= 0.99 &&
      value.scrolling === 'auto' &&
      Number.isFinite(value.measuredWidth) &&
      value.measuredWidth > 0 &&
      Number.isFinite(value.measuredHeight) &&
      value.measuredHeight > 0 &&
      value.rootTop >= 0 &&
      value.rootBottom <= viewport.height + 2 &&
      value.frameHeight > 100 &&
      value.frameHeight <= viewport.height &&
      value.controlsTop >= 0 &&
      value.controlsBottom <= viewport.height &&
      value.scrollerScrollTop <= 2 &&
      value.documentWidth <= value.viewportWidth + 2 &&
      value.scrollerScrollWidth <= value.scrollerWidth + 2
    ),
    `${label} protected viewer readable mode`,
    20_000,
  )
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-artifact-viewer-mode-control="fit-whole"]')?.click()`,
  }, sessionId)
  const fitWhole = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.mode === 'fit-whole' &&
      value.heightMode === 'fixed-viewport' &&
      value.fitWholePressed === 'true' &&
      value.readablePressed === 'false' &&
      value.artifactReady &&
      (value.fitMode === 'scaled' || value.fitMode === 'native') &&
      value.scale <= readable.scale + 0.001 &&
      value.scrolling === 'no' &&
      value.artifactFitsFrame &&
      value.documentWidth <= value.viewportWidth + 2 &&
      value.rootTop >= 0 &&
      value.rootBottom <= viewport.height + 2 &&
      value.controlsTop >= 0 &&
      value.controlsBottom <= viewport.height &&
      value.scrollerScrollTop <= 2
    ),
    `${label} protected viewer fit-whole mode`,
    20_000,
  )
  if (fitWhole.frameHeight > viewport.height) {
    throw new Error(`${label} fit-whole artifact frame exceeded the visible window.`)
  }

  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-artifact-viewer-mode-control="readable"]')?.click()`,
  }, sessionId)
  const readableReturn = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.mode === 'readable' &&
      value.heightMode === 'fixed-viewport' &&
      value.fitMode === 'readable-scroll' &&
      !value.heightPending &&
      value.readablePressed === 'true' &&
      value.scale >= 0.99 &&
      value.scrolling === 'auto' &&
      value.frameHeight <= viewport.height &&
      value.controlsTop >= 0 &&
      value.controlsBottom <= viewport.height &&
      value.scrollerScrollTop <= 2 &&
      Math.abs(value.measuredWidth - readable.measuredWidth) <= 2 &&
      Math.abs(value.rootWidth - readable.rootWidth) <= 2 &&
      Math.abs(value.frameWidth - readable.frameWidth) <= 2 &&
      value.scrollerScrollWidth <= readable.scrollerScrollWidth + 2
    ),
    `${label} protected viewer readable return`,
    20_000,
  )
  if (readableReturn.scrollerScrollWidth > readableReturn.scrollerWidth + 2) {
    throw new Error(`${label} readable return introduced horizontal viewer overflow.`)
  }
  return { readable, fitWhole, readableReturn }
}

function responsiveFitMatchesCanonical(value, canonical) {
  return Boolean(
    value?.mode === 'fit-whole' &&
    value.fitWholePressed === 'true' &&
    value.readablePressed === 'false' &&
    !value.heightPending &&
    !value.measurementRefreshPending &&
    value.artifactReady &&
    Math.abs(value.measuredWidth - canonical.measuredWidth) <= 2 &&
    Math.abs(value.measuredHeight - canonical.measuredHeight) <= 2 &&
    Math.abs(value.scale - canonical.scale) <= 0.002 &&
    Math.abs(value.iframeWidth - canonical.iframeWidth) <= 2 &&
    Math.abs(value.iframeHeight - canonical.iframeHeight) <= 2
  )
}

function responsiveReadableMatchesCanonical(value, canonical) {
  return Boolean(
    value?.mode === 'readable' &&
    value.readablePressed === 'true' &&
    value.fitWholePressed === 'false' &&
    !value.heightPending &&
    !value.measurementRefreshPending &&
    value.artifactReady &&
    Math.abs(value.measuredWidth - canonical.measuredWidth) <= 2 &&
    Math.abs(value.measuredHeight - canonical.measuredHeight) <= 2 &&
    Math.abs(value.scale - canonical.scale) <= 0.002 &&
    Math.abs(value.iframeWidth - canonical.iframeWidth) <= 2 &&
    Math.abs(value.iframeHeight - canonical.iframeHeight) <= 2
  )
}

function assertResponsiveViewerGeometry(label, value) {
  if (
    !value ||
    value.rootTop < value.protectedHeaderBottom ||
    value.viewerHeaderTop < value.protectedHeaderBottom ||
    value.controlsTop < value.protectedHeaderBottom ||
    value.controlsBottom > value.viewportHeight + 2 ||
    value.controlsLeft < -2 ||
    value.controlsRight > value.viewportWidth + 2 ||
    value.rootLeft < -2 ||
    value.rootRight > value.viewportWidth + 2 ||
    value.frameLeft < -2 ||
    value.frameRight > value.viewportWidth + 2 ||
    value.documentWidth > value.viewportWidth + 2 ||
    value.scrollerScrollWidth > value.scrollerWidth + 2 ||
    value.scrollerScrollLeft > 2
  ) {
    throw new Error(`${label} escaped its responsive protected-viewer geometry: ${JSON.stringify(value)}.`)
  }
}

async function readPausedAirlockState(client, artifactRuntime, label) {
  return evaluateInContext(
    client,
    artifactRuntime.sessionId,
    artifactRuntime.contextId,
    `(() => ({
      innerTimeOrigin:performance.timeOrigin,
      briefingHidden:document.querySelector('#briefingOverlay')?.hidden ?? null,
      pauseHidden:document.querySelector('#pauseOverlay')?.hidden ?? null,
      hudActive:document.querySelector('#hud')?.classList.contains('active') ?? false,
      oxygen:document.querySelector('#oxygenTime')?.textContent?.trim() ?? '',
    }))()`,
    label,
  )
}

function assertPausedAirlockState(label, state, expectedTimeOrigin) {
  if (
    state?.innerTimeOrigin !== expectedTimeOrigin ||
    state.briefingHidden !== true ||
    state.pauseHidden !== false ||
    state.hudActive !== true ||
    state.oxygen !== '02:20'
  ) {
    throw new Error(`${label} lost the paused Airlock runtime state: ${JSON.stringify(state)}.`)
  }
}

async function assertResponsiveAirlockIdentityAndState(
  client,
  artifactRuntime,
  label,
  viewer,
  expectedOuterTimeOrigin,
  expectedInnerTimeOrigin,
) {
  if (
    viewer.navigationTimeOrigin !== expectedOuterTimeOrigin ||
    viewer.iframeSameAsTracked !== true
  ) {
    throw new Error(`${label} reloaded or remounted the protected artifact.`)
  }
  const state = await readPausedAirlockState(client, artifactRuntime, `${label} state`)
  assertPausedAirlockState(label, state, expectedInnerTimeOrigin)
}

async function verifyPomodoroReadableResizeState(
  client,
  sessionId,
  baseUrl,
  artifact,
) {
  const desktop = { label: 'desktop', width: 1440, height: 900, mobile: false }
  const portrait = { label: '390px', width: 390, height: 844, mobile: true }
  const landscape = { label: 'landscape', width: 844, height: 390, mobile: true }
  const freshPortrait = await verifyProtectedArtifactViewerModes(
    client,
    sessionId,
    baseUrl,
    portrait,
    artifact,
  )
  const freshLandscape = await verifyProtectedArtifactViewerModes(
    client,
    sessionId,
    baseUrl,
    landscape,
    artifact,
  )
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: desktop.width,
    height: desktop.height,
    deviceScaleFactor: 1,
    mobile: desktop.mobile,
  }, sessionId)
  const viewerUrl = new URL('/artifact-viewer', baseUrl)
  viewerUrl.searchParams.set('path', artifact.artifactPath)
  viewerUrl.searchParams.set('title', artifact.title)
  viewerUrl.searchParams.set('provider', artifact.provider)
  await replaceRaw(client, sessionId, viewerUrl.href)

  const readable = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.mode === 'readable' &&
      !value.heightPending &&
      value.artifactReady &&
      value.measuredWidth > 0
    ),
    `${artifact.title} desktop readable resize start`,
    20_000,
  )
  assertResponsiveViewerGeometry(`${artifact.title} desktop readable resize start`, readable)
  await evaluateInContext(
    client,
    sessionId,
    undefined,
    `window.__pathforgeResponsiveIframe=document.querySelector('[data-artifact-package-id] iframe'); true`,
    `${artifact.title} readable iframe identity sentinel`,
  )
  const artifactRuntime = await artifactDocumentContext(
    client,
    sessionId,
    `${artifact.title} readable resize state`,
    '#workInput',
  )
  const sentinel = await evaluateInContext(
    client,
    artifactRuntime.sessionId,
    artifactRuntime.contextId,
    `(() => {
      const input=document.querySelector('#workInput');
      if (!input) return null;
      input.value='37';
      input.dispatchEvent(new Event('input',{bubbles:true}));
      return { innerTimeOrigin:performance.timeOrigin, workMinutes:input.value };
    })()`,
    `${artifact.title} changed preset sentinel`,
  )
  if (sentinel?.workMinutes !== '37') {
    throw new Error(`${artifact.title} could not establish its changed preset sentinel.`)
  }

  const checkpoints = [
    { label: 'live readable resize to 390px', viewport: portrait, canonical: freshPortrait.readable },
    { label: 'live readable resize to landscape', viewport: landscape, canonical: freshLandscape.readable },
    { label: 'live readable portrait return', viewport: portrait, canonical: freshPortrait.readable },
  ]
  for (const checkpoint of checkpoints) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: checkpoint.viewport.width,
      height: checkpoint.viewport.height,
      deviceScaleFactor: 1,
      mobile: checkpoint.viewport.mobile,
    }, sessionId)
    const resized = await waitForValue(
      client,
      sessionId,
      PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
      (value) => responsiveReadableMatchesCanonical(value, checkpoint.canonical),
      `${artifact.title} ${checkpoint.label}`,
      20_000,
    )
    assertResponsiveViewerGeometry(`${artifact.title} ${checkpoint.label}`, resized)
    if (
      resized.navigationTimeOrigin !== readable.navigationTimeOrigin ||
      resized.iframeSameAsTracked !== true
    ) {
      throw new Error(`${artifact.title} ${checkpoint.label} reloaded or remounted the artifact.`)
    }
    const state = await evaluateInContext(
      client,
      artifactRuntime.sessionId,
      artifactRuntime.contextId,
      `(() => ({
        innerTimeOrigin:performance.timeOrigin,
        workMinutes:document.querySelector('#workInput')?.value ?? '',
      }))()`,
      `${artifact.title} ${checkpoint.label} state`,
    )
    if (
      state?.innerTimeOrigin !== sentinel.innerTimeOrigin ||
      state.workMinutes !== sentinel.workMinutes
    ) {
      throw new Error(`${artifact.title} ${checkpoint.label} lost its changed preset state.`)
    }
  }

  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-artifact-viewer-mode-control="fit-whole"]')?.click()`,
  }, sessionId)
  const fit = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => responsiveFitMatchesCanonical(value, freshPortrait.fitWhole),
    `${artifact.title} responsive Fit-whole state checkpoint`,
    20_000,
  )
  assertResponsiveViewerGeometry(`${artifact.title} responsive Fit-whole state checkpoint`, fit)
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-artifact-viewer-mode-control="readable"]')?.click()`,
  }, sessionId)
  const readableReturn = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => responsiveReadableMatchesCanonical(value, freshPortrait.readableReturn),
    `${artifact.title} responsive readable state return`,
    20_000,
  )
  assertResponsiveViewerGeometry(`${artifact.title} responsive readable state return`, readableReturn)
  for (const [label, viewer] of [['Fit whole', fit], ['Readable return', readableReturn]]) {
    if (
      viewer.navigationTimeOrigin !== readable.navigationTimeOrigin ||
      viewer.iframeSameAsTracked !== true
    ) {
      throw new Error(`${artifact.title} ${label} reloaded or remounted the artifact.`)
    }
    const state = await evaluateInContext(
      client,
      artifactRuntime.sessionId,
      artifactRuntime.contextId,
      `(() => ({
        innerTimeOrigin:performance.timeOrigin,
        workMinutes:document.querySelector('#workInput')?.value ?? '',
      }))()`,
      `${artifact.title} ${label} state`,
    )
    if (
      state?.innerTimeOrigin !== sentinel.innerTimeOrigin ||
      state.workMinutes !== sentinel.workMinutes
    ) {
      throw new Error(`${artifact.title} ${label} lost its changed preset state.`)
    }
  }
}

async function verifyAirlockReadableResizeState(
  client,
  sessionId,
  baseUrl,
  freshPortrait,
  freshLandscape,
) {
  const artifact = PROTECTED_VIEWER_ARTIFACTS.airlock
  const desktop = { width: 1440, height: 900, mobile: false }
  const portrait = { width: 390, height: 844, mobile: true }
  const landscape = { width: 844, height: 390, mobile: true }
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: desktop.width,
    height: desktop.height,
    deviceScaleFactor: 1,
    mobile: desktop.mobile,
  }, sessionId)
  const viewerUrl = new URL('/artifact-viewer', baseUrl)
  viewerUrl.searchParams.set('path', artifact.artifactPath)
  viewerUrl.searchParams.set('title', artifact.title)
  viewerUrl.searchParams.set('provider', artifact.provider)
  await replaceRaw(client, sessionId, viewerUrl.href)

  const readable = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.mode === 'readable' &&
      !value.heightPending &&
      value.artifactReady &&
      value.measuredWidth > 1_000
    ),
    'Airlock desktop readable-resize start',
    20_000,
  )
  assertResponsiveViewerGeometry('Airlock desktop readable-resize start', readable)
  await evaluateInContext(
    client,
    sessionId,
    undefined,
    `window.__pathforgeResponsiveIframe=document.querySelector('[data-artifact-package-id] iframe'); true`,
    'Airlock readable-resize iframe identity sentinel',
  )
  const artifactRuntime = await artifactDocumentContext(
    client,
    sessionId,
    'Airlock readable-resize state',
    '#startButton',
  )
  const pausedAirlock = await evaluateInContext(
    client,
    artifactRuntime.sessionId,
    artifactRuntime.contextId,
    `(async () => {
      document.querySelector('#startButton')?.click();
      await new Promise((resolve)=>setTimeout(resolve,120));
      document.querySelector('#touchPause')?.click();
      await new Promise((resolve)=>setTimeout(resolve,80));
      return {
        innerTimeOrigin:performance.timeOrigin,
        briefingHidden:document.querySelector('#briefingOverlay')?.hidden ?? null,
        pauseHidden:document.querySelector('#pauseOverlay')?.hidden ?? null,
        hudActive:document.querySelector('#hud')?.classList.contains('active') ?? false,
        oxygen:document.querySelector('#oxygenTime')?.textContent?.trim() ?? '',
      };
    })()`,
    'Airlock readable-resize paused sentinel',
  )
  assertPausedAirlockState(
    'Airlock desktop readable-resize paused sentinel',
    pausedAirlock,
    pausedAirlock.innerTimeOrigin,
  )

  const checkpoints = [
    { label: 'Airlock live readable resize to 390px', viewport: portrait, canonical: freshPortrait.readable },
    { label: 'Airlock live readable resize to landscape', viewport: landscape, canonical: freshLandscape.readable },
    { label: 'Airlock live readable portrait return', viewport: portrait, canonical: freshPortrait.readable },
  ]
  for (const checkpoint of checkpoints) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: checkpoint.viewport.width,
      height: checkpoint.viewport.height,
      deviceScaleFactor: 1,
      mobile: checkpoint.viewport.mobile,
    }, sessionId)
    const resized = await waitForValue(
      client,
      sessionId,
      PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
      (value) => responsiveReadableMatchesCanonical(value, checkpoint.canonical),
      checkpoint.label,
      20_000,
    )
    assertResponsiveViewerGeometry(checkpoint.label, resized)
    await assertResponsiveAirlockIdentityAndState(
      client,
      artifactRuntime,
      checkpoint.label,
      resized,
      readable.navigationTimeOrigin,
      pausedAirlock.innerTimeOrigin,
    )
  }
}

async function verifyProtectedViewerResponsiveStateMachine(client, sessionId, baseUrl) {
  const airlock = PROTECTED_VIEWER_ARTIFACTS.airlock
  const portrait = { label: 'fresh 390px Airlock canonical', width: 390, height: 844, mobile: true }
  const landscape = { label: 'fresh landscape Airlock canonical', width: 844, height: 390, mobile: true }
  const desktop = { label: 'desktop Airlock responsive chain', width: 1440, height: 900, mobile: false }
  await verifyPomodoroReadableResizeState(
    client,
    sessionId,
    baseUrl,
    PROTECTED_VIEWER_ARTIFACTS.pomodoro,
  )
  const freshPortrait = await verifyProtectedArtifactViewerModes(
    client,
    sessionId,
    baseUrl,
    portrait,
    airlock,
  )
  const freshLandscape = await verifyProtectedArtifactViewerModes(
    client,
    sessionId,
    baseUrl,
    landscape,
    airlock,
  )
  await verifyAirlockReadableResizeState(
    client,
    sessionId,
    baseUrl,
    freshPortrait,
    freshLandscape,
  )

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: desktop.width,
    height: desktop.height,
    deviceScaleFactor: 1,
    mobile: desktop.mobile,
  }, sessionId)
  const viewerUrl = new URL('/artifact-viewer', baseUrl)
  viewerUrl.searchParams.set('path', airlock.artifactPath)
  viewerUrl.searchParams.set('title', airlock.title)
  viewerUrl.searchParams.set('provider', airlock.provider)
  await replaceRaw(client, sessionId, viewerUrl.href)

  const desktopReadable = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.mode === 'readable' &&
      !value.heightPending &&
      !value.measurementRefreshPending &&
      value.measuredWidth > 1_000 &&
      value.artifactReady
    ),
    'desktop Airlock readable responsive-chain start',
    20_000,
  )
  assertResponsiveViewerGeometry('desktop Airlock readable responsive-chain start', desktopReadable)
  await evaluateInContext(
    client,
    sessionId,
    undefined,
    `window.__pathforgeResponsiveIframe=document.querySelector('[data-artifact-package-id] iframe'); true`,
    'desktop Airlock iframe identity sentinel',
  )
  const artifactRuntime = await artifactDocumentContext(
    client,
    sessionId,
    'responsive Airlock state machine',
    '#startButton',
  )
  const pausedAirlock = await evaluateInContext(
    client,
    artifactRuntime.sessionId,
    artifactRuntime.contextId,
    `(async () => {
      document.querySelector('#startButton')?.click();
      await new Promise((resolve)=>setTimeout(resolve,120));
      document.querySelector('#touchPause')?.click();
      await new Promise((resolve)=>setTimeout(resolve,80));
      return {
        innerTimeOrigin:performance.timeOrigin,
        briefingHidden:document.querySelector('#briefingOverlay')?.hidden ?? null,
        pauseHidden:document.querySelector('#pauseOverlay')?.hidden ?? null,
        hudActive:document.querySelector('#hud')?.classList.contains('active') ?? false,
        oxygen:document.querySelector('#oxygenTime')?.textContent?.trim() ?? '',
      };
    })()`,
    'start and pause responsive Airlock state sentinel',
  )
  assertPausedAirlockState(
    'desktop Airlock paused responsive-chain start',
    pausedAirlock,
    pausedAirlock.innerTimeOrigin,
  )

  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-artifact-viewer-mode-control="fit-whole"]')?.click()`,
  }, sessionId)
  const desktopFit = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => value?.mode === 'fit-whole' && !value.heightPending && !value.measurementRefreshPending,
    'desktop Airlock Fit-whole responsive-chain start',
    20_000,
  )
  assertResponsiveViewerGeometry('desktop Airlock Fit-whole responsive-chain start', desktopFit)

  const checkpoints = [
    {
      label: 'live desktop Fit-whole to 390px',
      viewport: portrait,
      canonical: freshPortrait.fitWhole,
    },
    {
      label: 'live 390px Fit-whole to landscape',
      viewport: landscape,
      canonical: freshLandscape.fitWhole,
    },
    {
      label: 'live landscape Fit-whole to portrait return',
      viewport: portrait,
      canonical: freshPortrait.fitWhole,
    },
  ]

  for (const checkpoint of checkpoints) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: checkpoint.viewport.width,
      height: checkpoint.viewport.height,
      deviceScaleFactor: 1,
      mobile: checkpoint.viewport.mobile,
    }, sessionId)
    const settled = await waitForValue(
      client,
      sessionId,
      PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
      (value) => responsiveFitMatchesCanonical(value, checkpoint.canonical),
      checkpoint.label,
      20_000,
    )
    assertResponsiveViewerGeometry(checkpoint.label, settled)
    await assertResponsiveAirlockIdentityAndState(
      client,
      artifactRuntime,
      checkpoint.label,
      settled,
      desktopReadable.navigationTimeOrigin,
      pausedAirlock.innerTimeOrigin,
    )
  }

  for (let cycle = 1; cycle <= 2; cycle += 1) {
    await client.send('Runtime.evaluate', {
      expression: `document.querySelector('[data-artifact-viewer-mode-control="readable"]')?.click()`,
    }, sessionId)
    const readable = await waitForValue(
      client,
      sessionId,
      PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
      (value) => (
        value?.mode === 'readable' &&
        !value.heightPending &&
        !value.measurementRefreshPending &&
        Math.abs(value.measuredWidth - freshPortrait.readable.measuredWidth) <= 2 &&
        Math.abs(value.measuredHeight - freshPortrait.readable.measuredHeight) <= 2 &&
        Math.abs(value.iframeWidth - freshPortrait.readable.iframeWidth) <= 2 &&
        Math.abs(value.iframeHeight - freshPortrait.readable.iframeHeight) <= 2
      ),
      `responsive Airlock cycle ${cycle} readable`,
      20_000,
    )
    assertResponsiveViewerGeometry(`responsive Airlock cycle ${cycle} readable`, readable)
    await assertResponsiveAirlockIdentityAndState(
      client,
      artifactRuntime,
      `responsive Airlock cycle ${cycle} readable`,
      readable,
      desktopReadable.navigationTimeOrigin,
      pausedAirlock.innerTimeOrigin,
    )
    await client.send('Runtime.evaluate', {
      expression: `document.querySelector('[data-artifact-viewer-mode-control="fit-whole"]')?.click()`,
    }, sessionId)
    const fit = await waitForValue(
      client,
      sessionId,
      PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
      (value) => responsiveFitMatchesCanonical(value, freshPortrait.fitWhole),
      `responsive Airlock cycle ${cycle} Fit whole`,
      20_000,
    )
    assertResponsiveViewerGeometry(`responsive Airlock cycle ${cycle} Fit whole`, fit)
    await assertResponsiveAirlockIdentityAndState(
      client,
      artifactRuntime,
      `responsive Airlock cycle ${cycle} Fit whole`,
      fit,
      desktopReadable.navigationTimeOrigin,
      pausedAirlock.innerTimeOrigin,
    )
  }

  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-artifact-viewer-mode-control="readable"]')?.click()`,
  }, sessionId)
  const finalReadable = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.mode === 'readable' &&
      !value.heightPending &&
      !value.measurementRefreshPending &&
      Math.abs(value.measuredWidth - freshPortrait.readable.measuredWidth) <= 2 &&
      Math.abs(value.measuredHeight - freshPortrait.readable.measuredHeight) <= 2
    ),
    'responsive Airlock final readable return',
    20_000,
  )
  assertResponsiveViewerGeometry('responsive Airlock final readable return', finalReadable)
  await assertResponsiveAirlockIdentityAndState(
    client,
    artifactRuntime,
    'responsive Airlock final state',
    finalReadable,
    desktopReadable.navigationTimeOrigin,
    pausedAirlock.innerTimeOrigin,
  )
}

const TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION = `(() => {
  const doc=document.documentElement;
  const body=document.body;
  const scrolling=document.scrollingElement || doc;
  const documentHeight=Math.max(doc?.scrollHeight ?? 0, body?.scrollHeight ?? 0, window.innerHeight);
  const output=document.getElementById('output');
  return {
    timeOrigin:performance.timeOrigin,
    documentHeight,
    viewportHeight:window.innerHeight,
    scrollTop:scrolling?.scrollTop ?? window.scrollY,
    maxScroll:Math.max(0, documentHeight - window.innerHeight),
    outputHeight:output?.getBoundingClientRect().height ?? 0,
    itemCount:document.querySelectorAll('#output .item-row').length,
    checkedCount:document.querySelectorAll('#output .item-row input[type="checkbox"]:checked').length,
    activeFilter:[...document.querySelectorAll('#output .filters button')]
      .find((button)=>button.classList.contains('active'))?.textContent?.trim() ?? '',
  };
})()`

async function dispatchArtifactWheel(client, sessionId, viewer, deltaY) {
  const x = Math.round((viewer.frameLeft + viewer.frameRight) / 2)
  const y = Math.round((viewer.frameTop + viewer.frameBottom) / 2)
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

async function verifyDynamicReadableArtifact(client, sessionId, baseUrl, viewport) {
  const label = `${viewport.label} dynamic Trip Packing viewer`
  const localStorageKey = 'pathforge:artifact-storage:v1:local:/artifacts/trip-packing-gemini-pro.html'
  const sessionStorageKey = 'pathforge:artifact-storage:v1:session:/artifacts/trip-packing-gemini-pro.html'
  await client.send('Runtime.evaluate', {
    expression: `localStorage.removeItem(${JSON.stringify(localStorageKey)}); sessionStorage.removeItem(${JSON.stringify(sessionStorageKey)})`,
  }, sessionId)
  const modes = await verifyProtectedArtifactViewerModes(
    client,
    sessionId,
    baseUrl,
    viewport,
    PROTECTED_VIEWER_ARTIFACTS.tripPacking,
  )
  await evaluateInContext(
    client,
    sessionId,
    undefined,
    `window.__pathforgeResponsiveIframe=document.querySelector('[data-artifact-package-id] iframe'); true`,
    `${label} iframe identity sentinel`,
  )
  const viewerIdentity = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => value?.iframeSameAsTracked === true,
    `${label} tracked iframe identity`,
  )
  const artifactContext = await artifactDocumentContext(
    client,
    sessionId,
    label,
    '#destination',
  )
  const initialDocument = await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => value?.documentHeight > 0 && value.itemCount === 0,
    `${label} initial document`,
  )

  const generated = await evaluateInContext(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    `(() => {
      const destination=document.getElementById('destination');
      const days=document.getElementById('days');
      const generate=[...document.querySelectorAll('button')]
        .find((button)=>button.textContent?.includes('Generate New Checklist'));
      if (!destination || !days || !generate) return false;
      destination.value='city';
      days.value='3';
      generate.click();
      return true;
    })()`,
    `${label} checklist generation`,
  )
  if (!generated) throw new Error(`${label} could not trigger checklist generation.`)

  let grownDocument = await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.itemCount >= 18 &&
      value.outputHeight > 1_000 &&
      value.documentHeight > initialDocument.documentHeight * 2 &&
      value.documentHeight > 2_400
    ),
    `${label} grown document`,
    20_000,
  )
  const checked = await evaluateInContext(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    `(() => {
      const checkbox=document.querySelector('#output .item-row input[type="checkbox"]');
      checkbox?.click();
      return Boolean(checkbox);
    })()`,
    `${label} checked-item sentinel`,
  )
  if (!checked) throw new Error(`${label} could not establish its checked-item sentinel.`)
  grownDocument = await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => value?.checkedCount === 1 && value.itemCount >= 18,
    `${label} checked-item state`,
    20_000,
  )
  const grownViewer = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.mode === 'readable' &&
      value.fitMode === 'readable-scroll' &&
      value.scrolling === 'auto' &&
      !value.heightPending &&
      value.measuredHeight > 2_400 &&
      value.frameHeight <= viewport.height &&
      value.rootTop >= 0 &&
      value.rootBottom <= viewport.height + 2 &&
      value.controlsTop >= 0 &&
      value.controlsBottom <= viewport.height &&
      value.scrollerScrollTop <= 2 &&
      value.documentWidth <= value.viewportWidth + 2 &&
      value.scrollerScrollWidth <= value.scrollerWidth + 2
    ),
    `${label} settled grown viewer`,
    20_000,
  )
  grownDocument = await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => Math.abs(value?.documentHeight - grownViewer.measuredHeight) <= 4,
    `${label} settled grown inner height`,
  )

  await evaluateInContext(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    'window.scrollTo(0, 0)',
    `${label} reset to natural top`,
  )
  await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => value?.scrollTop <= 1,
    `${label} natural top`,
  )
  await dispatchArtifactWheel(client, sessionId, grownViewer, 700)
  await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => value?.scrollTop >= 100,
    `${label} center-pointer downward scroll`,
  )
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await dispatchArtifactWheel(client, sessionId, grownViewer, 6_000)
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => value?.maxScroll > 0 && value.scrollTop >= value.maxScroll - 2,
    `${label} natural bottom`,
  )
  await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.controlsTop >= 0 &&
      value.controlsBottom <= viewport.height &&
      value.scrollerScrollTop <= 2
    ),
    `${label} controls while artifact is at its natural bottom`,
  )
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await dispatchArtifactWheel(client, sessionId, grownViewer, -6_000)
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => value?.scrollTop <= 1,
    `${label} center-pointer return to natural top`,
  )

  const packedSelected = await evaluateInContext(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    `(() => {
      const packed=[...document.querySelectorAll('#output .filters button')]
        .find((button)=>button.textContent?.trim()==='Packed');
      packed?.click();
      return Boolean(packed);
    })()`,
    `${label} packed contraction`,
  )
  if (!packedSelected) throw new Error(`${label} could not select the Packed filter.`)
  let contractedDocument = await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.activeFilter === 'Packed' &&
      value.itemCount === 1 &&
      value.checkedCount === 1 &&
      value.documentHeight < grownDocument.documentHeight * 0.65
    ),
    `${label} contracted document`,
    20_000,
  )
  const contractedViewer = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.mode === 'readable' &&
      !value.heightPending &&
      value.measuredHeight < grownViewer.measuredHeight * 0.65 &&
      Math.abs(value.frameHeight - grownViewer.frameHeight) <= 2 &&
      value.scrollerScrollTop <= 2
    ),
    `${label} settled contraction`,
    20_000,
  )
  contractedDocument = await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => Math.abs(value?.documentHeight - contractedViewer.measuredHeight) <= 4,
    `${label} settled contracted inner height`,
  )

  const allSelected = await evaluateInContext(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    `(() => {
      const all=[...document.querySelectorAll('#output .filters button')]
        .find((button)=>button.textContent?.trim()==='All');
      all?.click();
      return Boolean(all);
    })()`,
    `${label} checklist regrowth`,
  )
  if (!allSelected) throw new Error(`${label} could not restore the All filter.`)
  let regrownDocument = await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.activeFilter === 'All' &&
      value.itemCount >= grownDocument.itemCount &&
      value.checkedCount === 1 &&
      value.documentHeight > contractedDocument.documentHeight * 1.5
    ),
    `${label} regrown document`,
    20_000,
  )
  const regrownViewer = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.mode === 'readable' &&
      !value.heightPending &&
      value.measuredHeight > contractedViewer.measuredHeight * 1.5 &&
      Math.abs(value.frameHeight - grownViewer.frameHeight) <= 2 &&
      value.controlsTop >= 0 &&
      value.controlsBottom <= viewport.height &&
      value.scrollerScrollTop <= 2
    ),
    `${label} settled regrowth`,
    20_000,
  )
  regrownDocument = await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => Math.abs(value?.documentHeight - regrownViewer.measuredHeight) <= 4,
    `${label} settled regrown inner height`,
  )

  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-artifact-viewer-mode-control="fit-whole"]')?.click()`,
  }, sessionId)
  const fitAfterRegrowth = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.mode === 'fit-whole' &&
      value.fitMode === 'scaled' &&
      value.scale < 0.8 &&
      value.scrolling === 'no' &&
      value.artifactFitsFrame &&
      Math.abs(value.measuredHeight - regrownViewer.measuredHeight) <= 4 &&
      value.controlsTop >= 0 &&
      value.controlsBottom <= viewport.height
    ),
    `${label} fit-whole after regrowth`,
    20_000,
  )
  if (
    fitAfterRegrowth.navigationTimeOrigin !== viewerIdentity.navigationTimeOrigin ||
    fitAfterRegrowth.iframeSameAsTracked !== true
  ) {
    throw new Error(`${label} Fit-whole transition reloaded or remounted the generated artifact.`)
  }
  await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.timeOrigin === initialDocument.timeOrigin &&
      value.activeFilter === 'All' &&
      value.itemCount === regrownDocument.itemCount &&
      value.checkedCount === 1 &&
      Math.abs(value.documentHeight - regrownDocument.documentHeight) <= 4
    ),
    `${label} preserved generated state in Fit whole`,
    20_000,
  )
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('[data-artifact-viewer-mode-control="readable"]')?.click()`,
  }, sessionId)
  const readableReturn = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.mode === 'readable' &&
      value.fitMode === 'readable-scroll' &&
      value.scale >= 0.99 &&
      value.scrolling === 'auto' &&
      !value.heightPending &&
      value.controlsTop >= 0 &&
      value.controlsBottom <= viewport.height &&
      value.scrollerScrollTop <= 2 &&
      value.documentWidth <= value.viewportWidth + 2
    ),
    `${label} readable return after regrowth`,
    20_000,
  )
  if (
    readableReturn.navigationTimeOrigin !== viewerIdentity.navigationTimeOrigin ||
    readableReturn.iframeSameAsTracked !== true
  ) {
    throw new Error(`${label} readable return reloaded or remounted the generated artifact.`)
  }
  await waitForContextValue(
    client,
    artifactContext.sessionId,
    artifactContext.contextId,
    TRIP_PACKING_DOCUMENT_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.timeOrigin === initialDocument.timeOrigin &&
      value.activeFilter === 'All' &&
      value.itemCount === regrownDocument.itemCount &&
      value.checkedCount === 1 &&
      Math.abs(value.documentHeight - regrownDocument.documentHeight) <= 4
    ),
    `${label} preserved generated state after readable return`,
    20_000,
  )

  process.stdout.write(
    `[model-variant-browser] ${label} grew ${initialDocument.documentHeight}px -> ${grownDocument.documentHeight}px, contracted to ${contractedDocument.documentHeight}px, and regrew to ${regrownDocument.documentHeight}px.\n`,
  )
  return { modes, initialDocument, grownDocument, contractedDocument, regrownDocument }
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
  await waitForValue(
    client,
    sessionId,
    COMPARISON_SNAPSHOT_EXPRESSION,
    (value) => Boolean(value?.destinationHydrated && !value.heightPending),
    'comparison artifact measurement quiet window',
  )
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
    assertVisibleCameraGeometry(
      `${viewport.label} page-top switch`,
      pageTopInitial,
      pageTopSwitched,
      viewport.height,
    )
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
    assertVisibleCameraGeometry(
      `${viewport.label} page-top return`,
      pageTopInitial,
      pageTopReturned,
      viewport.height,
    )
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
  assertBuildPathViewportGeometry(`${viewport.label} deep build-path switch`, deepInitial, deepSwitched)
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
  assertBuildPathViewportGeometry(`${viewport.label} deep build-path return`, deepInitial, deepReturned)
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
  assertBuildPathViewportGeometry(`${viewport.label} deep build-path browser Back`, deepInitial, deepBack)
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
  assertBuildPathViewportGeometry(`${viewport.label} deep build-path browser Forward`, deepInitial, deepForward)
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
        if (isExpectedLocalMissingArtifactFailure(baseUrl, message.params.entry)) return
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

        await runPhase(
          'protected viewer live responsive state machine',
          COMPARISON_PHASE_TIMEOUT_MS,
          () => verifyProtectedViewerResponsiveStateMachine(client, sessionId, baseUrl),
        )

        await runPhase('desktop protected viewer modes', SELECTOR_PHASE_TIMEOUT_MS, async () => {
          const viewport = {
            label: 'desktop',
            width: 1440,
            height: 900,
            mobile: false,
          }
          await verifyProtectedArtifactViewerModes(client, sessionId, baseUrl, viewport)
          await verifyDynamicReadableArtifact(client, sessionId, baseUrl, viewport)
          await verifyProtectedArtifactViewerModes(
            client,
            sessionId,
            baseUrl,
            viewport,
            PROTECTED_VIEWER_ARTIFACTS.pomodoro,
          )
          await verifyProtectedArtifactViewerModes(
            client,
            sessionId,
            baseUrl,
            viewport,
            PROTECTED_VIEWER_ARTIFACTS.pocketRally,
          )
        })
        await runPhase('390px protected viewer modes', SELECTOR_PHASE_TIMEOUT_MS, async () => {
          const viewport = {
            label: '390px',
            width: 390,
            height: 844,
            mobile: true,
          }
          await verifyProtectedArtifactViewerModes(client, sessionId, baseUrl, viewport)
          await verifyDynamicReadableArtifact(client, sessionId, baseUrl, viewport)
          await verifyProtectedArtifactViewerModes(
            client,
            sessionId,
            baseUrl,
            viewport,
            PROTECTED_VIEWER_ARTIFACTS.pomodoro,
          )
          await verifyProtectedArtifactViewerModes(
            client,
            sessionId,
            baseUrl,
            viewport,
            PROTECTED_VIEWER_ARTIFACTS.pocketRally,
          )
        })
        await runPhase('desktop dynamic artifact frame', SELECTOR_PHASE_TIMEOUT_MS, () => (
          verifyCalmingArtifactFrameFlow(client, sessionId, baseUrl, {
            label: 'desktop artifact frame',
            width: 1440,
            height: 1000,
            mobile: false,
          })
        ))
        await runPhase('tablet dynamic artifact frame', SELECTOR_PHASE_TIMEOUT_MS, () => (
          verifyCalmingArtifactFrameFlow(client, sessionId, baseUrl, {
            label: 'tablet artifact frame',
            width: 768,
            height: 1024,
            mobile: false,
          })
        ))
        await runPhase('390px dynamic artifact frame', SELECTOR_PHASE_TIMEOUT_MS, () => (
          verifyCalmingArtifactFrameFlow(client, sessionId, baseUrl, {
            label: '390px artifact frame',
            width: 390,
            height: 844,
            mobile: true,
          })
        ))
        await runPhase('artifact height guard fixtures', SELECTOR_PHASE_TIMEOUT_MS, () => (
          verifyArtifactHeightGuardFixtures(client, sessionId, baseUrl)
        ))
        await runPhase('desktop pending viewport anchoring', SELECTOR_PHASE_TIMEOUT_MS, () => (
          verifyPendingArtifactViewportFixtures(client, sessionId, baseUrl, {
            label: 'desktop pending viewport',
            width: 1440,
            height: 1000,
            mobile: false,
          })
        ))
        await runPhase('390px pending viewport anchoring', SELECTOR_PHASE_TIMEOUT_MS, () => (
          verifyPendingArtifactViewportFixtures(client, sessionId, baseUrl, {
            label: '390px pending viewport',
            width: 390,
            height: 844,
            mobile: true,
          })
        ))

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
            `[...document.querySelectorAll('[data-artifact-package-select]')]
              .filter((button)=>{
                const rect=button.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
              })
              .map((button)=>button.dataset.artifactPackageSelect)`,
            (value) => Array.isArray(value) && value.length >= 2,
            'multiple selectable artifact packages',
          )
          const mountedBeforeRapidSwitch = await waitForValue(
            client,
            sessionId,
            `document.querySelector('[data-artifact-package-id]')?.dataset.artifactPackageId ?? ''`,
            Boolean,
            'initial mounted artifact package',
          )
          const expectedPackageId = packageIds.find((id) => id !== mountedBeforeRapidSwitch)
          if (!expectedPackageId) {
            throw new Error('Rapid artifact switch fixture did not expose a different destination package.')
          }
          const targetSelector = `[data-artifact-package-select="${expectedPackageId}"]`
          const selectionAnchor = await waitForValue(
            client,
            sessionId,
            `(async () => {
          const button=document.querySelector('[data-artifact-package-select="'+CSS.escape(${JSON.stringify(expectedPackageId)})+'"]');
          const row=button?.closest('[data-source-run-response-row]');
          if (!button || !row) return null;
          button.scrollIntoView({ block: 'center' });
          await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          const positionedRect=button.getBoundingClientRect();
          if (positionedRect.top < 140 || positionedRect.bottom > innerHeight - 80) {
            window.scrollBy(0, positionedRect.top - 240);
            await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          }
          return {
            controlTop: button.getBoundingClientRect().top,
            controlWidth: button.getBoundingClientRect().width,
            controlHeight: button.getBoundingClientRect().height,
            rowTop: row.getBoundingClientRect().top,
            sourceRunPathTop: document.getElementById('source-run-path')?.getBoundingClientRect().top ?? null,
          };
        })()`,
            (value) => (
              Number.isFinite(value?.controlTop) &&
              value.controlWidth > 0 &&
              value.controlHeight > 0 &&
              Number.isFinite(value?.rowTop) &&
              Number.isFinite(value?.sourceRunPathTop)
            ),
            'artifact switch clicked-control anchor',
          )
          await client.send('Runtime.evaluate', {
            expression: `document.querySelector(${JSON.stringify(targetSelector)})?.click()`,
          }, sessionId)
          const anchoredPackage = await waitForValue(
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
            controlTop: document.querySelector('[data-artifact-package-select="'+CSS.escape(${JSON.stringify(expectedPackageId)})+'"]')?.getBoundingClientRect().top ?? null,
            rowTop: document.querySelector('[data-artifact-package-select="'+CSS.escape(${JSON.stringify(expectedPackageId)})+'"]')?.closest('[data-source-run-response-row]')?.getBoundingClientRect().top ?? null,
            sourceRunPathTop: document.getElementById('source-run-path')?.getBoundingClientRect().top ?? null,
          };
        })()`,
            (value) => (
              value?.id === expectedPackageId &&
              !value.loading &&
              value.iframe &&
              Math.abs(value.controlTop - selectionAnchor.controlTop) <= 2 &&
              Math.abs(value.rowTop - selectionAnchor.rowTop) <= 2 &&
              Math.abs(value.sourceRunPathTop - selectionAnchor.sourceRunPathTop) <= 2
            ),
            `settled artifact at clicked control (control ${selectionAnchor.controlTop}, row ${selectionAnchor.rowTop})`,
            20_000,
          )
          if (anchoredPackage.error) throw new Error(`Artifact switch rendered ${anchoredPackage.error}.`)
          if (!anchoredPackage.path.startsWith('/artifacts/')) {
            throw new Error(`Artifact switch mounted an invalid path: ${anchoredPackage.path}.`)
          }
          if (anchoredPackage.sandbox !== 'allow-scripts allow-pointer-lock') {
            throw new Error(`Artifact frame has unexpected sandbox tokens: ${anchoredPackage.sandbox}.`)
          }
          assertNear(
            'Artifact switch clicked-control viewport anchor',
            anchoredPackage.controlTop,
            selectionAnchor.controlTop,
          )
          assertNear(
            'Artifact switch response-row viewport anchor',
            anchoredPackage.rowTop,
            selectionAnchor.rowTop,
          )

          const rapidSequence = [
            mountedBeforeRapidSwitch,
            expectedPackageId,
            mountedBeforeRapidSwitch,
          ]
          await client.send('Runtime.evaluate', {
            expression: `(async () => {
          for (const id of ${JSON.stringify(rapidSequence)}) {
            document.querySelector('[data-artifact-package-select="'+CSS.escape(id)+'"]')?.click();
            await new Promise((resolve)=>requestAnimationFrame(resolve));
          }
        })()`,
            awaitPromise: true,
          }, sessionId)
          await waitForValue(
            client,
            sessionId,
            `(() => {
          const frame=document.querySelector('[data-artifact-package-id]');
          return {
            id: frame?.dataset.artifactPackageId ?? '',
            loading: Boolean(document.querySelector('[data-artifact-loading]')),
            iframe: Boolean(frame?.querySelector('iframe[srcdoc]')),
          };
        })()`,
            (value) => value?.id === mountedBeforeRapidSwitch && !value.loading && value.iframe,
            'final rapidly selected artifact package',
            20_000,
          )
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
