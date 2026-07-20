#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { isExpectedLocalActivationFailure } from './browser-guard-errors.mjs'
import {
  CdpClient,
  chromeExecutable,
  waitForWebSocketUrl,
} from './measure-html-artifacts.mjs'

const PROJECT_ID = '0ddfc7cf-37bf-47ae-8fe0-d8d445ba1bee'
const CALMING_PROJECT_ID = 'dc5e67c3-42d0-4823-ae23-586b7d3985cb'
const GEMINI_RUN = '4fcd2293646af036'
const CHATGPT_RUN = 'c42eebed94a0395e'
const SONNET_RUN = '08c8b725-4228-4b24-a6e6-5d7fcf78457c'
const GEMINI_ARTIFACT = '/artifacts/booking-flow-handoff-simulator-gemini-31-pro-repair-2.html'
const CHATGPT_ARTIFACT = '/artifacts/booking-flow-handoff-simulator-chatgpt-gpt56-luna-final.html'
const SONNET_ARTIFACT = '/artifacts/booking-flow-handoff-simulator-claude-sonnet46-low.html'
const CALMING_EXACT_ISSUE = 'Presets move the visible master control without applying the same value to the live master gain.'
let navigationSequence = 0

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

function localFaviconFailure(baseUrl, entry) {
  if (!/\b404\b/.test(entry?.text ?? '') || !entry?.url) return false
  const base = new URL(baseUrl)
  const request = new URL(entry.url, base)
  return request.origin === base.origin && request.pathname === '/favicon.ico'
}

async function withTimeout(promise, label, timeoutMs = 15_000) {
  let timeout
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timeout)
  }
}

async function evaluate(client, sessionId, expression) {
  const { result, exceptionDetails } = await withTimeout(
    client.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    }, sessionId),
    'Runtime.evaluate',
  )
  if (exceptionDetails) throw new Error(exceptionDetails.text ?? 'Browser evaluation failed.')
  return result.value
}

async function waitForValue(client, sessionId, expression, predicate, label, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  let lastValue
  while (Date.now() < deadline) {
    lastValue = await evaluate(client, sessionId, expression)
    if (predicate(lastValue)) return lastValue
    await new Promise((resolve) => setTimeout(resolve, 75))
  }
  throw new Error(`${label} timed out; last value was ${JSON.stringify(lastValue)}.`)
}

async function navigate(client, sessionId, url) {
  const targetUrl = new URL(url)
  targetUrl.searchParams.set('qa-guard', String(++navigationSequence))
  const domReady = client.waitFor('Page.domContentEventFired', sessionId, 20_000)
  await client.send('Page.navigate', { url: targetUrl.toString() }, sessionId)
  await domReady
  await client.send('Page.bringToFront', {}, sessionId)
  await waitForValue(
    client,
    sessionId,
    `({
      ready:document.readyState,
      cards:document.querySelectorAll('[data-path-model-card]').length,
      selected:document.querySelector('[data-path-model-card]')?.dataset.selectedSourceRun,
      trigger:Boolean(document.querySelector('[data-model-list-trigger]'))
    })`,
    (value) => value?.ready !== 'loading' && value.cards === 1 && value.selected === GEMINI_RUN && value.trigger,
    'hydrated selected model card',
  )
}

function assertEqual(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`)
  }
}

function assertRectStable(label, before, after, tolerance = 1) {
  for (const field of ['x', 'y']) {
    const delta = Math.abs((after?.shell?.[field] ?? Number.NaN) - (before?.shell?.[field] ?? Number.NaN))
    if (!Number.isFinite(delta) || delta > tolerance) {
      throw new Error(`${label} moved the card ${field} position by ${Number.isFinite(delta) ? delta.toFixed(2) : 'NaN'}px.`)
    }
  }
  const scrollDelta = Math.abs((after?.scrollY ?? Number.NaN) - (before?.scrollY ?? Number.NaN))
  if (!Number.isFinite(scrollDelta) || scrollDelta > tolerance) {
    throw new Error(`${label} changed the page scroll position by ${Number.isFinite(scrollDelta) ? scrollDelta.toFixed(2) : 'NaN'}px.`)
  }
  for (const region of ['shell', 'stage', 'preview', 'backplate']) {
    for (const field of ['width', 'height']) {
      const delta = Math.abs((after?.[region]?.[field] ?? Number.NaN) - (before?.[region]?.[field] ?? Number.NaN))
      if (!Number.isFinite(delta) || delta > tolerance) {
        throw new Error(`${label} changed ${region}.${field} by ${Number.isFinite(delta) ? delta.toFixed(2) : 'NaN'}px.`)
      }
    }
  }
  for (const region of ['stage', 'preview', 'backplate']) {
    for (const field of ['x', 'y']) {
      const beforeOffset = (before?.[region]?.[field] ?? Number.NaN) - (before?.shell?.[field] ?? Number.NaN)
      const afterOffset = (after?.[region]?.[field] ?? Number.NaN) - (after?.shell?.[field] ?? Number.NaN)
      const delta = Math.abs(afterOffset - beforeOffset)
      if (!Number.isFinite(delta) || delta > tolerance) {
        throw new Error(`${label} changed ${region}.${field} inside the card by ${Number.isFinite(delta) ? delta.toFixed(2) : 'NaN'}px.`)
      }
    }
  }
}

const SNAPSHOT_EXPRESSION = `(() => {
  const rect=(element)=>{
    if (!element) return null;
    const value=element.getBoundingClientRect();
    return {x:value.x,y:value.y,width:value.width,height:value.height};
  };
  const card=document.querySelector('[data-path-model-card="${PROJECT_ID}"]');
  const selector=card?.querySelector('[data-path-model-selector]');
  const trigger=selector?.querySelector('[data-model-list-trigger]');
  const menu=selector?.querySelector('[data-model-list]');
  const menuRect=menu?.getBoundingClientRect();
  const menuHit=menuRect
    ? document.elementFromPoint(menuRect.left+Math.min(18,menuRect.width/2),menuRect.top+Math.min(18,menuRect.height/2))
    : null;
  const primaryLink=card?.querySelector('[data-path-card-primary-link]');
  const activeOrder=selector?.querySelector('[data-model-order-option="active"]');
  const newOrder=selector?.querySelector('[data-model-order-option="new"]');
  const activityNoteId=selector?.getAttribute('aria-describedby');
  const protectedFrame=card?.querySelector('[data-artifact-path]');
  const headerRect=document.querySelector('header')?.getBoundingClientRect();
  return {
    cardCount:document.querySelectorAll('[data-path-model-card]').length,
    selectorCount:document.querySelectorAll('[data-path-model-selector]').length,
    scrollY:window.scrollY,
    overflow:Math.max(0,document.documentElement.scrollWidth-window.innerWidth),
    nextDialog:Boolean(document.querySelector('[data-nextjs-dialog]')),
    selected:card?.dataset.selectedSourceRun || '',
    orderMode:card?.dataset.modelOrderMode || '',
    artifact:card?.dataset.selectedArtifact || '',
    promptCount:Number(card?.querySelector('[data-selected-prompt-count]')?.dataset.selectedPromptCount),
    href:primaryLink ? new URL(primaryLink.href).pathname+new URL(primaryLink.href).search : '',
    nestedInteractive:Boolean(primaryLink?.querySelector('a,button,input,select,textarea,summary,details,iframe,[tabindex]:not([tabindex="-1"]),[role="button"],[role="link"]')),
    incompleteMenuPattern:Boolean(selector?.querySelector('[aria-haspopup="menu"], [role="menu"], [role="menuitemradio"]')),
    triggerText:trigger?.textContent?.replace(/\\s+/g,' ').trim() || '',
    modelCount:Number(selector?.dataset.modelCount || 0),
    modelTotal:selector?.querySelector('[data-model-total]')?.textContent?.replace(/\\s+/g,' ').trim() || '',
    orderText:selector?.querySelector('[data-model-order]')?.textContent?.replace(/\\s+/g,' ').trim() || '',
    activeOrderTag:activeOrder?.tagName || '',
    activeOrderDisabled:Boolean(activeOrder?.disabled),
    activeOrderPressed:activeOrder?.getAttribute('aria-pressed') || '',
    newOrderPressed:newOrder?.getAttribute('aria-pressed') || '',
    activityNote:activityNoteId ? document.getElementById(activityNoteId)?.textContent?.replace(/\\s+/g,' ').trim() || '' : '',
    menuOpen:selector?.dataset.modelMenuOpen || '',
    optionIds:[...(menu?.querySelectorAll('[data-model-option]') || [])].map((option)=>option.dataset.sourceRunId),
    optionModels:[...(menu?.querySelectorAll('[data-model-option] strong') || [])].map((entry)=>entry.textContent?.trim()),
    optionDates:[...(menu?.querySelectorAll('[data-model-option] time') || [])].map((entry)=>entry.textContent?.trim()),
    knownIssueCount:selector?.querySelectorAll('[data-model-known-issue]').length || 0,
    knownIssueExplanations:[...(selector?.querySelectorAll('[data-known-issue-explanation]') || [])].map((entry)=>entry.dataset.knownIssueExplanation || ''),
    visibleKnownIssueTooltips:[...(selector?.querySelectorAll('[role="tooltip"]') || [])].filter((entry)=>{
      const style=getComputedStyle(entry);
      return style.visibility === 'visible' && Number(style.opacity) > 0;
    }).map((entry)=>entry.textContent?.replace(/\\s+/g,' ').trim() || ''),
    visibleKnownIssueTooltipRects:[...(selector?.querySelectorAll('[role="tooltip"]') || [])].filter((entry)=>{
      const style=getComputedStyle(entry);
      return style.visibility === 'visible' && Number(style.opacity) > 0;
    }).map(rect),
    cardIssueFocused:document.activeElement === selector?.querySelector('.path-model-card-issue'),
    stickyHeaderBottom:headerRect ? headerRect.bottom : 0,
    menuVisible:Boolean(menu && menuHit && menu.contains(menuHit)),
    focusedTrigger:document.activeElement === trigger,
    focusedOptionId:document.activeElement?.dataset?.sourceRunId || '',
    controlSizes:[...(selector?.querySelectorAll('[data-model-cycle], [data-model-list-trigger]') || [])].map(rect),
    orderControlSizes:[...(selector?.querySelectorAll('[data-model-order-option]') || [])].map(rect),
    previewMounted:card?.querySelector('[data-path-card-preview-mounted]')?.dataset.pathCardPreviewMounted || '',
    protectedArtifact:protectedFrame?.dataset.artifactPath || '',
    artifactReady:Boolean(protectedFrame?.querySelector('iframe[srcdoc]')),
    fitMode:protectedFrame?.dataset.artifactFitMode || '',
    shell:rect(card),
    stage:rect(card?.querySelector('[data-path-card-stage]')),
    preview:rect(card?.querySelector('[data-path-card-preview]')),
    backplate:rect(card?.querySelector('[data-path-card-backplate]')),
  };
})()`

async function snapshot(client, sessionId) {
  return evaluate(client, sessionId, SNAPSHOT_EXPRESSION)
}

async function controlPoint(client, sessionId, selector) {
  return evaluate(client, sessionId, `(async () => {
    const control=document.querySelector(${JSON.stringify(selector)});
    if (!(control instanceof HTMLElement)) return null;
    let rect=control.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight || rect.left < 0 || rect.right > window.innerWidth) {
      control.scrollIntoView({block:'center',inline:'center'});
      await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      rect=control.getBoundingClientRect();
    }
    const x=rect.left+rect.width/2;
    const y=rect.top+rect.height/2;
    const hit=document.elementFromPoint(x,y);
    return {x,y,width:rect.width,height:rect.height,hit:Boolean(hit && (hit === control || control.contains(hit)))};
  })()`)
}

async function pointerClick(client, sessionId, selector) {
  const point = await controlPoint(client, sessionId, selector)
  if (!point?.hit) throw new Error(`Pointer hit-testing failed for ${selector}.`)
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y }, sessionId)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: point.x, y: point.y, button: 'left', buttons: 1, clickCount: 1,
  }, sessionId)
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: point.x, y: point.y, button: 'left', buttons: 0, clickCount: 1,
  }, sessionId)
}

async function pressKey(client, sessionId, key) {
  const definitions = {
    Enter: { code: 'Enter', keyCode: 13, text: '\r' },
    Escape: { code: 'Escape', keyCode: 27 },
    Tab: { code: 'Tab', keyCode: 9 },
  }
  const definition = definitions[key]
  if (!definition) throw new Error(`Unsupported key: ${key}`)
  await client.send('Input.dispatchKeyEvent', {
    type: definition.text ? 'keyDown' : 'rawKeyDown',
    key,
    code: definition.code,
    windowsVirtualKeyCode: definition.keyCode,
    nativeVirtualKeyCode: definition.keyCode,
    ...(definition.text ? { text: definition.text, unmodifiedText: definition.text } : {}),
  }, sessionId)
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp', key, code: definition.code,
    windowsVirtualKeyCode: definition.keyCode,
    nativeVirtualKeyCode: definition.keyCode,
  }, sessionId)
}

async function screenshot(client, sessionId, file) {
  const result = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  }, sessionId)
  writeFileSync(file, Buffer.from(result.data, 'base64'))
}

async function prepareFixture(client, sessionId, options) {
  await navigate(client, sessionId, `${options.baseUrl}/qa/path-card-concepts`)
  await controlPoint(client, sessionId, '[data-path-model-card]')
  await waitForValue(
    client,
    sessionId,
    `(() => {
      const mount=document.querySelector('[data-path-card-preview-mounted]');
      const frame=document.querySelector('[data-artifact-path]');
      return {
        mounted:mount?.dataset.pathCardPreviewMounted,
        iframe:Boolean(frame?.querySelector('iframe[srcdoc]')),
        fit:frame?.dataset.artifactFitMode || ''
      };
    })()`,
    (value) => value?.mounted === 'true' && value.iframe && value.fit && value.fit !== 'loading',
    'settled real artifact preview',
  )
}

async function verifyCompareModelCatalog(client, sessionId, options, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  }, sessionId)
  const targetUrl = new URL(`${options.baseUrl}/paths?compare=models`)
  targetUrl.searchParams.set('qa-guard', String(++navigationSequence))
  const targetHref = targetUrl.toString()
  const domReady = client.waitFor('Page.domContentEventFired', sessionId, 20_000)
  await client.send('Page.navigate', { url: targetHref }, sessionId)
  await domReady
  await waitForValue(
    client,
    sessionId,
    `({
      href:location.href,
      cards:document.querySelectorAll('[data-path-model-card]').length,
      skeletons:document.querySelectorAll('.skeleton-shimmer').length
    })`,
    (value) => value?.href === targetHref && value.cards === 8 && value.skeletons === 0,
    `${viewport.name} rendered multi-model Explore results`,
    20_000,
  )
  await new Promise((resolve) => setTimeout(resolve, 750))
  await waitForValue(
    client,
    sessionId,
    `({
      href:location.href,
      cards:document.querySelectorAll('[data-path-model-card]').length,
      skeletons:document.querySelectorAll('.skeleton-shimmer').length
    })`,
    (value) => value?.href === targetHref && value.cards === 8 && value.skeletons === 0,
    `${viewport.name} stable rendered multi-model Explore results`,
    20_000,
  )
  await controlPoint(client, sessionId, '[data-path-model-card]')
  const stateExpression = `(() => {
    const cards=[...document.querySelectorAll('[data-path-model-card]')];
    const selectors=cards.map((card)=>card.querySelector('[data-path-model-selector]'));
    const calmingCard=cards.find((card)=>card.dataset.pathModelCard === '${CALMING_PROJECT_ID}');
    const calmingSelector=calmingCard?.querySelector('[data-path-model-selector]');
    const visibleCards=cards.filter((card)=>{
      const rect=card.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
    const visiblePreviewsSettled=visibleCards.length > 0 && visibleCards.every((card)=>{
      const mount=card.querySelector('[data-path-card-preview-mounted]');
      const frame=card.querySelector('[data-artifact-fit-mode]');
      return mount?.dataset.pathCardPreviewMounted === 'true' &&
        Boolean(frame?.querySelector('iframe[srcdoc]')) &&
        !frame?.querySelector('[data-artifact-loading]') &&
        frame?.dataset.artifactFitMode !== 'loading';
    });
    return {
      href:location.href,
      ready:document.readyState,
      skeletons:document.querySelectorAll('.skeleton-shimmer').length,
      heading:document.querySelector('.path-section-heading h2')?.textContent?.trim() || '',
      cardCount:cards.length,
      visibleCardCount:visibleCards.length,
      visiblePreviewsSettled,
      selectorCounts:selectors.map((selector)=>Number(selector?.dataset.modelCount || 0)),
      calmingModelCount:Number(calmingSelector?.dataset.modelCount || 0),
      calmingIssueCount:calmingSelector?.querySelectorAll('[data-model-known-issue]').length || 0,
      calmingIssueExplanations:[...(calmingSelector?.querySelectorAll('[data-known-issue-explanation]') || [])].map((entry)=>entry.dataset.knownIssueExplanation || ''),
      visibleTotals:selectors.map((selector)=>selector?.querySelector('[data-model-total]')?.textContent?.replace(/\\s+/g,' ').trim() || ''),
      compareCount:document.querySelector('.path-filter-count')?.textContent?.trim() || '',
      footerText:cards.map((card)=>card.querySelector('.path-card-anatomy')?.textContent?.replace(/\\s+/g,' ').trim() || ''),
      overflow:Math.max(0,document.documentElement.scrollWidth-window.innerWidth),
      nextDialog:Boolean(document.querySelector('[data-nextjs-dialog]')),
    };
  })()`
  const compareIsSettled = (value) => (
    value?.href === targetHref &&
    value.ready === 'complete' &&
    value.skeletons === 0 &&
    value.cardCount === 8 &&
    value.visiblePreviewsSettled
  )
  await waitForValue(
    client,
    sessionId,
    stateExpression,
    compareIsSettled,
    `${viewport.name} eight multi-model Explore results`,
    20_000,
  )
  await new Promise((resolve) => setTimeout(resolve, 500))
  const state = await waitForValue(
    client,
    sessionId,
    stateExpression,
    compareIsSettled,
    `${viewport.name} stable multi-model Explore results`,
    20_000,
  )
  if (
    state.heading !== '8 paths match.' ||
    state.compareCount !== '8' ||
    state.selectorCounts.some((count) => count < 2) ||
    state.visibleTotals.some((label) => !/^\d+ models$/.test(label))
  ) {
    throw new Error(`${viewport.name} Compare models did not expose eight clearly counted multi-model projects: ${JSON.stringify(state)}.`)
  }
  if (
    state.calmingModelCount !== 3 ||
    state.calmingIssueCount < 1 ||
    !state.calmingIssueExplanations.some((explanation) => explanation.includes(CALMING_EXACT_ISSUE))
  ) {
    throw new Error(`${viewport.name} Calming Mixer did not expose all three models and its explained known issue: ${JSON.stringify(state)}.`)
  }
  if (state.footerText.some((text) => /ChatGPT|Gemini|Claude|GPT-/i.test(text))) {
    throw new Error(`${viewport.name} lower card footer still duplicates the selected model name.`)
  }
  if (state.overflow !== 0 || state.nextDialog) {
    throw new Error(`${viewport.name} Compare models rendered overflow or a Next.js error dialog.`)
  }
  if (options.screenshotDir) {
    await screenshot(client, sessionId, path.join(options.screenshotDir, `${viewport.name}-compare-models.png`))
  }
  const calmingIssueSelector = `[data-path-model-card="${CALMING_PROJECT_ID}"] .path-model-card-issue`
  await pointerClick(client, sessionId, calmingIssueSelector)
  const calmingIssueTooltip = await waitForValue(
    client,
    sessionId,
    `(() => {
      const issue=document.querySelector(${JSON.stringify(`[data-path-model-card="${CALMING_PROJECT_ID}"] .path-model-card-issue`)});
      const tooltip=issue?.querySelector('[role="tooltip"]');
      const tooltipStyle=tooltip ? getComputedStyle(tooltip) : null;
      const tooltipRect=tooltip?.getBoundingClientRect();
      const headerRect=document.querySelector('header')?.getBoundingClientRect();
      return {
        text:tooltip?.textContent?.replace(/\\s+/g,' ').trim() || '',
        visible:Boolean(tooltipStyle && tooltipStyle.visibility === 'visible' && Number(tooltipStyle.opacity) > 0),
        rect:tooltipRect ? {x:tooltipRect.x,y:tooltipRect.y,width:tooltipRect.width,height:tooltipRect.height} : null,
        stickyHeaderBottom:headerRect?.bottom || 0,
      };
    })()`,
    (value) => value?.visible && value.text.includes(CALMING_EXACT_ISSUE),
    `${viewport.name} Calming Mixer card issue tooltip`,
  )
  if (
    !calmingIssueTooltip.rect ||
    calmingIssueTooltip.rect.x < 0 ||
    calmingIssueTooltip.rect.y < calmingIssueTooltip.stickyHeaderBottom ||
    calmingIssueTooltip.rect.x + calmingIssueTooltip.rect.width > viewport.width ||
    calmingIssueTooltip.rect.y + calmingIssueTooltip.rect.height > viewport.height
  ) {
    throw new Error(`${viewport.name} Calming Mixer card issue tooltip escaped the usable viewport: ${JSON.stringify(calmingIssueTooltip)}.`)
  }
  if (options.screenshotDir) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    await screenshot(client, sessionId, path.join(options.screenshotDir, `${viewport.name}-calming-card-issue-tooltip.png`))
  }
  console.log(`[${viewport.name}] Compare models catalog passed`)
}

async function verifyKnownIssueProjectMenu(client, sessionId, options, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  }, sessionId)
  const targetUrl = new URL(`${options.baseUrl}/calming-sleep-sound-mixer-demo`)
  targetUrl.searchParams.set('run', 'cf73efd5-2fb6-48fe-a9fd-a1a0df336d18')
  targetUrl.searchParams.set('qa-guard', String(++navigationSequence))
  const domReady = client.waitFor('Page.domContentEventFired', sessionId, 20_000)
  await client.send('Page.navigate', { url: targetUrl.toString() }, sessionId)
  await domReady
  await waitForValue(
    client,
    sessionId,
    `({
      href:location.href,
      ready:document.readyState,
      selector:Boolean(document.querySelector('[data-model-variant-selector]')),
      issue:Boolean(document.querySelector('[data-model-variant-selector] [data-model-known-issue]')),
      skeletons:document.querySelectorAll('.skeleton-shimmer').length
    })`,
    (value) => (
      value?.href === targetUrl.toString() &&
      value.ready === 'complete' &&
      value.selector &&
      value.issue &&
      value.skeletons === 0
    ),
    `${viewport.name} known-issue project selector`,
    20_000,
  )
  await waitForValue(
    client,
    sessionId,
    `(() => {
      const frame=document.querySelector('[data-artifact-fit-mode]');
      return {
        iframe:Boolean(frame?.querySelector('iframe[srcdoc]')),
        loading:Boolean(document.querySelector('[data-artifact-loading]')),
        fit:frame?.dataset.artifactFitMode || ''
      };
    })()`,
    (value) => value?.iframe && !value.loading && value.fit && value.fit !== 'loading',
    `${viewport.name} settled known-issue project artifact`,
    20_000,
  )

  await evaluate(
    client,
    sessionId,
    `document.querySelector('[data-model-variant-selector] summary')?.click()`,
  )
  await waitForValue(
    client,
    sessionId,
    `Boolean(document.querySelector('[data-model-variant-selector] details[open]'))`,
    Boolean,
    `${viewport.name} open known-issue project menu`,
  )
  if (!viewport.mobile) {
    await evaluate(
      client,
      sessionId,
      `document.querySelector('[data-model-variant-run="cf73efd5-2fb6-48fe-a9fd-a1a0df336d18"] [data-model-known-issue]')?.focus()`,
    )
  }
  const state = await waitForValue(
    client,
    sessionId,
    `(() => {
      const selector=document.querySelector('[data-model-variant-selector]');
      const summary=selector?.querySelector('summary');
      const rows=[...document.querySelectorAll('[data-model-variant-run]')];
      const issue=selector?.querySelector('[data-model-variant-run="cf73efd5-2fb6-48fe-a9fd-a1a0df336d18"] [data-model-known-issue]');
      const tooltip=issue?.querySelector('[role="tooltip"]');
      const style=tooltip ? getComputedStyle(tooltip) : null;
      return {
        summaryText:summary?.textContent?.replace(/\\s+/g,' ').trim() || '',
        rows:rows.map((row)=>row.dataset.modelVariantRun),
        explanation:issue?.dataset.knownIssueExplanation || '',
        tooltipText:tooltip?.textContent?.replace(/\\s+/g,' ').trim() || '',
        tooltipVisible:Boolean(style && style.visibility === 'visible' && Number(style.opacity) > 0),
        skeletons:document.querySelectorAll('.skeleton-shimmer').length,
        artifactReady:Boolean(document.querySelector('[data-artifact-fit-mode] iframe[srcdoc]')),
        overflow:Math.max(0,document.documentElement.scrollWidth-window.innerWidth),
        nextDialog:Boolean(document.querySelector('[data-nextjs-dialog]')),
      };
    })()`,
    (value) => (
      value?.rows?.length === 3 &&
      value.tooltipVisible &&
      value.skeletons === 0 &&
      value.artifactReady
    ),
    `${viewport.name} explained known-issue model row`,
  )
  if (
    !state.summaryText.includes('Known issue') ||
    !state.explanation.includes(CALMING_EXACT_ISSUE) ||
    !state.tooltipText.includes('Historical run preserved for comparison')
  ) {
    throw new Error(`${viewport.name} project dropdown omitted its source-backed issue explanation.`)
  }
  if (state.overflow !== 0 || state.nextDialog) {
    throw new Error(`${viewport.name} known-issue project menu rendered overflow or a Next.js error dialog.`)
  }
  if (viewport.mobile) {
    await evaluate(
      client,
      sessionId,
      `document.querySelector('[data-model-variant-run="cf73efd5-2fb6-48fe-a9fd-a1a0df336d18"]')?.scrollIntoView({block:'center'})`,
    )
    await waitForValue(
      client,
      sessionId,
      `(() => {
        const row=document.querySelector('[data-model-variant-run="cf73efd5-2fb6-48fe-a9fd-a1a0df336d18"]');
        const rect=row?.getBoundingClientRect();
        return rect ? {top:rect.top,bottom:rect.bottom,height:innerHeight} : null;
      })()`,
      (value) => value && value.top >= 0 && value.bottom <= value.height,
      `${viewport.name} visible known-issue project row`,
    )
  }
  if (options.screenshotDir) {
    await screenshot(client, sessionId, path.join(options.screenshotDir, `${viewport.name}-known-issue-project-menu.png`))
  }
  console.log(`[${viewport.name}] known-issue project menu passed`)
}

async function verifyViewport(client, sessionId, options, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  }, sessionId)
  await prepareFixture(client, sessionId, options)

  const initial = await snapshot(client, sessionId)
  assertEqual(`${viewport.name} fixture counts`, [initial.cardCount, initial.selectorCount], [1, 1])
  if (initial.overflow !== 0 || initial.nextDialog) {
    throw new Error(`${viewport.name} rendered overflow or a Next.js error dialog.`)
  }
  if (
    initial.selected !== GEMINI_RUN ||
    initial.artifact !== GEMINI_ARTIFACT ||
    initial.promptCount !== 3 ||
    initial.href !== `/booking-flow-handoff-simulator-demo?run=${GEMINI_RUN}`
  ) throw new Error(`${viewport.name} did not start on the exact newest Gemini receipt.`)
  if (!initial.triggerText.includes('Gemini 3.1 Pro') || !initial.triggerText.includes('Verified · 3 models total') || !initial.triggerText.includes('Jul 11, 2026')) {
    throw new Error(`${viewport.name} omitted the selected model, total model count, or capture date.`)
  }
  if (initial.modelCount !== 3 || initial.modelTotal !== '3 models') {
    throw new Error(`${viewport.name} did not expose the exact model count before opening the selector.`)
  }
  if (!['Order', 'New', 'Active'].every((label) => initial.orderText.includes(label))) {
    throw new Error(`${viewport.name} did not show the New and Active ordering controls.`)
  }
  if (
    initial.activeOrderTag !== 'BUTTON' ||
    initial.activeOrderDisabled ||
    initial.activeOrderPressed !== 'false' ||
    initial.newOrderPressed !== 'true'
  ) {
    throw new Error(`${viewport.name} did not expose working New and Active buttons for a multi-model card.`)
  }
  if (!initial.activityNote.includes('model provider')) {
    throw new Error(`${viewport.name} omitted the truthful Active-order definition.`)
  }
  if (
    initial.knownIssueCount !== 1 ||
    !initial.knownIssueExplanations.some((explanation) => /FAILED state/i.test(explanation))
  ) {
    throw new Error(`${viewport.name} card-level issue indicator did not explain the preserved Sonnet defect.`)
  }
  if (initial.nestedInteractive || initial.incompleteMenuPattern) {
    throw new Error(`${viewport.name} retained nested controls or an incomplete ARIA menu pattern.`)
  }
  if (viewport.mobile && initial.controlSizes.some((rect) => rect.width < 44 || rect.height < 44)) {
    throw new Error(`${viewport.name} has a selector control smaller than 44px.`)
  }
  if (options.screenshotDir) {
    await screenshot(client, sessionId, path.join(options.screenshotDir, `${viewport.name}-initial.png`))
  }

  if (!viewport.mobile) {
    const issuePoint = await controlPoint(client, sessionId, '.path-model-card-issue')
    if (!issuePoint?.hit) throw new Error(`${viewport.name} known-issue indicator could not be hovered.`)
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: issuePoint.x, y: issuePoint.y }, sessionId)
    const hoveredIssue = await waitForValue(
      client,
      sessionId,
      SNAPSHOT_EXPRESSION,
      (value) => value?.visibleKnownIssueTooltips?.some((text) => /FAILED state/i.test(text)),
      `${viewport.name} known-issue tooltip`,
    )
    if (!hoveredIssue.visibleKnownIssueTooltips.some((text) => /Historical run preserved/i.test(text))) {
      throw new Error(`${viewport.name} known-issue tooltip omitted its historical comparison context.`)
    }
    const tooltipRect = hoveredIssue.visibleKnownIssueTooltipRects[0]
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: tooltipRect.x + tooltipRect.width / 2,
      y: tooltipRect.y + tooltipRect.height / 2,
    }, sessionId)
    await waitForValue(
      client,
      sessionId,
      SNAPSHOT_EXPRESSION,
      (value) => value?.visibleKnownIssueTooltips?.some((text) => /FAILED state/i.test(text)),
      `${viewport.name} hoverable known-issue tooltip`,
    )
    if (options.screenshotDir) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      await screenshot(client, sessionId, path.join(options.screenshotDir, `${viewport.name}-card-issue-tooltip.png`))
    }
    await pressKey(client, sessionId, 'Escape')
    await waitForValue(
      client,
      sessionId,
      SNAPSHOT_EXPRESSION,
      (value) => value?.visibleKnownIssueTooltips.length === 0,
      `${viewport.name} Escape-dismissed hovered known-issue tooltip`,
    )
    await evaluate(client, sessionId, `document.querySelector('.path-model-card-issue')?.focus()`)
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: viewport.width - 2, y: viewport.height - 2 }, sessionId)
    await waitForValue(
      client,
      sessionId,
      SNAPSHOT_EXPRESSION,
      (value) => value?.cardIssueFocused && value.visibleKnownIssueTooltips.length > 0,
      `${viewport.name} focused known-issue tooltip`,
    )
    await pressKey(client, sessionId, 'Escape')
    await waitForValue(
      client,
      sessionId,
      SNAPSHOT_EXPRESSION,
      (value) => value?.cardIssueFocused && value.visibleKnownIssueTooltips.length === 0,
      `${viewport.name} Escape-dismissed known-issue tooltip`,
    )
  } else {
    await pointerClick(client, sessionId, '.path-model-card-issue')
    const focusedIssue = await waitForValue(
      client,
      sessionId,
      SNAPSHOT_EXPRESSION,
      (value) => value?.visibleKnownIssueTooltips?.some((text) => /FAILED state/i.test(text)),
      `${viewport.name} tapped known-issue tooltip`,
    )
    const tooltipOutsideViewport = focusedIssue.visibleKnownIssueTooltipRects.some((rect) => (
      rect.x < 0 ||
      rect.y < focusedIssue.stickyHeaderBottom ||
      rect.x + rect.width > viewport.width ||
      rect.y + rect.height > viewport.height
    ))
    if (tooltipOutsideViewport) {
      throw new Error(`${viewport.name} tapped known-issue tooltip escaped the viewport: ${JSON.stringify(focusedIssue.visibleKnownIssueTooltipRects)}.`)
    }
    if (options.screenshotDir) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      await screenshot(client, sessionId, path.join(options.screenshotDir, `${viewport.name}-card-issue-tooltip.png`))
    }
    await pressKey(client, sessionId, 'Escape')
    await waitForValue(
      client,
      sessionId,
      SNAPSHOT_EXPRESSION,
      (value) => value?.cardIssueFocused && value.visibleKnownIssueTooltips.length === 0,
      `${viewport.name} Escape-dismissed tapped known-issue tooltip`,
    )
  }

  const beforeActiveOrder = await snapshot(client, sessionId)
  await pointerClick(client, sessionId, '[data-model-order-option="active"]')
  const activeOrdered = await waitForValue(
    client,
    sessionId,
    SNAPSHOT_EXPRESSION,
    (value) => value?.orderMode === 'active' && value.selected === GEMINI_RUN,
    `${viewport.name} Active provider ordering`,
  )
  if (activeOrdered.activeOrderPressed !== 'true' || activeOrdered.newOrderPressed !== 'false') {
    throw new Error(`${viewport.name} did not visibly select Active ordering.`)
  }
  assertRectStable(`${viewport.name} switching to Active order`, beforeActiveOrder, activeOrdered)

  await pointerClick(client, sessionId, '[data-model-order-option="new"]')
  const newestOrdered = await waitForValue(
    client,
    sessionId,
    SNAPSHOT_EXPRESSION,
    (value) => value?.orderMode === 'new' && value.selected === GEMINI_RUN,
    `${viewport.name} New capture ordering`,
  )
  assertRectStable(`${viewport.name} switching back to New order`, activeOrdered, newestOrdered)

  const beforeMenu = await snapshot(client, sessionId)
  await pointerClick(client, sessionId, '[data-model-list-trigger]')
  const menuOpen = await waitForValue(
    client,
    sessionId,
    SNAPSHOT_EXPRESSION,
    (value) => value?.menuOpen === 'true' && value.optionIds?.length === 3,
    `${viewport.name} three-option model list`,
  )
  assertEqual(`${viewport.name} newest-first run order`, menuOpen.optionIds, [GEMINI_RUN, CHATGPT_RUN, SONNET_RUN])
  assertEqual(`${viewport.name} capture dates`, menuOpen.optionDates, ['Jul 11, 2026', 'Jul 10, 2026', 'Jun 19, 2026'])
  if (
    menuOpen.optionModels.length !== 3 ||
    !menuOpen.optionModels[0].includes('Gemini 3.1 Pro') ||
    !menuOpen.optionModels[1].includes('ChatGPT 5.6 Luna') ||
    !menuOpen.optionModels[2].includes('Sonnet 4.6')
  ) {
    throw new Error(`${viewport.name} model list omitted one of the three recorded model identities.`)
  }
  if (!menuOpen.knownIssueExplanations.some((explanation) => /FAILED state/i.test(explanation))) {
    throw new Error(`${viewport.name} open menu omitted the Sonnet issue explanation.`)
  }
  if (
    viewport.mobile &&
    !menuOpen.visibleKnownIssueTooltips.some((text) => /FAILED state/i.test(text))
  ) {
    throw new Error(`${viewport.name} did not show the known-issue explanation inline.`)
  }
  if (!menuOpen.menuVisible) throw new Error(`${viewport.name} menu is clipped or covered.`)
  assertRectStable(`${viewport.name} opening the model list`, beforeMenu, menuOpen)
  if (options.screenshotDir) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    await screenshot(client, sessionId, path.join(options.screenshotDir, `${viewport.name}-menu-open.png`))
  }

  const beforeSwitch = await snapshot(client, sessionId)
  await pointerClick(client, sessionId, `[data-model-option][data-source-run-id="${CHATGPT_RUN}"]`)
  const switched = await waitForValue(
    client,
    sessionId,
    SNAPSHOT_EXPRESSION,
    (value) => (
      value?.selected === CHATGPT_RUN &&
      value.previewMounted === 'true' &&
      value.focusedTrigger
    ),
    `${viewport.name} ChatGPT model selection and focus return`,
  )
  if (
    switched.artifact !== CHATGPT_ARTIFACT ||
    switched.promptCount !== 1 ||
    switched.href !== '/booking-flow-handoff-simulator-demo' ||
    !switched.triggerText.includes('ChatGPT 5.6 Luna · Extra High') ||
    !switched.triggerText.includes('Jul 10, 2026')
  ) throw new Error(`${viewport.name} did not atomically update the artifact, receipt, identity, date, and route.`)
  if (!switched.focusedTrigger) throw new Error(`${viewport.name} did not return focus to the selector trigger.`)
  assertRectStable(`${viewport.name} switching the selected model`, beforeSwitch, switched)

  await waitForValue(
    client,
    sessionId,
    `(() => {
      const frame=document.querySelector('[data-artifact-path]');
      return {
        path:frame?.dataset.artifactPath || '',
        iframe:Boolean(frame?.querySelector('iframe[srcdoc]')),
        fit:frame?.dataset.artifactFitMode || ''
      };
    })()`,
    (value) => value?.path.includes(CHATGPT_ARTIFACT) && value.iframe && value.fit && value.fit !== 'loading',
    `${viewport.name} settled ChatGPT preview`,
  )
  if (options.screenshotDir) {
    await new Promise((resolve) => setTimeout(resolve, 350))
    await screenshot(client, sessionId, path.join(options.screenshotDir, `${viewport.name}-switched.png`))
  }

  await pointerClick(client, sessionId, '[data-model-list-trigger]')
  await waitForValue(client, sessionId, SNAPSHOT_EXPRESSION, (value) => value?.menuOpen === 'true', `${viewport.name} known-issue list`)
  const beforeKnownIssueSwitch = await snapshot(client, sessionId)
  await pointerClick(client, sessionId, `[data-model-option][data-source-run-id="${SONNET_RUN}"]`)
  const knownIssueSelected = await waitForValue(
    client,
    sessionId,
    SNAPSHOT_EXPRESSION,
    (value) => (
      value?.selected === SONNET_RUN &&
      value.previewMounted === 'true' &&
      value.focusedTrigger
    ),
    `${viewport.name} known-issue model selection`,
  )
  if (
    knownIssueSelected.artifact !== SONNET_ARTIFACT ||
    knownIssueSelected.promptCount !== 4 ||
    knownIssueSelected.href !== `/booking-flow-handoff-simulator-demo?run=${SONNET_RUN}` ||
    !knownIssueSelected.triggerText.includes('Sonnet 4.6') ||
    !knownIssueSelected.triggerText.includes('Known issue') ||
    !knownIssueSelected.knownIssueExplanations.some((explanation) => /FAILED state/i.test(explanation))
  ) {
    throw new Error(`${viewport.name} did not keep the known-issue run selectable and truthfully labeled.`)
  }
  assertRectStable(`${viewport.name} switching to the known-issue model`, beforeKnownIssueSwitch, knownIssueSelected)
  await waitForValue(
    client,
    sessionId,
    `(() => {
      const frame=document.querySelector('[data-artifact-path]');
      return {
        path:frame?.dataset.artifactPath || '',
        iframe:Boolean(frame?.querySelector('iframe[srcdoc]')),
        fit:frame?.dataset.artifactFitMode || ''
      };
    })()`,
    (value) => value?.path.includes(SONNET_ARTIFACT) && value.iframe && value.fit && value.fit !== 'loading',
    `${viewport.name} settled known-issue preview`,
  )
  if (options.screenshotDir) {
    await screenshot(client, sessionId, path.join(options.screenshotDir, `${viewport.name}-known-issue-selected.png`))
  }

  await prepareFixture(client, sessionId, options)
  await pointerClick(client, sessionId, '[data-model-list-trigger]')
  await waitForValue(client, sessionId, SNAPSHOT_EXPRESSION, (value) => value?.menuOpen === 'true', `${viewport.name} reopened list`)
  await pressKey(client, sessionId, 'Escape')
  await waitForValue(
    client,
    sessionId,
    SNAPSHOT_EXPRESSION,
    (value) => value?.menuOpen === 'false' && value.focusedTrigger,
    `${viewport.name} Escape close and focus return`,
  )

  await prepareFixture(client, sessionId, options)
  await controlPoint(client, sessionId, '[data-model-cycle="next"]')
  const beforeCycle = await snapshot(client, sessionId)
  await pointerClick(client, sessionId, '[data-model-cycle="next"]')
  const cycled = await waitForValue(client, sessionId, SNAPSHOT_EXPRESSION, (value) => value?.selected === CHATGPT_RUN, `${viewport.name} next cycle`)
  await controlPoint(client, sessionId, '[data-model-cycle="previous"]')
  const beforeCycleBack = await snapshot(client, sessionId)
  await pointerClick(client, sessionId, '[data-model-cycle="previous"]')
  const cycledBack = await waitForValue(client, sessionId, SNAPSHOT_EXPRESSION, (value) => value?.selected === GEMINI_RUN, `${viewport.name} previous cycle`)
  assertRectStable(`${viewport.name} next cycle`, beforeCycle, cycled)
  assertRectStable(`${viewport.name} previous cycle`, beforeCycleBack, cycledBack)

  await prepareFixture(client, sessionId, options)
  await evaluate(client, sessionId, `(() => {
    const trigger=document.querySelector('[data-model-list-trigger]');
    trigger?.focus();
    return document.activeElement === trigger;
  })()`)
  await pressKey(client, sessionId, 'Enter')
  await waitForValue(client, sessionId, SNAPSHOT_EXPRESSION, (value) => value?.menuOpen === 'true', `${viewport.name} keyboard open`)
  for (let index = 0; index < 5; index += 1) await pressKey(client, sessionId, 'Tab')
  await waitForValue(
    client,
    sessionId,
    SNAPSHOT_EXPRESSION,
    (value) => value?.focusedOptionId === CHATGPT_RUN,
    `${viewport.name} keyboard focus on ChatGPT option`,
  )
  await pressKey(client, sessionId, 'Enter')
  await waitForValue(
    client,
    sessionId,
    SNAPSHOT_EXPRESSION,
    (value) => value?.selected === CHATGPT_RUN && value.focusedTrigger,
    `${viewport.name} keyboard selection and focus return`,
  )

  console.log(`[${viewport.name}] model selector passed`)
  return { viewport: viewport.name, stage: initial.stage, controls: initial.controlSizes }
}

async function stopChrome(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  const exitPromise = once(child, 'exit')
  child.kill('SIGTERM')
  const exited = await Promise.race([
    exitPromise.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ])
  if (!exited && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found for the path-card model-selector guard.')

  const profile = mkdtempSync(path.join(tmpdir(), 'pathforge-path-card-model-selector-'))
  const child = spawn(executable, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

  let client
  try {
    client = new CdpClient(await waitForWebSocketUrl(child))
    await client.ready()
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
    const consoleErrors = []
    client.listeners.add((message) => {
      if (message.sessionId !== sessionId) return
      if (message.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(message.params.exceptionDetails?.text ?? 'Uncaught runtime exception')
      }
      if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') {
        if (isExpectedLocalActivationFailure(options.baseUrl, message.params.entry)) return
        if (localFaviconFailure(options.baseUrl, message.params.entry)) return
        consoleErrors.push(message.params.entry.text)
      }
    })

    await Promise.all([
      client.send('Page.enable', {}, sessionId),
      client.send('Runtime.enable', {}, sessionId),
      client.send('Log.enable', {}, sessionId),
    ])

    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000, mobile: false },
      { name: 'mobile-390', width: 390, height: 844, mobile: true },
    ]) {
      await verifyCompareModelCatalog(client, sessionId, options, viewport)
      await verifyKnownIssueProjectMenu(client, sessionId, options, viewport)
    }

    const results = []
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000, mobile: false },
      { name: 'mobile-390', width: 390, height: 844, mobile: true },
    ]) results.push(await verifyViewport(client, sessionId, options, viewport))

    if (consoleErrors.length > 0) {
      throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`)
    }
    console.log(JSON.stringify({ ok: true, results }, null, 2))
  } finally {
    client?.close()
    await stopChrome(child)
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
