import Link from 'next/link'
import {
  ArrowRight,
  ArrowUp,
  Bookmark,
  CheckCircle2,
  Cpu,
  GitFork,
  MessageSquareText,
} from 'lucide-react'
import { ProjectPreview } from '@/components/ProjectPreview'
import { BuilderByline } from '@/components/BuilderByline'
import { getProjectHref } from '@/lib/project-links'
import type { PublicProfileProjectEvidence } from '@/lib/profile-presentation'
import type { PromptWithRelations } from '@/lib/types'

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return value === 1 ? singular : pluralLabel
}

export default function BuilderWorkCard({
  project,
  evidence,
  featured = false,
  showArtifactPreview = false,
}: {
  project: PromptWithRelations
  evidence: PublicProfileProjectEvidence
  featured?: boolean
  showArtifactPreview?: boolean
}) {
  const projectHref = getProjectHref(project)
  const isFork = Boolean(evidence.forkSource)
  const previewLabel = evidence.isCommunityArtifact ? 'visual-only community preview' : 'working artifact'
  const hasFeaturedArtifact = Boolean(
    featured && showArtifactPreview && evidence.hasWorkingArtifact && evidence.artifactPath,
  )
  const engagement = [
    project.vote_count > 0 ? { icon: ArrowUp, label: `${project.vote_count} ${plural(project.vote_count, 'upvote')}` } : null,
    project.bookmark_count > 0 ? { icon: Bookmark, label: `${project.bookmark_count} ${plural(project.bookmark_count, 'save')}` } : null,
  ].filter((item): item is { icon: typeof ArrowUp; label: string } => Boolean(item))

  return (
    <article className={[
      'group relative overflow-hidden border bg-white transition-colors',
      isFork ? 'border-[#07551f]/25 hover:border-[#07551f]/55' : 'border-surface-200 hover:border-brand-orange/45',
      featured ? 'lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]' : 'flex h-full flex-col',
    ].join(' ')}>
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${isFork ? 'bg-[#07551f]' : 'bg-brand-orange'}`}
      />

      {hasFeaturedArtifact && (
        <Link
          href={projectHref}
          className="block lg:col-span-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-orange-ink"
          aria-label={`Open the ${previewLabel} and full path for ${project.title}`}
        >
          <ProjectPreview
            artifactPath={evidence.artifactPath}
            title={project.title}
            label="Featured work · real artifact"
            isCommunityArtifact={evidence.isCommunityArtifact}
          />
        </Link>
      )}

      <div className={featured ? 'p-6 sm:p-7 lg:p-8' : 'flex flex-1 flex-col p-5 pl-6'}>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[0.14em]">
          <span className={isFork ? 'text-[#07551f]' : 'text-brand-orange-ink'}>
            {isFork ? 'Published branch' : 'Published path'}
          </span>
          {project.category?.name && (
            <>
              <span aria-hidden="true" className="text-surface-300">/</span>
              <span className="text-surface-500">{project.category.icon} {project.category.name}</span>
            </>
          )}
          {evidence.hasWorkingArtifact && (
            <>
              <span aria-hidden="true" className="text-surface-300">/</span>
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                {evidence.isCommunityArtifact ? 'Visual-only preview' : 'Working artifact'}
              </span>
            </>
          )}
        </div>

        <h3 className={`mt-3 font-black leading-tight tracking-[-0.025em] text-surface-900 ${featured ? 'text-2xl sm:text-3xl' : 'text-lg'}`}>
          {project.title}
        </h3>
        <p className={`mt-2 leading-6 text-surface-600 ${featured ? 'max-w-3xl text-sm sm:text-[15px]' : 'line-clamp-3 text-sm'}`}>
          {project.description}
        </p>
        <BuilderByline
          name={project.author?.display_name || project.author?.username || 'PathForge builder'}
          username={project.author?.username}
          provenanceKind={project.author?.provenance?.kind}
          href={project.author?.username ? `/user/${project.author.username}` : undefined}
          showUsername
          className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-xs text-surface-500 hover:text-brand-orange-ink"
          provenanceClassName="font-semibold text-surface-600"
        />

        {evidence.forkSource && (
          <div className="mt-4 flex items-start gap-2 border-l-2 border-[#07551f] bg-[#effdf3] px-3 py-2.5 text-xs leading-5 text-surface-700">
            <GitFork className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#07551f]" aria-hidden="true" />
            <span>
              Forked from{' '}
              <Link
                href={getProjectHref({ id: evidence.forkSource.sourceProjectId })}
                className="font-bold text-[#07551f] underline decoration-[#07551f]/30 underline-offset-2 hover:decoration-[#07551f]"
              >
                {evidence.forkSource.sourceProjectTitle || 'the original path'}
              </Link>
              {evidence.forkSource.sourceStepNumber
                ? ` · response ${evidence.forkSource.sourceStepNumber}`
                : ''}
            </span>
          </div>
        )}

        {!featured && evidence.outcome && (
          <div className="mt-4 border-t border-surface-100 pt-4">
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.13em] text-surface-400">Working result</div>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-surface-700">{evidence.outcome}</p>
          </div>
        )}

        <div className={`mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-surface-500 ${featured ? 'pt-6' : 'pt-5'}`}>
          <span className="inline-flex items-center gap-1.5">
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
            {evidence.modelRunCount > 1 ? 'Default run · ' : ''}{evidence.promptCount} {plural(evidence.promptCount, 'prompt')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
            {evidence.modelRunCount} model {plural(evidence.modelRunCount, 'run')}
          </span>
          <span className={evidence.artifactStatus === 'known-issue' ? 'text-amber-800' : evidence.artifactStatus === 'verified' ? 'text-emerald-700' : ''}>
            {evidence.artifactStatusLabel}
          </span>
          {evidence.knownIssueRunCount > 0 && evidence.artifactStatus !== 'known-issue' && (
            <span className="text-amber-800">
              {evidence.knownIssueRunCount} model {plural(evidence.knownIssueRunCount, 'run')} with known artifact {plural(evidence.knownIssueRunCount, 'issue')}
            </span>
          )}
          {engagement.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className={[
        'flex flex-col border-surface-200 bg-surface-50',
        featured ? 'border-t p-6 lg:border-l lg:border-t-0 lg:p-7' : 'border-t p-5',
      ].join(' ')}>
        {featured && evidence.outcome && (
          <div>
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-surface-400">What shipped</div>
            <p className="mt-3 line-clamp-6 text-sm leading-6 text-surface-800">{evidence.outcome}</p>
          </div>
        )}

        {evidence.defaultModelLabel !== 'Unknown model' && (
          <div className={featured && evidence.outcome ? 'mt-6 border-t border-surface-200 pt-5' : ''}>
            <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[0.14em] text-surface-400">
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
              {evidence.modelRunCount > 1 ? 'Canonical default model' : 'Model used'}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="border border-surface-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-surface-700">
                {evidence.defaultModelLabel}
              </span>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-surface-500">{evidence.defaultModelProofLabel}</p>
            {evidence.modelRunCount > 1 && (
              <p className="mt-1 text-[10px] leading-4 text-surface-500">{evidence.modelRunCount} model runs in this project.</p>
            )}
            {evidence.hasModelHistory && (
              <p className="mt-2 text-[10px] leading-4 text-surface-500">Includes an artifact-verified historical baseline.</p>
            )}
            {evidence.artifactStatusExplanation && (
              <p className="mt-2 text-[10px] leading-4 text-amber-800">{evidence.artifactStatusExplanation}</p>
            )}
            {!evidence.artifactStatusExplanation && evidence.knownIssueExplanations.length > 0 && (
              <p className="mt-2 text-[10px] leading-4 text-amber-800">{evidence.knownIssueExplanations.join(' ')}</p>
            )}
          </div>
        )}

        <p
          className="mt-3 text-[10px] leading-4 text-surface-500"
          data-profile-default-source-evidence
        >
          {evidence.defaultSourceAccessLabel}
          {evidence.defaultRecordLabel ? ` · ${evidence.defaultRecordLabel}` : ''}
        </p>

        <Link
          href={projectHref}
          className="mt-auto inline-flex min-h-11 items-center justify-between gap-3 border-t border-surface-200 pt-5 text-sm font-black text-surface-900 hover:text-brand-orange-ink"
        >
          Inspect the full path
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
