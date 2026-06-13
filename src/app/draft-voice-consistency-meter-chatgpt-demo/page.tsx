import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { DRAFT_VOICE_CONSISTENCY_METER_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = DRAFT_VOICE_CONSISTENCY_METER_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function DraftVoiceConsistencyMeterChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('draft-voice-consistency-meter-chatgpt-source-run.json')}
      route="/draft-voice-consistency-meter-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
