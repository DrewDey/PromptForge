import { SkeletonBox, SkeletonCardGrid } from '@/components/Skeleton'

export default function UserProfileLoading() {
  return (
    <div className="min-h-[calc(100vh-3rem)] bg-surface-50" aria-busy="true">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="border border-surface-200 bg-white">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_290px]">
            <div className="p-5 sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="h-16 w-16 shrink-0 bg-brand-orange/40 sm:h-20 sm:w-20" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <SkeletonBox className="h-9 w-56" />
                  <SkeletonBox className="mt-2 h-4 w-24" />
                  <SkeletonBox className="mt-5 h-4 w-full max-w-xl" />
                  <SkeletonBox className="mt-2 h-4 w-4/5 max-w-lg" />
                  <div className="mt-5 flex gap-4">
                    <SkeletonBox className="h-3.5 w-24" />
                    <SkeletonBox className="h-3.5 w-28" />
                    <SkeletonBox className="h-3.5 w-28" />
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-surface-200 bg-surface-50 p-5 lg:border-l lg:border-t-0">
              <SkeletonBox className="h-3 w-24" />
              <div className="mt-4 flex flex-wrap gap-2">
                <SkeletonBox className="h-7 w-28" />
                <SkeletonBox className="h-7 w-24" />
                <SkeletonBox className="h-7 w-32" />
              </div>
              <SkeletonBox className="mt-5 h-3 w-20" />
              <div className="mt-3 flex flex-wrap gap-2">
                <SkeletonBox className="h-7 w-28" />
                <SkeletonBox className="h-7 w-24" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="border border-surface-200 bg-white p-4">
              <SkeletonBox className="h-3 w-24" />
              <SkeletonBox className="mt-3 h-8 w-12" />
            </div>
          ))}
        </div>

        <div className="mt-10 border-b border-surface-200 pb-4">
          <SkeletonBox className="h-3 w-20" />
          <SkeletonBox className="mt-2 h-7 w-40" />
        </div>
        <div className="mt-5">
          <SkeletonCardGrid count={3} />
        </div>

        <div className="mt-10 border-b border-surface-200 pb-4">
          <SkeletonBox className="h-3 w-24" />
          <SkeletonBox className="mt-2 h-7 w-36" />
        </div>
        <div className="mt-5">
          <SkeletonCardGrid count={3} />
        </div>
      </div>
    </div>
  )
}
