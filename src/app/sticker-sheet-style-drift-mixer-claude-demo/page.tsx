import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { STICKER_SHEET_STYLE_DRIFT_MIXER_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = STICKER_SHEET_STYLE_DRIFT_MIXER_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function StickerSheetStyleDriftMixerClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('sticker-sheet-style-drift-mixer-claude-source-run.json')}
      route="/sticker-sheet-style-drift-mixer-claude-demo"
      capturedAt="June 13, 2026"
    />
  )
}
