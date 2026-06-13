import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { CLIENT_EMAIL_REPLY_RISK_METER_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = CLIENT_EMAIL_REPLY_RISK_METER_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ClientEmailReplyRiskMeterChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('client-email-reply-risk-meter-chatgpt-source-run.json')}
      route="/client-email-reply-risk-meter-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
