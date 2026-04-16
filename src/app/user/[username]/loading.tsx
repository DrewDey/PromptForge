import { SkeletonBox, SkeletonCardGrid } from '@/components/Skeleton'

/**
 * User profile page loading skeleton.
 *
 * Structure-matched to page.tsx (iteration 25 redesign):
 * - Identity row card (square monogram + name/handle/bio/meta stack)
 * - Left-aligned stat tiles (icon+label row on top, numeric value below)
 * - Section heading with right-aligned count
 * - Project grid
 */
export default function UserProfileLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10" aria-busy="true">
      {/* Identity row */}
      <div className="bg-white border border-surface-200 p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">
          {/* Square monogram placeholder — tinted brand-orange to match the real
              tile on hydration (prevents a color pop when content loads). */}
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-orange/40 shrink-0"
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1">
            <SkeletonBox className="h-8 w-56 mb-2" />
            <SkeletonBox className="h-4 w-24 mb-3" />
            <SkeletonBox className="h-4 w-72 mb-4" />
            {/* Inline meta line */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <SkeletonBox className="h-3.5 w-28" />
              <SkeletonBox className="h-3.5 w-24" />
              <SkeletonBox className="h-3.5 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Stat tiles — left-aligned icon+label on top, value below */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-surface-200 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <SkeletonBox className="w-3.5 h-3.5" />
              <SkeletonBox className="h-3 w-16" />
            </div>
            <SkeletonBox className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* Section header with right-aligned count */}
      <div className="flex items-baseline justify-between mb-6">
        <SkeletonBox className="h-6 w-28" />
        <SkeletonBox className="h-4 w-16" />
      </div>

      {/* Project grid */}
      <SkeletonCardGrid count={3} />
    </div>
  )
}
