import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { FAQ_ANSWER_FRESHNESS_FLASHCARDS_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = FAQ_ANSWER_FRESHNESS_FLASHCARDS_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function FaqAnswerFreshnessFlashcardsChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('faq-answer-freshness-flashcards-chatgpt-source-run.json')}
      route="/faq-answer-freshness-flashcards-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
