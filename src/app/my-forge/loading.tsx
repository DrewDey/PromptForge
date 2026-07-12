export default function MyForgeLoading() {
  return (
    <main className="min-h-[calc(100vh-3rem)] bg-surface-50" aria-busy="true" aria-label="Loading My Forge">
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="h-3 w-32 bg-surface-200" />
        <div className="mt-4 h-10 w-56 bg-surface-200" />
        <div className="mt-4 h-4 w-full max-w-xl bg-surface-200" />
        <div className="mt-7 grid grid-cols-2 border border-surface-200 bg-white lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 border-r border-surface-200 p-4 last:border-r-0">
              <div className="h-3 w-20 bg-surface-200" />
              <div className="mt-3 h-6 w-8 bg-surface-200" />
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.75fr)]">
          <div className="space-y-3">
            <div className="h-8 w-40 bg-surface-200" />
            {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-32 border border-surface-200 bg-white" />)}
          </div>
          <div className="h-80 border border-surface-200 bg-white" />
        </div>
      </div>
    </main>
  )
}
