import { SkeletonBox, SkeletonCardGrid } from '@/components/Skeleton'

/**
 * Landing page loading skeleton.
 * Shows the hero structure immediately while the popular paths data loads.
 * Matches the real page layout to prevent layout shift.
 */
export default function HomeLoading() {
  return (
    <div className="bg-white text-gray-900" aria-busy="true">
      {/* ═══════════ HERO SKELETON ═══════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-orange-50/30" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          {/* Tagline chip */}
          <div className="flex justify-center mb-8">
            <SkeletonBox className="h-7 w-72" />
          </div>

          {/* Heading */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <SkeletonBox className="h-12 w-[80%] max-w-lg" />
            <SkeletonBox className="h-12 w-[60%] max-w-sm" />
          </div>

          {/* Subtitle — two lines matching tighter copy */}
          <div className="flex flex-col items-center gap-3 mb-12 max-w-xl mx-auto">
            <SkeletonBox className="h-5 w-full" />
            <SkeletonBox className="h-4 w-[70%]" />
          </div>

          {/* CTA — primary button + text link */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SkeletonBox className="h-13 w-48" />
            <SkeletonBox className="h-5 w-36" />
          </div>
        </div>
      </section>

      {/* ═══════════ PIPE SKELETON ═══════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-12 bg-gray-200/60" />
            <div className="w-2.5 h-2.5 bg-gray-200" />
          </div>
        </div>
      </div>

      {/* ═══════════ PROBLEM SECTION SKELETON ═══════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex gap-6 lg:gap-10">
          <div className="w-8 flex-shrink-0 hidden sm:flex flex-col items-center">
            <div className="w-0.5 flex-1 bg-gray-200/40" />
          </div>
          <div className="flex-1">
            <SkeletonBox className="h-3 w-24 mb-3" />
            <SkeletonBox className="h-10 w-72 mb-3" />
            <SkeletonBox className="h-5 w-40 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white border border-gray-200 p-5">
                  <SkeletonBox className="h-4 w-32 mb-2" />
                  <SkeletonBox className="h-3 w-full mb-1" />
                  <SkeletonBox className="h-3 w-[80%]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ POPULAR PATHS SKELETON ═══════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div className="border-l-4 border-gray-200 pl-4">
            <SkeletonBox className="h-3 w-14 mb-2" />
            <SkeletonBox className="h-8 w-52 mb-1" />
            <SkeletonBox className="h-4 w-64" />
          </div>
          <SkeletonBox className="h-4 w-16" />
        </div>
        <SkeletonCardGrid count={6} />
      </section>
    </div>
  )
}
