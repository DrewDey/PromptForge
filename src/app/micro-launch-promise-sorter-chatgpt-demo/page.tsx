import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { MICRO_LAUNCH_PROMISE_SORTER_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = MICRO_LAUNCH_PROMISE_SORTER_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function MicroLaunchPromiseSorterChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('micro-launch-promise-sorter-chatgpt-source-run.json')}
      route="/micro-launch-promise-sorter-chatgpt-demo"
      capturedAt="June 14, 2026"
    />
  )
}
