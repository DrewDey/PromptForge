import { SkeletonBox } from '@/components/Skeleton'

/**
 * Admin dashboard loading skeleton.
 * Structure-matched to page.tsx. Note: admin layout provides the sidebar and
 * container (flex-1 p-6 sm:p-8 bg-gray-50), so no outer wrapper needed here.
 */
export default function AdminLoading() {
  return (
    <div aria-busy="true">
      {/* Header */}
      <div className="mb-8">
        <SkeletonBox className="h-7 w-48 mb-2" />
        <SkeletonBox className="h-4 w-72" />
      </div>

      {/* Mobile tab nav */}
      <div className="flex gap-2 mb-6 md:hidden">
        <SkeletonBox className="h-7 w-20" />
        <SkeletonBox className="h-7 w-24" />
        <SkeletonBox className="h-7 w-12" />
      </div>

      {/* Stat cards — 5 cards, matching grid-cols-2 lg:grid-cols-5 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white border border-gray-200 p-5">
            <SkeletonBox className="h-3 w-20 mb-3" />
            <SkeletonBox className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* Pending Review section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <SkeletonBox className="h-5 w-32" />
          <SkeletonBox className="h-5 w-8" />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
              <div className="flex-1">
                <SkeletonBox className="h-4 w-48 mb-1" />
                <SkeletonBox className="h-3 w-32" />
              </div>
              <SkeletonBox className="h-6 w-16" />
              <SkeletonBox className="h-6 w-16" />
              <div className="flex gap-2">
                <SkeletonBox className="h-8 w-20" />
                <SkeletonBox className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
