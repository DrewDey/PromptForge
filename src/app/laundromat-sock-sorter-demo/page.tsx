import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { LAUNDROMAT_SOCK_SORTER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function LaundromatSockSorterDemoPage() {
  return (
    <PreparedSourceRunPage
      project={LAUNDROMAT_SOCK_SORTER_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('laundromat-sock-sorter-chatgpt-source-run.json')}
      route="/laundromat-sock-sorter-demo"
      capturedAt="June 6, 2026"
    />
  )
}
