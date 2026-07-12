import { SkeletonBox } from '@/components/Skeleton'

export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the PathForge admin workspace" className="min-w-0">
      <section className="grid min-w-0 gap-5 border-b border-surface-200 pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <SkeletonBox className="h-3 w-40" />
          <SkeletonBox className="mt-4 h-10 w-full max-w-md" />
          <SkeletonBox className="mt-3 h-4 w-full max-w-2xl" />
          <SkeletonBox className="mt-2 h-4 w-4/5 max-w-xl" />
        </div>
        <div className="flex items-center gap-3 border border-surface-200 bg-white px-4 py-3">
          <SkeletonBox className="h-9 w-9 shrink-0" />
          <div className="min-w-40">
            <SkeletonBox className="h-3 w-20" />
            <SkeletonBox className="mt-2 h-4 w-36" />
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-1 border border-surface-200 bg-white p-1.5 sm:flex">
        {[1, 2, 3, 4].map(item => (
          <SkeletonBox key={item} className="h-10 min-w-0 sm:w-32" />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 border border-surface-200 bg-white lg:grid-cols-4">
        {[1, 2, 3, 4].map(item => (
          <div key={item} className="border-b border-r border-surface-200 p-4 lg:border-b-0">
            <SkeletonBox className="h-3 w-24" />
            <SkeletonBox className="mt-2 h-7 w-10" />
          </div>
        ))}
      </div>

      <section className="mt-9 min-w-0">
        <SkeletonBox className="h-3 w-28" />
        <SkeletonBox className="mt-3 h-7 w-48" />
        <SkeletonBox className="mt-2 h-4 w-full max-w-xl" />
        <div className="mt-4 divide-y divide-surface-200 border border-surface-200 bg-white">
          {[1, 2, 3].map(item => (
            <div key={item} className="grid min-w-0 gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <SkeletonBox className="h-5 w-32" />
                <SkeletonBox className="mt-3 h-5 w-full max-w-md" />
                <SkeletonBox className="mt-2 h-4 w-full max-w-2xl" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <SkeletonBox className="h-6 w-24" />
                  <SkeletonBox className="h-6 w-28" />
                  <SkeletonBox className="h-6 w-20" />
                </div>
              </div>
              <div className="flex items-start gap-2 border-t border-surface-200 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <SkeletonBox className="h-10 w-20" />
                <SkeletonBox className="h-10 w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
