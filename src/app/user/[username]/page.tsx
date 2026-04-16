import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Calendar, ArrowUp, Bookmark, Layers, Award, Plus } from 'lucide-react'
import { getProfileByUsername, getProjectsByAuthor, getAuthorStats } from '@/lib/data'
import PromptCard from '@/components/PromptCard'

/**
 * User profile page.
 *
 * Design direction (iteration 25, 2026-04-16):
 * - Replaced gradient-banner + centered-avatar SaaS header with a dev-tool
 *   identity row (square brand-orange monogram + inline Linear-style meta line).
 * - Stat tiles left-aligned, icon+label row on top, big numeric value below
 *   (GitHub profile cadence). Subtle hover on borders for affordance parity
 *   with PromptCard.
 * - Section heading upgraded from `text-lg font-semibold` to `text-xl font-bold`
 *   (stronger page-level hierarchy; browse page uses a different in-grid label
 *   pattern so this isn't strict parity, but the direction is aligned).
 * - Empty-state CTA aligned to landing primary button spec
 *   (font-bold, duration-150, min-h-11, focus-visible outline).
 * - Full `gray-*` / raw `bg-white` → `surface-*` migration; last public-facing
 *   page with palette drift per iteration 24 log.
 */
export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const profile = await getProfileByUsername(username)

  if (!profile) notFound()

  const [projects, stats] = await Promise.all([
    getProjectsByAuthor(profile.id),
    getAuthorStats(profile.id),
  ])

  const joinDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  const displayName = profile.display_name || profile.username
  const monogram = (displayName || '?').charAt(0).toUpperCase()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Identity row — dev-tool profile header (replaces gradient banner pattern) */}
      <section className="bg-white border border-surface-200 p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">
          {/* Square monogram avatar — sharp corners, brand-orange tile */}
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-orange flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <span className="text-2xl sm:text-3xl font-black text-white">
              {monogram}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-surface-900 leading-tight">
              {displayName}
            </h1>
            <p className="text-sm text-surface-500 font-medium mt-0.5">
              @{profile.username}
            </p>
            {profile.bio && (
              <p className="text-[15px] text-surface-700 mt-3 max-w-2xl leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Inline meta line (Linear pattern) — single scan line, not a chip cloud */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-xs text-surface-500">
              {joinDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  Joined {joinDate}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                {stats.totalProjects} {stats.totalProjects === 1 ? 'project' : 'projects'}
              </span>
              {stats.topCategory && (
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" aria-hidden="true" />
                  Top: <span aria-hidden="true">{stats.topCategory.icon}</span>{' '}
                  <span className="text-surface-700 font-medium">{stats.topCategory.name}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stat tiles — GitHub-cadence: left-aligned label row, big numeric value below */}
      <section className="grid grid-cols-3 gap-3 sm:gap-4 mb-10" aria-label="Profile statistics">
        <StatTile icon={<Layers className="w-3.5 h-3.5" aria-hidden="true" />} label="Projects" value={stats.totalProjects} />
        <StatTile icon={<ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />} label="Upvotes" value={stats.totalUpvotes} accent />
        <StatTile icon={<Bookmark className="w-3.5 h-3.5" aria-hidden="true" />} label="Saves" value={stats.totalBookmarks} />
      </section>

      {/* Projects — section heading upgraded to match browse page weight */}
      <section>
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xl font-bold text-surface-900">
            Projects
          </h2>
          <span className="text-sm text-surface-500 font-medium tabular-nums">
            {projects.length} total
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="bg-surface-50 border border-dashed border-surface-300 p-10 sm:p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center">
              <Plus className="w-6 h-6 text-brand-orange" aria-hidden="true" />
            </div>
            <p className="text-surface-900 font-semibold mb-1">No projects yet</p>
            <p className="text-sm text-surface-500 mb-6 max-w-sm mx-auto">
              This user hasn&apos;t shared any AI projects.
            </p>
            <Link
              href="/prompt/new"
              className="inline-flex items-center gap-2 bg-brand-orange text-white px-6 py-2.5 text-sm font-bold hover:bg-brand-orange-dark focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 transition-colors duration-150 min-h-11"
            >
              Share your first project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map(project => (
              <PromptCard key={project.id} prompt={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/**
 * GitHub-style stat tile: icon + small uppercase label on top row,
 * large numeric value below, left-aligned. Subtle hover border for
 * affordance parity with PromptCard.
 *
 * `accent` = highlight the leading value in brand-orange (used for Upvotes,
 * the single most meaningful number to guide the eye toward).
 */
function StatTile({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="bg-white border border-surface-200 p-4 hover:border-surface-300 transition-colors duration-150">
      <div className="flex items-center gap-1.5 text-surface-500 mb-2">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      {/* One step smaller than the H1 so the name stays the dominant anchor of the page. */}
      <p
        className={`text-2xl font-black tabular-nums ${
          accent ? 'text-brand-orange' : 'text-surface-900'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
