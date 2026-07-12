import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { GARAGE_SALE_TAGS_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function GarageSaleTagsDemoPage() {
  return (
    <PreparedSourceRunPage
      project={GARAGE_SALE_TAGS_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('garage-sale-tags-gemini-source-run.json')}
      capturedAt="June 5, 2026"
    />
  )
}
