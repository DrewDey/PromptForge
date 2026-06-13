import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { TINY_PIXEL_STAMP_CARD_MAKER_CHATGPT_RECOVERED_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = TINY_PIXEL_STAMP_CARD_MAKER_CHATGPT_RECOVERED_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function TinyPixelStampCardMakerChatgptRecoveredDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('tiny-pixel-stamp-card-maker-chatgpt-recovered-source-run.json')}
      route="/tiny-pixel-stamp-card-maker-chatgpt-recovered-demo"
      capturedAt="June 10, 2026"
    />
  )
}
