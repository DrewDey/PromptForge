import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { SEARCH_RESULT_SNIPPET_PROOF_LAB_OPENROUTER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = SEARCH_RESULT_SNIPPET_PROOF_LAB_OPENROUTER_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function SearchResultSnippetProofLabOpenrouterDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('search-result-snippet-proof-lab-openrouter-source-run.json')}
      route="/search-result-snippet-proof-lab-openrouter-demo"
      capturedAt="June 13, 2026"
    />
  )
}
