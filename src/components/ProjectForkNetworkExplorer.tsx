'use client'

import { useState } from 'react'
import ProjectForkBuildPath from '@/components/ProjectForkBuildPath'
import {
  buildCommunityProjectForkHref,
  type ProjectForkNetworkItem,
  type ProjectForkSourceStep,
} from '@/lib/project-forks'
import { resolvePublicSourceEvidence } from '@/lib/public-source-evidence'

export default function ProjectForkNetworkExplorer({
  sourceSteps,
  forks,
}: {
  sourceSteps: ProjectForkSourceStep[]
  forks: ProjectForkNetworkItem[]
}) {
  const [selectedForkId, setSelectedForkId] = useState<string | null>(null)
  const selectedFork = forks.find((fork) => fork.id === selectedForkId) ?? null
  const selectedForkEvidence = selectedFork
    ? selectedFork.childSourceEvidence ?? resolvePublicSourceEvidence({
        sourceRunId: selectedFork.childSourceRunId,
        pathforgeRecordChecked: Boolean(selectedFork.childSourceRunId),
      })
    : resolvePublicSourceEvidence(null)

  if (forks.length === 0) return null

  return (
    <div className="mb-10" data-project-fork-network-explorer>
      <div className="mb-4 border-l-4 border-[#2bd15f] pl-4">
        <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#07551f]">
          Forks from this build path
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {forks.map((fork) => (
            <button
              key={fork.id}
              type="button"
              onClick={() => setSelectedForkId(fork.id)}
              aria-pressed={selectedForkId === fork.id}
              className={[
                'min-h-10 border px-3 py-2 text-left text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bd15f]',
                selectedForkId === fork.id
                  ? 'border-[#07551f] bg-[#07551f] text-white'
                  : 'border-[#07551f]/30 bg-white text-[#07551f] hover:bg-[#effdf3]',
              ].join(' ')}
            >
              {fork.title}
            </button>
          ))}
        </div>
      </div>

      {selectedFork && (
        <ProjectForkBuildPath
          mode="parent"
          sourceSteps={sourceSteps}
          branch={selectedFork}
          branchHref={selectedFork.childRoute}
          newForkHref={buildCommunityProjectForkHref(selectedFork.forkSource)}
          sourceRunHref={selectedFork.childSourceUrl}
          sourceEvidence={selectedForkEvidence}
          onClose={() => setSelectedForkId(null)}
        />
      )}
    </div>
  )
}
