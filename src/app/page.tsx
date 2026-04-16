import Link from 'next/link'
import { ArrowRight, GitFork, Users, TrendingUp, ChevronRight, Sparkles, Eye } from 'lucide-react'
import { getPrompts } from '@/lib/data'
import PromptCard from '@/components/PromptCard'

/* ─────────────────────────────────────────────────────────
   Design Brief (Iteration 12):
   1. Popular Paths: responsive header, fix grid spacing, stronger "View all", mobile empty state
   2. Mobile touch: active states on cards, 44px secondary CTA tap targets
   3. Left sidebar: mobile accent replacement, consistent section spacing
   ───────────────────────────────────────────────────────── */

export default async function HomePage() {
  const popularPaths = await getPrompts({ sort: 'popular', limit: 6 })

  return (
    <div className="bg-white text-gray-900">
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-orange-50/30" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          {/* Tagline chip — de-emphasized to let headline dominate */}
          <div className="inline-flex items-center gap-2 border border-gray-200 bg-gray-50 px-4 py-1.5 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 tracking-wide uppercase">Community-driven AI project sharing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
            See how it was built.<br />
            <span className="bg-gradient-to-r from-brand-orange to-brand-orange-light bg-clip-text text-transparent">
              Build it yourself.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto mb-6 leading-relaxed">
            Browse real AI projects with every prompt, result, and step visible.
          </p>
          <p className="text-base text-gray-400 max-w-lg mx-auto mb-12 leading-relaxed">
            Fork what works. Skip the blank-chat guesswork.
          </p>

          {/* CTA hierarchy: clear primary + secondary */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/browse"
              className="group bg-brand-orange text-white px-10 py-4 font-bold text-sm hover:bg-brand-orange-dark transition-colors duration-200 flex items-center gap-2"
            >
              Browse Build Paths
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/prompt/new"
              className="text-sm font-semibold text-gray-500 hover:text-brand-orange transition-colors duration-200 flex items-center gap-1.5 px-4 py-3"
            >
              or share your build <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ PIPE: Hero → Problem ═══════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-12 bg-gradient-to-b from-gray-200 to-brand-orange opacity-60" />
            <div className="w-2.5 h-2.5 bg-brand-orange animate-pulse-subtle" />
          </div>
        </div>
      </div>

      {/* ═══════════ THE PROBLEM ═══════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex gap-6 lg:gap-10">
          {/* Pipe running down the left side (desktop) / top accent bar (mobile) */}
          <div className="w-8 flex-shrink-0 hidden sm:flex flex-col items-center">
            <div className="w-0.5 flex-1 bg-gradient-to-b from-brand-orange via-brand-orange/50 to-brand-blue opacity-40" />
          </div>

          <div className="flex-1 border-t-2 border-brand-orange sm:border-t-0 pt-4 sm:pt-0">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-3 block">The Problem</span>
            <h2 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">
              You start from scratch.
            </h2>
            <p className="text-gray-400 text-lg mb-8">Every. Single. Time.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 p-5 hover:border-brand-orange hover:shadow-[4px_4px_0px_0px_rgba(232,122,44,0.15)] focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-200 group">
                <h3 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-brand-orange inline-block flex-shrink-0" />
                  Blank Chat Tax
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">You open a new chat, stare at the cursor, and rebuild something someone else already figured out.</p>
              </div>
              <div className="bg-white border border-gray-200 p-5 hover:border-brand-orange hover:shadow-[4px_4px_0px_0px_rgba(232,122,44,0.15)] focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-200 group">
                <h3 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-brand-orange inline-block flex-shrink-0" />
                  Hidden Craftsmanship
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">The best AI work is buried in private chats, screenshots, and memory. Nobody else can learn from it.</p>
              </div>
              <div className="bg-white border border-gray-200 p-5 hover:border-brand-orange hover:shadow-[4px_4px_0px_0px_rgba(232,122,44,0.15)] focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-200 group">
                <h3 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-brand-orange inline-block flex-shrink-0" />
                  Weak Reproducibility
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">You see a great result but can&apos;t see how it was built well enough to recreate it.</p>
              </div>
              <div className="bg-white border border-gray-200 p-5 hover:border-brand-orange hover:shadow-[4px_4px_0px_0px_rgba(232,122,44,0.15)] focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-200 group">
                <h3 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-brand-orange inline-block flex-shrink-0" />
                  Lost Branches
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">The detours and alternative paths that taught you what works are thrown away instead of shared.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PIPE: Problem → Solution ═══════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 bg-brand-blue animate-pulse-subtle" />
            <div className="w-0.5 h-12 bg-brand-blue/40" />
          </div>
        </div>
      </div>

      {/* ═══════════ THE SOLUTION ═══════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue mb-3 block">The Solution</span>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Build paths, not prompts.
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
            A build path captures the full journey from blank chat to useful result &mdash;
            the prompts, the outputs, the sequence, the branches. Everything someone needs
            to fork it and get their own result.
          </p>
        </div>

        {/* Flow diagram — enhanced with directional connectors */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-0 py-4 overflow-x-auto">
          {/* Step 1: Start */}
          <div className="bg-gray-50 border border-gray-200 px-5 py-4 text-center flex-shrink-0 min-w-[100px]">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Start</p>
            <p className="font-black text-sm text-gray-900">Blank Chat</p>
          </div>
          {/* Connector */}
          <div className="hidden sm:flex items-center">
            <div className="h-0.5 w-10 bg-gradient-to-r from-gray-300 to-brand-orange relative">
              <ChevronRight className="w-4 h-4 text-brand-orange absolute -right-2 -top-[7px]" />
            </div>
          </div>
          <div className="sm:hidden flex justify-center">
            <div className="w-0.5 h-6 bg-gradient-to-b from-gray-300 to-brand-orange" />
          </div>
          {/* Step 2: Build Path */}
          <div className="bg-brand-orange/5 border-2 border-brand-orange px-5 py-4 text-center flex-shrink-0 min-w-[100px] relative">
            <p className="text-[10px] text-brand-orange uppercase tracking-wider mb-1">Share</p>
            <p className="font-black text-sm text-gray-900">Build Path</p>
          </div>
          {/* Connector */}
          <div className="hidden sm:flex items-center">
            <div className="h-0.5 w-10 bg-brand-orange relative">
              <ChevronRight className="w-4 h-4 text-brand-orange absolute -right-2 -top-[7px]" />
            </div>
          </div>
          <div className="sm:hidden flex justify-center">
            <div className="w-0.5 h-6 bg-brand-orange" />
          </div>
          {/* Step 3: Fork */}
          <div className="bg-brand-blue/5 border-2 border-brand-blue px-5 py-4 text-center flex-shrink-0 min-w-[100px]">
            <p className="text-[10px] text-brand-blue uppercase tracking-wider mb-1">Copy</p>
            <p className="font-black text-sm text-gray-900">Fork</p>
          </div>
          {/* Connector */}
          <div className="hidden sm:flex items-center">
            <div className="h-0.5 w-10 bg-gradient-to-r from-brand-blue to-gray-400 relative">
              <ChevronRight className="w-4 h-4 text-gray-400 absolute -right-2 -top-[7px]" />
            </div>
          </div>
          <div className="sm:hidden flex justify-center">
            <div className="w-0.5 h-6 bg-gradient-to-b from-brand-blue to-gray-400" />
          </div>
          {/* Step 4: Adapt */}
          <div className="bg-gray-50 border border-gray-200 px-5 py-4 text-center flex-shrink-0 min-w-[100px]">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Customize</p>
            <p className="font-black text-sm text-gray-900">Adapt</p>
          </div>
          {/* Connector */}
          <div className="hidden sm:flex items-center">
            <div className="h-0.5 w-10 bg-gradient-to-r from-gray-300 to-green-500 relative">
              <ChevronRight className="w-4 h-4 text-green-500 absolute -right-2 -top-[7px]" />
            </div>
          </div>
          <div className="sm:hidden flex justify-center">
            <div className="w-0.5 h-6 bg-gradient-to-b from-gray-300 to-green-500" />
          </div>
          {/* Step 5: Result */}
          <div className="bg-green-50 border-2 border-green-400 px-5 py-4 text-center flex-shrink-0 min-w-[100px]">
            <p className="text-[10px] text-green-600 uppercase tracking-wider mb-1">Done</p>
            <p className="font-black text-sm text-gray-900">Result</p>
          </div>
        </div>
      </section>

      {/* ═══════════ PIPE: Solution → Features ═══════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="flex flex-col items-center">
          <div className="w-0.5 h-6 bg-brand-orange/40" />
          <div className="w-2.5 h-2.5 bg-brand-orange animate-pulse-subtle" />
          <div className="w-0.5 h-6 bg-brand-orange/40" />
        </div>
      </div>

      {/* ═══════════ WHY IT WORKS ═══════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-3 block">Why It Works</span>
          <h2 className="text-3xl sm:text-4xl font-black">Built for real workflows</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 p-6 hover:border-brand-orange hover:shadow-[4px_4px_0px_0px_rgba(232,122,44,0.15)] focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-200 group">
            <div className="w-10 h-10 bg-brand-orange/10 flex items-center justify-center mb-4 group-hover:bg-brand-orange/20 transition-colors duration-200">
              <Eye className="w-5 h-5 text-brand-orange" />
            </div>
            <h3 className="font-bold mb-2 text-gray-900">See Every Step</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Not just the final prompt &mdash; the full sequence. Each step shows the prompt used and the result it produced.
            </p>
          </div>
          <div className="bg-white border border-gray-200 p-6 hover:border-brand-blue hover:shadow-[4px_4px_0px_0px_rgba(59,143,228,0.15)] focus-visible:outline-2 focus-visible:outline-brand-blue focus-visible:outline-offset-2 transition-all duration-200 group">
            <div className="w-10 h-10 bg-brand-blue/10 flex items-center justify-center mb-4 group-hover:bg-brand-blue/20 transition-colors duration-200">
              <GitFork className="w-5 h-5 text-brand-blue" />
            </div>
            <h3 className="font-bold mb-2 text-gray-900">Fork & Adapt</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Every build path is forkable. Take someone&apos;s proven process, customize it for your context, and publish your version.
            </p>
          </div>
          <div className="bg-white border border-gray-200 p-6 hover:border-green-500 hover:shadow-[4px_4px_0px_0px_rgba(34,197,94,0.15)] focus-visible:outline-2 focus-visible:outline-green-500 focus-visible:outline-offset-2 transition-all duration-200 group">
            <div className="w-10 h-10 bg-green-500/10 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors duration-200">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-bold mb-2 text-gray-900">Proven Results</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Every path shows real outcomes &mdash; actual outputs, what worked, what didn&apos;t. No guessing if it&apos;ll work for you.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ PIPE: Features → Popular Paths ═══════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="flex flex-col items-center">
          <div className="w-0.5 h-5 bg-brand-blue/40" />
          <div className="w-2.5 h-2.5 bg-brand-blue animate-pulse-subtle" />
          <div className="w-0.5 h-5 bg-brand-blue/40" />
        </div>
      </div>

      {/* ═══════════ POPULAR BUILD PATHS ═══════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="border-l-4 border-brand-orange pl-4">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-2 block">Explore</span>
            <h2 className="text-3xl sm:text-4xl font-black">Popular Build Paths</h2>
            <p className="text-sm text-gray-400 mt-1">Real projects built with AI &mdash; see the full process</p>
          </div>
          <Link
            href="/browse?sort=popular"
            className="group text-sm font-semibold text-brand-blue border border-brand-blue/30 bg-brand-blue/5 px-4 py-2 hover:bg-brand-blue/10 hover:border-brand-blue/50 active:bg-brand-blue/15 focus-visible:outline-2 focus-visible:outline-brand-blue focus-visible:outline-offset-2 transition-all duration-200 flex items-center gap-1.5 flex-shrink-0 w-fit"
          >
            View all paths <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
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
          <div className="text-center py-10 sm:py-16 border border-dashed border-gray-300 bg-gray-50/50">
            <p className="text-gray-500 mb-3 font-medium">No build paths yet</p>
            <Link href="/prompt/new" className="inline-flex items-center gap-1.5 text-brand-orange hover:text-brand-orange-dark text-sm font-bold px-4 py-2 border border-brand-orange/30 bg-brand-orange/5 hover:bg-brand-orange/10 active:bg-brand-orange/15 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-all duration-200">
              Be the first to share one <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* ═══════════ PIPE: Paths → CTA ═══════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="flex flex-col items-center">
          <div className="w-0.5 h-5 bg-brand-orange/40" />
          <div className="w-2.5 h-2.5 bg-brand-orange animate-pulse-subtle" />
          <div className="w-0.5 h-5 bg-brand-orange/40" />
        </div>
      </div>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="w-12 h-12 bg-brand-orange/10 flex items-center justify-center mx-auto mb-6">
            <Users className="w-6 h-6 text-brand-orange" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Stop rebuilding from scratch.
          </h2>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto leading-relaxed">
            Join PathForge and start using proven AI build paths created by people who already figured it out.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="group bg-brand-orange text-white px-10 py-4 font-bold text-sm hover:bg-brand-orange-dark transition-colors duration-200 inline-flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/browse"
              className="text-sm font-semibold text-gray-500 hover:text-brand-blue transition-colors duration-200 px-4 py-3"
            >
              or browse paths first
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
