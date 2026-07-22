import { BuilderByline } from '@/components/BuilderByline'
import PromptCard from '@/components/PromptCard'
import { PublicTruthSummary } from '@/components/PublicTruthSummary'
import { AIRLOCK_ZERO_PROJECT_ID } from '@/lib/featured-projects'
import { deriveCanonicalPromptPublicTruth } from '@/lib/prompt-public-truth'
import type { PromptWithRelations } from '@/lib/types'

const fixturePrompt: PromptWithRelations = {
  id: 'qa-generic-public-truth-fixture-project',
  title: 'Generic Community Build Fixture',
  description: 'A QA-only generic project used to verify conservative public truth and trusted builder provenance.',
  content: 'Build a small community project without provider-source evidence.',
  result_content: 'The generic project record renders without claiming public provider proof.',
  category_id: 'qa-category',
  category: {
    id: 'qa-category',
    name: 'QA Fixtures',
    slug: 'qa-fixtures',
    description: 'Internal browser verification fixtures.',
    icon: '◇',
    created_at: '2026-07-21T00:00:00.000Z',
  },
  difficulty: 'beginner',
  model_used: 'Claude Sonnet 4.6 Medium',
  model_recommendation: 'Claude Sonnet 4.6 Medium',
  tools_used: ['Browser'],
  tags: ['qa-fixture'],
  status: 'approved',
  author_id: 'qa-operated-builder',
  author: {
    id: 'qa-operated-builder',
    username: 'qa_operated_builder',
    display_name: 'QA Operated Builder',
    avatar_url: null,
    bio: null,
    role: 'user',
    provenance: { kind: 'pathforge_seed' },
    created_at: '2026-07-21T00:00:00.000Z',
    updated_at: '2026-07-21T00:00:00.000Z',
  },
  vote_count: 0,
  bookmark_count: 0,
  created_at: '2026-07-21T00:00:00.000Z',
  updated_at: '2026-07-21T00:00:00.000Z',
  prompt_step_count: 2,
  steps: [
    {
      id: 'qa-generic-step-1',
      prompt_id: 'qa-generic-public-truth-fixture-project',
      step_number: 1,
      title: 'Start the build',
      content: 'Create the first pass.',
      result_content: 'First pass recorded.',
      description: null,
      created_at: '2026-07-21T00:00:00.000Z',
    },
    {
      id: 'qa-generic-step-2',
      prompt_id: 'qa-generic-public-truth-fixture-project',
      step_number: 2,
      title: 'Refine the build',
      content: 'Refine the first pass.',
      result_content: 'Second pass recorded.',
      description: null,
      created_at: '2026-07-21T00:01:00.000Z',
    },
  ],
}

const preparedMultiRunPrompt: PromptWithRelations = {
  ...fixturePrompt,
  id: AIRLOCK_ZERO_PROJECT_ID,
  title: 'Prepared Multi-Run Card Fixture',
  description: 'The canonical default card must match the prepared project page truth.',
}

const genericTruth = deriveCanonicalPromptPublicTruth(fixturePrompt)

export default function GenericPublicTruthFixturePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6" data-generic-public-truth-fixture>
      <section className="border border-surface-200 bg-white p-5" data-fixture-generic-header>
        <h1 className="text-2xl font-black text-surface-900">Generic public truth fixture</h1>
        <div className="mt-3" data-generic-public-byline>
          <BuilderByline
            name={fixturePrompt.author?.display_name || 'Anonymous'}
            username={fixturePrompt.author?.username}
            provenanceKind={fixturePrompt.author?.provenance?.kind}
            showUsername
            className="inline-flex flex-wrap items-center gap-2 text-xs text-surface-600"
          />
        </div>
        <span className="mt-3 block text-xs text-surface-600" data-public-model-identity>
          Claude Sonnet 4.6 · Medium
        </span>
        <div data-generic-public-truth>
          <PublicTruthSummary truth={genericTruth} className="mt-3" />
        </div>
      </section>

      <section data-fixture-generic-rail>
        <h2 className="mb-3 text-sm font-semibold text-surface-900">Generic sticky rail fixture</h2>
        <aside className="w-full max-w-72 min-w-0" aria-label="Generic fixture project actions">
          <div className="border border-surface-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex min-w-0 items-center justify-between gap-3 text-[11px]">
              <span className="font-mono uppercase tracking-[0.14em] text-surface-400">Model</span>
              <span className="min-w-0 truncate font-medium text-surface-700" data-public-model-identity>
                Claude Sonnet 4.6 · Medium
              </span>
            </div>
            <div className="mt-3 min-w-0 border-t border-surface-200/80 pt-3" data-generic-rail-truth>
              <PublicTruthSummary
                truth={genericTruth}
                showArtifactExplanation={false}
                className="gap-x-2 gap-y-1 text-[10px] leading-4"
              />
            </div>
          </div>
        </aside>
      </section>

      <section data-fixture-related-project>
        <PromptCard prompt={fixturePrompt} />
      </section>

      <section data-fixture-prepared-multi-run>
        <PromptCard prompt={preparedMultiRunPrompt} />
      </section>
    </main>
  )
}
