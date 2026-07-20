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
  modelLabel: string
  authorName: string
  modelRunCount: number
  verifiedModelCount: number
  variantsAreVerified: boolean
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

type ModelSelectorProps = {
  cardId: string
  title: string
  variants: BuildPathModelVariant[]
  variantsAreVerified: boolean
  selectedVariant: BuildPathModelVariant
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  onSelect: (sourceRunId: string) => void
  onCycle: (direction: -1 | 1) => void
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
  variantsAreVerified,
  selectedVariant,
  menuOpen,
  onMenuOpenChange,
  onSelect,
  onCycle,
}: ModelSelectorProps) {
  const selectorRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const returnFocusAfterSelectionRef = useRef(false)
  const menuId = `${cardId}-model-index`
  const activityNoteId = `${cardId}-activity-note`
  const hiddenCount = Math.max(0, variants.length - 1)
  const canCycle = variants.length > 1

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
      className="path-model-selector"
      data-path-model-selector
      data-model-menu-open={menuOpen ? 'true' : 'false'}
      role="group"
      aria-label={`Choose the model artifact shown for ${title}`}
      aria-describedby={activityNoteId}
    >
      <div className="path-model-selector-rail">
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
          className="path-model-trigger"
          onClick={() => onMenuOpenChange(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          data-model-list-trigger
        >
          <span className="path-model-identity">
            <small>Shown</small>
            <strong title={selectedVariant.publicModelLabel}>{selectedVariant.publicModelLabel}</strong>
            <em>
              {hiddenCount > 0
                ? `+${hiddenCount} more ${hiddenCount === 1 ? 'model' : 'models'}`
                : variantsAreVerified
                  ? 'Only verified model'
                  : 'Only recorded model'}
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
        <div className="path-model-order" data-model-order="captured-descending">
          <span>Order <strong>New</strong></span>
          <span aria-hidden="true">|</span>
          <span aria-disabled="true">Active 🔒</span>
        </div>
      </div>
      <span id={activityNoteId} className="sr-only">
        Models are ordered newest first. Per-version activity is not tracked yet, so Active ordering is unavailable.
      </span>

      {menuOpen ? (
        <div
          id={menuId}
          className="path-model-menu"
          role="region"
          aria-label={`${variantsAreVerified ? 'Verified' : 'Recorded'} model artifacts, newest first`}
          data-model-list
        >
          <div className="path-model-menu-heading">
            <span>{variantsAreVerified ? 'Verified' : 'Recorded'} artifacts</span>
            <span>Newest first</span>
          </div>
          {variants.map((variant) => {
            const selected = variant.sourceRunId === selectedVariant.sourceRunId
            return (
              <button
                type="button"
                aria-pressed={selected}
                className="path-model-option"
                key={variant.sourceRunId}
                onClick={() => selectAndReturnFocus(variant.sourceRunId)}
                data-model-option
                data-source-run-id={variant.sourceRunId}
                data-selected={selected ? 'true' : 'false'}
              >
                <span>
                  <small>{selected ? 'Shown' : 'Available'}</small>
                  <strong>{variant.publicModelLabel}</strong>
                </span>
                <span>
                  <small>Captured</small>
                  <time dateTime={variant.capturedAt}>{variant.capturedAtLabel}</time>
                </span>
              </button>
            )
          })}
          <p className="path-model-activity-note">
            <strong>Active order unavailable.</strong> Per-version activity is not tracked yet.
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
    item.verifiedModelCount > 0
      ? `${item.verifiedModelCount} verified ${item.verifiedModelCount === 1 ? 'model' : 'models'}`
      : item.modelLabel,
    item.forkCount > 0
      ? `${item.forkCount} ${item.forkCount === 1 ? 'fork' : 'forks'}`
      : item.isFork
        ? 'Forked path'
        : null,
  ].filter(Boolean)

  return <span>{parts.join(' · ')}</span>
}

function cardLinkLabel(item: BuildPathCardClientItem, selectedVariant: BuildPathModelVariant) {
  const hiddenCount = Math.max(0, item.modelVariants.length - 1)
  return [
    `Explore ${item.title}.`,
    `Showing ${selectedVariant.publicModelLabel}, captured ${selectedVariant.capturedAtLabel}.`,
    hiddenCount > 0
      ? `${hiddenCount} more ${item.variantsAreVerified ? 'verified ' : ''}${hiddenCount === 1 ? 'model' : 'models'} available.`
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
  const selectedVariant = variants.find((variant) => variant.sourceRunId === selectedSourceRunId)
    ?? variants[0]

  const cycleVariant = (direction: -1 | 1) => {
    const currentIndex = variants.findIndex((variant) => variant.sourceRunId === selectedVariant.sourceRunId)
    const nextIndex = (currentIndex + direction + variants.length) % variants.length
    setSelectedSourceRunId(variants[nextIndex].sourceRunId)
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
        variants={variants}
        variantsAreVerified={item.variantsAreVerified}
        selectedVariant={selectedVariant}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        onSelect={selectVariant}
        onCycle={cycleVariant}
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
