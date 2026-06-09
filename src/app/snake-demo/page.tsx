import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { SNAKE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export const metadata = buildPreparedSourceRunDetailMetadata(SNAKE_SHOWCASE_PROJECT)

export default function SnakeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={SNAKE_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('snake-gpt55-pro-oneshot-source-run.json')}
      route="/snake-demo"
      capturedAt="May 23, 2026"
    />
  )
}
