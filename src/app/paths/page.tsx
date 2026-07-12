import type { Metadata } from 'next'
import { canonicalMetadata } from '@/lib/site-url'
import { BuildPathsDiscovery, type BuildPathsSearchParams } from '@/components/discovery/BuildPathsDiscovery'
import '../browse.css'

export const metadata: Metadata = {
  title: 'Explore AI Build Paths | PathForge',
  description: 'Browse PathForge\'s library of real AI build paths, with finished artifacts, prompt chains, model details, and forkable project examples.',
  ...canonicalMetadata('/paths'),
}

export default function BuildPathsPage({
  searchParams,
}: {
  searchParams: Promise<BuildPathsSearchParams>
}) {
  return <BuildPathsDiscovery searchParams={searchParams} />
}
