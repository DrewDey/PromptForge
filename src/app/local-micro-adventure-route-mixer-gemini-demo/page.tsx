import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { LOCAL_MICRO_ADVENTURE_ROUTE_MIXER_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = LOCAL_MICRO_ADVENTURE_ROUTE_MIXER_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function LocalMicroAdventureRouteMixerGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('local-micro-adventure-route-mixer-gemini-source-run.json')}
      route="/local-micro-adventure-route-mixer-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
