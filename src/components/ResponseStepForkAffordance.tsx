import Link from 'next/link'
import { ArrowRight, GitFork } from 'lucide-react'

export default function ResponseStepForkAffordance({
  forkHref,
  forkLabel,
}: {
  forkHref: string | null
  forkLabel: string
}) {
  if (!forkHref) return null

  return (
    <>
      <span
        data-response-fork-socket
        data-generic-response-fork-socket
        className="absolute right-[-34px] top-5 z-20 hidden h-10 w-10 border-4 border-[#07551f] bg-[#effdf3] shadow-[0_0_0_0_rgba(43,209,95,0)] transition duration-300 group-hover/response-fork-node:shadow-[0_0_0_8px_rgba(43,209,95,0.16)] group-focus-within/response-fork-node:shadow-[0_0_0_8px_rgba(43,209,95,0.16)] xl:block"
        aria-hidden="true"
      >
        <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 border-2 border-[#07551f] bg-[#2bd15f]" />
      </span>

      <div
        data-response-fork-hover-rail
        data-generic-response-fork-hover-rail
        className="pointer-events-none absolute right-[-24px] top-5 z-30 hidden translate-x-3 items-center opacity-0 transition duration-300 group-hover/response-fork-node:pointer-events-auto group-hover/response-fork-node:translate-x-0 group-hover/response-fork-node:opacity-100 group-focus-within/response-fork-node:pointer-events-auto group-focus-within/response-fork-node:translate-x-0 group-focus-within/response-fork-node:opacity-100 xl:flex"
      >
        <div className="relative h-10 w-28 shrink-0" aria-hidden="true">
          <span className="absolute left-0 top-1/2 h-4 w-full origin-left -translate-y-1/2 scale-x-0 border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_4px_0_rgba(255,255,255,0.2),inset_0_-4px_0_rgba(0,0,0,0.16)] transition-transform duration-300 group-hover/response-fork-node:scale-x-100 group-focus-within/response-fork-node:scale-x-100" />
          <span className="absolute right-[-2px] top-1/2 h-8 w-8 -translate-y-1/2 border-4 border-[#07551f] bg-[#effdf3] shadow-[0_0_0_6px_rgba(43,209,95,0.14)]" />
        </div>
        <Link
          href={forkHref}
          data-generic-response-fork-action
          className="inline-flex min-h-10 shrink-0 translate-x-[-10px] items-center gap-2 border-2 border-[#07551f] bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#07551f] shadow-[0_14px_34px_rgba(7,85,31,0.18)] transition duration-300 hover:bg-[#effdf3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bd15f] group-hover/response-fork-node:translate-x-0 group-focus-within/response-fork-node:translate-x-0"
          aria-label={forkLabel}
        >
          <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
          Fork here
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <Link
        href={forkHref}
        data-generic-response-fork-action
        className="relative mt-3 inline-flex min-h-11 items-center gap-2 border border-[#07551f] bg-[#effdf3] py-2 pl-10 pr-3 text-xs font-black uppercase tracking-[0.12em] text-[#07551f] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bd15f] xl:hidden"
        aria-label={forkLabel}
      >
        <span className="absolute left-0 top-1/2 h-2 w-8 -translate-y-1/2 border-y border-[#07551f] bg-[#2bd15f]" aria-hidden="true" />
        <span className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 border-2 border-[#07551f] bg-white" aria-hidden="true" />
        <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
        Fork from this response
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </>
  )
}
