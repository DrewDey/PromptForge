#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import {
  derivePublicProjectPresentationCore,
  publicArtifactStatusPresentationCore,
} from '../src/lib/public-project-truth-core.mjs'
import { resolvePublicSourceEvidenceCore as resolvePublicSourceEvidence } from '../src/lib/public-source-evidence-core.mjs'

const noRecord = resolvePublicSourceEvidence(null)
const checkedRecord = resolvePublicSourceEvidence({
  sourceRunId: 'checked-but-unconfirmed',
  pathforgeRecordChecked: true,
})
const blackoutPackage = JSON.parse(await readFile(
  'seed-runs/airlock-zero-blackout-shift-claude-sonnet-5-max-fork.json',
  'utf8',
))
assert.equal(blackoutPackage.fork_source?.source_step_number, 10)
assert.equal(
  blackoutPackage.steps.filter((step) => step.step_number > blackoutPackage.fork_source.source_step_number).length,
  4,
  'Blackout must preserve four child prompts separately from ten inherited parent pairs',
)
const blackoutChildPreviewEvidence = resolvePublicSourceEvidence({
  sourceRunId: blackoutPackage.source_run_id,
  pathforgeRecordChecked: true,
})
assert.equal(blackoutChildPreviewEvidence.accessState, 'provider_private')
assert.equal(blackoutChildPreviewEvidence.providerLinkLabel, 'Open provider session')
assert.match(blackoutChildPreviewEvidence.accessNote, /owner's signed-in account/)

const defaultRun = derivePublicProjectPresentationCore({
  sourceEvidence: checkedRecord,
  qualityStatus: 'verified',
  knownIssueExplanation: null,
  selectedRunPromptCount: 2,
  familyRunCount: 3,
  isCanonicalDefaultRun: true,
})
assert.equal(defaultRun.artifact.label, 'Artifact verified')
assert.equal(defaultRun.runContextLabel, 'Default run')
assert.equal(defaultRun.selectedRunPromptLabel, '2 prompts')
assert.equal(defaultRun.familyRunLabel, '3 model runs')
assert.equal(defaultRun.sourceEvidence.recordLabel, 'PathForge record only')

const selectedKnownIssueRun = derivePublicProjectPresentationCore({
  sourceEvidence: noRecord,
  qualityStatus: 'known-issue',
  knownIssueExplanation: 'The checked artifact clips one control at 390px.',
  selectedRunPromptCount: 3,
  familyRunCount: 2,
  isCanonicalDefaultRun: false,
})
assert.equal(selectedKnownIssueRun.artifact.label, 'Artifact has known issue')
assert.equal(selectedKnownIssueRun.artifact.explanation, 'The checked artifact clips one control at 390px.')
assert.equal(selectedKnownIssueRun.runContextLabel, 'Selected run')
assert.equal(selectedKnownIssueRun.selectedRunPromptCount, 3)
assert.equal(selectedKnownIssueRun.familyRunCount, 2)
assert.equal(selectedKnownIssueRun.sourceEvidence.recordLabel, null)

assert.deepEqual(
  publicArtifactStatusPresentationCore({ qualityStatus: 'recorded' }),
  { status: 'recorded', label: 'Run recorded', explanation: null },
)

const requiredSurfaceTokens = new Map([
  ['src/components/home/HomeHero.tsx', ['authorProvenanceKind', 'BuilderByline']],
  ['src/components/home/HomeBuildMosaic.tsx', ['BuildPathCard', 'data-home-shared-path-cards']],
  ['src/components/discovery/InteractiveBuildPathCard.tsx', ['selectedVariant.promptCount', 'selectedVariant.modelProofLabel']],
  ['src/components/PreparedSourceRunPage.tsx', [
    'derivePublicProjectTruth',
    'PublicTruthSummary',
    'BuilderByline',
    'data-prepared-header-public-truth',
    'getCanonicalPreparedSelectedRunPromptCount',
  ]],
  ['src/components/PathForgeLabsModelRuns.tsx', [
    'activeVariant.promptCount',
    'variantSourceEvidence.modelProofLabel',
    'data-selected-model-public-truth',
    'activeSourceEvidence.accessLabel',
    'activeSourceEvidence.recordLabel',
  ]],
  ['src/components/BuilderWorkCard.tsx', ['defaultModelLabel', 'defaultModelProofLabel', 'knownIssueRunCount']],
  ['src/lib/airlock-zero-projects.ts', [
    'A genuine Sonnet 5 Max branch from Reactor Run response 10',
    'the genuine branch attached to an exact response in that run',
  ]],
  ['src/lib/data.ts', [
    'PREPARED_SHOWCASE_PROJECTS',
    'project.forkSource?.sourceProjectId === projectId',
    'childSourceRunId = resolveProviderPublicShareSourceRunId(sourceRun)',
    'childSourceUrl: null',
    "childArtifactQualityStatus: checkedChildVariant?.qualityStatus ?? 'recorded'",
  ]],
  ['src/components/ProjectForkBuildPath.tsx', [
    'ForkTruthDisclosure',
    'sourceEvidence ?? resolvePublicSourceEvidence(null)',
    "qualityStatus: fork.childArtifactQualityStatus ?? 'recorded'",
    'publicSourceEvidence.providerLinkLabel',
  ]],
  ['src/components/ProjectForkNetworkExplorer.tsx', ['sourceEvidence={selectedForkEvidence}']],
  ['src/components/SourceRunShowcase.tsx', [
    'SourceRunEvidenceFooter',
    'sourceEvidence={publicSourceEvidence}',
    'sourceEvidence={activeForkSourceEvidence}',
    'activeForkContext.fork.childSourceRunId',
  ]],
])

for (const [filePath, tokens] of requiredSurfaceTokens) {
  const source = await readFile(filePath, 'utf8')
  for (const token of tokens) {
    assert.ok(source.includes(token), `${filePath} must preserve ${token}`)
  }
}

const runtimeRequire = createRequire(import.meta.url)
const builderProvenanceSource = await readFile('src/lib/builder-provenance.ts', 'utf8')
const builderProvenanceModule = { exports: {} }
const builderProvenanceJavaScript = ts.transpileModule(builderProvenanceSource, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: 'builder-provenance.ts',
}).outputText
const loadBuilderProvenance = vm.runInNewContext(
  `(function (require, module, exports) { ${builderProvenanceJavaScript}\n })`,
)
loadBuilderProvenance(runtimeRequire, builderProvenanceModule, builderProvenanceModule.exports)

const builderBylineSource = await readFile('src/components/BuilderByline.tsx', 'utf8')
const builderBylineModule = { exports: {} }
const builderBylineRequire = (specifier) => {
  if (specifier === 'next/link') {
    return {
      __esModule: true,
      default: ({ children, href, className }) => React.createElement('a', { href, className }, children),
    }
  }
  if (specifier === '@/lib/builder-provenance') {
    return builderProvenanceModule.exports
  }
  return runtimeRequire(specifier)
}
const builderBylineJavaScript = ts.transpileModule(builderBylineSource, {
  compilerOptions: {
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: 'BuilderByline.tsx',
}).outputText
const loadBuilderByline = vm.runInNewContext(
  `(function (require, module, exports) { ${builderBylineJavaScript}\n })`,
)
loadBuilderByline(builderBylineRequire, builderBylineModule, builderBylineModule.exports)
const { BuilderByline } = builderBylineModule.exports
const renderBuilderByline = (provenanceKind) => renderToStaticMarkup(
  React.createElement(BuilderByline, {
    name: 'Lena Dusk',
    provenanceKind,
  }),
)
const renderedSeedByline = renderBuilderByline('pathforge_seed')
const renderedTeamByline = renderBuilderByline('pathforge_team')
const renderedSeedBylineText = renderedSeedByline.replace(/<[^>]+>/g, '')
const renderedTeamBylineText = renderedTeamByline.replace(/<[^>]+>/g, '')
assert.match(renderedSeedBylineText, /^by Lena Dusk · PathForge-operated$/)
assert.match(renderedTeamBylineText, /^by Lena Dusk · PathForge team$/)
assert.doesNotMatch(`${renderedSeedBylineText} ${renderedTeamBylineText}`, /byLena|Dusk·/)
for (const renderedByline of [renderedSeedByline, renderedTeamByline]) {
  assert.match(
    renderedByline,
    /class="[^"]*whitespace-nowrap[^"]*" data-builder-provenance=/,
    'operated-builder provenance must wrap as one complete public label',
  )
}

const forkTruthDisclosureSource = await readFile('src/components/ForkTruthDisclosure.tsx', 'utf8')
const forkTruthDisclosureModule = { exports: {} }
const forkTruthDisclosureJavaScript = ts.transpileModule(forkTruthDisclosureSource, {
  compilerOptions: {
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: 'ForkTruthDisclosure.tsx',
}).outputText
const loadForkTruthDisclosure = vm.runInNewContext(
  `(function (require, module, exports) { ${forkTruthDisclosureJavaScript}\n })`,
)
loadForkTruthDisclosure(runtimeRequire, forkTruthDisclosureModule, forkTruthDisclosureModule.exports)
const { ForkTruthDisclosure } = forkTruthDisclosureModule.exports
const recordedArtifact = publicArtifactStatusPresentationCore({ qualityStatus: 'recorded' })
const renderedCheckedForkTruth = renderToStaticMarkup(React.createElement(ForkTruthDisclosure, {
  artifact: recordedArtifact,
  sourceEvidence: blackoutChildPreviewEvidence,
}))
const renderedCheckedForkText = renderedCheckedForkTruth.replace(/<[^>]+>/g, '')
for (const label of [
  'Run recorded',
  'Provider sign-in required',
  'PathForge record',
  'Exact model recorded by PathForge, not shown publicly',
]) {
  assert.ok(renderedCheckedForkText.includes(label), `checked fork disclosure must render ${label}`)
}
for (const hook of [
  'data-artifact-truth="recorded"',
  'data-source-access="provider_private"',
  'data-pathforge-record="true"',
  'data-model-proof="pathforge_recorded_not_public"',
]) {
  assert.ok(renderedCheckedForkTruth.includes(hook), `checked fork disclosure must render ${hook}`)
}
const renderedUnknownForkTruth = renderToStaticMarkup(React.createElement(ForkTruthDisclosure, {
  artifact: recordedArtifact,
  sourceEvidence: noRecord,
}))
assert.match(renderedUnknownForkTruth, /data-source-access="unconfirmed"/)
assert.match(renderedUnknownForkTruth, /Public access not confirmed/)
assert.match(renderedUnknownForkTruth, /Model proof not confirmed/)
assert.doesNotMatch(renderedUnknownForkTruth, /data-pathforge-record=/)

const sourceRunEvidenceFooterSource = await readFile('src/components/SourceRunEvidenceFooter.tsx', 'utf8')
const sourceRunEvidenceFooterModule = { exports: {} }
const sourceRunEvidenceFooterJavaScript = ts.transpileModule(sourceRunEvidenceFooterSource, {
  compilerOptions: {
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: 'SourceRunEvidenceFooter.tsx',
}).outputText
const loadSourceRunEvidenceFooter = vm.runInNewContext(
  `(function (require, module, exports) { ${sourceRunEvidenceFooterJavaScript}\n })`,
)
const sourceRunEvidenceFooterRequire = (specifier) => {
  if (specifier === '@/lib/provider-public-share') {
    return {
      providerPublicShareHref(value, accessState) {
        return (
          typeof value === 'string' &&
          ['public_exact', 'public_partial'].includes(accessState) &&
          /^https:\/\/chatgpt\.com\/share\/[A-Za-z0-9_-]+\/?$/.test(value)
        ) ? value : null
      },
    }
  }
  return runtimeRequire(specifier)
}
loadSourceRunEvidenceFooter(
  sourceRunEvidenceFooterRequire,
  sourceRunEvidenceFooterModule,
  sourceRunEvidenceFooterModule.exports,
)
const { SourceRunEvidenceFooter } = sourceRunEvidenceFooterModule.exports
const renderedNoLinkFooter = renderToStaticMarkup(React.createElement(SourceRunEvidenceFooter, {
  sourceRunHref: null,
  evidence: checkedRecord,
}))
assert.doesNotMatch(renderedNoLinkFooter, /<a\b/)
assert.match(renderedNoLinkFooter, /data-source-access="unconfirmed"/)
assert.match(renderedNoLinkFooter, /data-pathforge-record="true"/)
assert.match(renderedNoLinkFooter, /PathForge record only/)
assert.match(renderedNoLinkFooter, /data-model-proof="not_confirmed"/)
assert.match(renderedNoLinkFooter, /Model proof not confirmed/)
const renderedPrivateLocatorFooter = renderToStaticMarkup(
  React.createElement(SourceRunEvidenceFooter, {
    sourceRunHref: 'https://chatgpt.com/c/account-private-session',
    evidence: blackoutChildPreviewEvidence,
  }),
)
assert.doesNotMatch(
  renderedPrivateLocatorFooter,
  /<a\b|account-private-session/,
  'private provider evidence must not become a public footer link',
)
const renderedVerifiedShareFooter = renderToStaticMarkup(
  React.createElement(SourceRunEvidenceFooter, {
    sourceRunHref: 'https://chatgpt.com/share/verified-public-source',
    evidence: {
      ...checkedRecord,
      accessState: 'public_exact',
      providerLinkLabel: 'Open public source',
    },
  }),
)
assert.match(
  renderedVerifiedShareFooter,
  /href="https:\/\/chatgpt\.com\/share\/verified-public-source"/,
  'a separately verified public share must remain renderable',
)

const airlockZeroProjectSource = await readFile('src/lib/airlock-zero-projects.ts', 'utf8')
assert.doesNotMatch(
  airlockZeroProjectSource,
  /description:\s*\n\s*['"][^'"]*from the verified Reactor Run response 10/,
  'public Blackout Shift presenter copy must not imply public-provider verification',
)
assert.doesNotMatch(
  airlockZeroProjectSource,
  /resultContent:\s*\n\s*['"][^'"]*branch attached to a verified response/,
  'public Airlock outcome copy must distinguish response lineage from verification history',
)
const preparedPageSource = await readFile('src/components/PreparedSourceRunPage.tsx', 'utf8')
assert.ok(
  preparedPageSource.includes('{project.description}'),
  'the guarded project description must remain the copy rendered by the prepared public page',
)
assert.match(
  preparedPageSource,
  /\.\.\.\(sourceRunSlug === undefined \? \{\} : \{ slug: sourceRunSlug \}\)/,
  'prepared pages must omit an absent optional slug without weakening malformed-alias fail-closed behavior',
)
assert.doesNotMatch(
  preparedPageSource,
  /sourceEvidenceLookup:\s*\{[\s\S]{0,180}?slug:\s*sourceRunSlug,/,
  'prepared pages cannot always materialize an absent slug identity alias',
)
assert.match(
  preparedPageSource,
  /selectedRunPromptCount:\s*getCanonicalPreparedSelectedRunPromptCount\([\s\S]{0,100}?project,[\s\S]{0,100}?activeModelVariant\?\.promptCount/,
  'prepared headers must share the canonical selected-run prompt count used by static surfaces',
)

const profilePresenter = await readFile('src/lib/profile-presentation.ts', 'utf8')
assert.doesNotMatch(
  profilePresenter,
  /provenanceKind\s*===\s*['"]pathforge_team['"]\s*\|\|\s*profile\.role/,
  'admin role must not substitute for trusted profile provenance',
)

console.log('Public project truth presenter and cross-surface wiring checks passed.')
