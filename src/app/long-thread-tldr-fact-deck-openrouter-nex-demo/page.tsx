import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { LONG_THREAD_TLDR_FACT_DECK_OPENROUTER_NEX_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = LONG_THREAD_TLDR_FACT_DECK_OPENROUTER_NEX_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function LongThreadTldrFactDeckOpenrouterNexDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('long-thread-tldr-fact-deck-openrouter-nex-source-run.json')}
      route="/long-thread-tldr-fact-deck-openrouter-nex-demo"
      capturedAt="June 13, 2026"
    />
  )
}
