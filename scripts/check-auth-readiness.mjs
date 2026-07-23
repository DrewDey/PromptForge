import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function requireText(path, source, expected, message) {
  if (!source.includes(expected)) {
    throw new Error(`${path}: ${message}`)
  }
}

function forbidText(path, source, forbidden, message) {
  if (source.includes(forbidden)) {
    throw new Error(`${path}: ${message}`)
  }
}

const packageJson = JSON.parse(read('package.json'))
if (packageJson.dependencies?.next !== '16.2.11') {
  throw new Error('package.json: Next.js must stay on the reviewed patched 16.2.11 release')
}
if (packageJson.devDependencies?.['eslint-config-next'] !== '16.2.11') {
  throw new Error('package.json: eslint-config-next must match the Next.js release')
}
if (packageJson.overrides?.sharp !== '0.35.3') {
  throw new Error('package.json: Next.js image processing must stay on the reviewed patched sharp 0.35.3 release')
}
if (packageJson.overrides?.ws !== '8.21.0') {
  throw new Error('package.json: ws must stay on the reviewed patched 8.21.0 release')
}
if (
  packageJson.devDependencies?.postcss !== '8.5.22'
  || packageJson.overrides?.postcss !== '8.5.22'
) {
  throw new Error('package.json: every PostCSS consumer must stay on the reviewed patched 8.5.22 release')
}

const browserClientPath = 'src/lib/supabase/client.ts'
const browserClient = read(browserClientPath)
forbidText(browserClientPath, browserClient, 'autoRefreshToken: false', 'browser session refresh must not be disabled')

const sessionProxyPath = 'src/lib/supabase/proxy.ts'
const sessionProxy = read(sessionProxyPath)
requireText(sessionProxyPath, sessionProxy, 'hasSupabaseAuthCookie', 'anonymous traffic must bypass remote Auth checks')
requireText(sessionProxyPath, sessionProxy, 'await supabase.auth.getClaims()', 'the proxy must verify and refresh cookie sessions')

const proxyPath = 'src/proxy.ts'
const proxy = read(proxyPath)
requireText(proxyPath, proxy, 'return refreshAuthSession(request)', 'all matched application routes must use session refresh')
forbidText(proxyPath, proxy, "pathname.startsWith('/admin')", 'session refresh must not be limited to admin')

const headerPath = 'src/components/Header.tsx'
const header = read(headerPath)
requireText(headerPath, header, 'hasSupabaseAuthCookie', 'anonymous pages must not call Auth just to render the header')

const callbackPath = 'src/app/auth/callback/route.ts'
const callback = read(callbackPath)
requireText(callbackPath, callback, 'safeAuthNextPath', 'callback redirects must validate the requested path')
requireText(callbackPath, callback, 'new URL(nextPath, origin)', 'callback redirects must use URL parsing rather than string concatenation')
requireText(callbackPath, callback, "onboardingUrl.searchParams.set('next', nextPath)", 'first-time profile onboarding must retain the requested post-auth destination')
requireText(callbackPath, callback, 'verifyOtp({', 'callback must support server-consumed email token hashes as well as PKCE codes')
requireText(callbackPath, callback, 'isTokenHashType', 'callback must restrict token-hash verification to supported email flows')
forbidText(callbackPath, callback, '`${origin}${next}`', 'unsafe callback redirect concatenation is forbidden')

const profileSettingsPath = 'src/app/settings/profile/page.tsx'
const profileSettings = read(profileSettingsPath)
requireText(profileSettingsPath, profileSettings, 'safeAuthNextPath', 'profile onboarding must validate the preserved destination')
requireText(profileSettingsPath, profileSettings, 'continueHref={continueHref}', 'profile onboarding must pass the preserved destination to its completion control')

const profileSettingsFormPath = 'src/components/ProfileSettingsForm.tsx'
const profileSettingsForm = read(profileSettingsFormPath)
requireText(profileSettingsFormPath, profileSettingsForm, 'href={continueHref}', 'profile completion must offer the original destination after a successful save')

const signupPath = 'src/app/auth/signup/page.tsx'
const signup = read(signupPath)
requireText(signupPath, signup, 'emailRedirectTo:', 'email confirmation must return through the PKCE callback')
requireText(signupPath, signup, ", 'oauth')", 'social signup must route through profile onboarding')
requireText(signupPath, signup, ".ilike('username'", 'handle conflicts must be caught before Auth creates a user')
requireText(signupPath, signup, 'enabledOAuthProviders.length > 0', 'disabled social providers must not be advertised')

const passwordPolicyPath = 'src/lib/password-policy.ts'
const passwordPolicy = read(passwordPolicyPath)
requireText(passwordPolicyPath, passwordPolicy, 'PATHFORGE_PASSWORD_MIN_LENGTH = 12', 'browser password validation must match the production Supabase minimum')

const loginPath = 'src/app/auth/login/page.tsx'
const login = read(loginPath)
requireText(loginPath, login, 'supabase.auth.resend({', 'unconfirmed accounts must be able to request a fresh confirmation link')

const authShellPath = 'src/app/auth/AuthPageShell.tsx'
const authShell = read(authShellPath)
requireText(authShellPath, authShell, '/auth/v1/settings', 'social login availability must come from the live Auth configuration')
requireText(authShellPath, authShell, "settings.external?.[provider]", 'only enabled social providers may be rendered')

for (const path of [
  'src/app/auth/forgot-password/page.tsx',
  'src/app/auth/reset-password/page.tsx',
]) {
  if (!fs.existsSync(path)) throw new Error(`${path}: password recovery route is missing`)
}

const forgot = read('src/app/auth/forgot-password/page.tsx')
requireText('src/app/auth/forgot-password/page.tsx', forgot, 'resetPasswordForEmail', 'recovery must request a Supabase reset link')
requireText('src/app/auth/forgot-password/page.tsx', forgot, 'If an account exists', 'recovery confirmation must not enumerate accounts')

const reset = read('src/app/auth/reset-password/page.tsx')
requireText('src/app/auth/reset-password/page.tsx', reset, 'updateUser({ password })', 'reset route must replace the password')
requireText('src/app/auth/reset-password/page.tsx', reset, "signOut({ scope: 'others' })", 'password replacement must remove other sessions')
requireText('src/app/auth/reset-password/page.tsx', reset, 'PATHFORGE_PASSWORD_MIN_LENGTH', 'password recovery must share the signup password policy')

const migrationPath = 'supabase/migrations/20260713021544_harden_community_mutation_boundaries.sql'
const restrictionMigrationPath = 'supabase/migrations/20260713023646_restrict_community_mutation_grants.sql'
const preparationMigration = read(migrationPath)
const restrictionMigration = read(restrictionMigrationPath)
forbidText(migrationPath, preparationMigration, 'REVOKE ALL ON TABLE public.suggestions', 'preparation migration must remain backward-compatible with the live client')
requireText(restrictionMigrationPath, restrictionMigration, 'REVOKE ALL ON TABLE public.suggestions', 'narrow grants belong in the post-deploy restriction migration')
const migration = `${preparationMigration}\n${restrictionMigration}`
for (const [expected, message] of [
  ['private.pathforge_mutation_windows', 'private per-account mutation windows are required'],
  ['enforce_pathforge_mutation_quota', 'database-level creation quotas are required'],
  ['Users create pending private suggestions', 'suggestion inserts must have fixed moderation state'],
  ['Users create open zero-vote build requests', 'build request inserts must have fixed state'],
  ['Users create unaccepted zero-vote build responses', 'build response inserts must have fixed state'],
  ['REVOKE ALL ON TABLE public.suggestions', 'broad suggestion grants must stay revoked'],
  ['REVOKE ALL ON TABLE public.build_requests', 'broad build-request grants must stay revoked'],
  ['DROP POLICY IF EXISTS "Users can add steps to their prompts"', 'the legacy post-publication step policy must stay removed'],
  ['pathforge_approve_suggestion', 'admin suggestion transitions must use checked RPCs'],
  ['pathforge_touch_suggestion_on_response', 'suggestion responses must safely refresh parent ordering'],
]) {
  requireText(migrationPath, migration, expected, message)
}

const suggestionsPath = 'src/lib/data/suggestions.ts'
const suggestions = read(suggestionsPath)
requireText(suggestionsPath, suggestions, ".rpc('pathforge_approve_suggestion'", 'admin approval must use the checked database transition')
forbidText(suggestionsPath, suggestions, "moderation_status: 'approved'", 'application clients must not directly write privileged suggestion state')

const buildRequestsPath = 'src/lib/data/build-requests.ts'
const buildRequests = read(buildRequestsPath)
requireText(buildRequestsPath, buildRequests, 'normalizePathForgeBuildUrl', 'build response links must be constrained to PathForge projects')
forbidText(buildRequestsPath, buildRequests, "status: 'open'", 'database defaults must own initial build-request state')

const importerPath = 'scripts/import-pathforge-source-run.mjs'
const importer = read(importerPath)
requireText(importerPath, importer, 'Public signup cannot attach a new auth user', 'existing seed handles must fail before synthetic public signup')

const nextConfigPath = 'next.config.ts'
const nextConfig = read(nextConfigPath)
requireText(nextConfigPath, nextConfig, 'poweredByHeader: false', 'the framework fingerprint header must stay disabled')
for (const headerName of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Permissions-Policy']) {
  requireText(nextConfigPath, nextConfig, headerName, `${headerName} is required on ordinary pages`)
}

console.log('Auth readiness guard passed.')
