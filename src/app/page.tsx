import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, GitFork, Zap, Users, TrendingUp } from 'lucide-react'
import { getPrompts } from '@/lib/data'
import PromptCard from '@/components/PromptCard'

export default async function HomePage() {
  const popularPaths = await getPrompts({ sort: 'popular', limit: 6 })

  return (
    <div className="bg-surface-900 text-white">
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          <Image src="/logo.png" alt="PathForge" width={280} height={80} className="mx-auto mb-8" priority />

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
            Steal a proven path.<br />
            <span className="bg-gradient-to-r from-brand-orange to-brand-orange-light bg-clip-text text-transparent">
              Get results faster.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            PathForge is where successful AI work becomes reusable.
            Browse proven build paths, fork them, adapt them to your needs,
            and skip the blank-chat guesswork.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/browse"
              className="bg-brand-orange text-white px-8 py-3.5 font-semibold text-sm hover:bg-brand-orange-dark transition-colors flex items-center gap-2"
            >
              Browse Build Paths
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/signup"
              className="border border-surface-600 text-gray-300 px-8 py-3.5 font-semibold text-sm hover:border-brand-blue hover:text-brand-blue transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ PIPE: Hero → Problem ═══════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex">
          <div className="w-16 flex flex-col items-center">
            <div className="w-1 h-20 bg-gradient-to-b from-brand-orange to-brand-blue" />
            <div className="w-3 h-3 bg-brand-blue border-2 border-brand-blue" />
          </div>
        </div>
      </div>

      {/* ═══════════ THE PROBLEM ═══════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex gap-8">
          {/* Pipe running down the left side */}
          <div className="w-16 flex-shrink-0 flex flex-col items-center">
            <div className="w-1 flex-1 bg-brand-blue" />
          </div>

          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-3 block">The Problem</span>
            <h2 className="text-3xl sm:text-4xl font-black mb-6">
              You start from scratch.<br />
              <span className="text-gray-500">Every. Single. Time.</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-800 border border-surface-600 p-5">
                <h3 className="font-bold text-sm text-brand-orange mb-2">Blank Chat Tax</h3>
                <p className="text-sm text-gray-400">You open a new chat, stare at the cursor, and rebuild something someone else already figured out.</p>
              </div>
              <div className="bg-surface-800 border border-surface-600 p-5">
                <h3 className="font-bold text-sm text-brand-orange mb-2">Hidden Craftsmanship</h3>
                <p className="text-sm text-gray-400">The best AI work is buried in private chats, screenshots, and memory. Nobody else can use it.</p>
              </div>
              <div className="bg-surface-800 border border-surface-600 p-5">
                <h3 className="font-bold text-sm text-brand-orange mb-2">Weak Reproducibility</h3>
                <p className="text-sm text-gray-400">You see a great result but can&apos;t see how it was built well enough to recreate it.</p>
              </div>
              <div className="bg-surface-800 border border-surface-600 p-5">
                <h3 className="font-bold text-sm text-brand-orange mb-2">Lost Branches</h3>
                <p className="text-sm text-gray-400">The detours and alternative paths that taught you what works are thrown away instead of shared.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PIPE: Turn right ═══════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex">
          <div className="w-16 flex flex-col items-center">
            <div className="w-1 h-8 bg-brand-blue" />
          </div>
        </div>
        <div className="ml-[31px] h-1 w-32 bg-gradient-to-r from-brand-blue to-brand-orange" />
        <div className="ml-[159px]">
          <div className="w-1 h-8 bg-brand-orange" />
        </div>
      </div>

      {/* ═══════════ THE SOLUTION ═══════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue mb-3 block">The Solution</span>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Build paths, not prompts.
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            A build path captures the full journey from blank chat to useful result —
            the inputs, the sequence, the branches, the outputs. Everything someone needs
            to fork it, adapt it, and get their own result faster.
          </p>
        </div>

        {/* Flow diagram */}
        <div className="flex items-center justify-center gap-0 overflow-x-auto py-4">
          <div className="bg-surface-700 border border-surface-500 px-4 py-3 text-center flex-shrink-0">
            <p className="text-xs text-gray-500 mb-1">Start</p>
            <p className="font-bold text-sm">Blank Chat</p>
          </div>
          <div className="h-1 w-8 bg-gradient-to-r from-surface-500 to-brand-orange flex-shrink-0" />
          <div className="bg-brand-orange/10 border-2 border-brand-orange px-4 py-3 text-center flex-shrink-0">
            <p className="text-xs text-brand-orange mb-1">Share</p>
            <p className="font-bold text-sm">Build Path</p>
          </div>
          <div className="h-1 w-8 bg-brand-orange flex-shrink-0" />
          <div className="bg-surface-700 border border-brand-blue px-4 py-3 text-center flex-shrink-0">
            <p className="text-xs text-brand-blue mb-1">Copy</p>
            <p className="font-bold text-sm">Fork</p>
          </div>
          <div className="h-1 w-8 bg-gradient-to-r from-brand-blue to-brand-orange flex-shrink-0" />
          <div className="bg-surface-700 border border-surface-500 px-4 py-3 text-center flex-shrink-0">
            <p className="text-xs text-gray-500 mb-1">Customize</p>
            <p className="font-bold text-sm">Adapt</p>
          </div>
          <div className="h-1 w-8 bg-gradient-to-r from-surface-500 to-green-500 flex-shrink-0" />
          <div className="bg-green-500/10 border-2 border-green-500 px-4 py-3 text-center flex-shrink-0">
            <p className="text-xs text-green-400 mb-1">Done</p>
            <p className="font-bold text-sm">Result</p>
          </div>
        </div>
      </section>

      {/* ═══════════ PIPE: down to features ═══════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="w-1 h-16 bg-gradient-to-b from-brand-orange to-brand-blue" />
      </div>

      {/* ═══════════ WHY IT WORKS ═══════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-800 border border-surface-600 p-6 hover:border-brand-orange transition-colors">
            <div className="w-10 h-10 bg-brand-orange/10 flex items-center justify-center mb-4">
              <GitFork className="w-5 h-5 text-brand-orange" />
            </div>
            <h3 className="font-bold mb-2">Fork & Adapt</h3>
            <p className="text-sm text-gray-400">
              Every build path is forkable. Take someone&apos;s proven process, customize it for your context, and publish your version.
            </p>
          </div>
          <div className="bg-surface-800 border border-surface-600 p-6 hover:border-brand-blue transition-colors">
            <div className="w-10 h-10 bg-brand-blue/10 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-brand-blue" />
            </div>
            <h3 className="font-bold mb-2">See Every Step</h3>
            <p className="text-sm text-gray-400">
              Not just the final prompt — the full sequence. Each step shows the prompt used and the result it produced.
            </p>
          </div>
          <div className="bg-surface-800 border border-surface-600 p-6 hover:border-green-500 transition-colors">
            <div className="w-10 h-10 bg-green-500/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-bold mb-2">Proven Results</h3>
            <p className="text-sm text-gray-400">
              Every path shows real outcomes — metrics, outputs, what actually worked. No guessing if it&apos;ll work for you.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ PIPE: down to paths ═══════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="w-1 h-12 bg-gradient-to-b from-brand-blue to-brand-orange" />
        <div className="sr-only">Connecting to popular paths</div>
      </div>

      {/* ═══════════ POPULAR BUILD PATHS ═══════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-2 block">Explore</span>
            <h2 className="text-2xl sm:text-3xl font-black">Popular Build Paths</h2>
          </div>
          <Link
            href="/browse?sort=popular"
            className="text-brand-blue hover:text-brand-blue-light text-sm font-semibold flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {popularPaths.map((path, idx) => (
            <div key={path.id} className="animate-card-slide-in" style={{ animationDelay: `${idx * 80}ms` }}>
              <PromptCard prompt={path} />
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ PIPE: down to CTA ═══════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="w-1 h-16 bg-gradient-to-b from-brand-orange to-brand-blue" />
      </div>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="border-t border-surface-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="w-12 h-12 bg-brand-orange/10 flex items-center justify-center mx-auto mb-6">
            <Users className="w-6 h-6 text-brand-orange" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Stop rebuilding from scratch.
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Join PathForge and start using proven AI build paths created by people who already figured it out.
          </p>
          <Link
            href="/auth/signup"
            className="bg-brand-orange text-white px-10 py-4 font-bold text-sm hover:bg-brand-orange-dark transition-colors inline-block"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  )
}
