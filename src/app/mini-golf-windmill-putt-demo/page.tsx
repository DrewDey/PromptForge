import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { MINI_GOLF_WINDMILL_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function MiniGolfWindmillDemoPage() {
  return (
    <PreparedSourceRunPage
      project={MINI_GOLF_WINDMILL_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('mini-golf-windmill-putt-chatgpt-source-run.json')}
      route="/mini-golf-windmill-putt-demo"
      capturedAt="June 5, 2026"
    />
  )
}
