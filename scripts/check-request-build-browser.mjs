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
  isExpectedLocalFaviconFailure,
  isExpectedLocalFaviconResponseFailure,
  isExpectedLocalVercelScriptFailure,
  isExpectedLocalVercelScriptResponseFailure,
} from './browser-guard-errors.mjs'

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000, mobile: false },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
]

const LIFECYCLES = [
  'submitted',
  'triage',
  'clarification_requested',
  'accepted',
  'building',
  'review_pending',
  'repair_required',
  'delivery_ready',
  'delivered',
  'completed',
  'closed',
]
const ACTORS = ['requester', 'triager', 'builder', 'reviewer', 'system']
const MODERATION = ['clear', 'held', 'removed']
const CLOSE_REASONS = [
  'existing_resolution',
  'duplicate',
  'out_of_scope',
  'capacity_unavailable',
  'declined',
  'withdrawn',
  'expired',
  'failed_review',
  'safety_removed',
  'no_response',
]
const SERVICE_STATES = [
  'loading',
  'unavailable',
  'closed',
  'capacity_full',
  'available',
  'private',
  'sign_in_required',
  'not_admitted',
  'already_active',
  'controls_off',
]
const INTAKE_STATES = [
  'pristine',
  'errors',
  'unavailable',
  'not_admitted',
  'rate_limited',
  'duplicate',
  'stale_version',
  'forbidden_input',
  'pending',
  'project_reference',
  'response_reference',
]
const CASE_ERRORS = [
  'rate_limited',
  'stale_version',
  'idempotent_replay',
  'missing_delivery',
  'hash_mismatch',
  'publication_blocked',
]
const DELIVERY_STATES = ['not_ready', 'missing', 'hash_mismatch', 'repair', 'ready', 'delivered']
const MY_FORGE_STATES = ['loading', 'unavailable', 'empty', 'ready']
const ADMIN_QUEUE_STATES = [
  'loading',
  'unavailable',
  'empty',
  'open',
  'controls_off',
  'assignment_off',
  'capacity_full',
]
const ADMIN_SCOPES = ['admin', 'triager', 'builder', 'reviewer']
const ADMIN_DETAIL_STATES = ['triager', 'builder', 'reviewer', 'admin', 'none']

function scenario(name, query, options = {}) {
  return {
    name,
    path: `/qa/request-build?${new URLSearchParams(query)}`,
    ...options,
  }
}

const SCENARIOS = [
  scenario(
    'analytics-fail-then-submitted',
    { surface: 'analytics-transition' },
    { analyticsTransition: true },
  ),
  ...SERVICE_STATES.map((state) => scenario(`service-${state}`, { surface: 'service', state }, {
    screenshot: ['capacity_full', 'unavailable', 'not_admitted'].includes(state),
  })),
  ...INTAKE_STATES.map((state) => scenario(`intake-${state}`, { surface: 'intake', state }, {
    expectFocusedAlert: ['errors', 'unavailable', 'rate_limited', 'duplicate', 'stale_version', 'forbidden_input'].includes(state),
    screenshot: state === 'errors',
  })),
  ...['recorded', 'replayed'].map((state) => scenario(`receipt-${state}`, { surface: 'receipt', state })),
  ...LIFECYCLES.map((lifecycle) => scenario(
    `case-lifecycle-${lifecycle}`,
    { surface: 'case', lifecycle, actor: 'requester' },
    {
      caseOrder: true,
      screenshot: ['clarification_requested', 'delivery_ready'].includes(lifecycle),
    },
  )),
  ...ACTORS.slice(1).map((actor) => scenario(
    `case-actor-${actor}`,
    {
      surface: 'case',
      lifecycle: actor === 'reviewer' ? 'review_pending' : actor === 'builder' ? 'building' : 'triage',
      actor,
    },
    { caseOrder: true },
  )),
  ...MODERATION.slice(1).map((moderation) => scenario(
    `case-moderation-${moderation}`,
    { surface: 'case', lifecycle: 'building', moderation },
    {
      caseOrder: moderation !== 'held' && moderation !== 'removed',
      restrictedCase: moderation === 'held' || moderation === 'removed',
    },
  )),
  scenario(
    'case-action-mismatched',
    { surface: 'case', lifecycle: 'submitted', actor: 'requester', primary: 'mismatched' },
    { caseOrder: true, expectedPrimaryCount: 0 },
  ),
  scenario(
    'case-held-authorized-action',
    { surface: 'case', lifecycle: 'building', actor: 'triager', moderation: 'held' },
    { expectedPrimaryCount: 1, restrictedCase: true },
  ),
  scenario(
    'case-held-mismatched-action',
    {
      surface: 'case',
      lifecycle: 'building',
      actor: 'triager',
      moderation: 'held',
      primary: 'mismatched',
    },
    { expectedPrimaryCount: 0, restrictedCase: true },
  ),
  ...CLOSE_REASONS.map((closeReason) => scenario(
    `case-close-${closeReason}`,
    { surface: 'case', lifecycle: 'closed', closeReason },
    { caseOrder: true },
  )),
  ...CASE_ERRORS.map((error) => scenario(
    `case-error-${error}`,
    {
      surface: 'case',
      lifecycle: error === 'publication_blocked' ? 'completed' : 'delivery_ready',
      error,
    },
    {
      caseOrder: true,
      expectFocusedAlert: ['rate_limited', 'stale_version', 'missing_delivery', 'hash_mismatch'].includes(error),
    },
  )),
  ...DELIVERY_STATES.map((delivery) => scenario(
    `case-delivery-${delivery}`,
    {
      surface: 'case',
      lifecycle: delivery === 'repair'
        ? 'repair_required'
        : delivery === 'ready'
          ? 'delivery_ready'
          : delivery === 'delivered'
            ? 'delivered'
            : 'review_pending',
      delivery,
    },
    { caseOrder: true },
  )),
  ...MY_FORGE_STATES.map((state) => scenario(
    `my-forge-${state}`,
    { surface: 'my-forge', state },
    { screenshot: state === 'ready' },
  )),
  ...ADMIN_QUEUE_STATES.map((state) => scenario(
    `admin-queue-${state}`,
    { surface: 'admin-queue', state, scope: 'admin' },
    { screenshot: state === 'capacity_full' },
  )),
  ...ADMIN_SCOPES.slice(1).map((scope) => scenario(
    `admin-queue-scope-${scope}`,
    { surface: 'admin-queue', state: 'open', scope },
  )),
  ...ADMIN_DETAIL_STATES.map((state) => scenario(
    `admin-detail-${state}`,
    { surface: 'admin-detail', state },
    { screenshot: state === 'reviewer' },
  )),
]

function parseArgs(argv) {
  const options = {
    baseUrl: 'http://127.0.0.1:3012',
    screenshotDir: path.resolve('artifacts/request-build-browser'),
  }
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!value) throw new Error(`Missing value after ${key}.`)
    if (key === '--base-url') options.baseUrl = new URL(value).origin
    else if (key === '--screenshot-dir') options.screenshotDir = path.resolve(value)
    else throw new Error(`Unknown argument: ${key}`)
    index += 1
  }
  mkdirSync(options.screenshotDir, { recursive: true })
  return options
}

async function evaluate(client, sessionId, expression) {
  const { result, exceptionDetails } = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }, sessionId)
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text ?? 'Browser evaluation failed.')
  }
  return result.value
}

async function waitForValue(client, sessionId, expression, predicate, label, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  let value
  while (Date.now() < deadline) {
    value = await evaluate(client, sessionId, expression)
    if (predicate(value)) return value
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`${label} timed out; last value ${JSON.stringify(value)}.`)
}

async function navigate(client, sessionId, url, expectedState) {
  const loaded = client.waitFor('Page.loadEventFired', sessionId, 20_000)
  await client.send('Page.navigate', { url }, sessionId)
  await loaded
  const result = await waitForValue(
    client,
    sessionId,
    `(() => {
      const fixture=document.querySelector('[data-request-build-fixture]');
      return {
        ready:Boolean(fixture && document.body.innerText.trim().length > 0),
        state:fixture?.getAttribute('data-fixture-state') || '',
      };
    })()`,
    (value) => value?.ready && value.state === expectedState,
    `fixture ${expectedState}`,
  )
  await evaluate(client, sessionId, `new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  })`)
  return result
}

async function capture(client, sessionId, destination) {
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  }, sessionId)
  writeFileSync(destination, Buffer.from(data, 'base64'))
}

function expectedFixtureState(scenarioItem) {
  const query = new URL(scenarioItem.path, 'http://fixture.invalid').searchParams
  const surface = query.get('surface')
  if (surface === 'case') {
    return [
      query.get('lifecycle') ?? 'clarification_requested',
      query.get('actor') ?? 'requester',
      query.get('moderation') ?? 'clear',
      query.get('closeReason') ?? (query.get('lifecycle') === 'closed' ? 'declined' : 'open'),
      query.get('error') ?? 'none',
      query.get('delivery') ?? (
        query.get('lifecycle') === 'repair_required'
          ? 'repair'
          : query.get('lifecycle') === 'delivery_ready'
            ? 'ready'
            : ['delivered', 'completed'].includes(query.get('lifecycle'))
              ? 'delivered'
              : 'not_ready'
      ),
    ].join(':')
  }
  if (surface === 'admin-queue') {
    return `${query.get('state') ?? 'open'}:${query.get('scope') ?? 'admin'}`
  }
  return query.get('state') ?? (
    surface === 'analytics-transition' ? 'transition'
      : surface === 'service' ? 'available'
      : surface === 'intake' ? 'pristine'
        : surface === 'receipt' ? 'recorded'
          : surface === 'my-forge' ? 'ready'
            : 'triager'
  )
}

const PAGE_SNAPSHOT = `(() => {
  const root=document.documentElement;
  const body=document.body;
  const fixture=document.querySelector('[data-request-build-fixture]');
  const viewportWidth=root.clientWidth;
  const scrollWidth=Math.max(root.scrollWidth,body?.scrollWidth || 0);
  const visible=(element)=>{
    const style=getComputedStyle(element);
    const rect=element.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
  };
  const controlRect=(element)=>{
    const target=(element.matches('input[type="radio"],input[type="checkbox"]') && element.closest('label')) || element;
    const rect=target.getBoundingClientRect();
    return {
      tag:element.tagName.toLowerCase(),
      type:element.getAttribute('type') || '',
      name:element.getAttribute('name') || '',
      text:(target.textContent || element.getAttribute('aria-label') || '').trim().slice(0,80),
      width:Math.round(rect.width),
      height:Math.round(rect.height),
    };
  };
  const controls=[...fixture.querySelectorAll('button,a,input:not([type="hidden"]),select,textarea')]
    .filter(visible)
    .map(controlRect);
  const tooSmall=controls.filter((item)=>(
    ['button','input','select','textarea'].includes(item.tag) &&
    (item.height < 43 || (item.tag === 'button' && item.width < 43))
  ));
  const overflowingElements=[...fixture.querySelectorAll('*')]
    .map((element)=>{
      const rect=element.getBoundingClientRect();
      return {
        tag:element.tagName.toLowerCase(),
        className:typeof element.className === 'string' ? element.className.slice(0,100) : '',
        left:Math.round(rect.left),
        right:Math.round(rect.right),
        width:Math.round(rect.width),
      };
    })
    .filter((entry)=>entry.right > viewportWidth + 1 || entry.left < -1)
    .slice(0,10);
  const overlay=Boolean(document.querySelector(
    '[data-nextjs-dialog],.vite-error-overlay,#webpack-dev-server-client-overlay'
  ));
  const stickyActions=[...fixture.querySelectorAll('[data-request-case-primary-action]')]
    .filter(visible);
  const primaryActionDetails=[...fixture.querySelectorAll('[data-request-case-primary-action]')]
    .map((element)=>{
      const rect=element.getBoundingClientRect();
      const style=getComputedStyle(element);
      return {
        display:style.display,
        visibility:style.visibility,
        width:Math.round(rect.width),
        height:Math.round(rect.height),
      };
    });
  const fixtureStyle=fixture ? getComputedStyle(fixture) : null;
  const caseSectionIds=[
    'request-case-status',
    'request-case-next-action',
    'request-case-finish-line',
    'request-case-clarification',
    'request-case-delivery',
    'request-case-assignments',
    'request-case-progress',
    'request-case-history',
    'request-case-retention',
  ];
  return {
    viewportWidth,
    viewportHeight:root.clientHeight,
    scrollWidth,
    overflow:Math.max(0,scrollWidth-viewportWidth),
    overflowingElements,
    overlay,
    hasContent:Boolean(fixture && fixture.innerText.trim().length > 40),
    proofLabel:Boolean(fixture?.querySelector('[data-fixture-proof-label]')),
    fixtureText:(fixture?.innerText || '').replace(/\\s+/g,' ').trim(),
    deliveryPlaceholders:fixture?.querySelectorAll('[data-request-delivery-placeholder]').length || 0,
    tooSmall,
    stickyActionCount:stickyActions.length,
    primaryActionDetails,
    caseHeadingOrder:[...fixture.querySelectorAll('h2[id^="request-case-"]:not(#request-case-error-title)')]
      .map((heading)=>heading.id),
    caseSections:Object.fromEntries(
      caseSectionIds.map((id)=>[id,Boolean(fixture?.querySelector('#'+id))])
    ),
    reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
    fixtureTransition:fixtureStyle?.transitionDuration || '',
  };
})()`

async function assertAccessibilityTree(client, sessionId, label) {
  await client.send('Accessibility.enable', {}, sessionId)
  const { nodes } = await client.send('Accessibility.getFullAXTree', {}, sessionId)
  const roles = new Set(nodes.map((node) => node.role?.value).filter(Boolean))
  if (!roles.has('main')) throw new Error(`${label} accessibility tree has no main landmark.`)
  if (!roles.has('heading')) throw new Error(`${label} accessibility tree has no heading.`)
  const unnamedControls = nodes.filter((node) => (
    ['button', 'textbox', 'combobox', 'radio'].includes(node.role?.value) &&
    !node.name?.value &&
    !node.ignored
  ))
  if (unnamedControls.length > 0) {
    throw new Error(`${label} accessibility tree has ${unnamedControls.length} unnamed controls.`)
  }
}

async function assertCaseMobileOrder(client, sessionId, label) {
  const order = await evaluate(client, sessionId, `(() => {
    const ids=[
      'request-case-status',
      'request-case-next-action',
      'request-case-finish-line',
      'request-case-clarification',
      'request-case-delivery',
      'request-case-history',
    ];
    return ids.map((id)=>{
      const node=document.getElementById(id);
      const section=node?.closest('section');
      const rect=section?.getBoundingClientRect();
      return {
        id,
        top:rect ? Math.round(rect.top + scrollY) : -1,
        bottom:rect ? Math.round(rect.bottom + scrollY) : -1,
      };
    });
  })()`)
  if (order.some((item) => item.top < 0)) {
    throw new Error(`${label} is missing a required case section: ${JSON.stringify(order)}.`)
  }
  for (let index = 1; index < order.length; index += 1) {
    if (order[index].top < order[index - 1].bottom) {
      throw new Error(`${label} mobile case order failed: ${JSON.stringify(order)}.`)
    }
  }
}

async function assertAnalyticsTransition(client, sessionId, label) {
  const countsExpression = `(() => {
    const fixture=document.querySelector('[data-request-analytics-transition]');
    return {
      failed:Number(fixture?.getAttribute('data-failed-count') || -1),
      submitted:Number(fixture?.getAttribute('data-submitted-count') || -1),
    };
  })()`
  await waitForValue(
    client,
    sessionId,
    countsExpression,
    (value) => value?.failed === 1 && value.submitted === 0,
    `${label} initial failed event`,
  )
  await evaluate(client, sessionId, `(() => {
    const button=document.querySelector('[data-analytics-rerender]');
    button?.click();
    button?.click();
  })()`)
  await new Promise((resolve) => setTimeout(resolve, 100))
  let counts = await evaluate(client, sessionId, countsExpression)
  if (counts.failed !== 1 || counts.submitted !== 0) {
    throw new Error(`${label} duplicated its failed event: ${JSON.stringify(counts)}.`)
  }
  await evaluate(
    client,
    sessionId,
    `document.querySelector('[data-analytics-submit]')?.click()`,
  )
  await waitForValue(
    client,
    sessionId,
    countsExpression,
    (value) => value?.failed === 1 && value.submitted === 1,
    `${label} verified submitted event`,
  )
  await evaluate(client, sessionId, `(() => {
    const button=document.querySelector('[data-analytics-rerender]');
    button?.click();
    button?.click();
  })()`)
  await new Promise((resolve) => setTimeout(resolve, 100))
  counts = await evaluate(client, sessionId, countsExpression)
  if (counts.failed !== 1 || counts.submitted !== 1) {
    throw new Error(`${label} duplicated a rerendered event: ${JSON.stringify(counts)}.`)
  }
}

async function verifyViewport(client, options, viewport) {
  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true })
  const consoleErrors = []
  const httpFailures = []
  const listener = (message) => {
    if (message.sessionId !== sessionId) return
    if (message.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(
        message.params.exceptionDetails?.exception?.description ??
        message.params.exceptionDetails?.text ??
        'Runtime exception',
      )
    }
    if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') {
      const entry = message.params.entry
      if (
        !isExpectedLocalActivationFailure(options.baseUrl, entry) &&
        !isExpectedLocalFaviconFailure(options.baseUrl, entry) &&
        !isExpectedLocalVercelScriptFailure(options.baseUrl, entry)
      ) consoleErrors.push(entry.text)
    }
    if (message.method === 'Network.responseReceived' && message.params.response?.status >= 400) {
      const response = message.params.response
      if (
        !isExpectedLocalActivationResponseFailure(options.baseUrl, response) &&
        !isExpectedLocalFaviconResponseFailure(options.baseUrl, response) &&
        !isExpectedLocalVercelScriptResponseFailure(options.baseUrl, response)
      ) httpFailures.push(`${response.status} ${response.url}`)
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
      client.send('Emulation.setEmulatedMedia', {
        media: '',
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      }, sessionId),
    ])

    for (const scenarioItem of SCENARIOS) {
      const expectedState = expectedFixtureState(scenarioItem)
      await navigate(
        client,
        sessionId,
        `${options.baseUrl}${scenarioItem.path}`,
        expectedState,
      )
      await new Promise((resolve) => setTimeout(resolve, 80))
      const snapshot = await evaluate(client, sessionId, PAGE_SNAPSHOT)
      const label = `${viewport.name}/${scenarioItem.name}`
      if (
        snapshot.viewportWidth > viewport.width ||
        snapshot.viewportWidth < viewport.width - 20 ||
        snapshot.viewportHeight !== viewport.height
      ) {
        throw new Error(
          `${label} measured ${snapshot.viewportWidth}x${snapshot.viewportHeight}, expected ${viewport.width}x${viewport.height}.`,
        )
      }
      if (!snapshot.hasContent || !snapshot.proofLabel) {
        throw new Error(`${label} did not render meaningful labelled fixture content.`)
      }
      if (snapshot.overlay) throw new Error(`${label} rendered a framework error overlay.`)
      if (snapshot.overflow > 1) {
        throw new Error(
          `${label} overflowed horizontally by ${snapshot.overflow}px: ${JSON.stringify(snapshot.overflowingElements)}.`,
        )
      }
      if (snapshot.tooSmall.length > 0) {
        throw new Error(`${label} rendered undersized controls: ${JSON.stringify(snapshot.tooSmall)}.`)
      }
      if (!snapshot.reducedMotion) throw new Error(`${label} did not honor reduced-motion emulation.`)
      if (
        scenarioItem.path.includes('surface=service') &&
        scenarioItem.path.includes('state=not_admitted') &&
        !snapshot.fixtureText.includes('This account is not in the current pilot.')
      ) {
        throw new Error(`${label} omitted the participant-safe pilot eligibility message.`)
      }
      const isRemovedCase = scenarioItem.path.includes('surface=case') &&
        scenarioItem.path.includes('moderation=removed')
      const isHeldCase = scenarioItem.path.includes('surface=case') &&
        scenarioItem.path.includes('moderation=held')
      if (
        scenarioItem.path.includes('surface=case') &&
        snapshot.deliveryPlaceholders !== (isRemovedCase || isHeldCase ? 0 : 1)
      ) {
        throw new Error(
          `${label} rendered an unexpected PM 3 placeholder count: ${snapshot.deliveryPlaceholders}.`,
        )
      }
      if (viewport.mobile && scenarioItem.path.includes('surface=case')) {
        if (snapshot.stickyActionCount > 1) {
          throw new Error(`${label} rendered more than one state-specific sticky action.`)
        }
        if (scenarioItem.caseOrder && !isRemovedCase) {
          await assertCaseMobileOrder(client, sessionId, label)
        }
      }
      if (
        typeof scenarioItem.expectedPrimaryCount === 'number' &&
        snapshot.primaryActionDetails.length !== scenarioItem.expectedPrimaryCount
      ) {
        throw new Error(
          `${label} rendered ${snapshot.primaryActionDetails.length} primary actions; expected ${scenarioItem.expectedPrimaryCount}: ${JSON.stringify(snapshot.primaryActionDetails)}.`,
        )
      }
      if (scenarioItem.restrictedCase) {
        const forbiddenRestrictedSections = [
          'request-case-finish-line',
          'request-case-clarification',
          'request-case-delivery',
          'request-case-assignments',
          'request-case-progress',
        ].filter((id) => snapshot.caseSections[id])
        if (forbiddenRestrictedSections.length > 0) {
          throw new Error(
            `${label} exposed restricted case sections: ${forbiddenRestrictedSections.join(', ')}.`,
          )
        }
        if (isHeldCase && (
          !snapshot.caseSections['request-case-status'] ||
          !snapshot.caseSections['request-case-next-action'] ||
          !snapshot.caseSections['request-case-history']
        )) {
          throw new Error(`${label} omitted required held-case status, action, or safe history.`)
        }
        if (isRemovedCase && !snapshot.caseSections['request-case-retention']) {
          throw new Error(`${label} omitted the minimum removed-case retention status.`)
        }
      }
      if (scenarioItem.caseOrder) {
        const expectedCaseHeadingOrder = [
          'request-case-status',
          'request-case-next-action',
          'request-case-finish-line',
          'request-case-clarification',
          'request-case-delivery',
          'request-case-history',
        ]
        if (JSON.stringify(snapshot.caseHeadingOrder) !== JSON.stringify(expectedCaseHeadingOrder)) {
          throw new Error(
            `${label} case heading order was ${JSON.stringify(snapshot.caseHeadingOrder)}; expected ${JSON.stringify(expectedCaseHeadingOrder)}.`,
          )
        }
      }
      if (scenarioItem.expectFocusedAlert) {
        const focus = await waitForValue(
          client,
          sessionId,
          `(() => ({
            role:document.activeElement?.getAttribute('role') || '',
            inFixture:Boolean(document.activeElement?.closest('[data-request-build-fixture]')),
          }))()`,
          (value) => value?.role === 'alert' && value.inFixture,
          `${label} focused error summary`,
        )
        if (focus.role !== 'alert') throw new Error(`${label} did not focus its error summary.`)
      }
      if (scenarioItem.analyticsTransition) {
        await assertAnalyticsTransition(client, sessionId, label)
      }
      await assertAccessibilityTree(client, sessionId, label)
      if (scenarioItem.screenshot) {
        // Turbopack can replace the route DOM before Chrome's mobile compositor
        // has swapped out the preceding loading frame. Screenshot evidence must
        // wait for that visual frame, not merely for a passing DOM snapshot.
        await new Promise((resolve) => setTimeout(resolve, 500))
        await evaluate(client, sessionId, `new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        })`)
        await capture(
          client,
          sessionId,
          path.join(options.screenshotDir, `${scenarioItem.name}-${viewport.name}.png`),
        )
      }
    }

    if (consoleErrors.length > 0) {
      throw new Error(`${viewport.name} logged browser errors: ${[...new Set(consoleErrors)].join(' | ')}`)
    }
    if (httpFailures.length > 0) {
      throw new Error(`${viewport.name} received failed HTTP responses: ${[...new Set(httpFailures)].join(' | ')}`)
    }
    return SCENARIOS.length
  } finally {
    client.listeners.delete(listener)
    await client.send('Target.closeTarget', { targetId }).catch(() => {})
  }
}

async function waitForProcessExit(child, timeoutMs) {
  if (child.exitCode !== null) return true
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.off('exit', onExit)
      resolve(child.exitCode !== null)
    }, timeoutMs)
    const onExit = () => {
      clearTimeout(timeout)
      resolve(true)
    }
    child.once('exit', onExit)
    if (child.exitCode !== null) onExit()
  })
}

function signalChromeProcessGroup(child, signal) {
  if (typeof child.pid !== 'number') return
  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, signal)
      return
    } catch {
      // The detached Chrome process group may already be gone.
    }
  }
  if (child.exitCode === null) child.kill(signal)
}

async function closeChrome(client, child) {
  try {
    await client?.send('Browser.close')
  } catch {
    // Closing the browser can close CDP before the command response arrives.
  }
  if (await waitForProcessExit(child, 5_000)) return
  signalChromeProcessGroup(child, 'SIGTERM')
  if (await waitForProcessExit(child, 5_000)) return
  signalChromeProcessGroup(child, 'SIGKILL')
  if (!await waitForProcessExit(child, 5_000)) {
    throw new Error('Chrome did not exit before temporary-profile cleanup.')
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const executable = chromeExecutable()
  if (!executable) throw new Error('Chrome was not found for the Request a Build browser guard.')

  const profile = mkdtempSync(path.join(tmpdir(), 'pathforge-request-build-browser-'))
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
    let assertions = 0
    for (const viewport of VIEWPORTS) {
      assertions += await verifyViewport(client, options, viewport)
    }
    console.log(
      `Request a Build fixture browser guard passed ${assertions} rendered scenario/viewport checks across desktop and exact 390px: semantic content, focused errors, mobile order, reduced motion, 44px controls, overflow, framework/console/HTTP failures, and explicit PM 3 non-evidence slots.`,
    )
    console.log(`Fixture screenshots: ${options.screenshotDir}`)
  } finally {
    await closeChrome(client, chrome)
    client?.close()
    rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
