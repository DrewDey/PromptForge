import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { FORUM_REPLY_HELPFULNESS_DIAL_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = FORUM_REPLY_HELPFULNESS_DIAL_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ForumReplyHelpfulnessDialChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('forum-reply-helpfulness-dial-chatgpt-source-run.json')}
      route="/forum-reply-helpfulness-dial-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
