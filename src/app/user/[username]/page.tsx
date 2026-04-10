import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Calendar, ArrowUp, Bookmark, Layers, Award, Cpu } from 'lucide-react'
import { getProfileByUsername, getProjectsByAuthor, getAuthorStats } from '@/lib/data'
import PromptCard from '@/components/PromptCard'

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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-10 mb-4">
            <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-sm flex items-center justify-center text-2xl font-bold text-primary-600 bg-primary-50">
              {(profile.display_name || profile.username || '?').charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-sm text-gray-500">@{profile.username}</p>
              {profile.bio && (
                <p className="text-gray-600 mt-2 max-w-lg">{profile.bio}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                {joinDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined {joinDate}
                  </span>
                )}
                {stats.topCategory && (
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    Top: {stats.topCategory.icon} {stats.topCategory.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
            <Layers className="w-4 h-4" />
            <span className="text-xs font-medium">Projects</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProjects}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
            <ArrowUp className="w-4 h-4" />
            <span className="text-xs font-medium">Upvotes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalUpvotes}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
            <Bookmark className="w-4 h-4" />
            <span className="text-xs font-medium">Saves</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalBookmarks}</p>
        </div>
      </div>

      {/* Projects */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Projects ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
            <p className="mb-1">No projects yet.</p>
            <p className="text-sm">This user hasn&apos;t shared any projects.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map(project => (
              <PromptCard key={project.id} prompt={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
