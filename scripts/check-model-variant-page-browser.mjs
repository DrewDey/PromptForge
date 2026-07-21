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

const CDP_COMMAND_TIMEOUT_MS = 8_000
const CHROME_BOOT_TIMEOUT_MS = 15_000
const SELECTOR_PHASE_TIMEOUT_MS = 55_000
const COMPARISON_PHASE_TIMEOUT_MS = 75_000
const OVERALL_ASSERTION_TIMEOUT_MS = 240_000

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

async function navigateRaw(client, sessionId, url) {
  const loaded = client.waitFor('Page.loadEventFired', sessionId)
  await withTimeout(
    `navigation dispatch for ${url}`,
    CDP_COMMAND_TIMEOUT_MS,
    () => client.send('Page.navigate', { url }, sessionId),
  )
  await withTimeout(`page load for ${url}`, 15_000, () => loaded)
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
          artifactTop:artifact.getBoundingClientRect().top,
          artifactBottom:artifact.getBoundingClientRect().bottom,
          sourceRunPathTop:document.getElementById('source-run-path')?.getBoundingClientRect().top ?? null,
          scrollY:window.scrollY,
          frameHeight:document.querySelector('[data-artifact-package-id]')?.getBoundingClientRect().height ?? null,
        };
        const samples=[];
        const startedAt=performance.now();
        let settledFrames=0;
        link.click();
        while (performance.now()-startedAt < 7_000) {
          await new Promise((resolve)=>requestAnimationFrame(()=>setTimeout(resolve, 0)));
          const currentArtifact=document.getElementById('final-result');
          const sourceRunPath=document.getElementById('source-run-path');
          const frame=currentArtifact?.querySelector('[data-artifact-package-id]');
          const fitMode=frame?.dataset.artifactFitMode ?? '';
          const heightGuard=frame?.dataset.artifactHeightGuard ?? '';
          const heightPending=frame?.dataset.artifactHeightPending === 'true';
          const settled=Boolean(
            new URLSearchParams(location.search).get('run') === runId &&
            frame?.dataset.artifactPath === artifactPath &&
            !heightPending &&
            (fitMode === expectedFitMode || (!expectedFitMode && (
              fitMode === 'native' || fitMode === 'scaled' || fitMode === 'blocked' || heightGuard !== 'none'
            )))
          );
          samples.push({
            elapsed:performance.now()-startedAt,
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

async function positionQaArtifactPathSeam(client, sessionId, viewport, label) {
  const desiredTop = Math.round(viewport.height * 0.62)
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
    `${viewport.label} visible artifact-path seam`,
  )
  const delayedSeamRoute = await sampleQaRouteTransition(client, sessionId, {
    runId: 'delayed',
    artifactPath: '/qa/artifact-height-guards/delayed',
    expectedFitMode: 'native',
    label: `${viewport.label} visible-seam contraction route`,
  })
  assertContinuousViewportSamples(
    `${viewport.label} visible-seam contraction route`,
    delayedSeamRoute,
    {
      sourceRunPathTop: visibleSeam.sourceRunPathTop,
      artifactBottom: visibleSeam.artifactBottom,
    },
  )
  assertDelayedPostPaintMeasurement(
    `${viewport.label} visible-seam contraction route`,
    delayedSeamRoute,
    '/qa/artifact-height-guards/delayed',
  )
  const tallSeamReturn = await sampleQaRouteTransition(client, sessionId, {
    runId: 'tall',
    artifactPath: '/qa/artifact-height-guards/tall',
    expectedFitMode: 'native',
    label: `${viewport.label} visible-seam expansion route`,
  })
  assertContinuousViewportSamples(
    `${viewport.label} visible-seam expansion route`,
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
  const scroller=root?.parentElement;
  return {
    mode:root?.dataset.artifactViewerMode ?? '',
    rootWidth:rootRect?.width ?? null,
    frameWidth:frameRect?.width ?? null,
    frameHeight:frameRect?.height ?? null,
    iframeWidth:iframeRect?.width ?? null,
    iframeHeight:iframeRect?.height ?? null,
    scale:Number(frame?.dataset.artifactScale ?? Number.NaN),
    heightMode:frame?.dataset.artifactHeightMode ?? '',
    fitMode:frame?.dataset.artifactFitMode ?? '',
    heightPending:frame?.dataset.artifactHeightPending === 'true',
    measuredWidth:Number(frame?.dataset.artifactMeasuredWidth ?? Number.NaN),
    measuredHeight:Number(frame?.dataset.artifactMeasuredHeight ?? Number.NaN),
    virtualWidth:Number(frame?.dataset.artifactVirtualWidth ?? Number.NaN),
    artifactReady:Boolean(iframe?.srcdoc),
    scrolling:iframe?.getAttribute('scrolling') ?? '',
    documentWidth:document.documentElement.scrollWidth,
    viewportWidth:window.innerWidth,
    scrollerWidth:scroller?.clientWidth ?? null,
    scrollerScrollWidth:scroller?.scrollWidth ?? null,
    readablePressed:document.querySelector('[data-artifact-viewer-mode-control="readable"]')?.getAttribute('aria-pressed') ?? '',
    fitWholePressed:document.querySelector('[data-artifact-viewer-mode-control="fit-whole"]')?.getAttribute('aria-pressed') ?? '',
    artifactFitsFrame:Boolean(
      frameRect && iframeRect &&
      iframeRect.width <= frameRect.width + 2 &&
      iframeRect.height <= frameRect.height + 2
    ),
  };
})()`

async function verifyProtectedArtifactViewerModes(client, sessionId, baseUrl, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  }, sessionId)

  const viewerUrl = new URL('/artifact-viewer', baseUrl)
  viewerUrl.searchParams.set('path', CALMING_SLEEP_RUNS.claude.artifactPath)
  viewerUrl.searchParams.set('title', 'Calming sleep sound mixer')
  viewerUrl.searchParams.set('provider', 'Claude')
  await navigateRaw(client, sessionId, viewerUrl.href)

  const readable = await waitForValue(
    client,
    sessionId,
    PROTECTED_VIEWER_SNAPSHOT_EXPRESSION,
    (value) => (
      value?.mode === 'readable' &&
      value.heightMode === 'measured-content' &&
      !value.heightPending &&
      value.artifactReady &&
      value.readablePressed === 'true' &&
      value.fitWholePressed === 'false' &&
      value.scale >= 0.99 &&
      value.scrolling === 'no' &&
      Number.isFinite(value.measuredWidth) &&
      value.measuredWidth > 0 &&
      value.frameHeight > viewport.height * 1.2
    ),
    `${viewport.label} protected viewer readable mode`,
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
      value.fitMode === 'scaled' &&
      value.scale < readable.scale - 0.05 &&
      value.scrolling === 'no' &&
      value.artifactFitsFrame &&
      value.documentWidth <= value.viewportWidth + 2
    ),
    `${viewport.label} protected viewer fit-whole mode`,
    20_000,
  )
  if (fitWhole.frameHeight > viewport.height) {
    throw new Error(`${viewport.label} fit-whole artifact frame exceeded the visible window.`)
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
      value.heightMode === 'measured-content' &&
      !value.heightPending &&
      value.readablePressed === 'true' &&
      value.scale >= 0.99 &&
      value.frameHeight > viewport.height * 1.2 &&
      Math.abs(value.measuredWidth - readable.measuredWidth) <= 2 &&
      Math.abs(value.rootWidth - readable.rootWidth) <= 2 &&
      Math.abs(value.frameWidth - readable.frameWidth) <= 2 &&
      value.scrollerScrollWidth <= readable.scrollerScrollWidth + 2
    ),
    `${viewport.label} protected viewer readable return`,
    20_000,
  )
  if (readableReturn.scrollerScrollWidth > readableReturn.scrollerWidth + 2) {
    throw new Error(`${viewport.label} readable return introduced horizontal viewer overflow.`)
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
        await runPhase('desktop protected viewer modes', SELECTOR_PHASE_TIMEOUT_MS, () => (
          verifyProtectedArtifactViewerModes(client, sessionId, baseUrl, {
            label: 'desktop',
            width: 1440,
            height: 1000,
            mobile: false,
          })
        ))
        await runPhase('390px protected viewer modes', SELECTOR_PHASE_TIMEOUT_MS, () => (
          verifyProtectedArtifactViewerModes(client, sessionId, baseUrl, {
            label: '390px',
            width: 390,
            height: 844,
            mobile: true,
          })
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
