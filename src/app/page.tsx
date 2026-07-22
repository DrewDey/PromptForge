import type { Metadata } from 'next'
import { HomeBuildMosaic } from '@/components/home/HomeBuildMosaic'
import { HomeHero } from '@/components/home/HomeHero'
import { HomeProcess } from '@/components/home/HomeProcess'
import { HomeSupportRoutes } from '@/components/home/HomeSupportRoutes'
import { getCategories, getPrompts } from '@/lib/data'
import {
  START_HERE_PROJECT_IDS,
  buildPathDiscoveryCatalog,
  newestOrder,
  recommendedOrder,
  selectCuratedItems,
} from '@/lib/path-discovery'
import { canonicalMetadata } from '@/lib/site-url'
import './browse.css'
import './home.css'

export const metadata: Metadata = {
  title: 'PathForge — Explore Real AI Build Paths',
  description: 'Open finished AI projects, inspect the exact prompts and responses behind them, compare model runs, and fork a path into your own work.',
  ...canonicalMetadata('/'),
}

export default async function HomePage() {
  const [categories, prompts] = await Promise.all([
    getCategories(),
    getPrompts({ sort: 'newest', limit: 300 }),
  ])
  const catalog = buildPathDiscoveryCatalog(prompts, categories)
  const recommended = recommendedOrder(catalog)
  const workingProjects = recommended.filter((item) => item.hasWorkingArtifact)
  const featurePool = workingProjects.length > 0 ? workingProjects : recommended
  const featured = selectCuratedItems(featurePool, START_HERE_PROJECT_IDS, 1)[0]
  const recentPool = newestOrder(workingProjects.length > 0 ? workingProjects : recommended)
  const recent = recentPool.filter((item) => item.id !== featured?.id).slice(0, 4)

  return (
    <div className="pf-home-next">
      <HomeHero pathCount={catalog.length} featured={featured} />
      {recent.length > 0 && <HomeBuildMosaic items={recent} />}
      <HomeProcess />
      <HomeSupportRoutes />
    </div>
  )
}
