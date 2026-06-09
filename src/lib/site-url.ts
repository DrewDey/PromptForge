import type { Metadata } from 'next'

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

export function getCanonicalSiteUrl(path: string) {
  const url = new URL(path, `${getSiteUrl()}/`)
  url.search = ''
  url.hash = ''

  if (url.pathname !== '/') {
    url.pathname = url.pathname.replace(/\/+$/, '')
  }

  return url.toString()
}

export function canonicalMetadata(path: string): Pick<Metadata, 'alternates'> {
  return {
    alternates: {
      canonical: getCanonicalSiteUrl(path),
    },
  }
}
