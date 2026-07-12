import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Flame, GitFork, Moon, Sparkles, TimerReset } from 'lucide-react'
import { getPrompts } from '@/lib/data'
import { getProjectHref } from '@/lib/project-links'
import { canonicalMetadata } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'What to Build with AI Tonight | PathForge',
  description: 'Find focused AI project ideas for tonight, then jump into real PathForge build paths, prompts, artifacts, or community requests.',
  ...canonicalMetadata('/what-to-build'),
}

const starterLanes = [
  {
    icon: Flame,
    title: 'Finish something tonight',
    copy: 'Choose a small, visible result you can use or play before the night is over.',
    ideas: ['One-file arcade game', 'Personal dashboard'],
    href: '/paths?difficulty=beginner&panel=open',
  },
  {
    icon: Sparkles,
    title: 'Try one plain prompt',
    copy: 'See what a current model can make from a normal-person request without a giant spec.',
    ideas: ['Snake variant', 'Timer or quiz'],
    href: '/paths?intent=one-prompt&panel=open',
  },
  {
    icon: GitFork,
    title: 'Fork a proven build',
    copy: 'Start from a working result and change its subject, rules, model, or output format.',
    ideas: ['Remix a game', 'Adapt a work tool'],
    href: '/paths?fork=available&panel=open',
  },
  {
    icon: TimerReset,
    title: 'Take on a weekend build',
    copy: 'Pick a larger experiment that benefits from a prompt chain, testing, and repair.',
    ideas: ['Budget simulator', 'Study planner'],
    href: '/paths?difficulty=intermediate&panel=open',
  },
] as const

const experimentBands = [
  {
    label: 'Start smaller',
    title: 'You do not need a perfect idea.',
    body: 'Pick something small enough to finish, visible enough to inspect, and interesting enough that you care whether it works.',
  },
  {
    label: 'Use the model',
    title: 'Spend the effort on output, not setup.',
    body: 'A strong first path turns a normal request into a real artifact, then lets you see exactly how the result was made.',
  },
  {
    label: 'Leave a next move',
    title: 'A good result invites a fork.',
    body: 'The best starting point makes the next change obvious: swap the audience, rules, model, format, or constraint.',
  },
]

export default async function WhatToBuildPage() {
  const paths = await getPrompts({ sort: 'newest', limit: 4 })

  return (
    <div className="bg-surface-50">
      <section className="relative overflow-hidden border-b border-surface-200 bg-white">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--color-surface-100)_1px,transparent_1px),linear-gradient(90deg,var(--color-surface-100)_1px,transparent_1px)] [background-size:56px_56px]" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-11 lg:px-8 lg:py-12">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 border border-surface-200 bg-surface-50 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-surface-600">
              <Moon className="h-3.5 w-3.5 text-brand-orange" aria-hidden="true" />
              For the blank-chat moment
            </div>
            <h1 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.045em] text-surface-900 sm:text-5xl lg:text-6xl">
              Pick tonight&apos;s <span className="font-display font-normal italic text-brand-orange">starting point</span>.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-surface-600 sm:text-lg">
              Choose the amount of ambition you have. PathForge will take you to a real build you can inspect, reuse, or change instead of another empty chat.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href="/paths?panel=open"
                className="inline-flex min-h-11 items-center gap-2 bg-surface-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                Browse every build
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/requests"
                className="inline-flex min-h-11 items-center gap-2 border border-surface-300 bg-white px-4 py-2.5 text-sm font-bold text-surface-800 transition-colors hover:border-brand-orange hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                Request what is missing
              </Link>
            </div>
          </div>

          <div className="mt-8 flex items-end justify-between gap-4 border-t border-surface-200 pt-5">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange">Pick a lane</div>
              <h2 className="mt-1 text-xl font-black tracking-[-0.025em] text-surface-900 sm:text-2xl">
                Start with the energy you have.
              </h2>
            </div>
            <p className="hidden max-w-sm text-right text-xs leading-5 text-surface-500 sm:block">
              Each lane opens a focused slice of the real PathForge catalog.
            </p>
          </div>

          <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4">
            {starterLanes.map(lane => {
              const Icon = lane.icon
              return (
                <Link
                  key={lane.title}
                  href={lane.href}
                  className="group flex w-[82vw] max-w-[315px] shrink-0 snap-start flex-col border border-surface-200 bg-white p-4 shadow-[4px_4px_0_rgba(24,24,27,0.035)] transition-all hover:border-brand-orange hover:shadow-[5px_5px_0_rgba(232,122,44,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange md:w-auto md:max-w-none"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary-50 text-brand-orange ring-1 ring-primary-200">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-surface-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-orange" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-base font-black tracking-[-0.015em] text-surface-900">{lane.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-6 text-surface-600">{lane.copy}</p>
                  <p className="mt-3 border-t border-surface-100 pt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-surface-500">
                    Try: {lane.ideas.join(' · ')}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange">Ready-made starting points</div>
            <h2 className="mt-1 text-3xl font-black tracking-[-0.035em] text-surface-900">Start from a finished result.</h2>
          </div>
          <Link href="/paths?panel=open" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-brand-orange hover:text-brand-orange-dark">
            See the full catalog
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {paths.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {paths.map((path, index) => (
              <Link
                key={path.id}
                href={getProjectHref(path)}
                className="group min-w-0 border border-surface-200 bg-white p-4 transition-colors hover:border-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-brand-orange">
                    {index === 0 ? 'Newest approved path' : 'Approved path'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-surface-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-orange" aria-hidden="true" />
                </div>
                <h3 className="mt-3 line-clamp-2 text-lg font-black leading-6 tracking-[-0.02em] text-surface-900">{path.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-surface-600">{path.description}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-surface-300 bg-white p-6 text-sm leading-6 text-surface-600">
            No approved paths are available yet. Once a project clears review, it will appear here as a real starting point.
          </div>
        )}
      </section>

      <section className="border-y border-surface-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
          {experimentBands.map(band => (
            <article key={band.label} className="border-l-2 border-brand-orange bg-surface-50 p-5">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">{band.label}</div>
              <h3 className="mt-2 text-xl font-black tracking-[-0.025em] text-surface-900">{band.title}</h3>
              <p className="mt-2 text-sm leading-6 text-surface-600">{band.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-surface-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange-light">Still missing the thing?</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.035em]">Ask for the path you wish existed.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-300">
              Post a focused Build Request so someone can answer with a real PathForge path, fork, or finished artifact.
            </p>
          </div>
          <Link
            href="/requests"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-brand-orange px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-orange-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Open Build Requests
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  )
}
