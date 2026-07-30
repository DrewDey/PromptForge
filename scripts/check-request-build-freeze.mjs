import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

function requireText(path, source, expected, message) {
  if (!source.includes(expected)) {
    throw new Error(`${message}: ${path} must include ${JSON.stringify(expected)}`)
  }
}

function forbidText(path, source, forbidden, message) {
  if (source.includes(forbidden)) {
    throw new Error(`${message}: ${path} must not include ${JSON.stringify(forbidden)}`)
  }
}

const dataPath = 'src/lib/data/build-requests.ts'
const data = read(dataPath)
requireText(
  dataPath,
  data,
  'responses:build_request_responses!build_request_responses_request_id_fkey(*)',
  'legacy response reads must select the populated-board relationship explicitly',
)
requireText(dataPath, data, "status: 'unavailable'", 'legacy read failures must have an unavailable state')
requireText(dataPath, data, "status: 'ready'", 'verified legacy reads must have a ready state')
requireText(dataPath, data, 'throwReadableBuildRequestError(error)', 'PostgREST errors must be checked')
requireText(dataPath, data, 'reject(new Error(', 'legacy read timeouts must reject rather than resolve empty')
requireText(dataPath, data, 'LEGACY_BUILD_REQUESTS_FROZEN_MESSAGE', 'legacy mutation paths must fail closed')
forbidText(dataPath, data, "responses:build_request_responses(*)", 'ambiguous PostgREST embeds are forbidden')
forbidText(dataPath, data, '.insert(', 'the legacy data module must not retain direct inserts')
forbidText(dataPath, data, '.delete(', 'the legacy data module must not retain direct vote deletes')

const pagePath = 'src/app/requests/page.tsx'
const page = read(pagePath)
const overviewPath = 'src/components/requests/service/RequestServiceOverview.tsx'
const overview = read(overviewPath)
requireText(pagePath, page, 'getRequestApplicationService()', 'the page must use the Request application service')
requireText(pagePath, page, 'service.getAvailability()', 'the page must use the authority availability read')
requireText(pagePath, page, 'toUnavailableServiceAvailability()', 'the page must distinguish unavailable reads')
requireText(overviewPath, overview, 'Availability could not be confirmed.', 'the page must label read failure truthfully')
requireText(overviewPath, overview, 'The service control is off.', 'private intake must render default-off')
requireText(overviewPath, overview, 'availability.maxActiveCases', 'the page must disclose the authority-projected capacity')
requireText(
  'src/components/requests/service/RequestSubmissionReceipt.tsx',
  read('src/components/requests/service/RequestSubmissionReceipt.tsx'),
  'Durable receipt',
  'only a durable authority receipt may prove submission',
)
forbidText(pagePath, page, 'BuildRequestSubmitForm', 'default-off intake must not render the legacy submit form')
forbidText(pagePath, page, 'searchParams', 'query strings must not produce submission success')
forbidText(pagePath, page, 'submittedBanner', 'query strings must not produce submission success')
forbidText(pagePath, page, 'getBuildRequests(', 'the private service desk must not read the legacy public board')

const cardPath = 'src/components/requests/BuildRequestCard.tsx'
const card = read(cardPath)
requireText(cardPath, card, 'public responses and votes are permanently read-only', 'legacy cards must disclose the freeze')
forbidText(cardPath, card, 'BuildRequestResponseForm', 'legacy cards must not render response mutation controls')
forbidText(cardPath, card, 'voteOnBuildRequest', 'legacy cards must not render vote mutation controls')

const retiredInstallerPath = 'supabase/build-requests.sql'
const retiredInstaller = read(retiredInstallerPath)
requireText(
  retiredInstallerPath,
  retiredInstaller,
  'RETIRED: legacy public Request a Build installer.',
  'the legacy manual installer must remain unmistakably retired',
)
requireText(
  retiredInstallerPath,
  retiredInstaller,
  'supabase/migrations/20260730040819_request_build_private_authority_v1.sql',
  'the retired installer must point to the canonical versioned migration',
)
for (const forbidden of [
  'CREATE TABLE',
  'CREATE POLICY',
  'CREATE OR REPLACE FUNCTION',
  'GRANT SELECT',
  'GRANT INSERT',
  'GRANT UPDATE',
  'GRANT DELETE',
]) {
  forbidText(
    retiredInstallerPath,
    retiredInstaller,
    forbidden,
    'the retired installer must contain no executable legacy authority',
  )
}

const canonicalMigrationName =
  '20260730040819_request_build_private_authority_v1.sql'
const legacyAuthorityPatterns = [
  /\bCREATE\s+POLICY\b[\s\S]{0,240}\bON\s+(?:public\.)?build_request_(?:responses|votes)\b/i,
  /\bGRANT\s+(?:INSERT|UPDATE|DELETE)\b[\s\S]{0,240}\bbuild_request_(?:responses|votes)\b/i,
  /\bCREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?(?:update_build_request_vote_count|touch_build_request_on_response)\s*\(/i,
]
const supabaseDirectory = new URL('../supabase/', import.meta.url)
const authoritySources = fs
  .readdirSync(supabaseDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
  .map((entry) => `supabase/${entry.name}`)
const migrationDirectory = new URL('../supabase/migrations/', import.meta.url)
authoritySources.push(
  ...fs
    .readdirSync(migrationDirectory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.sql') &&
        entry.name > canonicalMigrationName,
    )
    .map((entry) => `supabase/migrations/${entry.name}`),
)
for (const authorityPath of authoritySources) {
  const source = read(authorityPath)
  for (const pattern of legacyAuthorityPatterns) {
    if (pattern.test(source)) {
      throw new Error(
        `legacy public Request authority is forbidden outside the historical migration fixture: ${authorityPath}`,
      )
    }
  }
}

console.log('Request a Build truthful-freeze guard passed.')
