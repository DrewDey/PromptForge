import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { PHONE_CHAT_SCREENSHOT_STORYBOARD_STUDIO_OPENROUTER_KIMI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = PHONE_CHAT_SCREENSHOT_STORYBOARD_STUDIO_OPENROUTER_KIMI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function PhoneChatScreenshotStoryboardStudioOpenrouterKimiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('phone-chat-screenshot-storyboard-studio-openrouter-kimi-source-run.json')}
      route="/phone-chat-screenshot-storyboard-studio-openrouter-kimi-demo"
      capturedAt="June 13, 2026"
    />
  )
}
