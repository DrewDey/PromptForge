import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { LOGO_BRIEF_CONSTRAINT_MIXER_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = LOGO_BRIEF_CONSTRAINT_MIXER_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function LogoBriefConstraintMixerClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('logo-brief-constraint-mixer-claude-source-run.json')}
      route="/logo-brief-constraint-mixer-claude-demo"
      capturedAt="June 12, 2026"
    />
  )
}
