import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { META_TAG_CTR_CARD_DUEL_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = META_TAG_CTR_CARD_DUEL_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function MetaTagCtrCardDuelChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('meta-tag-ctr-card-duel-chatgpt-source-run.json')}
      route="/meta-tag-ctr-card-duel-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
