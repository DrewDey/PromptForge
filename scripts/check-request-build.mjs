#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const FIXTURE_ROUTE = 'src/app/qa/request-build/page.tsx'
const FIXTURE_MODELS = 'src/lib/build-requests/fixtures.ts'

const route = readFileSync(FIXTURE_ROUTE, 'utf8')
const models = readFileSync(FIXTURE_MODELS, 'utf8')

assert.match(
  route,
  /process\.env\.VERCEL_ENV === 'production'\) notFound\(\)/,
  'Request fixture route must fail closed in production.',
)

for (const productionComponent of [
  'RequestServiceOverview',
  'RequestSubmissionReceipt',
  'RequestIntakeForm',
  'RequestCaseShell',
  'MyForgeRequestsList',
  'AdminRequestQueue',
  'AdminRequestDetailOperations',
]) {
  assert.match(
    route,
    new RegExp(`\\b${productionComponent}\\b`),
    `Request fixture must mount the real ${productionComponent} component.`,
  )
}

for (const collection of [
  'REQUEST_LIFECYCLES',
  'REQUEST_ACTOR_ROLES',
  'REQUEST_MODERATION_STATES',
  'REQUEST_CLOSE_REASONS',
  'REQUEST_SERVICE_STATES',
  'REQUEST_INTAKE_STATES',
  'REQUEST_RECEIPT_STATES',
  'REQUEST_CASE_ERROR_STATES',
  'REQUEST_DELIVERY_STATES',
  'REQUEST_MY_FORGE_STATES',
  'REQUEST_ADMIN_QUEUE_STATES',
  'REQUEST_ADMIN_SCOPES',
  'REQUEST_ADMIN_DETAIL_STATES',
]) {
  assert.match(models, new RegExp(`export const ${collection}\\s*=`))
  assert.match(route, new RegExp(`\\b${collection}\\b`))
}

for (const lifecycle of [
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
]) {
  assert.match(models, new RegExp(`'${lifecycle}'`), `Missing lifecycle fixture ${lifecycle}.`)
}

for (const actor of ['requester', 'triager', 'builder', 'reviewer', 'system']) {
  assert.match(models, new RegExp(`'${actor}'`), `Missing actor fixture ${actor}.`)
}

for (const moderation of ['clear', 'held', 'removed']) {
  assert.match(models, new RegExp(`'${moderation}'`), `Missing moderation fixture ${moderation}.`)
}

for (const closeReason of [
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
]) {
  assert.match(models, new RegExp(`'${closeReason}'`), `Missing close-reason fixture ${closeReason}.`)
}

for (const state of [
  'loading',
  'unavailable',
  'closed',
  'capacity_full',
  'available',
  'private',
  'rate_limited',
  'stale_version',
  'forbidden_input',
  'idempotent_replay',
  'missing_delivery',
  'hash_mismatch',
  'publication_blocked',
  'controls_off',
  'assignment_off',
]) {
  assert.match(models, new RegExp(`'${state}'`), `Missing Request state fixture ${state}.`)
}

assert.match(
  models,
  /kind: 'response',[\s\S]*projectId:[\s\S]*modelVariantId:[\s\S]*responseStepNumber:/,
  'Response-reference fixture must use the exact project/model-variant/step tuple.',
)
assert.doesNotMatch(
  models,
  /pathforgeReference:\s*\{[\s\S]{0,180}\burl:/,
  'PathForge fixture references must not use URLs.',
)

assert.match(route, /data-request-delivery-placeholder/)
assert.match(route, /Placeholder · not custody or hash evidence/)
assert.match(route, /does not prove live[\s\S]*artifact custody[\s\S]*hash verification/)
assert.doesNotMatch(
  route,
  /\b(uploaded artifact|verified artifact bytes|custody verified)\b/i,
  'Fixture must not claim PM 3 custody or artifact proof.',
)

assert.match(route, /async function fixtureAction\(_formData: FormData\)[\s\S]*'use server'/)
assert.doesNotMatch(
  route,
  /\b(from|insert|update|delete)\s*\(\s*['"`](?:build_|request_)/i,
  'Fixture route must not access Request tables.',
)

console.log(
  'Request a Build deterministic fixture contract passed: all actors, lifecycle/moderation/closure, availability/error states, exact typed references, real-component seams, production hiding, and PM 3 non-evidence boundary are present.',
)
