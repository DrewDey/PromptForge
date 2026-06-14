import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { PRODUCT_PHOTO_SHOT_LIST_TILE_SORTER_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = PRODUCT_PHOTO_SHOT_LIST_TILE_SORTER_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ProductPhotoShotListTileSorterChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('product-photo-shot-list-tile-sorter-chatgpt-source-run.json')}
      route="/product-photo-shot-list-tile-sorter-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
