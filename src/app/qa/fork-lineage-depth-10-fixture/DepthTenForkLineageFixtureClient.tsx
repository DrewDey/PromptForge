'use client'

import { useMemo, useState } from 'react'
import ProjectForkBuildPath from '@/components/ProjectForkBuildPath'
import {
  buildDepthTenForkLineageFixture,
  type DepthTenFixtureFamily,
  type DepthTenFixtureIntegrityKind,
  type DepthTenFixtureInvalidCase,
} from '@/lib/qa/depth-ten-fork-lineage-fixtures'
import type { ProjectForkNetworkItem } from '@/lib/project-forks'

const integrityKinds: DepthTenFixtureIntegrityKind[] = [
  'complete',
  'missing-parent',
  'cycle',
  'truncated',
  'unavailable',
  'invalid',
]

const invalidCases: DepthTenFixtureInvalidCase[] = [
  'stale-depth',
  'family-mismatch',
  'edge-mismatch',
]

export default function DepthTenForkLineageFixtureClient() {
  const [family, setFamily] = useState<DepthTenFixtureFamily>('prepared')
  const [integrity, setIntegrity] =
    useState<DepthTenFixtureIntegrityKind>('complete')
  const [invalidCase, setInvalidCase] =
    useState<DepthTenFixtureInvalidCase>('stale-depth')

  const lineage = useMemo(
    () => buildDepthTenForkLineageFixture(family, integrity, invalidCase),
    [family, integrity, invalidCase],
  )
  const currentGeneration = lineage.generations.find(
    (generation) => generation.isCurrent,
  ) ?? lineage.generations.at(-1)
  const branch = useMemo<ProjectForkNetworkItem>(() => {
    const fallbackForkSource = {
      sourceProjectId: `${family}-fixture-unavailable-source`,
      depth: 0,
      branchIndex: 0,
    }
    return {
      id: currentGeneration?.projectId ?? `${family}-fixture-unavailable`,
      title: currentGeneration?.title ?? `${family} lineage unavailable`,
      modelUsed: currentGeneration?.presentation.modelLabel ?? null,
      createdAt: '2026-07-27T00:00:00.000Z',
      forkSource: currentGeneration?.forkSource ?? fallbackForkSource,
      continuationSteps: currentGeneration?.presentation.localSteps ?? [],
      childRoute: currentGeneration?.presentation.href,
      childSourceRunId:
        currentGeneration?.presentation.localSteps[0]?.sourceRunId ?? null,
      childProviderName: 'MUST_NOT_INHERIT_ACROSS_GENERATIONS',
      lineageTruth: lineage,
    }
  }, [currentGeneration, family, lineage])

  const evidence = lineage.integrity.issues.map((issue) => (
    issue.kind === 'stale-stored-depth'
      ? `stale-stored-depth: observed stored depth ${String(issue.observed ?? 'missing')}; expected ${String(issue.expected ?? 'verified value')}`
      : `${issue.kind}: expected ${String(issue.expected ?? 'verified value')}; observed ${String(issue.observed ?? 'missing')}`
  )).join(' | ')

  return (
    <main
      className="min-h-screen overflow-x-clip bg-surface-50 px-3 py-6 text-surface-900 sm:px-6"
      data-depth-ten-fixture
      data-presentation-family={family}
      data-integrity-kind={lineage.integrity.kind}
    >
      <div className="mx-auto grid max-w-[1600px] gap-5">
        <header className="border border-surface-300 bg-white p-4">
          <p className="font-mono text-xs font-black uppercase tracking-[0.14em] text-brand-orange-ink">
            Local QA fixture · production renderer
          </p>
          <h1 className="mt-2 text-2xl font-black">
            Ten-level fork lineage verification
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-surface-700">
            Test-only controls switch deterministic lineage truth. The workspace,
            lanes, connectors, artifacts, actions, keyboard behavior, and
            responsive geometry below are the shared production component.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            {(['prepared', 'community'] as const).map((fixtureFamily) => (
              <button
                key={fixtureFamily}
                type="button"
                onClick={() => setFamily(fixtureFamily)}
                data-fixture-family={fixtureFamily}
                aria-pressed={family === fixtureFamily}
                className="inline-flex min-h-11 min-w-11 items-center justify-center border border-surface-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.1em] hover:border-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                {fixtureFamily}
              </button>
            ))}

            <label className="grid gap-1 text-xs font-bold text-surface-700">
              Integrity
              <select
                value={integrity}
                onChange={(event) => setIntegrity(
                  event.target.value as DepthTenFixtureIntegrityKind,
                )}
                data-fixture-integrity-picker
                className="min-h-11 border border-surface-300 bg-white px-3"
              >
                {integrityKinds.map((kind) => (
                  <option key={kind} value={kind}>{kind}</option>
                ))}
              </select>
            </label>

            {integrity === 'invalid' && (
              <label className="grid gap-1 text-xs font-bold text-surface-700">
                Invalid evidence
                <select
                  value={invalidCase}
                  onChange={(event) => setInvalidCase(
                    event.target.value as DepthTenFixtureInvalidCase,
                  )}
                  data-fixture-invalid-case-picker
                  className="min-h-11 border border-surface-300 bg-white px-3"
                >
                  {invalidCases.map((kind) => (
                    <option key={kind} value={kind}>{kind}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {integrity === 'invalid' && (
            <p
              className="mt-3 border border-red-300 bg-red-50 p-3 font-mono text-xs text-red-950"
              data-invalid-lineage-evidence
            >
              {invalidCase}: {evidence || 'invalid lineage evidence retained'}
            </p>
          )}
        </header>

        <ProjectForkBuildPath
          mode="child"
          lineage={lineage}
          sourceSteps={[]}
          branch={branch}
          sourceProjectHref="/prompt/qa-depth-ten-root"
          branchHref={currentGeneration?.presentation.href}
          newForkHref="/prompt/new?fixture=must-be-denied"
          sourceRunHref="/qa/source-run"
        />
      </div>
    </main>
  )
}
