import type { Metadata } from 'next'
import { canonicalMetadata } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Share an AI Build | PathForge',
  description: 'Submit a real shared AI session, its exact model details, and review notes to the PathForge review queue. Nothing publishes automatically.',
  ...canonicalMetadata('/build'),
}

export { default } from '../prompt/new/page'
