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
    title: 'Burn tokens tonight',
    copy: 'Short prompts that can become a playable, visible, shareable result before bed.',
    ideas: ['One-file arcade game', 'Personal dashboard', 'Tiny local tool'],
  },
  {
    icon: Sparkles,
    title: 'One-shot starters',
    copy: 'Use one plain sentence and see how much a modern model can do without a giant spec.',
    ideas: ['Make a Snake variant', 'Build a timer app', 'Create a quiz game'],
  },
  {
    icon: GitFork,
    title: 'Fork an idea',
    copy: 'Start from a proven path, then change the subject, rules, model, or output format.',
    ideas: ['Snake → stealth game', 'Game → productivity tool', 'HTML artifact → mobile-first'],
  },
  {
    icon: TimerReset,
    title: 'Weekend builds',
    copy: 'Bigger experiments that need a chain, verification, screenshots, and a stronger final page.',
    ideas: ['Budget simulator', 'Study planner', 'Content calendar engine'],
  },
]

const experimentBands = [
  {
    label: 'AI paralysis',
    title: 'You do not need a perfect idea.',
    body: 'Pick something small enough to finish, visible enough to inspect, and weird enough that you actually care whether it works.',
  },
  {
    label: 'Token maxing',
    title: 'Spend the model on output, not setup.',
    body: 'The best first build paths should turn a normal-person ask into a real artifact, then show exactly what happened.',
  },
  {
    label: 'Forkable by default',
    title: 'Every path should suggest a next version.',
    body: 'A good PathForge entry should make you think: I could change one thing and make this mine.',
  },
]

export default async function WhatToBuildPage() {
  const paths = await getPrompts({ sort: 'newest', limit: 4 })
  const featured = paths[0]

  return (
    <div className="bg-surface-50">
      <section className="relative overflow-hidden border-b border-surface-200 bg-white">
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(var(--color-surface-100)_1px,transparent_1px),linear-gradient(90deg,var(--color-surface-100)_1px,transparent_1px)] [background-size:56px_56px]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 border border-surface-200 bg-surface-100 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-600">
              <Moon className="h-3.5 w-3.5 text-brand-orange" />
              For the blank chat moment
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.035em] text-surface-900 sm:text-6xl">
              What to build when AI gives you too many <span className="font-display italic font-normal text-brand-orange">options</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-surface-600">
              This is the anti-paralysis page: simple directions for turning an empty AI screen into a finished artifact, a forkable path, or a build request the community can answer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/paths" className="inline-flex items-center gap-2 bg-brand-orange px-4 py-3 text-sm font-bold text-white hover:bg-brand-orange-dark">
                See real build paths
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/requests" className="inline-flex items-center gap-2 border border-surface-300 bg-white px-4 py-3 text-sm font-bold text-surface-900 hover:border-surface-900">
                Open Build Requests
              </Link>
            </div>
          </div>

          <div className="border border-surface-200 bg-white p-5 text-surface-900 shadow-[10px_10px_0_rgba(232,122,44,0.10)] sm:p-6">
            <div className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-orange">Tonight&apos;s simplest path</div>
            {featured ? (
              <Link href={getProjectHref(featured)} className="block border border-surface-200 bg-primary-50 p-5 transition-colors hover:border-brand-orange">
                <div className="mb-3 inline-flex bg-brand-orange px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                  Approved seed
                </div>
                <h2 className="text-2xl font-black tracking-[-0.025em]">{featured.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-surface-600">{featured.description}</p>
                <div className="mt-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-brand-orange">
                  Open the path
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ) : (
              <div className="border border-dashed border-surface-300 bg-surface-50 p-5 text-sm leading-relaxed text-surface-600">
                No approved paths yet. Once a project clears approval, this slot should point to the most useful starter.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">Pick a lane</div>
            <h2 className="text-3xl font-black tracking-[-0.025em] text-surface-900">Start with the kind of energy you have.</h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-surface-500">
            These are not fake projects. They are starting directions for what PathForge should help users find, fork, or ask the community to build.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {starterLanes.map((lane) => {
            const Icon = lane.icon
            return (
              <article key={lane.title} className="border border-surface-200 bg-white p-5">
                <div className="mb-4 flex h-9 w-9 items-center justify-center bg-primary-50 text-brand-orange ring-1 ring-primary-200">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-black tracking-[-0.015em] text-surface-900">{lane.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-600">{lane.copy}</p>
                <div className="mt-5 space-y-2 border-t border-surface-100 pt-4">
                  {lane.ideas.map(idea => (
                    <div key={idea} className="flex items-center gap-2 text-sm text-surface-700">
                      <span className="h-1.5 w-1.5 bg-brand-orange" />
                      {idea}
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="border-y border-surface-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
          {experimentBands.map(band => (
            <article key={band.label} className="border border-surface-200 bg-surface-50 p-5">
              <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">{band.label}</div>
              <h3 className="text-xl font-black tracking-[-0.02em] text-surface-900">{band.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-surface-600">{band.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-surface-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">Missing the thing?</div>
            <h2 className="text-3xl font-black tracking-[-0.025em] text-surface-900">Ask the community to build it.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-surface-600">
              If this page does not give you the right starter, post a focused Build Request so someone can answer with an actual path, fork, or finished artifact.
            </p>
          </div>
          <Link href="/requests" className="inline-flex shrink-0 items-center justify-center gap-2 bg-brand-orange px-4 py-3 text-sm font-bold text-white hover:bg-brand-orange-dark">
            Open Build Requests
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
