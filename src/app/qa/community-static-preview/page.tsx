import { notFound } from 'next/navigation'
import BuilderWorkCard from '@/components/BuilderWorkCard'
import { BuildPathCard } from '@/components/discovery/BuildPathCard'
import { buildPathDiscoveryCatalog } from '@/lib/path-discovery'
import { getPublicProfileProjectEvidence } from '@/lib/profile-presentation'
import type { PromptWithRelations } from '@/lib/types'
import '../../browse.css'

export const metadata = {
  robots: { index: false, follow: false },
}

// The browser guard intercepts this otherwise nonexistent public route with a
// fixture whose script clears the document. Both real public card components
// must keep it visible by selecting the static community-preview mode.
const COMMUNITY_FIXTURE_PROMPT_ID = '10000000-0000-4000-8000-000000000001'
const communityArtifactPath = `/api/community-artifacts/${COMMUNITY_FIXTURE_PROMPT_ID}`

const category = {
  id: 'qa-community-category',
  name: 'QA fixtures',
  slug: 'qa-fixtures',
  description: 'Internal rendered browser verification fixtures.',
  icon: '◇',
  created_at: '2026-07-22T00:00:00.000Z',
}

const communityPrompt: PromptWithRelations = {
  id: COMMUNITY_FIXTURE_PROMPT_ID,
  title: 'Community static-preview fixture',
  description: 'A local-only published community fixture used to verify that public cards never execute contributor code.',
  content: 'Render the artifact as a visual-only public preview.',
  result_content: 'The public card should preserve the visible fixture despite the contributor script.',
  category_id: category.id,
  category,
  difficulty: 'beginner',
  model_used: 'Fixture model',
  model_recommendation: 'Fixture model',
  tools_used: ['Browser'],
  tags: ['qa-fixture', 'community'],
  status: 'approved',
  author_id: 'qa-community-builder',
  author: {
    id: 'qa-community-builder',
    username: 'qa_community_builder',
    display_name: 'QA community builder',
    avatar_url: null,
    bio: null,
    role: 'user',
    created_at: '2026-07-22T00:00:00.000Z',
    updated_at: '2026-07-22T00:00:00.000Z',
    provenance: { kind: 'member' },
  },
  vote_count: 0,
  bookmark_count: 0,
  created_at: '2026-07-22T00:00:00.000Z',
  updated_at: '2026-07-22T00:00:00.000Z',
  prompt_step_count: 1,
  steps: [{
    id: 'qa-community-step-1',
    prompt_id: COMMUNITY_FIXTURE_PROMPT_ID,
    step_number: 1,
    title: 'Visual-only public preview',
    content: 'Keep the public preview static.',
    result_content: 'Fixture result.',
    description: null,
    created_at: '2026-07-22T00:00:00.000Z',
  }],
  community_project: {
    submission_id: '10000000-0000-4000-8000-000000000002',
    prompt_id: COMMUNITY_FIXTURE_PROMPT_ID,
    evidence_scope: 'full_run',
    provider: 'Fixture provider',
    model: 'Fixture model',
    model_settings: null,
    source_url: null,
    source_checked_at: '2026-07-22T00:00:00.000Z',
    artifact_sha256: 'a'.repeat(64),
    artifact_size_bytes: 512,
    submitter_role: 'builder',
    reuse_permission: 'view_only',
    submission_version: 1,
    published_at: '2026-07-22T00:00:00.000Z',
  },
}

const COMMUNITY_FIXTURE_FORK_ID = '10000000-0000-4000-8000-000000000003'
const communityForkPrompt: PromptWithRelations = {
  ...communityPrompt,
  id: COMMUNITY_FIXTURE_FORK_ID,
  title: 'Approved community fixture fork',
  description: 'A local-only approved fork used to verify durable community activity.',
  tags: ['qa-fixture', 'fork'],
  community_project: null,
  created_at: '2026-07-23T00:00:00.000Z',
  updated_at: '2026-07-23T00:00:00.000Z',
  fork_source_project_id: COMMUNITY_FIXTURE_PROMPT_ID,
  fork_source_project_title: communityPrompt.title,
  steps: communityPrompt.steps?.map((step) => ({
    ...step,
    id: 'qa-community-fork-step-1',
    prompt_id: COMMUNITY_FIXTURE_FORK_ID,
  })),
}

const [communityDiscoveryItem] = buildPathDiscoveryCatalog(
  [communityPrompt, communityForkPrompt],
  [category],
)
const communityProfileEvidence = getPublicProfileProjectEvidence(communityPrompt)

export default function CommunityStaticPreviewFixturePage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6" data-community-static-preview-fixture>
      <header>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-orange">Local QA only</p>
        <h1 className="mt-2 text-3xl font-black text-surface-900">Community static preview fixture</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-surface-600">
          These are the production Explore and featured-profile card components with a published community artifact.
          The fixture contains a script that would erase its own document if this boundary regressed.
        </p>
      </header>

      <section
        className="pf-paths path-card-surface"
        data-community-preview-surface="explore"
        data-community-verified-runs={communityDiscoveryItem.verifiedModelRunCount}
        data-community-fork-count={communityDiscoveryItem.forkCount}
        data-community-active={String(communityDiscoveryItem.isActive)}
      >
        <h2 className="mb-3 text-lg font-black text-surface-900">Explore card</h2>
        <BuildPathCard item={communityDiscoveryItem} />
      </section>

      <section
        data-community-preview-surface="profile"
        data-community-verified-runs={communityProfileEvidence.verifiedModelRunCount}
      >
        <h2 className="mb-3 text-lg font-black text-surface-900">Featured profile card</h2>
        <BuilderWorkCard
          project={communityPrompt}
          evidence={communityProfileEvidence}
          featured
          showArtifactPreview
        />
      </section>

      <p className="sr-only" data-community-artifact-path={communityArtifactPath}>
        Community artifact route fixture.
      </p>
    </main>
  )
}
