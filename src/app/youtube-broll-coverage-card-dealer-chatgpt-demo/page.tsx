import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { YOUTUBE_BROLL_COVERAGE_CARD_DEALER_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = YOUTUBE_BROLL_COVERAGE_CARD_DEALER_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function YoutubeBrollCoverageCardDealerChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('youtube-broll-coverage-card-dealer-chatgpt-source-run.json')}
      route="/youtube-broll-coverage-card-dealer-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
