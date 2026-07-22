import type { CSSProperties } from 'react'

function Pulse({ className, style }: { className: string; style?: CSSProperties }) {
  return <div className={`animate-pulse bg-surface-200 ${className}`} style={style} />
}

export default function BuildPathsLoading() {
  return (
    <div className="min-h-screen bg-white text-surface-900" aria-busy="true" aria-label="Loading build paths">
      <section className="border-b border-surface-200 bg-white">
        <div className="mx-auto w-[min(1200px,calc(100%_-_48px))] py-12">
          <Pulse className="h-3 w-48 bg-brand-orange/25" />
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.65fr] lg:items-end">
            <div>
              <Pulse className="h-12 w-full max-w-xl sm:h-14" />
              <Pulse className="mt-3 h-12 w-3/5 sm:h-14" />
            </div>
            <div>
              <Pulse className="h-4 w-full" />
              <Pulse className="mt-3 h-4 w-4/5" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-[18px_minmax(0,1fr)_110px] items-center gap-3 border border-surface-300 bg-white p-2">
            <Pulse className="h-4 w-4" />
            <Pulse className="h-9 w-full" />
            <Pulse className="h-10 w-full bg-surface-300" />
          </div>
          <div className="mt-4 flex gap-3 overflow-hidden">
            {[58, 52, 50, 54, 44, 88].map((width) => (
              <Pulse key={width} className="h-5 shrink-0" style={{ width }} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-[min(1200px,calc(100%_-_48px))] py-10 sm:py-12">
        <Pulse className="h-3 w-28 bg-brand-orange/25" />
        <Pulse className="mt-4 h-9 w-full max-w-sm" />
        <Pulse className="mt-3 h-4 w-full max-w-xl" />
        <div className="mt-7 flex flex-col gap-4 border-y border-surface-200 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <div className="flex flex-wrap gap-3">
            {[36, 74, 54, 112].map((width) => (
              <Pulse key={width} className="h-8 shrink-0" style={{ width }} />
            ))}
          </div>
          <div className="flex gap-2">
            <Pulse className="h-9 w-20" />
            <Pulse className="h-9 w-28" />
          </div>
        </div>
        <div className="mt-7 grid gap-x-5 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="overflow-hidden bg-white shadow-[0_18px_46px_rgba(29,25,18,.06)]">
              <Pulse className="h-64 w-full bg-surface-200" />
              <div className="p-5">
                <Pulse className="h-3 w-28 bg-brand-orange/20" />
                <Pulse className="mt-4 h-6 w-4/5" />
                <Pulse className="mt-3 h-4 w-full" />
                <Pulse className="mt-2 h-4 w-3/4" />
                <Pulse className="mt-5 h-8 w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
