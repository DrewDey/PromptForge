import Link from 'next/link'
import { ArrowRight, GitFork, Users, TrendingUp, Eye } from 'lucide-react'
import { getPrompts } from '@/lib/data'
import PromptCard from '@/components/PromptCard'

/* ─────────────────────────────────────────────────────────
   Iteration 23 (2026-04-16) — Problem-card hierarchy:
   • "Blank Chat Tax" promoted to primary problem: full-width
     card, left accent bar (border-l-4 brand-orange), text-2xl
     black title, text-base body, "The root problem" eyebrow.
   • Three remaining cards ("Hidden Craftsmanship", "Weak
     Reproducibility", "Lost Branches") demoted to supporting
     symptoms in a 3-col grid: text-sm titles, neutral
     surface-400 dot icons (was brand-orange), p-5 (was p-6).
   • Pattern: typography-only hierarchy + accent line on primary
     (Stripe/Apple research), one-dominant + three-peer layout.

   Iteration 22 (2026-04-16) — Screenshot-driven overhaul:
   • Removed all 5 decorative pipe connectors, killed green
     color leak, migrated raw gray-* → surface-* tokens,
     removed tagline chip, solid orange H1, py-20 standardized.
     Cards intentionally remain bg-white per CLAUDE.md.
   ───────────────────────────────────────────────────────── */

export default async function HomePage() {
  const popularPaths = await getPrompts({ sort: 'popular', limit: 6 })

  return (
    <div className="text-surface-900">
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden border-b border-surface-200">
        {/* Subtle grid pattern — strengthened so it's actually visible */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.05] text-surface-900">
            See how it was built.<br />
            <span className="text-brand-orange">Build it yourself.</span>
          </h1>

          <p className="text-lg sm:text-xl text-surface-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Browse real AI projects with every prompt, result, and step visible. Fork what works.
            Skip the blank-chat guesswork.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/browse"
              className="group bg-brand-orange text-white px-8 py-3.5 font-bold text-sm hover:bg-brand-orange-dark focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-colors duration-150 flex items-center gap-2 min-h-11"
            >
              Browse Build Paths
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/prompt/new"
              className="text-sm font-semibold text-surface-600 hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-colors duration-150 flex items-center gap-1.5 px-4 min-h-11"
            >
              or share your build <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ THE PROBLEM ═══════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-3 block">
            The Problem
          </span>
          <h2 className="text-3xl sm:text-4xl font-black mb-3 leading-tight text-surface-900">
            You start from scratch.
          </h2>
          <p className="text-surface-500 text-lg">Every. Single. Time.</p>
        </div>

        {/* Primary problem — "Blank Chat Tax" is the root insight. Given
            typographic weight, a left accent bar, and full width so it
            dominates the Z-scan. The other three cards below read as the
            consequences that follow from it. */}
        <div className="space-y-4">
          <div className="bg-white border border-surface-200 border-l-4 border-l-brand-orange p-6 sm:p-8 hover:border-brand-orange hover:shadow-[4px_4px_0px_0px_rgba(232,122,44,0.15)] focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-150">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
                The root problem
              </span>
            </div>
            <h3 className="font-black text-xl sm:text-2xl text-surface-900 mb-2 leading-tight">
              Blank Chat Tax
            </h3>
            <p className="text-base text-surface-600 leading-relaxed max-w-2xl">
              You open a new chat, stare at the cursor, and rebuild something someone
              else already figured out &mdash; every single time.
            </p>
          </div>

          {/* Supporting symptoms — three consequences of the root problem.
              Peer-weighted to each other, but visibly subordinate to the
              primary card above (smaller type, no accent bar, 3-col grid). */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-surface-200 p-5 hover:border-brand-orange hover:shadow-[4px_4px_0px_0px_rgba(232,122,44,0.15)] focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-150">
              <h3 className="font-bold text-sm text-surface-900 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-surface-400 inline-block flex-shrink-0" aria-hidden="true" />
                Hidden Craftsmanship
              </h3>
              <p className="text-sm text-surface-500 leading-relaxed">
                The best AI work is buried in private chats, screenshots, and memory. Nobody else can learn from it.
              </p>
            </div>
            <div className="bg-white border border-surface-200 p-5 hover:border-brand-orange hover:shadow-[4px_4px_0px_0px_rgba(232,122,44,0.15)] focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-150">
              <h3 className="font-bold text-sm text-surface-900 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-surface-400 inline-block flex-shrink-0" aria-hidden="true" />
                Weak Reproducibility
              </h3>
              <p className="text-sm text-surface-500 leading-relaxed">
                You see a great result but can&apos;t see how it was built well enough to recreate it.
              </p>
            </div>
            <div className="bg-white border border-surface-200 p-5 hover:border-brand-orange hover:shadow-[4px_4px_0px_0px_rgba(232,122,44,0.15)] focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-150">
              <h3 className="font-bold text-sm text-surface-900 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-surface-400 inline-block flex-shrink-0" aria-hidden="true" />
                Lost Branches
              </h3>
              <p className="text-sm text-surface-500 leading-relaxed">
                The detours and alternative paths that taught you what works are thrown away instead of shared.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ THE SOLUTION ═══════════ */}
      <section className="border-t border-surface-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-blue mb-3 block">
              The Solution
            </span>
            <h2 className="text-3xl sm:text-4xl font-black mb-4 text-surface-900">
              Build paths, not prompts.
            </h2>
            <p className="text-surface-500 max-w-2xl mx-auto leading-relaxed">
              A build path captures the full journey from blank chat to useful result &mdash;
              the prompts, the outputs, the sequence, the branches. Everything someone needs
              to fork it and get their own result.
            </p>
          </div>

          {/* Flow diagram — simplified, brand-only colors, no green, consistent weight */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-0 py-2 overflow-x-auto">
            {/* Step 1: Start (neutral) */}
            <div className="bg-surface-50 border border-surface-200 px-5 py-4 text-center flex-shrink-0 min-w-[108px]">
              <p className="text-[10px] text-surface-400 uppercase tracking-wider mb-1">Start</p>
              <p className="font-black text-sm text-surface-900">Blank Chat</p>
            </div>
            <FlowConnector color="surface" direction="to-orange" />
            {/* Step 2: Build Path (orange — the product) */}
            <div className="bg-brand-orange/5 border-2 border-brand-orange px-5 py-4 text-center flex-shrink-0 min-w-[108px]">
              <p className="text-[10px] text-brand-orange uppercase tracking-wider mb-1">Share</p>
              <p className="font-black text-sm text-surface-900">Build Path</p>
            </div>
            <FlowConnector color="orange" />
            {/* Step 3: Fork (blue) */}
            <div className="bg-brand-blue/5 border-2 border-brand-blue px-5 py-4 text-center flex-shrink-0 min-w-[108px]">
              <p className="text-[10px] text-brand-blue uppercase tracking-wider mb-1">Copy</p>
              <p className="font-black text-sm text-surface-900">Fork</p>
            </div>
            <FlowConnector color="blue" direction="to-surface" />
            {/* Step 4: Adapt (neutral) */}
            <div className="bg-surface-50 border border-surface-200 px-5 py-4 text-center flex-shrink-0 min-w-[108px]">
              <p className="text-[10px] text-surface-400 uppercase tracking-wider mb-1">Customize</p>
              <p className="font-black text-sm text-surface-900">Adapt</p>
            </div>
            <FlowConnector color="surface" direction="to-orange" />
            {/* Step 5: Result (orange — closing the loop, echoes Build Path) */}
            <div className="bg-brand-orange/10 border-2 border-brand-orange px-5 py-4 text-center flex-shrink-0 min-w-[108px]">
              <p className="text-[10px] text-brand-orange uppercase tracking-wider mb-1">Done</p>
              <p className="font-black text-sm text-surface-900">Result</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ WHY IT WORKS ═══════════ */}
      <section className="border-t border-surface-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-3 block">
              Why It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-surface-900">Built for real workflows</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-surface-200 p-6 hover:border-brand-orange hover:shadow-[4px_4px_0px_0px_rgba(232,122,44,0.15)] focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-150 group">
              <div className="w-10 h-10 bg-brand-orange/10 flex items-center justify-center mb-4 group-hover:bg-brand-orange/20 transition-colors duration-150">
                <Eye className="w-5 h-5 text-brand-orange" />
              </div>
              <h3 className="font-bold mb-2 text-surface-900">See Every Step</h3>
              <p className="text-sm text-surface-500 leading-relaxed">
                Not just the final prompt &mdash; the full sequence. Each step shows the prompt used and the result it produced.
              </p>
            </div>
            <div className="bg-white border border-surface-200 p-6 hover:border-brand-blue hover:shadow-[4px_4px_0px_0px_rgba(59,143,228,0.15)] focus-visible:outline-2 focus-visible:outline-brand-blue focus-visible:outline-offset-2 transition-all duration-150 group">
              <div className="w-10 h-10 bg-brand-blue/10 flex items-center justify-center mb-4 group-hover:bg-brand-blue/20 transition-colors duration-150">
                <GitFork className="w-5 h-5 text-brand-blue" />
              </div>
              <h3 className="font-bold mb-2 text-surface-900">Fork &amp; Adapt</h3>
              <p className="text-sm text-surface-500 leading-relaxed">
                Every build path is forkable. Take someone&apos;s proven process, customize it for your context, and publish your version.
              </p>
            </div>
            <div className="bg-white border border-surface-200 p-6 hover:border-brand-orange hover:shadow-[4px_4px_0px_0px_rgba(232,122,44,0.15)] focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-150 group">
              <div className="w-10 h-10 bg-brand-orange/10 flex items-center justify-center mb-4 group-hover:bg-brand-orange/20 transition-colors duration-150">
                <TrendingUp className="w-5 h-5 text-brand-orange" />
              </div>
              <h3 className="font-bold mb-2 text-surface-900">Proven Results</h3>
              <p className="text-sm text-surface-500 leading-relaxed">
                Every path shows real outcomes &mdash; actual outputs, what worked, what didn&apos;t. No guessing if it&apos;ll work for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ POPULAR BUILD PATHS ═══════════ */}
      <section className="border-t border-surface-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-2 block">
                Explore
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-surface-900">Popular Build Paths</h2>
              <p className="text-sm text-surface-500 mt-2">Real projects built with AI &mdash; see the full process</p>
            </div>
            <Link
              href="/browse?sort=popular"
              className="group text-sm font-semibold text-surface-700 border border-surface-300 bg-white px-4 py-2.5 hover:bg-surface-50 hover:border-surface-400 active:bg-surface-100 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-150 flex items-center gap-1.5 flex-shrink-0 w-fit min-h-11"
            >
              View all paths
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularPaths.map((path, idx) => (
              <div key={path.id} className="animate-card-slide-in" style={{ animationDelay: `${idx * 80}ms` }}>
                <PromptCard prompt={path} />
              </div>
            ))}
          </div>
          {popularPaths.length === 0 && (
            <div className="text-center py-16 border border-dashed border-surface-300 bg-surface-50">
              <p className="text-surface-600 mb-3 font-medium">No build paths yet</p>
              <Link
                href="/prompt/new"
                className="inline-flex items-center gap-1.5 text-brand-orange hover:text-brand-orange-dark text-sm font-bold px-4 py-2.5 border border-brand-orange/30 bg-brand-orange/5 hover:bg-brand-orange/10 active:bg-brand-orange/15 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-150 min-h-11"
              >
                Be the first to share one <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="border-t border-surface-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="w-12 h-12 bg-brand-orange/10 flex items-center justify-center mx-auto mb-6">
            <Users className="w-6 h-6 text-brand-orange" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-surface-900">
            Stop rebuilding from scratch.
          </h2>
          <p className="text-surface-500 mb-8 max-w-lg mx-auto leading-relaxed">
            Join PathForge and start using proven AI build paths created by people who already figured it out.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/signup"
              className="group bg-brand-orange text-white px-8 py-3.5 font-bold text-sm hover:bg-brand-orange-dark focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-colors duration-150 inline-flex items-center gap-2 min-h-11"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/browse"
              className="text-sm font-semibold text-surface-600 hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-colors duration-150 px-4 min-h-11 flex items-center"
            >
              or browse paths first
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

/* Small helper to keep the flow diagram connectors consistent and free of green */
function FlowConnector({
  color,
  direction,
}: {
  color: 'surface' | 'orange' | 'blue'
  direction?: 'to-orange' | 'to-surface' | 'to-blue'
}) {
  const lineClass =
    color === 'orange'
      ? 'bg-brand-orange'
      : color === 'blue'
      ? direction === 'to-surface'
        ? 'bg-gradient-to-r from-brand-blue to-surface-300'
        : 'bg-brand-blue'
      : direction === 'to-orange'
      ? 'bg-gradient-to-r from-surface-300 to-brand-orange'
      : 'bg-surface-300'

  const verticalClass =
    color === 'orange'
      ? 'bg-brand-orange'
      : color === 'blue'
      ? direction === 'to-surface'
        ? 'bg-gradient-to-b from-brand-blue to-surface-300'
        : 'bg-brand-blue'
      : direction === 'to-orange'
      ? 'bg-gradient-to-b from-surface-300 to-brand-orange'
      : 'bg-surface-300'

  return (
    <>
      <div className="hidden sm:flex items-center">
        <div className={`h-0.5 w-8 ${lineClass}`} />
      </div>
      <div className="sm:hidden flex justify-center">
        <div className={`w-0.5 h-5 ${verticalClass}`} />
      </div>
    </>
  )
}
