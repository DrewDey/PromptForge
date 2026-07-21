'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  GitFork,
  Layers3,
  ListFilter,
} from 'lucide-react'
import VoteBookmarkButtons from '@/components/VoteBookmarkButtons'
import { ModelVariantKnownIssue } from '@/components/ModelVariantKnownIssue'
import { ProjectPreview } from '@/components/ProjectPreview'
import type {
  BuildPathModelVariant,
  DiscoveryPreview,
} from '@/lib/path-discovery'
import { ArtifactPreview } from './ArtifactPreview'

export type BuildPathCardClientItem = {
  id: string
  title: string
  description: string
  categoryLabel: string
  authorName: string
  modelRunCount: number
  hasWorkingArtifact: boolean
  hasFork: boolean
  isFork: boolean
  forkCount: number
  isActive: boolean
  preview: DiscoveryPreview
  modelVariants: BuildPathModelVariant[]
}

export type BuildPathCardEngagement = {
  promptId: string
  initialVoteCount: number
  initialBookmarkCount: number
  isLoggedIn: boolean
  initialVoted: boolean
  initialBookmarked: boolean
  loginNextPath: string
}

type InteractiveBuildPathCardProps = {
  item: BuildPathCardClientItem
  featured?: boolean
  compact?: boolean
  engagement?: BuildPathCardEngagement
}

type ModelOrder = 'new' | 'active'

type ModelSelectorProps = {
  cardId: string
  title: string
  variants: BuildPathModelVariant[]
  selectedVariant: BuildPathModelVariant
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  onSelect: (sourceRunId: string) => void
  onCycle: (direction: -1 | 1) => void
  orderMode: ModelOrder
  onOrderModeChange: (order: ModelOrder) => void
}

function orderModelVariants(
  variants: BuildPathModelVariant[],
  orderMode: ModelOrder,
) {
  return variants.toSorted((left, right) => {
    if (orderMode === 'active') {
      const activityDifference = right.activityProjectCount - left.activityProjectCount
      if (activityDifference !== 0) return activityDifference
    }

    return (
      Date.parse(right.capturedAt) - Date.parse(left.capturedAt) ||
      left.publicModelLabel.localeCompare(right.publicModelLabel) ||
      left.sourceRunId.localeCompare(right.sourceRunId)
    )
  })
}

function LazyProjectPreview({
  artifactPath,
  title,
  modelLabel,
  instanceKey,
}: {
  artifactPath: string
  title: string
  modelLabel: string
  instanceKey: string
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    const node = mountRef.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      const frame = window.requestAnimationFrame(() => setShouldMount(true))
      return () => window.cancelAnimationFrame(frame)
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      setShouldMount(true)
      observer.disconnect()
    }, { rootMargin: '220px 0px' })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const instanceArtifactPath = `${artifactPath}#path-card=${encodeURIComponent(instanceKey)}`

  return (
    <div
      ref={mountRef}
      className="path-card-preview-mount"
      data-path-card-preview-mounted={shouldMount ? 'true' : 'false'}
      data-path-card-artifact={artifactPath}
    >
      {shouldMount ? (
        <ProjectPreview
          artifactPath={instanceArtifactPath}
          title={title}
          label={`Artifact shown · ${modelLabel}`}
          className="path-real-project-preview"
        />
      ) : (
        <div className="path-card-preview-placeholder" aria-hidden="true">
          Loading real artifact preview
        </div>
      )}
    </div>
  )
}

function ModelSelector({
  cardId,
  title,
  variants,
  selectedVariant,
  menuOpen,
  onMenuOpenChange,
  onSelect,
  onCycle,
  orderMode,
  onOrderModeChange,
}: ModelSelectorProps) {
  const selectorRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const returnFocusAfterSelectionRef = useRef(false)
  const menuId = `${cardId}-model-index`
  const activityNoteId = `${cardId}-activity-note`
  const hiddenCount = Math.max(0, variants.length - 1)
  const canCycle = variants.length > 1
  const selectedPosition = variants.findIndex((variant) => (
    variant.sourceRunId === selectedVariant.sourceRunId
  )) + 1
  const verifiedCount = variants.filter((variant) => variant.qualityStatus === 'verified').length
  const knownIssueVariants = variants.filter((variant) => (
    variant.qualityStatus === 'known-issue' && variant.knownIssueExplanation
  ))
  const knownIssueCount = knownIssueVariants.length
  const projectKnownIssueExplanation = knownIssueVariants
    .map((variant) => `${variant.publicModelLabel}: ${variant.knownIssueExplanation}`)
    .join(' ')
  const projectKnownIssueId = `${cardId}-card-known-issues`

  useEffect(() => {
    if (!menuOpen) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (selectorRef.current?.contains(event.target as Node)) return
      onMenuOpenChange(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      onMenuOpenChange(false)
      triggerRef.current?.focus({ preventScroll: true })
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen, onMenuOpenChange])

  useEffect(() => {
    if (menuOpen || !returnFocusAfterSelectionRef.current) return
    const frame = window.requestAnimationFrame(() => {
      returnFocusAfterSelectionRef.current = false
      triggerRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [menuOpen, selectedVariant.sourceRunId])

  const selectAndReturnFocus = (sourceRunId: string) => {
    returnFocusAfterSelectionRef.current = true
    onSelect(sourceRunId)
  }

  return (
    <div
      ref={selectorRef}
      className={`path-model-selector${canCycle ? ' has-multiple-models' : ''}`}
      data-path-model-selector
      data-model-count={variants.length}
      data-model-menu-open={menuOpen ? 'true' : 'false'}
      role="group"
      aria-label={`Choose the model artifact shown for ${title}`}
      aria-describedby={activityNoteId}
    >
      <div className="path-model-selector-rail">
        <span className="path-model-total" data-model-total>
          <strong>{variants.length}</strong> {variants.length === 1 ? 'model' : 'models'}
        </span>
        {knownIssueCount > 0 && projectKnownIssueExplanation ? (
          <ModelVariantKnownIssue
            id={projectKnownIssueId}
            explanation={projectKnownIssueExplanation}
            label={`${knownIssueCount} ${knownIssueCount === 1 ? 'issue' : 'issues'}`}
            className="path-model-card-issue"
            focusable
          />
        ) : null}
        <button
          type="button"
          className="path-model-cycle"
          onClick={() => onCycle(-1)}
          disabled={!canCycle}
          aria-label={`Show previous captured model. Currently showing ${selectedVariant.publicModelLabel}`}
          data-model-cycle="previous"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => onMenuOpenChange(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-describedby={selectedVariant.knownIssueExplanation ? projectKnownIssueId : undefined}
          className="path-model-trigger"
          data-model-list-trigger
        >
          <span className="path-model-identity">
            <small>Showing {selectedPosition} of {variants.length}</small>
            <strong title={selectedVariant.publicModelLabel}>{selectedVariant.publicModelLabel}</strong>
            <em>
              {selectedVariant.qualityStatus === 'known-issue' ? 'Known issue' : selectedVariant.qualityStatus === 'verified' ? 'Verified' : 'Recorded'}
              {' · '}
              {hiddenCount > 0 ? `${variants.length} models total` : '1 model total'}
            </em>
          </span>
          <span className="path-model-date">
            <small>Captured</small>
            <time dateTime={selectedVariant.capturedAt}>{selectedVariant.capturedAtLabel}</time>
          </span>
          <ListFilter aria-hidden="true" />
        </button>
        <button
          type="button"
          className="path-model-cycle"
          onClick={() => onCycle(1)}
          disabled={!canCycle}
          aria-label={`Show next captured model. Currently showing ${selectedVariant.publicModelLabel}`}
          data-model-cycle="next"
        >
          <ChevronRight aria-hidden="true" />
        </button>
        <div
          className="path-model-order"
          data-model-order={orderMode === 'active' ? 'published-project-usage' : 'captured-descending'}
        >
          <span>Order</span>
          <button
            type="button"
            aria-pressed={orderMode === 'new'}
            disabled={!canCycle}
            onClick={() => onOrderModeChange('new')}
            data-model-order-option="new"
          >
            New
          </button>
          <button
            type="button"
            aria-pressed={orderMode === 'active'}
            disabled={!canCycle}
            onClick={() => onOrderModeChange('active')}
            data-model-order-option="active"
          >
            Active
          </button>
        </div>
      </div>
      <span id={activityNoteId} className="sr-only">
        {canCycle
          ? 'New orders by capture date. Active orders by how many published PathForge projects use each model provider, with newest capture breaking ties.'
          : 'Only one model is available for this project, so ordering does not change.'}
      </span>

      {menuOpen ? (
        <div
          id={menuId}
          className="path-model-menu"
          role="region"
          aria-label={`${variants.length} recorded model results, ${verifiedCount} verified, ${
            orderMode === 'active' ? 'most used first' : 'newest first'
          }`}
          data-model-list
        >
          <div className="path-model-menu-heading">
            <span>{variants.length} model {variants.length === 1 ? 'result' : 'results'} · {verifiedCount} verified</span>
            <span>{orderMode === 'active' ? 'Most used first' : 'Newest first'}</span>
          </div>
          {variants.map((variant) => {
            const selected = variant.sourceRunId === selectedVariant.sourceRunId
            const issueId = `${cardId}-${variant.sourceRunId}-known-issue`
            return (
              <button
                type="button"
                aria-pressed={selected}
                aria-describedby={variant.knownIssueExplanation ? issueId : undefined}
                className={`path-model-option${variant.qualityStatus === 'known-issue' ? ' model-known-issue-owner' : ''}`}
                key={variant.sourceRunId}
                onClick={() => selectAndReturnFocus(variant.sourceRunId)}
                data-model-option
                data-source-run-id={variant.sourceRunId}
                data-selected={selected ? 'true' : 'false'}
              >
                <span>
                  <small>{selected ? 'Shown' : 'Available'}</small>
                  <strong>{variant.publicModelLabel}</strong>
                  {!variant.knownIssueExplanation ? (
                    <small className="path-model-verified-label">
                      {variant.qualityStatus === 'verified' ? 'Verified' : 'Recorded'}
                    </small>
                  ) : null}
                </span>
                <span>
                  <small>Captured</small>
                  <time dateTime={variant.capturedAt}>{variant.capturedAtLabel}</time>
                  <small>{variant.providerLabel}: {variant.activityProjectCount} published {variant.activityProjectCount === 1 ? 'project' : 'projects'}</small>
                </span>
                {variant.knownIssueExplanation ? (
                  <ModelVariantKnownIssue
                    id={issueId}
                    explanation={variant.knownIssueExplanation}
                    inlineOnMobile
                  />
                ) : null}
              </button>
            )
          })}
          <p className="path-model-activity-note">
            {canCycle ? (
              orderMode === 'active' ? (
                <><strong>Active order.</strong> Ranked by real provider presence across published projects; newest capture breaks ties.</>
              ) : (
                <><strong>New order.</strong> Ranked by capture date, newest first.</>
              )
            ) : (
              <><strong>One model.</strong> Add another model run to enable ordering.</>
            )}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function PathAnatomy({
  item,
  promptCount,
}: {
  item: BuildPathCardClientItem
  promptCount: number
}) {
  const parts = [
    `${promptCount || 1} ${promptCount === 1 ? 'prompt' : 'prompts'}`,
    item.forkCount > 0
      ? `${item.forkCount} ${item.forkCount === 1 ? 'fork' : 'forks'}`
      : item.isFork
        ? 'Forked path'
        : null,
  ].filter(Boolean)

  return <span>{parts.join(' · ')}</span>
}

function cardLinkLabel(item: BuildPathCardClientItem, selectedVariant: BuildPathModelVariant) {
  const modelCount = item.modelVariants.length
  return [
    `Explore ${item.title}.`,
    `Showing ${selectedVariant.publicModelLabel}, captured ${selectedVariant.capturedAtLabel}.`,
    `${modelCount} ${modelCount === 1 ? 'model' : 'models'} in this project.`,
    selectedVariant.knownIssueExplanation
      ? `Known issue: ${selectedVariant.knownIssueExplanation}`
      : null,
  ].filter(Boolean).join(' ')
}

export function InteractiveBuildPathCard({
  item,
  featured = false,
  compact = false,
  engagement,
}: InteractiveBuildPathCardProps) {
  const initials = item.authorName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const variants = item.modelVariants
  const [selectedSourceRunId, setSelectedSourceRunId] = useState(variants[0].sourceRunId)
  const [menuOpen, setMenuOpen] = useState(false)
  const [orderMode, setOrderMode] = useState<ModelOrder>('new')
  const orderedVariants = orderModelVariants(variants, orderMode)
  const selectedVariant = variants.find((variant) => variant.sourceRunId === selectedSourceRunId)
    ?? variants[0]

  const cycleVariant = (direction: -1 | 1) => {
    const currentIndex = orderedVariants.findIndex((variant) => variant.sourceRunId === selectedVariant.sourceRunId)
    const nextIndex = (currentIndex + direction + orderedVariants.length) % orderedVariants.length
    setSelectedSourceRunId(orderedVariants[nextIndex].sourceRunId)
    setMenuOpen(false)
  }

  const changeOrderMode = (nextOrder: ModelOrder) => {
    if (variants.length < 2 || nextOrder === orderMode) return
    const nextVariants = orderModelVariants(variants, nextOrder)
    setOrderMode(nextOrder)
    setSelectedSourceRunId(
      nextVariants.find((variant) => variant.qualityStatus === 'verified')?.sourceRunId ??
      nextVariants[0].sourceRunId,
    )
    setMenuOpen(false)
  }

  const selectVariant = (sourceRunId: string) => {
    setSelectedSourceRunId(sourceRunId)
    setMenuOpen(false)
  }

  return (
    <article
      className={`path-card${featured ? ' is-featured' : ''}${compact ? ' is-compact' : ''}`}
      data-path-model-card={item.id}
      data-selected-source-run={selectedVariant.sourceRunId}
      data-selected-artifact={selectedVariant.artifactPath ?? ''}
      data-model-order-mode={orderMode}
    >
      <div className="path-card-link">
        <div className="path-card-stage" data-path-card-stage>
          <div className="path-card-backplate" aria-hidden="true" data-path-card-backplate />
          <div className="path-card-preview-surface" data-path-card-preview>
            {selectedVariant.artifactPath ? (
              <LazyProjectPreview
                artifactPath={selectedVariant.artifactPath}
                title={item.title}
                modelLabel={selectedVariant.publicModelLabel}
                instanceKey={`${item.id}:${selectedVariant.sourceRunId}`}
              />
            ) : (
              <ArtifactPreview
                variant={item.preview}
                title={item.title}
                large={featured}
                live={item.hasWorkingArtifact}
              />
            )}
          </div>
          <span className="path-card-slab-stamp">Built, not imagined</span>
        </div>

        <div className="path-card-body">
          <div className="path-card-labels">
            <span>{item.categoryLabel}</span>
            {(item.isActive || item.hasWorkingArtifact) && (
              <span className="path-card-statuses">
                {item.isActive && (
                  <span
                    className="path-card-active"
                    title={`${item.modelRunCount} verified model runs and ${item.forkCount} approved forks`}
                  >
                    <i /> Active
                  </span>
                )}
                {item.hasWorkingArtifact && <span className="path-card-verified"><i /> Working artifact</span>}
              </span>
            )}
          </div>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <div className="path-card-author">
            <span className="path-card-avatar">{initials}</span>
            <span>by <strong>{item.authorName}</strong></span>
          </div>
          <div className="path-card-foot">
            <span className="path-card-anatomy" data-selected-prompt-count={selectedVariant.promptCount}>
              {item.hasFork || item.isFork ? <GitFork aria-hidden="true" /> : <Layers3 aria-hidden="true" />}
              <PathAnatomy item={item} promptCount={selectedVariant.promptCount} />
            </span>
            <span className="path-card-action">Explore path <ArrowUpRight aria-hidden="true" /></span>
          </div>
        </div>
      </div>

      <Link
        href={selectedVariant.href}
        className="path-card-hit-area"
        aria-label={cardLinkLabel(item, selectedVariant)}
        data-path-card-primary-link
      >
        <span className="sr-only">Explore {item.title}</span>
      </Link>

      <ModelSelector
        cardId={item.id}
        title={item.title}
        variants={orderedVariants}
        selectedVariant={selectedVariant}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        onSelect={selectVariant}
        onCycle={cycleVariant}
        orderMode={orderMode}
        onOrderModeChange={changeOrderMode}
      />

      {engagement && (
        <div className="path-card-quick-actions" aria-label={`Save or upvote ${item.title}`}>
          <VoteBookmarkButtons
            promptId={engagement.promptId}
            initialVoteCount={engagement.initialVoteCount}
            initialBookmarkCount={engagement.initialBookmarkCount}
            initialVoted={engagement.initialVoted}
            initialBookmarked={engagement.initialBookmarked}
            isLoggedIn={engagement.isLoggedIn}
            loginNextPath={engagement.loginNextPath}
            hideZeroCounts
          />
        </div>
      )}
    </article>
  )
}
