import type { Metadata } from 'next'
import { canonicalMetadata } from '@/lib/site-url'
import BrowsePage from '../browse/page'

export const metadata: Metadata = {
  title: 'Explore AI Build Paths | PathForge',
  description: 'Browse PathForge\'s library of real AI build paths, with finished artifacts, prompt chains, model details, and forkable project examples.',
  ...canonicalMetadata('/paths'),
}

export default BrowsePage
