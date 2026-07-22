#!/usr/bin/env node

import { createRequire } from 'node:module'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, join } from 'node:path'
import { tmpdir } from 'node:os'
import ts from 'typescript'
import { loadCheckedDedicatedSourceRunRoutes } from './source-run-publication-registry.mjs'

const MINIMUM_CHECKED_PACKAGE_COUNT = 173
const CURATED_MANIFEST_PATH = 'seed-runs/curation/2026-07-10-accepted-projects.json'
const RECOVERED_MANIFEST_PATH =
  'seed-runs/curation/2026-07-16-recovered-approved-source-runs.json'
const SOURCE_RUN_GUARD_PATH = 'scripts/check-source-run-showcases.mjs'

const failures = []

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function read(path) {
  if (!existsSync(path)) {
    fail(`${path}: missing required model-identity contract file`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

function parseJson(path) {
  const content = read(path)
  if (!content) return null
  try {
    return JSON.parse(content)
  } catch (error) {
    fail(`${path}: invalid JSON: ${error.message}`)
    return null
  }
}

function mustInclude(path, needle, message) {
  const content = read(path)
  if (content && !content.includes(needle)) fail(`${path}: ${message}`)
}

function mustNotInclude(path, needle, message) {
  const content = read(path)
  if (content && content.includes(needle)) fail(`${path}: ${message}`)
}

function loadIdentityFormatter() {
  const sourcePaths = [
    'src/lib/models.ts',
    'src/lib/public-model-labels.ts',
  ]
  const buildDirectory = mkdtempSync(join(tmpdir(), 'pathforge-model-identity-'))

  try {
    for (const sourcePath of sourcePaths) {
      const source = read(sourcePath)
      if (!source) continue
      const result = ts.transpileModule(source, {
        fileName: sourcePath,
        reportDiagnostics: true,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      })
      for (const diagnostic of result.diagnostics ?? []) {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        fail(`${sourcePath}: formatter test compilation failed: ${message}`)
      }
      writeFileSync(
        join(buildDirectory, basename(sourcePath, '.ts') + '.js'),
        result.outputText,
      )
    }

    const requireFromBuild = createRequire(join(buildDirectory, 'guard.cjs'))
    return {
      formatter: requireFromBuild(join(buildDirectory, 'public-model-labels.js')),
      models: requireFromBuild(join(buildDirectory, 'models.js')),
      cleanup: () => rmSync(buildDirectory, { recursive: true, force: true }),
    }
  } catch (error) {
    fail(`src/lib/public-model-labels.ts: could not execute formatter contract: ${error.message}`)
    return {
      formatter: null,
      models: null,
      cleanup: () => rmSync(buildDirectory, { recursive: true, force: true }),
    }
  }
}

function checkedPackagePaths() {
  const paths = new Set()
  const sourceRunGuard = read(SOURCE_RUN_GUARD_PATH)
  for (const match of sourceRunGuard.matchAll(/packagePath:\s*['"]([^'"]+\.json)['"]/g)) {
    paths.add(match[1])
  }

  const curated = parseJson(CURATED_MANIFEST_PATH)
  for (const project of Array.isArray(curated?.projects) ? curated.projects : []) {
    if (typeof project?.packageFile !== 'string') {
      fail(`${CURATED_MANIFEST_PATH}: every checked project needs packageFile`)
      continue
    }
    paths.add(project.packageFile)
  }

  const recovered = parseJson(RECOVERED_MANIFEST_PATH)
  for (const project of Array.isArray(recovered?.projects) ? recovered.projects : []) {
    if (typeof project?.sourceRunPackageFile !== 'string') {
      fail(`${RECOVERED_MANIFEST_PATH}: every checked project needs sourceRunPackageFile`)
      continue
    }
    paths.add(`seed-runs/${project.sourceRunPackageFile}`)
  }

  return [...paths].sort()
}

function canonicalProvider(provider) {
  const normalized = String(provider ?? '').trim().toLowerCase()
  if (normalized === 'chatgpt' || normalized === 'openai') return 'ChatGPT'
  if (normalized === 'claude' || normalized === 'anthropic') return 'Claude'
  if (normalized === 'gemini' || normalized === 'google') return 'Gemini'
  if (normalized === 'openrouter') return 'OpenRouter'
  return String(provider ?? '').trim()
}

function providerIsVisible(label, provider) {
  if (provider === 'OpenRouter') return /\bvia OpenRouter\b/.test(label)
  return label === provider || label.startsWith(`${provider} `) || label.startsWith(`${provider} ·`)
}

function auditIdentity(identity, packagePath, provider) {
  const label = identity?.label ?? ''
  const canonical = canonicalProvider(provider)

  assert(label.length > 0, `${packagePath}: canonical public model identity is blank`)
  assert(canonical.length > 0, `${packagePath}: canonical provider is blank`)
  assert(
    providerIsVisible(label, canonical),
    `${packagePath}: public identity does not visibly preserve provider ${canonical}: ${label || '(blank)'}`,
  )
  assert(
    !/^(?:extra high|high|medium|low|instant|standard|flash|pro|max)(?:\b|\s*·)/i.test(label),
    `${packagePath}: public identity starts with a provider-less model or setting fragment: ${label}`,
  )
  assert(
    !/\b(Claude Claude|ChatGPT ChatGPT|Gemini Gemini|via OpenRouter via OpenRouter)\b/i.test(label),
    `${packagePath}: public identity duplicates provider text: ${label}`,
  )

  if (identity?.setting) {
    assert(
      label.includes(` · ${identity.setting}`),
      `${packagePath}: determined setting ${identity.setting} is missing from public identity: ${label}`,
    )
  }

  if (identity?.exactness === 'model-unexposed') {
    assert(
      label.endsWith('· exact model not exposed'),
      `${packagePath}: unavailable model must be disclosed briefly: ${label}`,
    )
  } else if (identity?.exactness === 'version-unexposed') {
    assert(
      label.endsWith('· exact version not exposed'),
      `${packagePath}: unavailable model version must be disclosed briefly: ${label}`,
    )
  } else if (identity?.exactness === 'exact') {
    assert(
      !/exact (?:model|version) not exposed/.test(label),
      `${packagePath}: exact identity cannot carry an unavailable-model disclosure: ${label}`,
    )
  } else {
    fail(`${packagePath}: invalid identity exactness ${String(identity?.exactness)}`)
  }
}

function assertRepresentativeCases(getPublicModelIdentity) {
  const cases = [
    {
      name: 'Local Micro-Adventure package evidence',
      input: {
        provider: 'Gemini',
        model: '3.5 Flash',
        modelSettings:
          'Gemini Chrome session; selected visible menu item 3.5 Flash - All-around help before prompting; composer showed Flash; thinking level visible as Standard.',
      },
      expected: {
        label: 'Gemini 3.5 Flash · Standard',
        provider: 'Gemini',
        model: '3.5 Flash',
        setting: 'Standard',
        exactness: 'exact',
      },
    },
    {
      name: 'HP 10Bii provider model and setting',
      input: {
        provider: 'Claude',
        model: 'Claude Opus 4.8 Max',
        modelSettings: 'Claude share provided by Drew; model identified by user as Claude 4.8 Max.',
      },
      expected: {
        label: 'Claude Opus 4.8 · Max',
        provider: 'Claude',
        model: 'Opus 4.8',
        setting: 'Max',
        exactness: 'exact',
      },
    },
    {
      name: 'Claude setting separated from model',
      input: {
        provider: 'Claude',
        model: 'Sonnet 4.6 Medium',
        modelSettings: 'Visible model button: Sonnet 4.6 Medium; Effort: Medium.',
      },
      expected: {
        label: 'Claude Sonnet 4.6 · Medium',
        provider: 'Claude',
        model: 'Sonnet 4.6',
        setting: 'Medium',
        exactness: 'exact',
      },
    },
    {
      name: 'ChatGPT mode-only evidence',
      input: {
        provider: 'ChatGPT',
        model: 'High',
        modelSettings: 'Visible composer model label High selected before sending.',
      },
      expected: {
        label: 'ChatGPT · High · exact model not exposed',
        provider: 'ChatGPT',
        model: '',
        setting: 'High',
        exactness: 'model-unexposed',
      },
    },
    {
      name: 'Gemini version-unexposed evidence',
      input: {
        provider: 'Gemini',
        model: 'Flash',
        modelSettings: 'Visible Gemini mode picker showed Flash.',
      },
      expected: {
        label: 'Gemini Flash · exact version not exposed',
        provider: 'Gemini',
        model: 'Flash',
        setting: '',
        exactness: 'version-unexposed',
      },
    },
    {
      name: 'OpenRouter routed model',
      input: {
        provider: 'OpenRouter',
        model: 'Qwen3.7 Max',
      },
      expected: {
        label: 'Qwen3.7 Max via OpenRouter',
        provider: 'OpenRouter',
        model: 'Qwen3.7 Max',
        setting: '',
        exactness: 'exact',
      },
    },
    {
      name: 'variant service and model composition',
      input: {
        provider: 'Gemini',
        model: 'Gemini 3.1 Pro',
        modelSettings: { thinking_level: 'Standard' },
      },
      expected: {
        label: 'Gemini 3.1 Pro · Standard',
        provider: 'Gemini',
        model: '3.1 Pro',
        setting: 'Standard',
        exactness: 'exact',
      },
    },
  ]

  for (const testCase of cases) {
    const actual = getPublicModelIdentity(testCase.input)
    for (const [field, expected] of Object.entries(testCase.expected)) {
      assert(
        actual?.[field] === expected,
        `${testCase.name}: expected ${field} ${JSON.stringify(expected)}, received ${JSON.stringify(actual?.[field])}`,
      )
    }
  }
}

function assertSurfaceContracts() {
  const preparedPage = 'src/components/PreparedSourceRunPage.tsx'
  mustInclude(
    preparedPage,
    'getPublicModelIdentityLabel',
    'prepared pages must use the canonical public model identity formatter',
  )
  mustInclude(
    preparedPage,
    'provider: sourceRun.provider',
    'prepared pages must preserve package provider evidence',
  )
  mustInclude(
    preparedPage,
    'model: sourceRun.model ?? project.modelUsed',
    'package model evidence must take precedence over the database/project fallback',
  )
  mustInclude(
    preparedPage,
    'modelSettings: sourceRun.model_settings',
    'prepared pages must include package model-setting evidence',
  )
  mustInclude(
    preparedPage,
    'data-public-model-identity',
    'prepared page model summary needs a stable browser assertion target',
  )
  mustNotInclude(
    preparedPage,
    '>{sourceRun.model ?? project.modelUsed}</div>',
    'prepared pages must never print the raw provider-less package fragment',
  )

  const forkShowcase = 'src/components/SourceRunShowcase.tsx'
  mustInclude(
    forkShowcase,
    'provider: fork.childProviderName',
    'fork-network model labels must include the child provider',
  )
  mustInclude(
    forkShowcase,
    'getPublicModelIdentityLabel',
    'fork-network model labels must use the canonical formatter',
  )

  const modelVariants = 'src/components/PathForgeLabsModelRuns.tsx'
  mustInclude(
    modelVariants,
    'provider: variant.serviceLabel',
    'variant labels must compose their structured service provider',
  )
  mustInclude(
    modelVariants,
    'model: variant.modelLabel',
    'variant labels must compose their structured model label',
  )
  mustInclude(
    modelVariants,
    'modelSettings: variant.modelSettings',
    'variant labels must compose their structured settings',
  )

  const genericProjectPage = 'src/app/prompt/[id]/page.tsx'
  mustInclude(
    genericProjectPage,
    'getPublicModelIdentityLabel',
    'generic project details must use the canonical public model identity formatter',
  )
  mustInclude(
    genericProjectPage,
    'data-public-model-identity',
    'generic project details need a stable browser assertion target',
  )

  const myForge = 'src/app/my-forge/page.tsx'
  mustInclude(
    myForge,
    'getPublicModelIdentityLabel',
    'My Forge saved and unfinished rows must use the canonical formatter',
  )

  const relatedProjectRoute = 'src/app/prompt/[id]/page.tsx'
  mustInclude(
    relatedProjectRoute,
    'buildPathDiscoveryCatalog',
    'related-project cards must resolve through the canonical discovery projection',
  )
  mustInclude(
    relatedProjectRoute,
    '<BuildPathCard',
    'related-project cards must reuse the canonical card that displays projected public labels',
  )
  mustNotInclude(
    relatedProjectRoute,
    'loadSourceRunPackage',
    'related-project cards must not open full source-run packages during catalog rendering',
  )
  mustInclude(
    relatedProjectRoute,
    'data-related-shared-path-cards',
    'related-project cards need a stable browser assertion target',
  )

  const discovery = 'src/components/discovery/BuildPathsDiscovery.tsx'
  mustInclude(
    discovery,
    'activeModelFacet?.label ?? activeModel',
    'discovery must display the canonical facet label instead of reparsing its URL slug',
  )
  mustNotInclude(
    discovery,
    'getPublicModelLabel(activeModel)',
    'discovery must not reinterpret a canonical model-facet slug as source evidence',
  )

  const profileProjectionGuard = 'scripts/check-project-model-profile-summaries.mjs'
  mustInclude(
    profileProjectionGuard,
    'serviceLabel: variant.serviceLabel',
    'profile/discovery variant projections must retain structured provider evidence',
  )
  mustInclude(
    profileProjectionGuard,
    'modelSettings: variant.modelSettings',
    'profile/discovery variant projections must retain structured setting evidence',
  )
}

const { formatter, models, cleanup } = loadIdentityFormatter()
let packageCount = 0
let exactCount = 0
let versionUnexposedCount = 0
let modelUnexposedCount = 0

try {
  const getPublicModelIdentity = formatter?.getPublicModelIdentity
  const getPublicModelIdentityLabel = formatter?.getPublicModelIdentityLabel
  assert(
    typeof getPublicModelIdentity === 'function',
    'src/lib/public-model-labels.ts: missing getPublicModelIdentity formatter',
  )
  assert(
    typeof getPublicModelIdentityLabel === 'function',
    'src/lib/public-model-labels.ts: missing getPublicModelIdentityLabel formatter',
  )

  if (typeof getPublicModelIdentity === 'function') {
    assertRepresentativeCases(getPublicModelIdentity)

    const registeredModels = Array.isArray(models?.AI_MODELS) ? models.AI_MODELS : []
    assert(registeredModels.length >= 20, 'src/lib/models.ts: expected the complete registered model catalog')
    for (const registeredModel of registeredModels) {
      const identity = getPublicModelIdentity({ model: registeredModel.id })
      if (registeredModel.id === 'other') {
        assert(identity.label === '', 'the generic Other model option must not become an exact public identity')
        continue
      }

      const expectedProvider = canonicalProvider(registeredModel.provider)
      assert(
        identity.provider === expectedProvider,
        `${registeredModel.id}: expected registered provider ${expectedProvider}, received ${identity.provider || '(blank)'}`,
      )
      assert(
        identity.exactness === 'exact' && identity.model.length > 0,
        `${registeredModel.id}: registered model id must resolve to an exact public model identity`,
      )
      assert(
        providerIsVisible(identity.label, expectedProvider),
        `${registeredModel.id}: registered provider must remain visible in ${identity.label || '(blank)'}`,
      )
    }

    const packages = checkedPackagePaths()
    packageCount = packages.length
    assert(
      packageCount >= MINIMUM_CHECKED_PACKAGE_COUNT,
      `checked package registry shrank below ${MINIMUM_CHECKED_PACKAGE_COUNT} entries (${packageCount})`,
    )

    const routeAudit = loadCheckedDedicatedSourceRunRoutes()
    for (const failure of routeAudit.failures) fail(failure)
    assert(
      routeAudit.routes.size >= packageCount,
      `dedicated route registry (${routeAudit.routes.size}) cannot cover ${packageCount} checked packages`,
    )

    for (const packagePath of packages) {
      const sourcePackage = parseJson(packagePath)
      if (!sourcePackage) continue
      const provider = sourcePackage.provider
      const model = sourcePackage.model ?? sourcePackage.model_used
      assert(
        typeof provider === 'string' && provider.trim().length > 0,
        `${packagePath}: checked package must preserve provider evidence`,
      )
      assert(
        typeof model === 'string' && model.trim().length > 0,
        `${packagePath}: checked package must preserve model or mode evidence`,
      )
      if (typeof provider !== 'string' || typeof model !== 'string') continue

      const identity = getPublicModelIdentity({
        provider,
        model,
        modelSettings: sourcePackage.model_settings,
      })
      auditIdentity(identity, packagePath, provider)

      for (const secondPassInput of [
        { provider: identity.provider, model: identity.label },
        { model: identity.label },
      ]) {
        const secondPass = getPublicModelIdentity(secondPassInput)
        assert(
          secondPass.label === identity.label &&
            secondPass.provider === identity.provider &&
            secondPass.model === identity.model &&
            secondPass.setting === identity.setting &&
            secondPass.exactness === identity.exactness,
          `${packagePath}: canonical identity is not idempotent: ${identity.label} -> ${secondPass.label}`,
        )
      }
      if (identity.exactness === 'exact') exactCount += 1
      if (identity.exactness === 'version-unexposed') versionUnexposedCount += 1
      if (identity.exactness === 'model-unexposed') modelUnexposedCount += 1
    }
  }

  assertSurfaceContracts()
} finally {
  cleanup()
}

if (failures.length) {
  console.error('Public model identity guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `Public model identity guard passed for ${packageCount} checked source-run packages ` +
  `(${exactCount} exact, ${versionUnexposedCount} version unexposed, ` +
  `${modelUnexposedCount} model unexposed).`,
)
