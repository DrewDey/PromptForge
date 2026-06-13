import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { BLOG_REFRESH_BRIEF_SORTER_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = BLOG_REFRESH_BRIEF_SORTER_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function BlogRefreshBriefSorterChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('blog-refresh-brief-sorter-chatgpt-source-run.json')}
      route="/blog-refresh-brief-sorter-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
