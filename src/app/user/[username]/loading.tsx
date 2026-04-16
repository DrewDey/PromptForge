import { SkeletonBox, SkeletonCardGrid } from '@/components/Skeleton'

/**
 * User profile page loading skeleton.
 * Structure-matched to page.tsx: card with gradient banner, overlapping avatar,
 * name/username/bio, stat cards, project grid.
 */
export default function UserProfileLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10" aria-busy="true">
      {/* Profile Header Card */}
      <div className="bg-white border border-gray-200 overflow-hidden mb-8">
        {/* Banner */}
        <div className="h-24 skeleton-shimmer" />

        <div className="px-6 pb-6">
          {/* Avatar — overlapping banner */}
          <div className="-mt-10 mb-4">
            <SkeletonBox className="w-20 h-20 border-4 border-white" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <SkeletonBox className="h-7 w-40 mb-2" />
              <SkeletonBox className="h-4 w-24 mb-3" />
              <SkeletonBox className="h-4 w-64 mb-3" />
              <div className="flex items-center gap-4 mt-3">
                <SkeletonBox className="h-3.5 w-28" />
                <SkeletonBox className="h-3.5 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-50 border border-gray-100 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <SkeletonBox className="w-4 h-4" />
              <SkeletonBox className="h-3 w-16" />
            </div>
            <SkeletonBox className="h-7 w-8 mx-auto" />
          </div>
        ))}
      </div>

      {/* Section header */}
      <div className="mb-6">
        <SkeletonBox className="h-6 w-32" />
      </div>

      {/* Project grid */}
      <SkeletonCardGrid count={3} />
    </div>
  )
}
