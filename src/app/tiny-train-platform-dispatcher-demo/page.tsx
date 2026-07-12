import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { TINY_TRAIN_DISPATCHER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function TinyTrainDispatcherDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TINY_TRAIN_DISPATCHER_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('tiny-train-platform-dispatcher-claude-source-run.json')}
      capturedAt="June 5, 2026"
    />
  )
}
