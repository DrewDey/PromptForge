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
  'capacity_full',
  'not_admitted',
  'already_active',
  'expired_session',
  'hostile_error',
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
const DELIVERY_STATES = [
  'not_ready',
  'staging',
  'prepared_recovery',
  'sealed_waiting',
  'sealed_ready',
  'missing',
  'hash_mismatch',
  'repair',
  'ready',
  'delivered',
]
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
const ADMIN_DETAIL_STATES = ['triager', 'builder', 'reviewer', 'admin', 'no_response_eligible', 'none']
const PARTICIPANT_TRUST_STATES = [
  'proposal',
  'requester_consent',
  'builder_consent',
  'withdraw',
  'publish',
  'restricted',
  'reports',
]
const PUBLIC_OPERATION_STATES = ['off', 'ready', 'report', 'publication']
const PUBLIC_OUTCOME_STATES = [
  'unavailable',
  'off',
  'empty',
  'published',
  'paginated',
]

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
    screenshotTarget: state === 'not_admitted'
      ? '[data-request-intake-eligibility="not_admitted"]'
      : undefined,
    screenshotTargetSuffix: 'eligibility',
  })),
  ...INTAKE_STATES.map((state) => scenario(`intake-${state}`, { surface: 'intake', state }, {
    expectFocusedAlert: ['errors', 'unavailable', 'capacity_full', 'not_admitted', 'already_active', 'expired_session', 'hostile_error', 'rate_limited', 'duplicate', 'stale_version', 'forbidden_input'].includes(state),
    screenshot: state === 'errors',
  })),
  scenario(
    'my-forge-empty-cta',
    { surface: 'my-forge', state: 'empty' },
    { myForgeEmptyCta: true },
  ),
  scenario(
    'my-forge-assigned-empty',
    { surface: 'my-forge-assigned', state: 'empty' },
    { assignedQueueExpectation: { unavailable: 0, scopes: [] } },
  ),
  scenario(
    'my-forge-assigned-builder-rejected',
    { surface: 'my-forge-assigned', state: 'builder_rejected' },
    { assignedQueueExpectation: { unavailable: 1, scopes: ['reviewer'] } },
  ),
  scenario(
    'my-forge-assigned-reviewer-rejected',
    { surface: 'my-forge-assigned', state: 'reviewer_rejected' },
    { assignedQueueExpectation: { unavailable: 1, scopes: ['builder'] } },
  ),
  scenario(
    'my-forge-assigned-dual-ready',
    { surface: 'my-forge-assigned', state: 'dual_ready' },
    { assignedQueueExpectation: { unavailable: 0, scopes: ['builder', 'reviewer'] } },
  ),
  ...['recorded', 'replayed'].map((state) => scenario(`receipt-${state}`, { surface: 'receipt', state })),
  ...LIFECYCLES.map((lifecycle) => scenario(
    `case-lifecycle-${lifecycle}`,
    { surface: 'case', lifecycle, actor: 'requester' },
    {
      caseOrder: true,
      expectedDeliveryStickyAnchorCount: (
        lifecycle === 'delivery_ready' || lifecycle === 'delivered'
      ) ? 1 : lifecycle === 'completed' ? 0 : undefined,
      screenshot: ['clarification_requested', 'delivery_ready'].includes(lifecycle),
      screenshotTarget: lifecycle === 'delivery_ready'
        ? '[data-request-delivery-slot]'
        : lifecycle === 'clarification_requested'
          ? '[data-request-case-secondary-action]'
          : undefined,
      screenshotTargetSuffix: lifecycle === 'clarification_requested'
        ? 'actions'
        : 'delivery',
    },
  )),
  ...ACTORS.slice(1).map((actor) => scenario(
    `case-actor-${actor}`,
    {
      surface: 'case',
      lifecycle: actor === 'reviewer' ? 'review_pending' : actor === 'builder' ? 'building' : 'triage',
      actor,
    },
    {
      caseOrder: true,
      screenshot: actor === 'reviewer',
      screenshotTarget: actor === 'reviewer'
        ? '[data-request-delivery-slot]'
        : undefined,
      screenshotTargetSuffix: 'delivery',
      expectedDeliveryStickyAnchorCount: actor === 'reviewer' ? 1 : undefined,
    },
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
    {
      expectedPrimaryCount: 1,
      restrictedCase: true,
      screenshot: true,
      screenshotTarget: '#request-case-held-operation',
      screenshotTargetSuffix: 'operation',
    },
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
      lifecycle: [
        'staging',
        'prepared_recovery',
        'sealed_waiting',
        'sealed_ready',
      ].includes(delivery)
        ? 'building'
        : delivery === 'repair'
        ? 'repair_required'
        : delivery === 'ready'
          ? 'delivery_ready'
          : delivery === 'delivered'
            ? 'delivered'
            : 'review_pending',
      delivery,
      ...(
        [
          'staging',
          'prepared_recovery',
          'sealed_waiting',
          'sealed_ready',
        ].includes(delivery)
          ? { actor: 'builder' }
          : {}
      ),
    },
    {
      caseOrder: true,
      screenshot: [
        'staging',
        'prepared_recovery',
        'sealed_waiting',
        'sealed_ready',
      ].includes(delivery),
      expectedDeliveryStickyAnchorCount: [
        'staging',
        'prepared_recovery',
        'sealed_ready',
        'ready',
        'delivered',
      ].includes(delivery) ? 1 : 0,
      screenshotTarget: (
        [
          'staging',
          'prepared_recovery',
          'sealed_waiting',
          'sealed_ready',
        ].includes(delivery)
      )
        ? '[data-request-delivery-slot]'
        : undefined,
      screenshotTargetSuffix: 'delivery',
    },
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
  ...PARTICIPANT_TRUST_STATES.map((state) => scenario(
    `participant-trust-${state}`,
    { surface: 'participant-trust', state },
    {
      readySelector: '[data-request-participant-trust-tools]',
      readyText: 'Optional outcome publication',
      screenshot: ['publish', 'restricted', 'reports'].includes(state),
      screenshotTarget: state === 'publish'
        ? 'input[name="publicationRelease"][value="yes"]'
        : state === 'restricted'
          ? '#request-case-publication'
          : state === 'reports'
            ? 'a[href*="cursor=older"]'
            : undefined,
      screenshotTargetSuffix: state === 'publish'
        ? 'release'
        : state === 'restricted'
          ? 'publication'
          : 'history',
    },
  )),
  ...PUBLIC_OPERATION_STATES.map((state) => scenario(
    `public-operations-${state}`,
    { surface: 'public-operations', state },
    {
      readySelector: '[data-request-public-operations]',
      readyText: 'Scale and release controls',
      screenshot: ['off', 'report', 'publication'].includes(state),
      screenshotTarget: state === 'off'
        ? 'input[name="controlConfirmation"][value="yes"]'
          : state === 'report'
            ? 'select[name="nextStatus"]'
          : state === 'publication'
            ? 'input[name="reviewConfirmation"][value="yes"]'
            : undefined,
      screenshotTargetSuffix: state === 'off'
        ? 'controls'
        : state === 'report'
          ? 'report'
          : 'airlock',
    },
  )),
  ...PUBLIC_OUTCOME_STATES.map((state) => scenario(
    `public-outcomes-${state}`,
    { surface: 'public-outcomes', state },
    {
      readySelector: '[data-request-public-outcome-catalog]',
      readyText: 'Consented outcomes, never raw requests.',
      screenshot: ['off', 'paginated'].includes(state),
      screenshotTarget: state === 'off'
        ? '[data-request-public-outcome-catalog] section'
        : state === 'paginated'
          ? 'a[href^="/requests/outcomes?cursor="]'
          : undefined,
      screenshotTargetSuffix: state === 'off' ? 'gate' : 'pagination',
    },
  )),
  scenario(
    'public-outcome-published',
    { surface: 'public-outcome' },
    {
      readySelector: '[data-request-public-outcome-detail]',
      readyText: 'Requester attribution',
      screenshot: true,
    },
  ),
  scenario(
    'request-policy-publication',
    { surface: 'request-policy' },
    {
      readySelector: '[data-policy-page]',
      readyText: 'Version and activation',
      screenshot: true,
    },
  ),
]

function parseArgs(argv) {
  const options = {
    baseUrl: 'http://127.0.0.1:3012',
    screenshotDir: path.resolve('artifacts/request-build-browser'),
    scenarioPattern: null,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!value) throw new Error(`Missing value after ${key}.`)
    if (key === '--base-url') options.baseUrl = new URL(value).origin
    else if (key === '--screenshot-dir') options.screenshotDir = path.resolve(value)
    else if (key === '--scenario') options.scenarioPattern = value
    else throw new Error(`Unknown argument: ${key}`)
    index += 1
  }
  mkdirSync(options.screenshotDir, { recursive: true })
  options.scenarios = options.scenarioPattern
    ? SCENARIOS.filter((item) => item.name.includes(options.scenarioPattern))
    : SCENARIOS
  if (options.scenarios.length === 0) {
    throw new Error(`No Request browser scenario matched ${options.scenarioPattern}.`)
  }
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
            : surface === 'public-outcome' ? 'published'
              : surface === 'request-policy' ? 'publication'
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
        position:style.position,
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
    'request-delivery-heading',
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
    fixtureTextLower:(fixture?.innerText || '').replace(/\\s+/g,' ').trim().toLowerCase(),
    deliveryPlaceholders:fixture?.querySelectorAll('[data-request-delivery-slot]').length || 0,
    intakeCtaCount:fixture?.querySelectorAll('[data-request-intake-cta]').length || 0,
    myForgeRequestContinuationCount:fixture?.querySelectorAll(
      'a[href="/my-forge?tab=requests"]'
    ).length || 0,
    myForgeNewRequestLabels:[...fixture.querySelectorAll('[data-my-forge-new-request]')]
      .map((element)=>(element.textContent || '').replace(/→/g,'').replace(/\\s+/g,' ').trim()),
    myForgeNewRequestArrows:fixture?.querySelectorAll('[data-my-forge-new-request-arrow]').length || 0,
    myForgeNewRequestSvgs:fixture?.querySelectorAll('[data-my-forge-new-request] svg').length || 0,
    assignedQueueUnavailableCount:fixture?.querySelectorAll(
      '[data-assigned-request-work-unavailable]'
    ).length || 0,
    requestQueueScopes:[...fixture.querySelectorAll(
      'section[aria-labelledby^="request-"][aria-labelledby$="-queue-heading"]'
    )].map((section)=>(
      section.getAttribute('aria-labelledby') || ''
    ).replace(/^request-|\\-queue-heading$/g,'')),
    publicOperationCount:fixture?.querySelectorAll(
      '[data-request-public-operations]'
    ).length || 0,
    participantTrustToolCount:fixture?.querySelectorAll(
      '[data-request-participant-trust-tools]'
    ).length || 0,
    publicOutcomeCatalogCount:fixture?.querySelectorAll(
      '[data-request-public-outcome-catalog]'
    ).length || 0,
    publicOutcomeDetailCount:fixture?.querySelectorAll(
      '[data-request-public-outcome-detail]'
    ).length || 0,
    publicationReleaseConfirmationCount:fixture?.querySelectorAll(
      'input[name="publicationRelease"][value="yes"][required]'
    ).length || 0,
    outcomePaginationCount:fixture?.querySelectorAll(
      'a[href^="/requests/outcomes?cursor="]'
    ).length || 0,
    publicControlConfirmationCount:fixture?.querySelectorAll(
      'input[name="controlConfirmation"][value="yes"][required]'
    ).length || 0,
    publicationReviewConfirmationCount:fixture?.querySelectorAll(
      'input[name="reviewConfirmation"][value="yes"][required]'
    ).length || 0,
    publicationReviewCheckNames:[...fixture.querySelectorAll(
      'input[type="checkbox"][name$="Excluded"],' +
      'input[type="checkbox"][name$="Delivery"],' +
      'input[type="checkbox"][name$="Consent"],' +
      'input[type="checkbox"][name="publicTruthReady"]'
    )].map((element)=>element.getAttribute('name') || ''),
    hiddenPublicControlDenials:[...fixture.querySelectorAll(
      '[data-request-public-operations] input[type="hidden"][value="no"]'
    )].map((element)=>element.getAttribute('name') || ''),
    duplicateIds:[...fixture.querySelectorAll('[id]')]
      .map((element)=>element.id)
      .filter((id,index,ids)=>ids.indexOf(id)!==index)
      .filter((id,index,ids)=>ids.indexOf(id)===index),
    invalidAriaLabelledBy:[...fixture.querySelectorAll('[aria-labelledby]')]
      .filter((element)=>{
        const ids=(element.getAttribute('aria-labelledby') || '').trim().split(/\\s+/).filter(Boolean);
        return ids.length===0 || ids.some(
          (id)=>document.querySelectorAll('#'+CSS.escape(id)).length!==1
        );
      })
      .map((element)=>element.getAttribute('aria-labelledby')),
    tooSmall,
    stickyActionCount:stickyActions.length,
    primaryActionDetails,
    stickyFormCount:fixture?.querySelectorAll(
      '[data-request-case-primary-action] form'
    ).length || 0,
    heldStickyAnchorCount:fixture?.querySelectorAll(
      '[data-request-case-primary-action] a[href="#request-case-held-operation"]'
    ).length || 0,
    heldOperationCount:fixture?.querySelectorAll('#request-case-held-operation').length || 0,
    heldOperationFormCount:fixture?.querySelectorAll(
      '#request-case-held-operation form'
    ).length || 0,
    secondaryActionCount:fixture?.querySelectorAll(
      '[data-request-case-secondary-action]'
    ).length || 0,
    deliveryStickyAnchorCount:fixture?.querySelectorAll(
      '[data-request-case-primary-action] a[href="#request-delivery-workflow"]'
    ).length || 0,
    deliveryWorkflowCount:fixture?.querySelectorAll('#request-delivery-workflow').length || 0,
    caseHeadingOrder:[...fixture.querySelectorAll(
      'h2[id^="request-case-"]:not(#request-case-error-title), h2#request-delivery-heading'
    )]
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
      'request-delivery-heading',
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

    for (const scenarioItem of options.scenarios) {
      const expectedState = expectedFixtureState(scenarioItem)
      await navigate(
        client,
        sessionId,
        `${options.baseUrl}${scenarioItem.path}`,
        expectedState,
      )
      if (scenarioItem.readySelector) {
        await waitForValue(
          client,
          sessionId,
          `(() => {
            const target=document.querySelector(${JSON.stringify(scenarioItem.readySelector)});
            return Boolean(
              target && (
                ${JSON.stringify(scenarioItem.readyText ?? '')} === '' ||
                target.textContent?.includes(${JSON.stringify(scenarioItem.readyText ?? '')})
              )
            );
          })()`,
          Boolean,
          `${viewport.name}/${scenarioItem.name} production component`,
        )
      }
      await evaluate(client, sessionId, 'window.scrollTo(0, 0)')
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
      if (
        scenarioItem.path.includes('surface=intake') &&
        scenarioItem.path.includes('state=duplicate')
      ) {
        if (
          !snapshot.fixtureText.includes(
            'This submission conflicts with an existing active request or prior submission attempt.',
          ) ||
          snapshot.fixtureText.includes('appears to match an existing request') ||
          snapshot.myForgeRequestContinuationCount !== 1
        ) {
          throw new Error(
            `${label} overclaimed semantic duplicate detection or omitted its My Forge continuation.`,
          )
        }
      }
      if (
        scenarioItem.path.includes('surface=service') &&
        scenarioItem.path.includes('state=capacity_full') &&
        snapshot.intakeCtaCount !== 0
      ) {
        throw new Error(`${label} exposed ${snapshot.intakeCtaCount} intake CTAs at full capacity.`)
      }
      if (scenarioItem.path.includes('surface=participant-trust')) {
        if (
          snapshot.participantTrustToolCount !== 1 ||
          !snapshot.fixtureText.includes('Report a privacy, safety, rights, or service concern') ||
          !snapshot.fixtureText.includes('Transactional email') ||
          !snapshot.fixtureText.includes('Optional outcome publication')
        ) {
          throw new Error(`${label} omitted a participant-safe trust surface.`)
        }
        if (
          scenarioItem.path.includes('state=publish') &&
          (
            snapshot.publicationReleaseConfirmationCount !== 1 ||
            !snapshot.fixtureText.includes('Publish safe outcome projection') ||
            !snapshot.fixtureText.includes('Already-approved PathForge project identifier')
          )
        ) {
          throw new Error(`${label} omitted the attended final-publication confirmation.`)
        }
        if (
          scenarioItem.path.includes('state=restricted') &&
          (
            !snapshot.fixtureText.includes(
              'Publication controls are unavailable while this case is restricted.',
            ) ||
            snapshot.fixtureText.includes('Propose safe summary') ||
            snapshot.fixtureText.includes('Give requester consent') ||
            snapshot.fixtureText.includes('Give builder consent') ||
            snapshot.fixtureText.includes('Publish safe outcome projection')
          )
        ) {
          throw new Error(`${label} exposed publication authority for a restricted case.`)
        }
        if (
          scenarioItem.path.includes('state=reports') &&
          (
            !snapshot.fixtureText.includes('The status projection was corrected.') ||
            !snapshot.fixtureText.includes('Older report history')
          )
        ) {
          throw new Error(`${label} omitted participant-safe report history pagination.`)
        }
      }
      if (scenarioItem.path.includes('surface=public-operations')) {
        const requiredDenials = [
          'acceptingRequests',
          'assigningRequests',
          'operatorRosterRequired',
          'publicIntakeRiskScreening',
          'transactionalNotificationsEnabled',
          'publicationConsentEnabled',
          'publicationAirlockEnabled',
          'publicOutcomesEnabled',
          'controlConfirmation',
        ]
        if (
          snapshot.publicOperationCount !== 1 ||
          snapshot.publicControlConfirmationCount !== 1 ||
          requiredDenials.some(
            (name) => !snapshot.hiddenPublicControlDenials.includes(name),
          )
        ) {
          throw new Error(`${label} omitted a default-deny public control envelope.`)
        }
        if (
          scenarioItem.path.includes('state=off') &&
          (
            !snapshot.fixtureText.includes('0/7') ||
            !snapshot.fixtureText.includes('Every switch is independently default-off')
          )
        ) {
          throw new Error(`${label} did not truthfully render the default-off release posture.`)
        }
        if (
          scenarioItem.path.includes('state=report') &&
          (
            !snapshot.fixtureTextLower.includes('privacy · open') ||
            !snapshot.fixtureTextLower.includes('open private case')
          )
        ) {
          throw new Error(`${label} omitted the private report queue.`)
        }
        if (
          scenarioItem.path.includes('state=publication') &&
          (
            !snapshot.fixtureTextLower.includes('offline neighborhood readiness checklist') ||
            !snapshot.fixtureTextLower.includes('in_airlock') ||
            !snapshot.fixtureTextLower.includes('review these exact title and summary bytes independently') ||
            !snapshot.fixtureTextLower.includes('record independent review') ||
            !snapshot.fixtureTextLower.includes('review private authority') ||
            snapshot.publicationReviewConfirmationCount !== 1 ||
            JSON.stringify(snapshot.publicationReviewCheckNames) !== JSON.stringify([
              'privateContentExcluded',
              'claimsSupportedByDelivery',
              'attributionMatchesConsent',
              'reusePermissionMatchesConsent',
              'publicTruthReady',
            ])
          )
        ) {
          throw new Error(`${label} omitted the exact-summary independent-review airlock.`)
        }
      }
      if (scenarioItem.path.includes('surface=public-outcomes')) {
        if (snapshot.publicOutcomeCatalogCount !== 1) {
          throw new Error(`${label} did not mount the production public outcome catalog.`)
        }
        if (
          scenarioItem.path.includes('state=unavailable') &&
          !snapshot.fixtureText.includes('No empty or enabled publication state is inferred')
        ) {
          throw new Error(`${label} collapsed outcome read failure into an empty state.`)
        }
        if (
          scenarioItem.path.includes('state=off') &&
          !snapshot.fixtureText.includes('Public outcomes are off.')
        ) {
          throw new Error(`${label} did not render the independent outcomes gate as off.`)
        }
        if (
          scenarioItem.path.includes('state=empty') &&
          !snapshot.fixtureText.includes('does not expose or summarize private demand')
        ) {
          throw new Error(`${label} overclaimed an empty public outcome projection.`)
        }
        if (
          scenarioItem.path.includes('state=paginated') &&
          (
            snapshot.outcomePaginationCount !== 1 ||
            !snapshot.fixtureText.includes('Older outcomes')
          )
        ) {
          throw new Error(`${label} omitted stable public outcome pagination.`)
        }
      }
      if (
        /[?&]surface=public-outcome(?:&|$)/.test(scenarioItem.path) &&
        (
          snapshot.publicOutcomeDetailCount !== 1 ||
          !snapshot.fixtureTextLower.includes(
            'dual consent · independent review · publication airlock',
          ) ||
          !snapshot.fixtureTextLower.includes('requester attribution') ||
          !snapshot.fixtureTextLower.includes('not published') ||
          !snapshot.fixtureText.includes('Open the approved PathForge project') ||
          snapshot.fixtureText.includes('71000000-0000-4000-8000-000000000001')
        )
      ) {
        throw new Error(
          `${label} exposed an invalid public outcome detail: ${JSON.stringify({
            detailCount: snapshot.publicOutcomeDetailCount,
            hasAuthorityLabel: snapshot.fixtureTextLower.includes(
              'dual consent · independent review · publication airlock',
            ),
            hasRequesterState: snapshot.fixtureTextLower.includes(
              'requester attribution',
            ) && snapshot.fixtureTextLower.includes(
              'not published',
            ),
            hasApprovedProject: snapshot.fixtureText.includes(
              'Open the approved PathForge project',
            ),
            leakedRequestId: snapshot.fixtureText.includes(
              '71000000-0000-4000-8000-000000000001',
            ),
          })}.`,
        )
      }
      if (
        scenarioItem.path.includes('surface=request-policy') &&
        (
          !snapshot.fixtureTextLower.includes('request a build policy · request-publication-v1') ||
          !snapshot.fixtureTextLower.includes(
            'deploying this page does not open intake, enable email, or authorize publication.',
          )
        )
      ) {
        throw new Error(`${label} omitted versioned policy activation boundaries.`)
      }
      if (
        scenarioItem.path.includes('surface=case') &&
        scenarioItem.path.includes('lifecycle=accepted') &&
        !snapshot.fixtureText.includes('Target Aug 15, 2026')
      ) {
        throw new Error(`${label} did not preserve the exact 2026-08-15 service target date.`)
      }
      if (
        scenarioItem.path.includes('surface=case') &&
        snapshot.fixtureText.includes('ADMIN VIEW')
      ) {
        throw new Error(`${label} mislabeled a participant case as an admin delivery view.`)
      }
      if (
        scenarioItem.path.includes('surface=case') &&
        scenarioItem.path.includes('actor=reviewer') &&
        (
          !snapshot.fixtureText.includes('Approve exact revision') ||
          !snapshot.fixtureText.includes('Request repair')
        )
      ) {
        throw new Error(`${label} omitted the reviewer-owned delivery workflow.`)
      }
      if (
        scenarioItem.path.includes('surface=case') &&
        scenarioItem.path.includes('lifecycle=delivery_ready') &&
        scenarioItem.path.includes('actor=requester') &&
        !snapshot.fixtureText.includes('Acknowledge delivery')
      ) {
        throw new Error(`${label} omitted the requester delivery acknowledgment.`)
      }
      if (
        scenarioItem.path.includes('surface=case') &&
        scenarioItem.path.includes('lifecycle=delivered') &&
        scenarioItem.path.includes('actor=requester') &&
        (
          !snapshot.fixtureText.includes('Mark useful') ||
          !snapshot.fixtureText.includes('Report failed check')
        )
      ) {
        throw new Error(`${label} omitted the requester delivery outcome workflow.`)
      }
      if (
        scenarioItem.path.includes('surface=case') &&
        scenarioItem.path.includes('lifecycle=clarification_requested') &&
        scenarioItem.path.includes('actor=requester') &&
        (
          !snapshot.fixtureText.includes('Submit clarification') ||
          !snapshot.fixtureText.includes('Confirm permanent withdrawal') ||
          !snapshot.fixtureText.includes('Withdraw request') ||
          snapshot.primaryActionDetails.length !== 1 ||
          (
            viewport.mobile &&
            snapshot.primaryActionDetails[0]?.position !== 'fixed'
          ) ||
          snapshot.secondaryActionCount !== 1
        )
      ) {
        throw new Error(
          `${label} did not expose clarification plus one non-sticky confirmed withdrawal action: ${JSON.stringify({
            hasSubmit: snapshot.fixtureText.includes('Submit clarification'),
            hasConfirm: snapshot.fixtureText.includes('Confirm permanent withdrawal'),
            hasWithdraw: snapshot.fixtureText.includes('Withdraw request'),
            sticky: snapshot.stickyActionCount,
            primary: snapshot.primaryActionDetails.length,
            secondary: snapshot.secondaryActionCount,
          })}.`,
        )
      }
      if (
        scenarioItem.path.includes('delivery=staging') &&
        (
          !snapshot.fixtureText.includes('Continue the staged delivery') ||
          !snapshot.fixtureText.includes('Continue exact delivery workflow')
        )
      ) {
        throw new Error(`${label} did not render staged delivery continuation.`)
      }
      if (
        scenarioItem.path.includes('delivery=prepared_recovery') &&
        (
          !snapshot.fixtureText.includes('Resume the prepared delivery') ||
          !snapshot.fixtureText.includes('Continue exact delivery workflow') ||
          snapshot.fixtureText.includes('No case action is currently available')
        )
      ) {
        throw new Error(`${label} did not render prepared-workspace recovery.`)
      }
      if (
        scenarioItem.path.includes('delivery=sealed_waiting') &&
        (
          !snapshot.fixtureText.includes(
            'This exact revision is sealed and waiting for an independent reviewer assignment.',
          ) ||
          !snapshot.fixtureText.includes(
            'Wait for an independent reviewer assignment',
          ) ||
          !snapshot.fixtureText.includes('Delivery sealed') ||
          snapshot.fixtureText.includes('The assigned builder has not submitted') ||
          snapshot.fixtureText.includes('Continue the assigned build') ||
          snapshot.fixtureText.includes('Submit a private delivery revision') ||
          snapshot.fixtureText.includes('Continue exact revision workflow')
        )
      ) {
        throw new Error(
          `${label} did not render sealed reviewer-waiting as a non-actionable success state.`,
        )
      }
      if (
        scenarioItem.path.includes('delivery=sealed_ready') &&
        (
          !snapshot.fixtureText.includes('Ready to submit') ||
          !snapshot.fixtureText.includes('Submit the sealed revision') ||
          !snapshot.fixtureText.includes('Submit a private delivery revision') ||
          !snapshot.fixtureText.includes('Continue exact revision workflow') ||
          snapshot.fixtureText.includes('No case action is currently available') ||
          snapshot.fixtureText.includes('waiting for an independent reviewer assignment') ||
          snapshot.fixtureText.includes('waiting for review assignment')
        )
      ) {
        throw new Error(
          `${label} did not render reviewer-assigned sealed work as submit-ready.`,
        )
      }
      if (
        typeof scenarioItem.expectedDeliveryStickyAnchorCount === 'number' &&
        (
          snapshot.deliveryStickyAnchorCount !== scenarioItem.expectedDeliveryStickyAnchorCount ||
          snapshot.deliveryWorkflowCount !== 1
        )
      ) {
        throw new Error(
          `${label} rendered an invalid delivery sticky-anchor contract: ${JSON.stringify({
            anchors: snapshot.deliveryStickyAnchorCount,
            workflows: snapshot.deliveryWorkflowCount,
          })}.`,
        )
      }
      if (
        viewport.mobile &&
        scenarioItem.expectedDeliveryStickyAnchorCount === 1 &&
        (
          snapshot.primaryActionDetails.length !== 1 ||
          snapshot.primaryActionDetails[0].position !== 'fixed'
        )
      ) {
        throw new Error(
          `${label} did not render exactly one fixed mobile delivery workflow anchor: ${JSON.stringify(snapshot.primaryActionDetails)}.`,
        )
      }
      const isRemovedCase = scenarioItem.path.includes('surface=case') &&
        scenarioItem.path.includes('moderation=removed')
      const isHeldCase = scenarioItem.path.includes('surface=case') &&
        scenarioItem.path.includes('moderation=held')
      const isHeldOperator = isHeldCase &&
        scenarioItem.path.includes('actor=triager') &&
        !scenarioItem.path.includes('primary=mismatched')
      if (
        isHeldOperator &&
        (
          !snapshot.fixtureText.includes('Hold resolution') ||
          !snapshot.fixtureText.includes('Release moderation hold') ||
          !snapshot.fixtureText.includes('Removal reason') ||
          !snapshot.fixtureText.includes('Remove case for moderation') ||
          !snapshot.fixtureText.includes('Resolve the moderation hold') ||
          snapshot.fixtureText.includes('Wait for the next service update') ||
          snapshot.primaryActionDetails.length !== 1 ||
          snapshot.heldStickyAnchorCount !== 1 ||
          snapshot.heldOperationCount !== 1 ||
          snapshot.heldOperationFormCount !== 2 ||
          snapshot.stickyFormCount !== 0 ||
          (
            viewport.mobile &&
            snapshot.primaryActionDetails[0]?.position !== 'fixed'
          ) ||
          snapshot.deliveryPlaceholders !== 0
        )
      ) {
        throw new Error(`${label} did not render the exact restricted held-operator recovery form.`)
      }
      if (
        isHeldCase &&
        !isHeldOperator &&
        (
          snapshot.primaryActionDetails.length !== 0 ||
          snapshot.heldOperationCount !== 0
        )
      ) {
        throw new Error(`${label} exposed a held moderation action to a non-operator fixture.`)
      }
      if (
        scenarioItem.path.includes('surface=case') &&
        snapshot.deliveryPlaceholders !== (isRemovedCase || isHeldCase ? 0 : 1)
      ) {
        throw new Error(
          `${label} rendered an unexpected private delivery slot count: ${snapshot.deliveryPlaceholders}.`,
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
          'request-delivery-heading',
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
          'request-delivery-heading',
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
      if (scenarioItem.myForgeEmptyCta && (
        JSON.stringify(snapshot.myForgeNewRequestLabels) !== JSON.stringify(['Request a build']) ||
        snapshot.myForgeNewRequestArrows !== 1 ||
        snapshot.myForgeNewRequestSvgs !== 0
      )) {
        throw new Error(
          `${label} duplicated its Request a build label/icon: ${JSON.stringify({
            labels: snapshot.myForgeNewRequestLabels,
            arrows: snapshot.myForgeNewRequestArrows,
            svgs: snapshot.myForgeNewRequestSvgs,
          })}.`,
        )
      }
      if (scenarioItem.assignedQueueExpectation) {
        const expected = scenarioItem.assignedQueueExpectation
        if (
          snapshot.assignedQueueUnavailableCount !== expected.unavailable ||
          JSON.stringify(snapshot.requestQueueScopes) !== JSON.stringify(expected.scopes)
        ) {
          throw new Error(
            `${label} confused rejected and empty assigned queues: ${JSON.stringify({
              unavailable: snapshot.assignedQueueUnavailableCount,
              scopes: snapshot.requestQueueScopes,
            })}.`,
          )
        }
        if (
          expected.unavailable > 0 &&
          !snapshot.fixtureText.includes('Assigned Request work could not be verified')
        ) {
          throw new Error(`${label} omitted the bounded assigned-work unavailable notice.`)
        }
        if (
          snapshot.duplicateIds.length > 0 ||
          snapshot.invalidAriaLabelledBy.length > 0
        ) {
          throw new Error(
            `${label} rendered duplicate IDs or invalid aria-labelledby references: ${JSON.stringify({
              duplicateIds: snapshot.duplicateIds,
              invalidAriaLabelledBy: snapshot.invalidAriaLabelledBy,
            })}.`,
          )
        }
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
        if (scenarioItem.screenshotTarget) {
          const foundScreenshotTarget = await evaluate(client, sessionId, `(() => {
            const target=document.querySelector(${JSON.stringify(scenarioItem.screenshotTarget)});
            target?.scrollIntoView({block:'center',inline:'nearest'});
            return Boolean(target);
          })()`)
          if (!foundScreenshotTarget) {
            throw new Error(
              `${label} did not render screenshot target ${scenarioItem.screenshotTarget}.`,
            )
          }
          await new Promise((resolve) => setTimeout(resolve, 250))
          await evaluate(client, sessionId, `new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          })`)
          await capture(
            client,
            sessionId,
            path.join(
              options.screenshotDir,
              `${scenarioItem.name}-${viewport.name}-${scenarioItem.screenshotTargetSuffix ?? 'detail'}.png`,
            ),
          )
        }
      }
    }

    if (consoleErrors.length > 0) {
      throw new Error(`${viewport.name} logged browser errors: ${[...new Set(consoleErrors)].join(' | ')}`)
    }
    if (httpFailures.length > 0) {
      throw new Error(`${viewport.name} received failed HTTP responses: ${[...new Set(httpFailures)].join(' | ')}`)
    }
    return options.scenarios.length
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
      `Request a Build fixture browser guard passed ${assertions} rendered scenario/viewport checks across desktop and exact 390px: semantic content, focused errors, mobile order, reduced motion, 44px controls, overflow, framework/console/HTTP failures, private delivery, roster/report/notification/consent, versioned policy, and public-safe outcome states.`,
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
