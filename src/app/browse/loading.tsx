import { SkeletonBox, SkeletonCardGrid } from '@/components/Skeleton'

/**
 * Browse page loading skeleton.
 * Structure-matched to browse/page.tsx: header, search bar, category chips,
 * difficulty/sort row, result count, and card grid.
 */
export default function BrowseLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" aria-busy="true">
      {/* Header */}
      <div className="mb-8">
        <SkeletonBox className="h-3 w-14 mb-2" />
        <SkeletonBox className="h-8 w-44 mb-2" />
        <SkeletonBox className="h-4 w-72" />
      </div>

      {/* Search bar */}
      <div className="mb-8">
        <div className="flex gap-2">
          <div className="flex-1">
            <SkeletonBox className="h-[42px] w-full" />
          </div>
          <SkeletonBox className="h-[42px] w-[42px]" />
        </div>
      </div>

      {/* Category filter chips */}
      <div className="mb-6">
        <SkeletonBox className="h-3 w-16 mb-2" />
        <div className="flex flex-wrap gap-2">
          {[40, 64, 56, 72, 48, 60, 52, 68].map((w, i) => (
            <SkeletonBox key={i} className="h-[30px]" style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>

      {/* Difficulty + Sort row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-8">
        <div className="flex gap-2">
          {[70, 70, 90, 70].map((w, i) => (
            <SkeletonBox key={i} className="h-[30px]" style={{ width: `${w}px` }} />
          ))}
        </div>
        <div className="sm:ml-auto flex items-center gap-3">
          <SkeletonBox className="h-4 w-24" />
        </div>
      </div>

      {/* Result count */}
      <div className="mb-5">
        <SkeletonBox className="h-4 w-20" />
      </div>

      {/* Card grid */}
      <SkeletonCardGrid count={6} />
    </div>
  )
}
