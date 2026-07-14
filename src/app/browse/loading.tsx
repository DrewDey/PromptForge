import type { CSSProperties } from 'react'

function Pulse({ className, style }: { className: string; style?: CSSProperties }) {
  return <div className={`animate-pulse bg-surface-200 ${className}`} style={style} />
}

export default function BuildPathsLoading() {
  return (
    <div className="min-h-screen bg-white" aria-busy="true" aria-label="Loading build paths">
      <section className="border-b border-surface-800 bg-surface-900 text-white">
        <div className="mx-auto w-[min(1240px,calc(100%_-_28px))] py-10 sm:py-12">
          <Pulse className="h-3 w-52 bg-brand-orange/40" />
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.65fr] lg:items-end">
            <div>
              <Pulse className="h-14 w-full max-w-2xl bg-white/12 sm:h-16" />
              <Pulse className="mt-3 h-14 w-3/5 bg-white/12 sm:h-16" />
            </div>
            <div>
              <Pulse className="h-4 w-full bg-white/10" />
              <Pulse className="mt-3 h-4 w-4/5 bg-white/10" />
            </div>
          </div>
          <div className="mt-6 border border-white/15 bg-white p-3 shadow-[5px_5px_0_rgba(232,122,44,.7)]">
            <Pulse className="h-12 w-full" />
          </div>
          <div className="mt-4 flex gap-2 overflow-hidden">
            {[68, 58, 54, 62, 50, 82].map((width) => <Pulse key={width} className="h-8 shrink-0 bg-white/10" style={{ width }} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto w-[min(1240px,calc(100%_-_28px))] py-12 sm:py-16">
        <Pulse className="h-3 w-24 bg-brand-orange/30" />
        <Pulse className="mt-4 h-10 w-full max-w-xl" />
        <Pulse className="mt-3 h-4 w-full max-w-lg" />
        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          <div className="border border-surface-200">
            <Pulse className="h-64 w-full bg-surface-800" />
            <div className="p-5">
              <Pulse className="h-7 w-4/5" />
              <Pulse className="mt-3 h-4 w-full" />
              <Pulse className="mt-2 h-4 w-3/4" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="border border-surface-200">
                <Pulse className="h-32 w-full bg-surface-800" />
                <div className="p-4"><Pulse className="h-5 w-4/5" /><Pulse className="mt-3 h-3 w-full" /></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
