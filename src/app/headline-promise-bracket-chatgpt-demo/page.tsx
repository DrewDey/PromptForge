import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { HEADLINE_PROMISE_BRACKET_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = HEADLINE_PROMISE_BRACKET_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function HeadlinePromiseBracketChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('headline-promise-bracket-chatgpt-source-run.json')}
      route="/headline-promise-bracket-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
