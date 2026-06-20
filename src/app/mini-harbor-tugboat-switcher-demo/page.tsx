import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { MINI_HARBOR_TUGBOAT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function MiniHarborTugboatDemoPage() {
  return (
    <PreparedSourceRunPage
      project={MINI_HARBOR_TUGBOAT_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('mini-harbor-tugboat-switcher-chatgpt-source-run.json')}
      capturedAt="June 5, 2026"
    />
  )
}
