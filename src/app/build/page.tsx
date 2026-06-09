import type { Metadata } from 'next'
import { canonicalMetadata } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Build a PathForge Path | PathForge',
  description: 'Build or fork a PathForge path, save draft context, attach artifacts, preserve source-run notes, and prepare review-ready work for publishing.',
  ...canonicalMetadata('/build'),
}

export { default } from '../prompt/new/page'
