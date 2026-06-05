import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { TINY_LOOP_SEQUENCER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function TinyLoopSequencerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TINY_LOOP_SEQUENCER_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('tiny-loop-sequencer-claude-source-run.json')}
      route="/tiny-loop-sequencer-demo"
      capturedAt="June 5, 2026"
    />
  )
}
