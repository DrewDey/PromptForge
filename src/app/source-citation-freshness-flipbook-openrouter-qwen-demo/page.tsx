import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { SOURCE_CITATION_FRESHNESS_FLIPBOOK_OPENROUTER_QWEN_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = SOURCE_CITATION_FRESHNESS_FLIPBOOK_OPENROUTER_QWEN_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function SourceCitationFreshnessFlipbookOpenrouterQwenDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('source-citation-freshness-flipbook-openrouter-qwen-source-run.json')}
      route="/source-citation-freshness-flipbook-openrouter-qwen-demo"
      capturedAt="June 13, 2026"
    />
  )
}
