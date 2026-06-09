const FALLBACK_SITE_URL = 'https://prompt-forge-sandy.vercel.app'

function withProtocol(url: string) {
  return /^https?:\/\//.test(url) ? url : `https://${url}`
}

export function getSiteUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
    FALLBACK_SITE_URL

  return withProtocol(rawUrl).replace(/\/+$/, '')
}

export function getAbsoluteSiteUrl(path: string) {
  return new URL(path, `${getSiteUrl()}/`).toString()
}
