import type { Metadata } from 'next'

type BuildPathMetadataSource = {
  title: string
  description: string
}

const titleSuffix = 'PathForge Build Path'

function cleanTitle(title: string) {
  return title.trim().replace(/[.!?]+$/, '')
}

function cleanDescription(description: string) {
  return description.trim().replace(/\s+/g, ' ')
}

export function buildPathDetailMetadata(source: BuildPathMetadataSource): Metadata {
  const title = `${cleanTitle(source.title)} | ${titleSuffix}`
  const description = cleanDescription(source.description)

  return {
    title,
    description,
  }
}
