import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { MINI_METRO_SIGNAL_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function MiniMetroSignalDeskDemoPage() {
  return (
    <PreparedSourceRunPage
      project={MINI_METRO_SIGNAL_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('mini-metro-signal-desk-claude-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
