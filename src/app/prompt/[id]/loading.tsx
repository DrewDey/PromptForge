import { SkeletonBox, SkeletonText, SkeletonCard } from '@/components/Skeleton'

/**
 * Project detail page loading skeleton.
 * Structure-matched to prompt/[id]/page.tsx: breadcrumb, header with author row then
 * grouped metadata, story section, step flow with 48px nodes, and related projects.
 */
export default function PromptDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10" aria-busy="true">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <div className="flex items-center gap-1.5">
          <SkeletonBox className="h-4 w-14" />
          <SkeletonBox className="h-3.5 w-3.5" />
          <SkeletonBox className="h-4 w-20" />
          <SkeletonBox className="h-3.5 w-3.5" />
          <SkeletonBox className="h-4 w-40" />
        </div>
      </nav>

      {/* Header */}
      <header className="mb-10">
        {/* Title */}
        <SkeletonBox className="h-9 w-[75%] mb-3" />
        {/* Description */}
        <SkeletonText lines={2} widths={['100%', '60%']} className="mb-4" />

        {/* Author row — immediately after title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <SkeletonBox className="w-10 h-10" />
            <div>
              <SkeletonBox className="h-4 w-24 mb-1" />
              <SkeletonBox className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBox className="h-9 w-20" />
            <SkeletonBox className="h-9 w-20" />
          </div>
        </div>

        {/* Grouped metadata */}
        <div className="flex items-start gap-6 flex-wrap pt-5 border-t border-surface-200">
          <div className="flex items-center gap-2">
            <SkeletonBox className="h-7 w-24" />
            <SkeletonBox className="h-7 w-20" />
            <SkeletonBox className="h-7 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBox className="h-7 w-28" />
            <SkeletonBox className="h-7 w-24" />
          </div>
        </div>
      </header>

      {/* The Story section — prominent */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <SkeletonBox className="w-5 h-5" />
          <SkeletonBox className="h-6 w-28" />
        </div>
        <div className="border-l-4 border-surface-200 p-6 sm:p-8 bg-surface-50/50">
          <SkeletonText lines={4} widths={['100%', '95%', '100%', '50%']} />
        </div>
      </section>

      {/* Steps section */}
      <section className="mb-12">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <SkeletonBox className="w-5 h-5" />
            <SkeletonBox className="h-5 w-20" />
            <SkeletonBox className="h-4 w-16" />
          </div>
          <SkeletonBox className="h-4 w-72 ml-7" />
        </div>

        <div className="relative">
          {/* Vertical pipe placeholder */}
          <div className="absolute left-[23px] top-2 bottom-2 w-[3px] bg-surface-200/50" />

          <div className="space-y-10">
            {[1, 2, 3].map(step => (
              <div key={step} className="relative pl-16">
                {/* Step node — 48px to match real */}
                <div className="absolute left-0 top-3 w-[48px] h-[48px] bg-surface-200 flex items-center justify-center z-10">
                  <SkeletonBox className="w-5 h-5" />
                </div>

                <div className="border border-surface-200 overflow-hidden">
                  {/* Step header */}
                  <div className="bg-surface-50 px-5 py-3 border-b border-surface-200">
                    <div className="flex items-center gap-2">
                      <SkeletonBox className="h-3 w-20" />
                      <SkeletonBox className="h-4 w-32" />
                    </div>
                  </div>

                  {/* Prompt section */}
                  <div className="p-5 border-l-4 border-surface-200">
                    <div className="flex items-center justify-between mb-3">
                      <SkeletonBox className="h-3 w-16" />
                      <SkeletonBox className="h-6 w-14" />
                    </div>
                    <div className="p-4 bg-surface-50/40 border border-surface-100">
                      <SkeletonText lines={3} widths={['100%', '90%', '70%']} />
                    </div>
                  </div>

                  {/* Result section */}
                  <div className="p-5 border-l-4 border-surface-200 bg-surface-50/20 border-t border-surface-100">
                    <div className="flex items-center justify-between mb-3">
                      <SkeletonBox className="h-3 w-14" />
                      <SkeletonBox className="h-6 w-14" />
                    </div>
                    <div className="p-4 bg-surface-50 border border-surface-100">
                      <SkeletonText lines={2} widths={['100%', '55%']} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related projects */}
      <section className="mt-16 pt-10 border-t border-surface-200">
        <div className="flex items-center justify-between mb-6">
          <SkeletonBox className="h-5 w-40" />
          <SkeletonBox className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    </div>
  )
}
