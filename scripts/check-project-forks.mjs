import { existsSync, readFileSync, readdirSync } from 'node:fs'
import ts from 'typescript'
import {
  inspectablePreparedForkFallbacks,
  preparedReleaseGateIsEnforced,
} from '../src/lib/prepared-release-gates-core.mjs'

const failures = []

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

const gateBlockedPreparedFork = [{
  id: 'f25f83df-29c5-4d07-97b8-e7f6d2a902b8',
  childRoute: '/school-desk-hp-calculator-fork-demo',
}]
const releaseGatedPreparedProjectIds = new Set([
  gateBlockedPreparedFork[0].id,
])
const genericFallbackFork = {
  id: 'generic-approved-fallback',
  childRoute: '/prompt/generic-approved-fallback',
}
assert(
  preparedReleaseGateIsEnforced('production'),
  'prepared release gates must always be enforced in Vercel production',
)
assert(
  !preparedReleaseGateIsEnforced('preview') &&
  !preparedReleaseGateIsEnforced('development') &&
  !preparedReleaseGateIsEnforced(undefined),
  'preview and local prepared fixtures must remain inspectable',
)
assert(
  inspectablePreparedForkFallbacks(
    gateBlockedPreparedFork,
    releaseGatedPreparedProjectIds,
    'production',
  ).length === 0,
  'a production parent must not expose a fallback fork link to a release-gated child',
)
assert(
  inspectablePreparedForkFallbacks(
    gateBlockedPreparedFork,
    releaseGatedPreparedProjectIds,
    'preview',
  ).length === 1,
  'preview must retain prepared fallback forks for review',
)
assert(
  inspectablePreparedForkFallbacks(
    [genericFallbackFork],
    releaseGatedPreparedProjectIds,
    'production',
  ).length === 1,
  'production must retain non-prepared fallback forks whose generic child routes remain available',
)

function read(path) {
  if (!existsSync(path)) {
    fail(`${path}: required file is missing`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

function parse(path) {
  const source = read(path)
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  return ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind)
}

function visit(node, predicate, matches = []) {
  if (predicate(node)) matches.push(node)
  ts.forEachChild(node, (child) => {
    visit(child, predicate, matches)
  })
  return matches
}

function declarationName(node) {
  return node.name && ts.isIdentifier(node.name) ? node.name.text : null
}

function namedDeclarations(sourceFile, name) {
  return visit(sourceFile, (node) => (
    (
      ts.isFunctionDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isVariableDeclaration(node)
    ) && declarationName(node) === name
  ))
}

function isExported(node) {
  let declaration = node
  if (ts.isVariableDeclaration(node)) declaration = node.parent?.parent
  return Boolean(declaration?.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
}

function assertExport(sourceFile, path, name) {
  const declarations = namedDeclarations(sourceFile, name)
  assert(declarations.length > 0, `${path}: must declare ${name}`)
  assert(declarations.some(isExported), `${path}: ${name} must be exported for shared use and behavior checks`)
}

function typeProperties(sourceFile, name) {
  const declaration = namedDeclarations(sourceFile, name).find((node) => (
    ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)
  ))
  if (!declaration) return new Set()

  function membersFromType(node) {
    if (ts.isTypeLiteralNode(node)) return [...node.members]
    if (ts.isIntersectionTypeNode(node)) return node.types.flatMap(membersFromType)
    return []
  }

  const members = ts.isInterfaceDeclaration(declaration)
    ? declaration.members
    : membersFromType(declaration.type)

  return new Set(members.flatMap((member) => {
    if (!member.name) return []
    if (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) return [member.name.text]
    return []
  }))
}

function assertTypeProperties(sourceFile, path, name, expected) {
  const properties = typeProperties(sourceFile, name)
  assert(properties.size > 0, `${path}: ${name} must be an inspectable object contract`)
  for (const property of expected) {
    assert(properties.has(property), `${path}: ${name} must include ${property}`)
  }
}

function typeStringLiterals(sourceFile, name) {
  const declaration = namedDeclarations(sourceFile, name).find(ts.isTypeAliasDeclaration)
  if (!declaration) return []
  const members = ts.isUnionTypeNode(declaration.type) ? declaration.type.types : [declaration.type]
  return members.flatMap((member) => (
    ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal) ? [member.literal.text] : []
  ))
}

function numericExport(sourceFile, name) {
  const declaration = namedDeclarations(sourceFile, name).find(ts.isVariableDeclaration)
  if (!declaration?.initializer || !ts.isNumericLiteral(declaration.initializer)) return null
  return Number(declaration.initializer.text)
}

function importHas(sourceFile, moduleName, importedName) {
  return sourceFile.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) return false
    if (statement.moduleSpecifier.text !== moduleName) return false
    const clause = statement.importClause
    if (!clause) return false
    if (clause.name?.text === importedName) return true
    const bindings = clause.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) return false
    return bindings.elements.some((element) => element.name.text === importedName)
  })
}

function jsxTagName(node) {
  return node.tagName.getText()
}

function jsxOpenings(sourceFile, tagName) {
  return visit(sourceFile, (node) => (
    (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
    jsxTagName(node) === tagName
  ))
}

function jsxAttributeNames(node) {
  return new Set(node.attributes.properties.flatMap((property) => (
    ts.isJsxAttribute(property) && ts.isIdentifier(property.name) ? [property.name.text] : []
  )))
}

function hasJsxAttribute(sourceFile, attributeName) {
  return visit(sourceFile, (node) => (
    (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
    node.attributes.properties.some((property) => (
      ts.isJsxAttribute(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === attributeName
    ))
  )).length > 0
}

function callsNamed(sourceFile, name) {
  return visit(sourceFile, (node) => {
    if (!ts.isCallExpression(node)) return false
    if (ts.isIdentifier(node.expression)) return node.expression.text === name
    return ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === name
  })
}

function objectPropertiesNamed(sourceFile, name) {
  return visit(sourceFile, (node) => {
    if (!ts.isPropertyAssignment(node) && !ts.isShorthandPropertyAssignment(node)) return false
    return (
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      node.name.text === name
    )
  })
}

function functionDeclaration(sourceFile, name) {
  return namedDeclarations(sourceFile, name).find(ts.isFunctionDeclaration)
}

function sharedSourceRunRoutes() {
  return readdirSync('src/app', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `src/app/${entry.name}/page.tsx`)
    .filter((path) => existsSync(path))
    .filter((path) => importHas(parse(path), '@/components/SourceRunShowcase', 'SourceRunShowcase'))
}

function assertSqlColumns(path, columnNames) {
  const sql = read(path)
  for (const columnName of columnNames) {
    const definition = new RegExp(`\\b${columnName}\\s+(?:TEXT|UUID|INT|INTEGER)\\b`, 'i')
    assert(definition.test(sql), `${path}: must define durable ${columnName}`)
  }
}

function assertSqlForkConstraints(path) {
  const sql = read(path).replace(/\s+/g, ' ')
  assert(/fork_depth\s*>=\s*0\s+AND\s+fork_depth\s*<\s*10/i.test(sql), `${path}: must enforce the 10-level fork depth boundary`)
  assert(/fork_branch_index\s*>=\s*0\s+AND\s+fork_branch_index\s*<\s*10/i.test(sql), `${path}: must enforce the 10-branch width boundary`)
  assert(/fork_source_artifact_path[\s\S]*public\/artifacts\/%/i.test(sql), `${path}: fork artifacts must remain production-servable public artifact paths`)
  assert(/fork_source_artifact_sha256[\s\S]*(?:64|\{64\})/i.test(sql), `${path}: fork artifact identity must enforce a 64-character SHA-256 digest`)
}

const forkPath = 'src/lib/project-forks.ts'
const forkSource = parse(forkPath)

assert(numericExport(forkSource, 'PROJECT_FORK_MAX_DEPTH') === 10, `${forkPath}: fork depth capacity must remain 10`)
assert(numericExport(forkSource, 'PROJECT_FORK_MAX_WIDTH') === 10, `${forkPath}: fork width capacity must remain 10`)

for (const name of [
  'normalizeProjectForkSource',
  'parseProjectForkSearchParams',
  'buildProjectForkHref',
  'buildCommunityProjectForkHref',
  'buildProjectResponseForkHref',
  'projectForkSourceToSubmissionFields',
  'projectForkSourceFromSubmissionFields',
  'resolveProjectForkPoint',
  'createProjectForkDraftContract',
  'groupProjectForkNetworkBySourceStep',
  'filterProjectForkNetworkBySourceRun',
  'resolveProjectForkTrail',
  'serializeProjectForkSourceForNotes',
]) {
  assertExport(forkSource, forkPath, name)
}

const variantIdentity = [
  'sourceModelVariantId',
  'sourceRunId',
  'sourceStepId',
  'sourceStepNumber',
  'sourceArtifactPath',
  'sourceArtifactSha256',
]
assertTypeProperties(forkSource, forkPath, 'ProjectForkSource', [
  'sourceProjectId',
  ...variantIdentity,
  'parentForkId',
  'depth',
  'branchIndex',
  'promptFamilyId',
])
assertTypeProperties(forkSource, forkPath, 'ProjectForkSourceSubmissionFields', [
  'fork_source_project_id',
  'fork_source_model_variant_id',
  'fork_source_run_id',
  'fork_source_step_id',
  'fork_source_step_number',
  'fork_source_artifact_path',
  'fork_source_artifact_sha256',
  'fork_parent_submission_id',
  'prompt_family_id',
])
assertTypeProperties(forkSource, forkPath, 'ProjectForkNetworkItem', [
  'childSourceRunId',
  'childSourceUrl',
  'childArtifactQualityStatus',
  'childArtifactKnownIssueExplanation',
])
assertTypeProperties(forkSource, forkPath, 'ProjectForkNetworkItem', [
  'id',
  'forkSource',
  'continuationSteps',
  'childRoute',
])
assertTypeProperties(forkSource, forkPath, 'ProjectForkContinuationStep', ['artifactVersions'])

const sourcePackagePath = 'src/lib/source-run-package.ts'
const sourcePackage = parse(sourcePackagePath)
assert(importHas(sourcePackage, './project-forks', 'ProjectForkSource'), `${sourcePackagePath}: source packages must use the shared fork source contract`)
assert(typeProperties(sourcePackage, 'SourceRunPackage').has('fork_source'), `${sourcePackagePath}: source packages must preserve structured fork_source`)
assert(functionDeclaration(sourcePackage, 'parseForkSource'), `${sourcePackagePath}: source packages must validate fork_source instead of treating it as opaque notes`)

const importerPath = 'scripts/import-pathforge-source-run.mjs'
const importer = parse(importerPath)
assert(functionDeclaration(importer, 'forkSubmissionFields'), `${importerPath}: importer must map structured fork fields`)
assert(callsNamed(importer, 'forkSubmissionFields').length >= 1, `${importerPath}: importer must apply structured fork fields to an intake`)

const buildPagePath = 'src/app/build/ProjectSubmissionClient.tsx'
const buildPage = parse(buildPagePath)
assert(importHas(buildPage, '@/lib/project-forks', 'parseProjectForkSearchParams'), `${buildPagePath}: build intake must parse fork identity from its URL`)
assert(callsNamed(buildPage, 'parseProjectForkSearchParams').length >= 1, `${buildPagePath}: build intake must resolve structured fork identity`)
assert(read(buildPagePath).includes("formData.set('fork_json'"), `${buildPagePath}: build intake must submit structured fork identity`)

const communityActionPath = 'src/lib/community-project-actions.ts'
const communityActions = parse(communityActionPath)
assert(functionDeclaration(communityActions, 'parseFork'), `${communityActionPath}: server action must parse and validate structured fork identity`)
assert(objectPropertiesNamed(communityActions, 'source_project_id').length >= 1, `${communityActionPath}: community intake must preserve the canonical source project field`)

const dataPath = 'src/lib/data.ts'
const dataSource = parse(dataPath)
assert(importHas(dataSource, './project-forks', 'filterProjectForkNetworkBySourceRun'), `${dataPath}: approved fork reads must use the shared exact-run filter`)
assert(importHas(dataSource, './prepared-release-gates-core.mjs', 'inspectablePreparedForkFallbacks'), `${dataPath}: prepared fallback fork visibility must share the production release boundary`)
assert(functionDeclaration(dataSource, 'limitProjectForksPerResponseSocket'), `${dataPath}: public fork reads must enforce width per exact response socket`)
const mockForkReader = functionDeclaration(dataSource, 'getPublicMockProjectForks')
assert(mockForkReader?.parameters.some((parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === 'sourceRunId'), `${dataPath}: prepared fallback forks must be filtered by source run before width limiting`)
if (mockForkReader) {
  const mockFilterCalls = visit(mockForkReader, (node) => (
    ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'filterProjectForkNetworkBySourceRun'
  ))
  assert(mockFilterCalls.length >= 1, `${dataPath}: prepared fallback fork reader must apply exact source-run isolation`)
}
const approvedForkReader = functionDeclaration(dataSource, 'getApprovedProjectForks')
assert(approvedForkReader, `${dataPath}: must expose getApprovedProjectForks`)
if (approvedForkReader) {
  const parameterNames = approvedForkReader.parameters.flatMap((parameter) => (
    ts.isIdentifier(parameter.name) ? [parameter.name.text] : []
  ))
  assert(parameterNames[0] === 'projectId', `${dataPath}: approved fork reader must key from canonical project id`)
  assert(parameterNames.includes('sourceRunId'), `${dataPath}: approved fork reader must accept an optional exact source run id`)
  const filterCalls = visit(approvedForkReader, (node) => (
    ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'filterProjectForkNetworkBySourceRun'
  ))
  assert(filterCalls.length >= 2, `${dataPath}: exact source-run filtering must cover both fallback and database fork results`)
  const socketLimitCalls = visit(approvedForkReader, (node) => (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'limitProjectForksPerResponseSocket'
  ))
  assert(socketLimitCalls.length >= 1, `${dataPath}: approved fork width must be capped independently for every response socket`)
  const globalWidthLimits = visit(approvedForkReader, (node) => (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'limit' &&
    node.arguments.some((argument) => argument.getText().includes('PROJECT_FORK_MAX_WIDTH'))
  ))
  assert(globalWidthLimits.length === 0, `${dataPath}: approved fork reads must not apply one global ten-branch cap to the whole run`)
  const exactRunQuery = visit(approvedForkReader, (node) => (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'eq' &&
    node.arguments.length >= 2 &&
    ts.isStringLiteral(node.arguments[0]) &&
    node.arguments[0].text === 'fork_source_run_id' &&
    node.arguments[1].getText().includes('sourceRunId')
  ))
  assert(exactRunQuery.length >= 1, `${dataPath}: database fork query must constrain fork_source_run_id before width limiting`)
  const queryLiterals = visit(approvedForkReader, ts.isStringLiteral).map((literal) => literal.text).join(',')
  for (const field of [
    'fork_source_model_variant_id',
    'fork_source_run_id',
    'fork_source_artifact_path',
    'fork_source_artifact_sha256',
    'prompt_steps',
  ]) {
    assert(queryLiterals.includes(field), `${dataPath}: approved branch hydration must select ${field}`)
  }
  assert(objectPropertiesNamed(approvedForkReader, 'continuationSteps').length >= 1, `${dataPath}: approved branches must expose exact child continuation transcript/artifacts`)
  assert(objectPropertiesNamed(approvedForkReader, 'childRoute').length >= 1, `${dataPath}: approved branches must expose a stable child route`)
  const fallbackVisibilityCalls = callsNamed(approvedForkReader, 'inspectablePreparedForkFallbacks')
  assert(fallbackVisibilityCalls.length === 1, `${dataPath}: approved fork reads must apply the prepared fallback visibility guard exactly once`)
  if (fallbackVisibilityCalls.length === 1) {
    const callText = fallbackVisibilityCalls[0].getText()
    assert(callText.includes('getPublicMockProjectForks'), `${dataPath}: the release guard must wrap prepared registry fallback forks`)
    assert(callText.includes('PREPARED_SHOWCASE_PROJECT_IDS'), `${dataPath}: production must suppress only release-gated prepared fallback children`)
    assert(callText.includes('process.env.VERCEL_ENV'), `${dataPath}: fallback visibility must use the actual Vercel release environment`)
  }
}

const rendererPath = 'src/components/ProjectForkBuildPath.tsx'
const renderer = parse(rendererPath)
const rendererSource = read(rendererPath)
assertExport(renderer, rendererPath, 'ProjectForkBuildPath')
assertExport(renderer, rendererPath, 'ProjectForkBuildPathProps')
assertExport(renderer, rendererPath, 'ProjectForkBuildPathMode')
assert(importHas(renderer, '@/lib/project-forks', 'resolveProjectForkPoint'), `${rendererPath}: source-response anchoring must use the shared strict resolver`)
assert(callsNamed(renderer, 'resolveProjectForkPoint').length >= 1, `${rendererPath}: source-response anchoring must reject stale exact ids without numeric fallback`)
const rendererModes = new Set(typeStringLiterals(renderer, 'ProjectForkBuildPathMode'))
assert(rendererModes.has('parent'), `${rendererPath}: shared renderer must represent a parent branch focus state`)
assert(rendererModes.has('child'), `${rendererPath}: shared renderer must represent a child lineage page state`)
assertTypeProperties(renderer, rendererPath, 'ProjectForkBuildPathProps', [
  'mode',
  'sourceSteps',
  'forkSource',
  'branch',
  'trail',
  'sourceProjectHref',
  'branchHref',
  'newForkHref',
  'sourceRunHref',
  'sourceEvidence',
  'onClose',
  'onDisplayArtifact',
  'selectedArtifactPath',
  'artifactOpenHrefs',
])
assert(importHas(renderer, '@/components/ForkTruthDisclosure', 'ForkTruthDisclosure'), `${rendererPath}: branch truth must use the shared disclosure presenter`)
assert(importHas(renderer, '@/lib/public-source-evidence', 'resolvePublicSourceEvidence'), `${rendererPath}: missing child evidence must fail closed through the shared resolver`)
assert(importHas(renderer, '@/lib/public-project-truth', 'publicArtifactStatusPresentation'), `${rendererPath}: branch artifact state must remain orthogonal to provider evidence`)
assert(rendererSource.includes("qualityStatus: fork.childArtifactQualityStatus ?? 'recorded'"), `${rendererPath}: absent checked child quality must fail closed to Run recorded`)
const forkTruthDisclosures = jsxOpenings(renderer, 'ForkTruthDisclosure')
assert(forkTruthDisclosures.length === 1, `${rendererPath}: every selected branch must render exactly one combined truth disclosure`)
if (forkTruthDisclosures.length === 1) {
  const attributes = jsxAttributeNames(forkTruthDisclosures[0])
  assert(attributes.has('artifact'), `${rendererPath}: branch truth disclosure must receive artifact state independently`)
  assert(attributes.has('sourceEvidence'), `${rendererPath}: branch truth disclosure must receive full source evidence`)
  const conditionalOnProviderHref = (() => {
    let current = forkTruthDisclosures[0].parent
    while (current) {
      if (
        ts.isBinaryExpression(current) &&
        current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
        current.left.getText() === 'sourceRunHref'
      ) return true
      current = current.parent
    }
    return false
  })()
  assert(!conditionalOnProviderHref, `${rendererPath}: fail-closed truth must render even when no provider URL exists`)
}
for (const hook of [
  'data-project-fork-build-path',
  'data-fork-inherited-path',
  'data-fork-source-response',
  'data-fork-source-response-id',
  'data-fork-source-response-node',
  'data-fork-source-prompt',
  'data-fork-source-pipeline',
  'data-fork-source-prompt-node',
  'data-fork-desktop-layout',
  'data-fork-source-lane',
  'data-fork-connector-lane',
  'data-fork-response-connector',
  'data-fork-response-socket',
  'data-fork-response-elbow',
  'data-fork-continuation-elbow',
  'data-fork-response-connector-vertical',
  'data-fork-source-connector-endpoint',
  'data-fork-continuation-connector-endpoint',
  'data-fork-continuation-lane',
  'data-fork-continuation-workspace',
  'data-fork-continuation',
  'data-fork-continuation-prompt',
  'data-fork-continuation-response',
  'data-fork-continuation-pipeline',
  'data-fork-continuation-prompt-node',
  'data-fork-continuation-response-node',
  'data-fork-continuation-incoming-arm',
  'data-fork-continuation-prompt-card-arm',
  'data-fork-continuation-response-card-arm',
  'data-fork-continuation-fork',
  'data-fork-display-artifact',
]) {
  assert(hasJsxAttribute(renderer, hook), `${rendererPath}: shared renderer must expose ${hook} for mounted lineage verification`)
}
const rendererHasMobileDisclosure = jsxOpenings(renderer, 'details').length > 0 || hasJsxAttribute(renderer, 'aria-expanded')
assert(rendererHasMobileDisclosure, `${rendererPath}: inherited history needs an accessible compact/mobile disclosure`)
assert(
  rendererSource.includes('lg:grid-cols-[minmax(250px,320px)_72px_minmax(0,1fr)]'),
  `${rendererPath}: desktop lineage must retain explicit source, connector, and primary continuation columns`,
)
assert(
  rendererSource.includes('data-fork-desktop-layout="branch"'),
  `${rendererPath}: desktop lineage must identify the spatial branch layout for browser regression checks`,
)
assert(
  rendererSource.includes('className="relative hidden min-h-[220px] lg:block"'),
  `${rendererPath}: connector lane must remain desktop-only so mobile can stack without an empty branch column`,
)
assert(
  rendererSource.includes('group/inherited mb-4') && rendererSource.includes('lg:hidden'),
  `${rendererPath}: inherited history must retain its compact mobile disclosure`,
)
assert(!hasJsxAttribute(renderer, 'data-fork-prompt-connector'), `${rendererPath}: visual branch geometry must not regress to prompt-centered connector identity`)
assert(rendererSource.includes("bg-[#2bd15f]") && rendererSource.includes('bg-brand-orange'), `${rendererPath}: selected fork paths must visibly transition from green source piping to orange continuation piping`)

const showcasePath = 'src/components/SourceRunShowcase.tsx'
const showcase = parse(showcasePath)
assert(importHas(showcase, '@/components/ProjectForkBuildPath', 'ProjectForkBuildPath'), `${showcasePath}: parent and prepared child paths must use the shared fork renderer`)
assert(importHas(showcase, '@/lib/project-forks', 'groupProjectForkNetworkBySourceStep'), `${showcasePath}: branch attachment must use the strict shared response matcher`)
assert(callsNamed(showcase, 'groupProjectForkNetworkBySourceStep').length >= 1, `${showcasePath}: branch attachment must reject stale exact step ids at render time`)
const showcaseForkHandoffs = callsNamed(showcase, 'buildProjectResponseForkHref')
const exactVariantHandoff = showcaseForkHandoffs.some((call) => {
  const input = call.arguments[0]
  if (!input || !ts.isObjectLiteralExpression(input)) return false
  const properties = new Set(input.properties.flatMap((property) => (
    property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
      ? [property.name.text]
      : []
  )))
  return ['sourceModelVariantId', 'sourceRunId', 'sourceArtifactPath', 'sourceArtifactSha256']
    .every((property) => properties.has(property))
})
assert(exactVariantHandoff, `${showcasePath}: new-fork URLs must carry exact model, run, artifact path, and artifact digest identity`)
const showcaseRenderers = jsxOpenings(showcase, 'ProjectForkBuildPath')
assert(showcaseRenderers.length >= 1, `${showcasePath}: must render ProjectForkBuildPath for active branch/lineage state`)
if (showcaseRenderers.length > 0) {
  const attributes = jsxAttributeNames(showcaseRenderers[0])
  for (const property of ['mode', 'sourceSteps', 'branch', 'onDisplayArtifact', 'selectedArtifactPath']) {
    assert(attributes.has(property), `${showcasePath}: shared renderer integration must pass ${property}`)
  }
  for (const rendererNode of showcaseRenderers) {
    assert(jsxAttributeNames(rendererNode).has('sourceEvidence'), `${showcasePath}: every child/parent branch preview must pass complete per-run source evidence`)
  }
}
assert(namedDeclarations(showcase, 'ResponseForkFocusStage').length === 0, `${showcasePath}: remove the divergent legacy fork focus renderer`)
for (const hook of [
  'data-fork-existing-branch-origin',
  'data-fork-existing-branch-step',
  'data-fork-existing-branch-pipe',
  'data-fork-existing-branch-node',
  'data-source-run-pipeline',
  'data-source-run-pipe-node',
  'data-source-run-card',
  'data-source-run-prompt-row',
  'data-source-run-response-row',
]) {
  assert(hasJsxAttribute(showcase, hook), `${showcasePath}: source-run fork geometry must expose ${hook}`)
}

const preparedPath = 'src/components/PreparedSourceRunPage.tsx'
const prepared = parse(preparedPath)
const preparedSource = read(preparedPath)
const preparedShowcases = jsxOpenings(prepared, 'SourceRunShowcase')
assert(preparedShowcases.length === 1, `${preparedPath}: prepared page must have one source-run renderer`)
if (preparedShowcases.length === 1) {
  const attributes = jsxAttributeNames(preparedShowcases[0])
  for (const property of [
    'forkNetwork',
    'forkContext',
    'sourceRunId',
    'sourceModelVariantId',
    'sourceArtifactPath',
    'sourceArtifactSha256',
  ]) {
    assert(attributes.has(property), `${preparedPath}: exact parent/child lineage integration must pass ${property}`)
  }
}
const preparedForkReads = callsNamed(prepared, 'getApprovedProjectForks')
assert(preparedForkReads.some((call) => call.arguments.length >= 2), `${preparedPath}: model pages must read forks using canonical project plus exact source run`)
assert(
  preparedSource.indexOf('preparedProjectIsPublic(project.id)') <
  preparedSource.indexOf('getApprovedProjectForks('),
  `${preparedPath}: a prepared child must fail closed before its fork network can render`,
)
assert(callsNamed(prepared, 'resolvePreparedShowcaseLineage').length >= 1, `${preparedPath}: prepared child pages must reconstruct complete nested ancestry through the shared registry resolver`)
assert(callsNamed(prepared, 'buildProjectResponseForkHref').length >= 1, `${preparedPath}: prepared child continuations must create exact nested-fork handoffs`)
for (const nestedEvidence of [
  'defaultStepNumber(sourceRun) === continuation.stepNumber',
  'nestedArtifactPath === sourceRun.final_artifact_path',
  'forkArtifact.artifactSha256 === sourceRun.artifact_sha256',
  'currentForkSource: forkSource',
]) {
  assert(prepared.getFullText().includes(nestedEvidence), `${preparedPath}: nested fork handoff must require ${nestedEvidence}`)
}

const preparedRegistryPath = 'src/lib/prepared-showcase-projects.ts'
const preparedRegistry = read(preparedRegistryPath)
assert(preparedRegistry.includes('MAX_PREPARED_FORK_DEPTH = 10'), `${preparedRegistryPath}: prepared lineage must share the ten-generation ceiling`)
assert(preparedRegistry.includes('Prepared fork lineage cycle detected'), `${preparedRegistryPath}: prepared lineage must fail closed on cycles`)
assert(preparedRegistry.includes('references missing source project'), `${preparedRegistryPath}: prepared lineage must fail closed on missing parents`)

const preparedReleaseGatesPath = 'src/lib/prepared-release-gates.ts'
const preparedReleaseGates = read(preparedReleaseGatesPath)
assert(preparedReleaseGates.includes('preparedReleaseGateIsEnforced(process.env.VERCEL_ENV)'), `${preparedReleaseGatesPath}: page and artifact gates must share the production release boundary`)
assert(!preparedReleaseGates.includes('PATHFORGE_ALLOW_UNPUBLISHED_PREPARED_ROUTES'), `${preparedReleaseGatesPath}: no environment variable may reopen unpublished production routes`)

const nestedFixturePath = 'src/app/qa/fork-lineage-grandchild-fixture/page.tsx'
const nestedFixture = read(nestedFixturePath)
assert(nestedFixture.includes("process.env.VERCEL_ENV === 'production'"), `${nestedFixturePath}: nested QA fixture must be unavailable in production`)
const forkBrowserGuard = read('scripts/check-project-fork-page-browser.mjs')
assert(forkBrowserGuard.includes('/qa/fork-lineage-grandchild-fixture'), 'fork browser guard must exercise a real prepared grandchild route')
assert(forkBrowserGuard.includes('grandchildSnapshot.trail.length !== 3'), 'fork browser guard must require complete three-generation breadcrumbs')
assert(forkBrowserGuard.includes('/airlock-zero-swarm-shift-fork-demo'), 'fork browser guard must exercise nested-fork creation from a verified prepared child')
assert(forkBrowserGuard.includes('data-fork-continuation-fork'), 'fork browser guard must inspect the continuation-level nested-fork action')
assert(forkBrowserGuard.includes("nested.depth !== '1'"), 'fork browser guard must verify nested depth increments from the immediate parent')
assert(forkBrowserGuard.includes('geometry.gridColumns?.length !== 3'), 'fork browser guard must fail when desktop branch geometry collapses below three columns')
assert(forkBrowserGuard.includes('connector.width < 64'), 'fork browser guard must reject a decorative connector sliver')
assert(forkBrowserGuard.includes('Math.abs(socket.width - 48) > 1'), 'fork browser guard must require an exact 48px response-edge socket')
assert(forkBrowserGuard.includes('connectorHidden'), 'fork browser guard must verify the desktop connector collapses at 390px')
assert(forkBrowserGuard.includes('/airlock-zero-blackout-shift-fork-demo'), 'fork browser guard must exercise the four-prompt Blackout continuation')
assert(forkBrowserGuard.includes('/airlock-zero-hull-breach-fork-demo'), 'fork browser guard must exercise the seven-prompt Hull Breach continuation')
assert(forkBrowserGuard.includes('/airlock-zero-reactor-run-demo'), 'fork browser guard must exercise the parent source-page existing-fork rail')
assert(forkBrowserGuard.includes('2e526efa-191c-48ea-9ba0-5ff073403770') && forkBrowserGuard.includes('248f4672-d557-4b01-8756-c1cec7290925'), 'fork browser guard must exercise exact GPT and Gemini Reactor parent source runs')
assert(forkBrowserGuard.includes('Reactor GPT selected Swarm Shift') && forkBrowserGuard.includes('Reactor Gemini selected Hull Breach'), 'fork browser guard must inspect hosted parent-selected Swarm and Hull states')
assert(forkBrowserGuard.includes("assertResponseToPromptPipeline(blackoutSnapshot, 'Blackout child page', 10, [11, 12, 13, 14])"), 'fork browser guard must require response 10 to feed the complete 11-14 continuation')
assert(forkBrowserGuard.includes("assertResponseToPromptPipeline(swarmSnapshot, 'Swarm Shift child page', 2, [3])"), 'fork browser guard must sample another exact one-prompt response-to-prompt child')
assert(forkBrowserGuard.includes("assertResponseToPromptPipeline(hullSnapshot, 'Hull Breach child page', 2, [3, 4, 5, 6, 7, 8, 9])"), 'fork browser guard must sample another exact multi-prompt response-to-prompt child')
assert(forkBrowserGuard.includes('sourceResponseDelta > 2'), 'fork browser guard must reject a connector that misses the exact inherited response center')
assert(forkBrowserGuard.includes('continuationPromptDelta > 2'), 'fork browser guard must reject a connector that misses the first continuation prompt center')
assert(forkBrowserGuard.includes('sourcePromptDelta < 24'), 'fork browser guard must fail if the connector remains prompt-centered')
assert(forkBrowserGuard.includes('one continuous orange spine exactly from the first prompt center to the last response center'), 'fork browser guard must require prompt-response continuation-spine consistency')
assert(forkBrowserGuard.includes('exactly one orange incoming arm at the first continuation prompt'), 'fork browser guard must reject orphan left-facing continuation stubs')
assert(forkBrowserGuard.includes('full response-card center'), 'fork browser guard must center parent fork rails on the complete response card')
assert(forkBrowserGuard.includes('promptOriginCount !== 0'), 'fork browser guard must reject a parent existing-fork rail mounted in any prompt row')
assert(forkBrowserGuard.includes("segment?.color !== 'rgb(232, 122, 44)'"), 'fork browser guard must require a full orange continuation spine')
assert(forkBrowserGuard.includes('sourceArmRect?.width < 40'), 'fork browser guard must reject an invisible or collapsed response-to-elbow arm')
assert(forkBrowserGuard.includes("segment.color !== 'rgb(43, 209, 95)'"), 'fork browser guard must preserve both inherited green source-spine segments')
assert(forkBrowserGuard.includes('green source spine continuity/termination deltas'), 'fork browser guard must prove green terminates at the exact response node')
assert(forkBrowserGuard.includes('pipelineHidden') && forkBrowserGuard.includes('promptNodeHidden'), 'fork browser guard must ensure desktop pipe geometry stays hidden at 390px')
assert(forkBrowserGuard.includes('rootScrollWidth > mobile.rootClientWidth + 1') && forkBrowserGuard.includes('continuation article escapes its grid track'), 'fork browser guard must reject masked internal overflow and oversized continuation articles at 390px')
assert(forkBrowserGuard.includes('visualOffsetLeft') && forkBrowserGuard.includes('viewport screenshot clip'), 'fork browser guard must reject horizontally panned 390px capture surfaces')
assert(forkBrowserGuard.includes('verifyMobileParentRail') && forkBrowserGuard.includes("'HP selected School Desk'"), 'fork browser guard must inspect response-row and selected-parent mobile states')

const communityPath = 'src/components/ProjectCommunityPanel.tsx'
const community = parse(communityPath)
assert(importHas(community, '@/components/ProjectForkBuildPath', 'ProjectForkBuildPath'), `${communityPath}: generic project fork lineage must use the shared renderer`)
assert(jsxOpenings(community, 'ProjectForkBuildPath').length >= 1, `${communityPath}: generic fork pages must render the shared lineage workspace`)
assert(jsxOpenings(community, 'ProjectForkInheritedPathBand').length === 0, `${communityPath}: remove the divergent legacy inherited-path renderer`)
const communityForkRenderers = jsxOpenings(community, 'ProjectForkBuildPath')
assert(
  communityForkRenderers.every((node) => !jsxAttributeNames(node).has('sourceRunHref')),
  `${communityPath}: URL-less community child pages must exercise the renderer's unconditional fail-closed evidence path`,
)

const networkExplorerPath = 'src/components/ProjectForkNetworkExplorer.tsx'
const networkExplorer = parse(networkExplorerPath)
const networkForkRenderers = jsxOpenings(networkExplorer, 'ProjectForkBuildPath')
assert(networkForkRenderers.length === 1, `${networkExplorerPath}: selected network branch must use the shared renderer`)
if (networkForkRenderers.length === 1) {
  assert(
    jsxAttributeNames(networkForkRenderers[0]).has('sourceEvidence'),
    `${networkExplorerPath}: selected branch must pass its complete curated/fail-closed source evidence`,
  )
}

for (const routePath of sharedSourceRunRoutes()) {
  const route = parse(routePath)
  const showcases = jsxOpenings(route, 'SourceRunShowcase')
  assert(showcases.length >= 1, `${routePath}: direct showcase route must render SourceRunShowcase`)
  for (const showcaseNode of showcases) {
    const attributes = jsxAttributeNames(showcaseNode)
    assert(attributes.has('projectId'), `${routePath}: direct showcase must pass canonical project identity`)
    assert(attributes.has('projectTitle'), `${routePath}: direct showcase must pass project title`)
    assert(attributes.has('sourceRunId'), `${routePath}: direct showcase must pass exact source-run identity`)
    assert(attributes.has('forkNetwork'), `${routePath}: direct showcase must pass approved branch destinations`)
  }
  const directForkReads = callsNamed(route, 'getApprovedProjectForks')
  assert(directForkReads.length >= 1, `${routePath}: direct showcase must load approved branches`)
  assert(directForkReads.some((call) => call.arguments.length >= 2), `${routePath}: direct showcase must isolate approved branches to the exact source run`)
}

const promptDetailPath = 'src/app/prompt/[id]/page.tsx'
const promptDetail = parse(promptDetailPath)
assert(callsNamed(promptDetail, 'buildProjectResponseForkHref').length >= 1, `${promptDetailPath}: generic response cards must create exact-response fork handoffs`)
assert(jsxOpenings(promptDetail, 'ProjectCommunityPanel').length >= 1, `${promptDetailPath}: generic project pages must mount the shared community/lineage surface`)

const adminDetailPath = 'src/app/admin/source-runs/[id]/page.tsx'
const adminDetail = parse(adminDetailPath)
assert(callsNamed(adminDetail, 'projectForkSourceFromSubmissionFields').length >= 1, `${adminDetailPath}: review detail must reconstruct structured fork identity`)

const adminDashboardPath = 'src/app/admin/page.tsx'
const adminDashboard = parse(adminDashboardPath)
assert(callsNamed(adminDashboard, 'projectForkSourceFromSubmissionFields').length >= 1, `${adminDashboardPath}: pending rows must identify structured fork intakes`)

const forkColumns = [
  'fork_source_project_id',
  'fork_source_model_variant_id',
  'fork_source_run_id',
  'fork_source_step_id',
  'fork_source_step_number',
  'fork_source_artifact_path',
  'fork_source_artifact_sha256',
  'fork_parent_submission_id',
  'prompt_family_id',
  'fork_depth',
  'fork_branch_index',
]
assertSqlColumns('supabase/source-run-submissions.sql', forkColumns)
assertSqlColumns('supabase/schema.sql', forkColumns)
assertSqlColumns('supabase/project-forks.sql', forkColumns)
assertSqlForkConstraints('supabase/source-run-submissions.sql')
assertSqlForkConstraints('supabase/schema.sql')
assertSqlForkConstraints('supabase/project-forks.sql')

const variantAwareMigrations = readdirSync('supabase/migrations')
  .filter((fileName) => fileName.endsWith('.sql'))
  .map((fileName) => `supabase/migrations/${fileName}`)
  .filter((path) => {
    const sql = read(path)
    return (
      /ALTER\s+TABLE\s+public\.source_run_submissions/i.test(sql) &&
      /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+fork_source_model_variant_id/i.test(sql) &&
      /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+fork_source_run_id/i.test(sql) &&
      /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+fork_source_artifact_sha256/i.test(sql)
    )
  })
assert(variantAwareMigrations.length >= 1, 'supabase/migrations: variant-aware fork schema must have an additive deployable migration')
for (const migrationPath of variantAwareMigrations) {
  assertSqlColumns(migrationPath, forkColumns)
  assertSqlForkConstraints(migrationPath)
  const migrationSql = read(migrationPath)
  assert(/CREATE\s+(?:CONSTRAINT\s+)?TRIGGER/i.test(migrationSql), `${migrationPath}: migration must install fail-closed lineage validation triggers`)
  assert(/REVOKE\s+(?:ALL|EXECUTE)[\s\S]+FROM\s+PUBLIC/i.test(migrationSql), `${migrationPath}: lineage validation helpers must not be publicly executable`)
  assert(migrationSql.includes('project_model_variant_artifacts'), `${migrationPath}: exact response artifact evidence must be persisted in SQL`)
  assert(migrationSql.includes('Prepared fork response/artifact evidence does not match the approved source-run project final.'), `${migrationPath}: nested prepared forks must validate exact immutable final-response evidence`)
  assert(migrationSql.includes('publish_prepared_showcase_source_run'), `${migrationPath}: prepared publication must use one atomic database transaction`)
}

const sourceRunsDataPath = 'src/lib/data/source-runs.ts'
const sourceRunsData = read(sourceRunsDataPath)
assert(sourceRunsData.includes("'publish_prepared_showcase_source_run'"), `${sourceRunsDataPath}: prepared publication must call the atomic RPC`)
assert(!sourceRunsData.includes('const insertPayload = {'), `${sourceRunsDataPath}: prepared publication must not fall back to a non-atomic prompt insert`)
for (const rpcArgument of [
  'target_source_run_id: sourceRunId',
  'expected_intake: expectedIntake',
  'expected_fork: expectedFork',
  'project_payload: projectPayload',
]) {
  assert(sourceRunsData.includes(rpcArgument), `${sourceRunsDataPath}: atomic RPC must pass ${rpcArgument}`)
}
assert(sourceRunsData.includes('public_href: project.href'), `${sourceRunsDataPath}: atomic project payload must use public_href`)

const preparedProjects = read('src/lib/prepared-showcase-projects.ts')
const mockData = read('src/lib/mock-data.ts')
const forbiddenSyntheticMarkers = [
  ['Codex' + ' sim' + 'ulated', 'non-real model label'],
  ['Codex' + 'Lane', 'synthetic profile handle'],
  ['Sim' + 'ulated Codex fork profile', 'synthetic profile biography'],
]
for (const [needle, description] of forbiddenSyntheticMarkers) {
  assert(!preparedProjects.includes(needle), `src/lib/prepared-showcase-projects.ts: must not ship ${description}`)
  assert(!mockData.includes(needle), `src/lib/mock-data.ts: must not ship ${description}`)
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Project fork structural guard passed.')
