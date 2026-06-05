#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const failures = []

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path}: missing required file`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

function mustInclude(path, text, message) {
  const content = read(path)
  if (!content.includes(text)) failures.push(`${path}: ${message}`)
}

function mustIncludeNormalized(path, text, message) {
  const content = read(path).replace(/\s+/g, ' ')
  const normalizedText = text.replace(/\s+/g, ' ')
  if (!content.includes(normalizedText)) failures.push(`${path}: ${message}`)
}

function mustNotInclude(path, text, message) {
  const content = read(path)
  if (content.includes(text)) failures.push(`${path}: ${message}`)
}

const runbook = 'PATHFORGE_HOURLY_SEED_MANAGER.md'
const seedSkill = 'skills/pathforge-seed-iteration/SKILL.md'
const seedIdeaQuality = 'skills/pathforge-seed-iteration/references/seed-idea-quality.md'
const packageReference = 'skills/pathforge-seed-iteration/references/pathforge-seed-package.md'
const packageJson = 'package.json'
const automation = join(homedir(), '.codex/automations/pathforge-hourly-seed-manager/automation.toml')

mustInclude(packageJson, '"check:hourly-seed-manager"', 'package.json must expose the hourly seed manager guard')

for (const path of [runbook, automation]) {
  mustIncludeNormalized(path, 'Let each lane complete its intended 5-8 prompt chain before pass/reject', `${path} must forbid mid-chain rejection before the current 5-8 target finishes`)
  mustInclude(path, 'Wait much longer on high-thinking/model-finalizing stalls', `${path} must require longer waits for slow high-thinking runs`)
  mustInclude(path, 'One blocked or rejected lane does not cancel', `${path} must keep the three lanes independent`)
  mustInclude(path, 'seed-runs/rejected/', `${path} must preserve close rejected candidates`)
  mustInclude(path, 'OpenRouter is optional variety, not a default and not forced', `${path} must not force OpenRouter`)
  mustInclude(path, 'No non-verbatim response packages', `${path} must keep verbatim responses as a hard gate`)
  mustInclude(path, 'Use source-run intake only', `${path} must keep source-run-only intake`)
  mustInclude(path, 'Every real artifact version must be production-servable under', `${path} must require real public artifact versions`)
  mustInclude(path, 'not add `artifact_version_path`', `${path} must allow honest transcript-only steps`)
  mustInclude(path, 'If a prior hourly manager run is still active, do not start a duplicate batch', `${path} must avoid overlapping hourly batches`)
  mustInclude(path, 'Do not solve this with a fixed phrase list', `${path} must avoid phrase-list steering`)
  mustInclude(path, 'obvious batch-template repetition', `${path} must block cloned prompt openers without forcing a new opener`)
  mustInclude(path, 'Normal user source-run uploads', `${path} must know user uploads capture provider/model at intake`)
  mustIncludeNormalized(path, 'separate AI service from exact model', `${path} must distinguish service/router from actual model`)
  mustIncludeNormalized(path, 'OpenRouter is a router/service, not the model', `${path} must not treat OpenRouter as a model`)
  mustIncludeNormalized(path, 'exact model cannot be reliably inferred', `${path} must require user-entered model metadata`)
  mustInclude(path, 'Provider:', `${path} must point page builders to stable provider metadata labels`)
  mustInclude(path, 'Model settings:', `${path} must point page builders to stable model settings labels`)
  mustNotInclude(path, 'rejecting slow or blocked runs instead of waiting forever', `${path} must not keep the old quick-reject wording`)
  mustNotInclude(path, 'Prompt voice: <direct/personal/problem-first/etc>', `${path} must not assign fixed prompt voice categories`)
}

mustInclude(automation, 'status = "ACTIVE"', 'automation must be active for hourly seed runs')
mustInclude(automation, 'rrule = "FREQ=HOURLY;INTERVAL=1"', 'automation must remain hourly')
mustInclude(automation, 'npm run check:hourly-seed-manager', 'automation must run its own rule guard before uploads')

mustInclude(seedSkill, 'Let the lane finish, then judge the completed package.', 'seed skill must require completed-run judgment')
mustInclude(seedSkill, 'wait much longer before treating it as blocked', 'seed skill must require longer waits')
mustInclude(seedSkill, 'preview-only steps', 'seed skill must document preview-only steps')
mustInclude(seedSkill, 'seed-runs/rejected/', 'seed skill must preserve promising rejects')
mustInclude(seedSkill, 'Do not treat examples, prior successful seeds, or the phrase "single-file HTML"', 'seed skill must avoid template cloning')
mustInclude(seedSkill, 'Do not replace one repeated opener with another fixed opener list', 'seed skill must avoid fixed opener lists')
mustInclude(seedSkill, 'AI service/provider, exact model as free text', 'seed skill must document source-run service/model metadata fields')
mustInclude(seedSkill, 'OpenRouter is the service/router, not the model', 'seed skill must not treat OpenRouter as a model')
mustInclude(seedSkill, 'type `Not sure` only when the session truly does not show the exact model', 'seed skill must preserve honest unknown model capture')
mustNotInclude(seedSkill, 'after a short wait', 'seed skill must not keep short-wait fallback wording')
mustNotInclude(seedSkill, 'Make me a playable Breakout game as a single self-contained HTML file.', 'seed skill must not keep cloned first-prompt examples')
mustNotInclude(seedSkill, 'Make me a single-file meeting-cost calculator', 'seed skill must not keep cloned first-prompt examples')
mustNotInclude(seedSkill, 'Make me a single-file browser habit tracker', 'seed skill must not keep cloned first-prompt examples')

mustInclude(seedIdeaQuality, 'Do not use this reference as a phrase bank', 'seed idea quality guide must not act as a prompt phrase bank')
mustInclude(seedIdeaQuality, 'fixed opener list', 'seed idea quality guide must avoid replacement phrase lists')
mustNotInclude(seedIdeaQuality, 'Make me a polished one-file', 'seed idea quality guide must not keep cloned make-me examples')
mustNotInclude(seedIdeaQuality, 'Make me a single-file', 'seed idea quality guide must not keep cloned make-me examples')

mustInclude(packageReference, 'artifact_version_path`: optional', 'package docs must allow transcript-only steps')
mustInclude(packageReference, 'must point under `public/artifacts/`', 'package docs must restrict real artifacts to public/artifacts')
mustInclude(packageReference, 'Transcript-Only Steps', 'package docs must explain transcript-only steps')
mustInclude(packageReference, 'Rejected Candidates', 'package docs must explain rejected candidate preservation')
mustInclude(packageReference, 'preview-frame text', 'package docs must explicitly prohibit fake preview-frame artifacts')
mustInclude(packageReference, 'screenshots', 'package docs must explicitly prohibit screenshot-only fake artifacts')
mustInclude(packageReference, 'local-only notes', 'package docs must explicitly prohibit local-note fake artifacts')
mustInclude(packageReference, '`Provider:`, `Model used:`, and `Model settings:`', 'package docs must preserve stable model metadata labels')
mustInclude(packageReference, 'OpenRouter is', 'package docs must distinguish OpenRouter from the actual model')
mustInclude(packageReference, '`Model used` is required as free text', 'package docs must require model provenance for user uploads')

if (failures.length > 0) {
  console.error('Hourly seed manager guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Hourly seed manager guard passed.')
