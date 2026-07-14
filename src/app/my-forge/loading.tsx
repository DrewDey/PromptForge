export default function MyForgeLoading() {
  return (
    <div className="min-h-[calc(100vh-3rem)] bg-surface-50" aria-busy="true" aria-label="Loading My Forge">
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="h-3 w-32 bg-surface-200" />
        <div className="mt-4 h-10 w-56 bg-surface-200" />
        <div className="mt-4 h-4 w-full max-w-xl bg-surface-200" />
        <div className="mt-7 flex gap-5 border-y border-surface-200 py-3">
          <div className="h-3 w-20 bg-surface-200" />
          <div className="h-3 w-16 bg-surface-200" />
          <div className="h-3 w-24 bg-surface-200" />
        </div>
        <div className="mt-7 h-40 border border-surface-200 bg-white p-6">
          <div className="h-3 w-24 bg-surface-200" />
          <div className="mt-3 h-7 w-full max-w-lg bg-surface-200" />
          <div className="mt-3 h-4 w-full max-w-2xl bg-surface-200" />
        </div>
        <div className="mt-10">
          <div className="h-8 w-48 bg-surface-200" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-44 border border-surface-200 bg-white" />)}
          </div>
        </div>
      </div>
    </div>
  )
}
