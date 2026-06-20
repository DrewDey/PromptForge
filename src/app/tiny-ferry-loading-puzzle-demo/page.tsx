import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { TINY_FERRY_LOADING_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function TinyFerryLoadingPuzzleDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TINY_FERRY_LOADING_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('tiny-ferry-loading-puzzle-chatgpt-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
