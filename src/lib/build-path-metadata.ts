import type { Metadata } from 'next'
import { getProjectHref } from './project-links'
import { canonicalMetadata } from './site-url'

type BuildPathMetadataSource = {
  id?: string
  href?: string
  route?: string
  title: string
  description: string
}

const titleSuffix = 'PathForge Build Path'
const promptResultContextSentence =
  'The build path preserves the original prompt and result context.'

function cleanTitle(title: string) {
  return title.trim().replace(/[.!?]+$/, '')
}

function cleanDescription(description: string) {
  return description.trim().replace(/\s+/g, ' ')
}

function getBuildPathCanonicalPath(source: BuildPathMetadataSource) {
  if (source.href) return source.href
  if (source.route) return source.route
  if (source.id) return getProjectHref({ id: source.id })
  return null
}

export function buildPathDetailMetadata(source: BuildPathMetadataSource): Metadata {
  const title = `${cleanTitle(source.title)} | ${titleSuffix}`
  const description = cleanDescription(source.description)
  const canonicalPath = getBuildPathCanonicalPath(source)

  return {
    title,
    description,
    ...(canonicalPath ? canonicalMetadata(canonicalPath) : {}),
  }
}

export function buildPreparedSourceRunDetailMetadata(source: BuildPathMetadataSource): Metadata {
  return buildPathDetailMetadata({
    id: source.id,
    href: source.href,
    route: source.route,
    title: source.title,
    description: `${source.description} ${promptResultContextSentence}`,
  })
}
