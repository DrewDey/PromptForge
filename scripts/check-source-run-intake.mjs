#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const failures = []

function read(path, { optional = false } = {}) {
  if (!existsSync(path)) {
    if (!optional) failures.push(`${path}: missing required file`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

function mustInclude(path, text, message) {
  const content = read(path)
  if (!content.includes(text)) failures.push(`${path}: ${message}`)
}

function mustNotMatch(path, pattern, message) {
  const content = read(path)
  if (pattern.test(content)) failures.push(`${path}: ${message}`)
}

function mustNotInclude(path, text, message) {
  const content = read(path)
  if (content.includes(text)) failures.push(`${path}: ${message}`)
}

function optionalMustInclude(path, text, message) {
  if (!existsSync(path)) return
  const content = read(path, { optional: true })
  if (!content.includes(text)) failures.push(`${path}: ${message}`)
}

function optionalMustNotInclude(path, text, message) {
  if (!existsSync(path)) return
  const content = read(path, { optional: true })
  if (content.includes(text)) failures.push(`${path}: ${message}`)
}

const importer = 'scripts/import-pathforge-source-run.mjs'
mustInclude(importer, "source_run_submissions", 'importer must write only to source_run_submissions')
mustInclude(importer, "--submit-draft has been disabled", 'importer must hard-fail the old direct draft flag')
mustInclude(importer, "pkg.source_url = requireString(pkg.source_url, 'source_url')", 'importer must require a real source_url')
mustInclude(importer, "pkg.provider = requireString(pkg.provider, 'provider')", 'importer must require provider metadata')
mustInclude(importer, "pkg.model = requireString(pkg.model || pkg.model_used, 'model')", 'importer must require model metadata')
mustInclude(importer, 'Array.isArray(value)', 'importer must preserve array-style package notes instead of dropping them')
mustInclude(importer, '`Provider: ${provider || \'Not specified\'}`', 'importer notes must include stable provider metadata')
mustInclude(importer, '`Model used: ${modelUsed || \'Not specified\'}`', 'importer notes must include stable model metadata')
mustInclude(importer, "mode: 'source-run-intake'", 'importer result must identify source-run intake mode')
mustInclude(importer, 'No prompt/upvote page is created by this importer.', 'importer output must state that it does not create a prompt page')
mustNotMatch(importer, /\.from\(['"`]prompts['"`]\)/, 'importer must not insert into prompts')
mustNotMatch(importer, /\.from\(['"`]prompt_steps['"`]\)/, 'importer must not insert into prompt_steps')
mustNotMatch(importer, /args\.submitDraft\s*=\s*true|submitDraft:\s*true|mode:\s*['"`]draft['"`]/, 'importer must not support direct pending draft mode')
mustNotMatch(importer, /vote_count|bookmark_count|category_id:\s*category\.id|result_content:\s*pkg/, 'importer must not populate public/upvote-page fields')

const buildPage = 'src/app/prompt/new/page.tsx'
mustInclude(buildPage, 'source link, model info, and notes only', 'source-run card must describe the actual intake fields')
mustInclude(buildPage, 'AI service', 'source-run form must ask where the run happened separately from the model')
mustInclude(buildPage, 'Exact model', 'source-run form must ask for the actual visible model')
mustInclude(buildPage, 'Service name', 'source-run form must let Other providers enter a custom service name')
mustInclude(buildPage, 'sourceRunCustomProvider', 'source-run form must preserve a custom service name when Other is selected')
mustInclude(buildPage, "selectedSourceRunProvider === 'Other'", 'source-run form must branch Other into custom provider entry')
mustInclude(buildPage, 'OpenRouter is the service/router. Put the actual model in the model field.', 'source-run form must not treat OpenRouter as the model')
mustInclude(buildPage, 'Add the exact model shown for this source run, or type Not sure.', 'source-run form must require a model value or explicit Not sure')
mustInclude(buildPage, 'Pick the AI service for this source run.', 'source-run form must require provider metadata')
mustInclude(buildPage, 'disabled={sourceRunSubmitting || !canSubmitSourceRun}', 'source-run submit button must stay disabled until provider/model metadata is present')
mustInclude(buildPage, 'Model settings', 'source-run form must ask for optional visible model settings')
mustInclude(buildPage, 'It does not create a public project page.', 'source-run form must say it does not create a public page')
mustInclude(buildPage, 'Nothing is public until an explicit publish step.', 'source-run flow must preserve the publish boundary')
mustInclude(buildPage, 'Not available for now', 'manual entry card must stay visibly closed for now')
mustInclude(buildPage, '-rotate-6', 'manual entry card must keep the diagonal closed-state bar')
mustNotInclude(buildPage, "setIntakeMode('manual')", 'manual entry card must not activate manual upload mode')
mustNotInclude(buildPage, 'drafts the project page from the source link and notes', 'source-run UI must not promise page drafting on submission')
mustNotInclude(buildPage, 'Agent builds the final-artifact-first project page.', 'source-run UI must not say it builds a page during intake')
mustNotInclude(buildPage, 'Build project page', 'queued source-run card must not list project-page creation as an intake step')
mustNotInclude(buildPage, 'Paste the run and let the agent draft the page.', 'source-run empty state must not frame intake as page drafting')

const repoRunbooks = [
  'PATHFORGE_AGENT_NOTES.md',
  'PATHFORGE_PROFILE_TO_PUBLIC_PAGE_SCOPE.md',
]

for (const path of repoRunbooks) {
  mustInclude(path, 'source-run intake', `${path} must keep intake as the named submission boundary`)
  mustNotInclude(path, 'pending review draft', `${path} must not use pending draft as submission language`)
  mustNotInclude(path, 'If an entry starts as a session link, the agent drafts the project page first.', `${path} must not say session-link intake creates a page first`)
  mustNotInclude(path, 'Turns queued session links into pending PathForge project pages.', `${path} must not define source-run intake as page creation`)
}

mustInclude('src/lib/data.ts', 'Add the exact model shown for this source run, or type Not sure.', 'server action must enforce model metadata for user source-run uploads')
mustInclude('src/lib/data.ts', 'Pick the AI service for this source run.', 'server action must enforce provider metadata for user source-run uploads')
mustInclude('src/lib/source-run-review.ts', "labeledValue(notes, 'Provider/model')", 'admin metadata parser must preserve legacy provider/model notes')
mustInclude('src/lib/source-run-review.ts', "labeledValue(notes, 'Provider/model/settings')", 'admin metadata parser must preserve legacy provider/model/settings notes')
mustInclude('src/app/admin/page.tsx', 'modelMetadataForSourceRunReview', 'admin pending rows must surface model metadata')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', 'Model captured', 'admin source-run detail must surface captured model metadata')

const skillBase = join(homedir(), '.codex/skills/pathforge-seed-iteration')
const skillFiles = [
  join(skillBase, 'SKILL.md'),
  join(skillBase, 'pathforge-seed-iteration/SKILL.md'),
  join(skillBase, 'agents/openai.yaml'),
  join(skillBase, 'pathforge-seed-iteration/agents/openai.yaml'),
  join(skillBase, 'references/pathforge-seed-package.md'),
  join(skillBase, 'pathforge-seed-iteration/references/pathforge-seed-package.md'),
]

for (const path of skillFiles) {
  optionalMustInclude(path, 'source-run', `${path} must keep source-run language`)
  optionalMustNotInclude(path, 'pending review draft', `${path} must not say pending review draft`)
  optionalMustNotInclude(path, 'pending project under a realistic synthetic profile', `${path} must not say importer creates pending projects`)
  optionalMustNotInclude(path, 'Description: what the run produced.', `${path} must not list project-page description as a submission field`)
  optionalMustNotInclude(path, 'Outcome/result: final artifact summary and verification note.', `${path} must not list outcome/result as a submission field`)
  optionalMustNotInclude(path, 'Category: broad domain.', `${path} must not list category as a submission field`)
  optionalMustNotInclude(path, 'Difficulty: usually `beginner`', `${path} must not list difficulty as a submission field`)
  optionalMustNotInclude(path, 'Steps: each prompt/response pair with exact text.', `${path} must not list prompt steps as a submission field`)
  optionalMustNotInclude(path, 'vote_count', `${path} must not carry upvote-page defaults`)
  optionalMustNotInclude(path, 'bookmark_count', `${path} must not carry upvote-page defaults`)
}

if (failures.length > 0) {
  console.error('Source-run intake guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Source-run intake guard passed.')
