import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { CHAPTER_SCOPE_MAP_TINY_BOOKS_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = CHAPTER_SCOPE_MAP_TINY_BOOKS_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ChapterScopeMapTinyBooksClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('chapter-scope-map-tiny-books-claude-source-run.json')}
      route="/chapter-scope-map-tiny-books-claude-demo"
      capturedAt="June 12, 2026"
    />
  )
}
