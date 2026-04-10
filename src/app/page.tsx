import Link from 'next/link'
import { ArrowRight, Lightbulb, Share2, Search } from 'lucide-react'
import { getCategories, getPrompts } from '@/lib/data'
import PromptCard from '@/components/PromptCard'
import CategoryCard from '@/components/CategoryCard'

export default async function HomePage() {
  const [categories, featuredPrompts] = await Promise.all([
    getCategories(),
    getPrompts({ sort: 'popular', limit: 6 }),
  ])

  return (
    <div>
      {/* Hero */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            Discover AI Prompts<br />
            <span className="text-primary-600">That Actually Work</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            From simple one-liners to multi-step workflows — find, share, and build
            with prompts organized by what you actually need them for.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/browse"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              Browse Prompts
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/prompt/new"
              className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Submit a Prompt
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="font-semibold mb-2">Browse</h3>
            <p className="text-sm text-gray-600">
              Find prompts by category, difficulty, or search. From finance to coding, we&apos;ve got you covered.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="font-semibold mb-2">Use</h3>
            <p className="text-sm text-gray-600">
              Copy the prompt, paste it into your favorite AI tool, and get results immediately. It&apos;s that simple.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Share2 className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="font-semibold mb-2">Share</h3>
            <p className="text-sm text-gray-600">
              Submit your own prompts and workflows. Help others discover what&apos;s possible with AI.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Prompts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Popular Prompts</h2>
          <Link href="/browse?sort=popular" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredPrompts.map(prompt => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-center mb-8">Browse by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categories.map(category => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to forge something new?
          </h2>
          <p className="text-primary-100 mb-8 max-w-lg mx-auto">
            Join the community and start sharing prompts that help people get real value from AI.
          </p>
          <Link
            href="/auth/signup"
            className="bg-white text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors inline-block"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  )
}
