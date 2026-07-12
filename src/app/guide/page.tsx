import type { Metadata } from 'next'
import GuideHero from '@/components/guide/GuideHero'
import GuideRail from '@/components/guide/GuideRail'
import GuideIntro from '@/components/guide/GuideIntro'
import GuideWorkedExample from '@/components/guide/GuideWorkedExample'
import GuideLineage from '@/components/guide/GuideLineage'
import GuideProviderRun from '@/components/guide/GuideProviderRun'
import GuideSubmission from '@/components/guide/GuideSubmission'
import GuideFinalCta from '@/components/guide/GuideFinalCta'
import { canonicalMetadata } from '@/lib/site-url'
import './guide.css'

export const metadata: Metadata = {
  title: 'How PathForge Works | PathForge Walkthrough',
  description: 'See how to find a working AI project, inspect its exact build path, compare model results, fork a response, and share your own verified run.',
  ...canonicalMetadata('/guide'),
}

export default function GuidePage() {
  return (
    <div className="pf-guide">
      <GuideHero />
      <GuideRail />
      <GuideIntro />
      <GuideWorkedExample />
      <GuideLineage />
      <GuideProviderRun />
      <GuideSubmission />
      <GuideFinalCta />
    </div>
  )
}
