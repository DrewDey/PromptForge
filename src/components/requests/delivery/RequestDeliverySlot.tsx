import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileUp,
  History,
  LockKeyhole,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import type {
  RequestDeliveryReviewCheck,
  RequestDeliverySlotModel,
  RequestDeliverySlotState,
} from '@/lib/build-requests/delivery-view'
import { BuilderDeliveryUploader } from './BuilderDeliveryUploader'
import {
  RequestDeliveryArtifactLinks,
  RequestDeliveryArtifactPreview,
} from './RequestDeliveryArtifactInteractions'
import {
  RequesterDeliveryOutcomeForms,
  type RequestDeliveryReceiptServerAction,
} from './RequesterDeliveryOutcomeForms'

export type RequestDeliveryServerAction = (formData: FormData) => void | Promise<void>

export interface RequestDeliverySlotActions {
  review?: RequestDeliveryServerAction
  requesterOutcome?: RequestDeliveryReceiptServerAction
  acknowledge?: RequestDeliveryServerAction
}

export interface RequestDeliverySlotProps {
  model: RequestDeliverySlotModel
  mode: 'participant' | 'admin'
  actions?: RequestDeliverySlotActions
}

const STATE_PRESENTATION: Record<
  RequestDeliverySlotState,
  {
    icon: typeof Clock3
    tone: string
    label: string
    description: string
  }
> = {
  none: {
    icon: LockKeyhole,
    tone: 'border-surface-200 bg-surface-50 text-surface-700',
    label: 'No delivery yet',
    description: 'There is no builder-produced delivery evidence for this case yet.',
  },
  pending: {
    icon: Clock3,
    tone: 'border-accent-200 bg-accent-50 text-accent-900',
    label: 'Delivery pending',
    description: 'The assigned builder has not submitted a reviewable revision.',
  },
  staging: {
    icon: FileUp,
    tone: 'border-accent-200 bg-accent-50 text-accent-900',
    label: 'Securing delivery',
    description: 'The exact submitted bytes are being finalized in private custody.',
  },
  sealed_waiting: {
    icon: Clock3,
    tone: 'border-accent-200 bg-accent-50 text-accent-900',
    label: 'Delivery sealed',
    description: 'The exact private revision is sealed and waiting for an independent reviewer assignment.',
  },
  sealed_ready: {
    icon: FileCheck2,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    label: 'Ready to submit',
    description: 'An independent reviewer is assigned. This exact sealed revision is ready to submit for review.',
  },
  quarantined: {
    icon: ShieldAlert,
    tone: 'border-amber-300 bg-amber-50 text-amber-950',
    label: 'Safety review required',
    description: 'This revision is isolated and cannot be opened or downloaded.',
  },
  available: {
    icon: FileCheck2,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    label: 'Private delivery available',
    description: 'The protected delivery is available to currently authorized case participants.',
  },
  missing: {
    icon: AlertTriangle,
    tone: 'border-red-200 bg-red-50 text-red-950',
    label: 'Delivery unavailable',
    description: 'The recorded delivery object is unavailable. No evidence is inferred from its record.',
  },
  hash_mismatch: {
    icon: ShieldAlert,
    tone: 'border-red-300 bg-red-50 text-red-950',
    label: 'Integrity check failed',
    description: 'The protected object no longer matches its recorded bytes and cannot be served.',
  },
  repair_required: {
    icon: RotateCcw,
    tone: 'border-amber-300 bg-amber-50 text-amber-950',
    label: 'Repair requested',
    description: 'Independent review found a failed acceptance check. A new builder revision is required.',
  },
  review_pending: {
    icon: ShieldCheck,
    tone: 'border-accent-200 bg-accent-50 text-accent-900',
    label: 'Independent review pending',
    description: 'A revision is secured, but it has not passed an independent review.',
  },
  reviewed: {
    icon: CheckCircle2,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    label: 'Independently reviewed',
    description: 'The exact current revision passed its recorded acceptance and integrity checks.',
  },
}

function safeSameOriginPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  if (value.includes('#') || value.includes('\\') || value.includes('..')) return null
  try {
    const parsed = new URL(value, 'https://pathforge.invalid')
    if (
      parsed.origin !== 'https://pathforge.invalid'
      || (parsed.search !== '' && parsed.search !== '?download=1')
    ) return null
  } catch {
    return null
  }
  return value
}

function formatBytes(value: number | null) {
  if (value === null) return 'Size unavailable'
  if (value < 1_000) return `${value} B`
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)} KB`
  return `${(value / 1_000_000).toFixed(1)} MB`
}

function formatTimestamp(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return null
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function idempotencyIntent(requestId: string, command: string, version: number) {
  return `delivery-${requestId}-${command}-v${version}`
}

function CommandContext({
  command,
  model,
}: {
  command: string
  model: RequestDeliverySlotModel
}) {
  return (
    <>
      <input type="hidden" name="command" value={command} />
      <input type="hidden" name="request_id" value={model.requestId} />
      <input
        type="hidden"
        name="idempotency_intent"
        value={idempotencyIntent(model.requestId, command, model.version)}
      />
    </>
  )
}

function StateNotice({ model }: { model: RequestDeliverySlotModel }) {
  const presentation = STATE_PRESENTATION[model.state]
  const Icon = presentation.icon
  const isError = model.state === 'missing' || model.state === 'hash_mismatch'

  return (
    <div
      className={`border px-4 py-4 sm:px-5 ${presentation.tone}`}
      role={isError ? 'alert' : 'status'}
      data-delivery-state={model.state}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-bold">{presentation.label}</p>
          <p className="mt-1 text-sm leading-6">{presentation.description}</p>
          {model.integrityMessage ? (
            <p className="mt-2 border-t border-current/20 pt-2 text-xs leading-5">
              {model.integrityMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ArtifactPreview({ model }: { model: RequestDeliverySlotModel }) {
  const artifact = model.artifacts.find((item) => (
    item.reader.canOpen && safeSameOriginPath(item.reader.openPath)
  ))
  const openPath = artifact ? safeSameOriginPath(artifact.reader.openPath) : null
  if (!artifact || !openPath) return null

  return <RequestDeliveryArtifactPreview openPath={openPath} label={artifact.label} />
}

function DeliveryEvidence({ model }: { model: RequestDeliverySlotModel }) {
  const submittedAt = formatTimestamp(model.submittedAt)
  const hasDelivery = model.revisionNumber !== null || model.artifactCount !== null
  const hasEvidence = model.evidence.length > 0

  if (!hasDelivery && !hasEvidence && !model.rightsSummary) return null

  return (
    <section className="border-t border-surface-200 px-4 py-5 sm:px-6" aria-labelledby="delivery-evidence-heading">
      <div className="flex items-center gap-2">
        <FileCheck2 className="h-4 w-4 text-surface-500" aria-hidden="true" />
        <h3 id="delivery-evidence-heading" className="text-sm font-black text-surface-900">
          Exact delivery evidence
        </h3>
      </div>

      {hasDelivery ? (
        <dl className="mt-4 grid gap-3 border border-surface-200 bg-surface-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {model.revisionNumber !== null ? (
            <div>
              <dt className="text-xs font-semibold text-surface-500">Revision</dt>
              <dd className="mt-1 font-bold text-surface-900">Revision {model.revisionNumber}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-semibold text-surface-500">Private artifacts</dt>
            <dd className="mt-1 font-bold text-surface-900">
              {model.artifactCount ?? 0} {model.artifactCount === 1 ? 'file' : 'files'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-surface-500">Recorded size</dt>
            <dd className="mt-1 font-bold text-surface-900">{formatBytes(model.totalBytes)}</dd>
          </div>
          {submittedAt ? (
            <div>
              <dt className="text-xs font-semibold text-surface-500">Submitted</dt>
              <dd className="mt-1 font-bold text-surface-900">
                <time dateTime={model.submittedAt ?? undefined}>{submittedAt}</time>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {model.authoredByDisplayName ? (
        <p className="mt-3 text-sm text-surface-700">
          Authored by <strong className="text-surface-900">{model.authoredByDisplayName}</strong>
        </p>
      ) : null}

      {model.formatLabels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Delivery formats">
          {model.formatLabels.map(label => (
            <span
              key={label}
              className="border border-surface-200 bg-white px-2 py-1 text-xs font-semibold text-surface-700"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {hasEvidence ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Builder evidence">
          {model.evidence.map((item, index) => (
            <li key={`${item.label}-${index}`} className="border border-surface-200 bg-white p-3">
              <div className="flex items-start gap-2">
                {item.result === 'pass' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                ) : item.result === 'fail' ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
                ) : (
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-surface-500" aria-hidden="true" />
                )}
                <div>
                  <p className="text-sm font-bold text-surface-900">{item.label}</p>
                  {item.evidenceText ? (
                    <p className="mt-1 text-xs leading-5 text-surface-600">{item.evidenceText}</p>
                  ) : null}
                  {item.evidenceRef ? (
                    <p className="mt-1 font-mono text-[10px] text-surface-500">
                      Evidence reference: {item.evidenceRef}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {model.rightsSummary ? (
        <div className="mt-4 border-l-4 border-brand-blue bg-accent-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent-900">Use rights</p>
          <p className="mt-1 text-sm leading-6 text-accent-900">{model.rightsSummary}</p>
        </div>
      ) : null}

      {model.artifacts.length > 0 ? (
        <ul className="mt-4 space-y-2" aria-label="Private delivery artifacts">
          {model.artifacts.map((artifact, index) => {
            const openPath = artifact.reader.canOpen
              ? safeSameOriginPath(artifact.reader.openPath)
              : null
            const downloadPath = artifact.reader.canDownload
              ? safeSameOriginPath(artifact.reader.downloadPath)
              : null
            return (
              <li key={`${artifact.label}-${index}`} className="border border-surface-200 bg-white p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="break-words text-sm font-bold text-surface-900">{artifact.label}</p>
                    <p className="mt-1 text-xs text-surface-500">
                      {artifact.mediaTypeLabel} · {formatBytes(artifact.byteLength)}
                    </p>
                  </div>
                  {openPath || downloadPath ? (
                    <RequestDeliveryArtifactLinks
                      openPath={openPath}
                      downloadPath={downloadPath}
                    />
                  ) : (
                    <span className="text-xs font-semibold text-surface-500">Access unavailable</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
      <ArtifactPreview model={model} />
    </section>
  )
}

function BuilderSubmission({ model }: { model: RequestDeliverySlotModel }) {
  const canContinue = model.commands.canStageArtifact
    || model.commands.canPrepareRevision
    || model.commands.submitKind !== null
    || model.commands.canResumeRevision
  const canInteract = canContinue || model.commands.canAbandonArtifact
  if (!canInteract && !model.builderWorkspace) return null
  const isRepair = model.commands.submitKind === 'resubmit_delivery'
    || model.state === 'repair_required'
  const isSealedWaiting = (
    model.builderWorkspace?.revisionState === 'sealed'
    && model.commands.submitKind === null
  )

  return (
    <section className="border-t border-surface-200 px-4 py-5 sm:px-6" aria-labelledby="builder-delivery-heading">
      <div className="flex items-center gap-2">
        <FileUp className="h-4 w-4 text-brand-orange-ink" aria-hidden="true" />
        <h3 id="builder-delivery-heading" className="text-sm font-black text-surface-900">
          {isSealedWaiting
            ? 'Sealed revision waiting for review assignment'
            : isRepair
              ? 'Submit a repaired revision'
              : 'Submit a private delivery revision'}
        </h3>
      </div>
      <p className="mt-2 text-xs leading-5 text-surface-600">
        {isSealedWaiting
          ? 'The exact builder revision remains private and no further builder action is available until an independent reviewer is assigned.'
          : 'Builder-produced files only. Files are treated as untrusted, checked before access, and remain private to this case.'}
      </p>

      {canInteract ? (
        <BuilderDeliveryUploader
          requestId={model.requestId}
          expectedVersion={model.version}
          acceptanceChecks={model.acceptanceChecks}
          workspace={model.builderWorkspace}
          canStageArtifact={model.commands.canStageArtifact}
          canAbandonArtifact={model.commands.canAbandonArtifact}
          canContinue={canContinue}
        />
      ) : (
        <p className="mt-4 border border-surface-200 bg-surface-50 p-4 text-sm leading-6 text-surface-700" role="status">
          {model.builderWorkspace?.revisionState === 'sealed'
            ? 'This exact revision is sealed and waiting for an independent reviewer assignment. No further builder action is needed yet.'
            : 'This retained workspace is read-only and pending authority-owned retirement. No builder delivery command is currently available.'}
        </p>
      )}
    </section>
  )
}

function CheckResult({ item }: { item: RequestDeliveryReviewCheck }) {
  return (
    <li className="border border-surface-200 bg-white p-3">
      <div className="flex items-start gap-3">
        {item.result === 'pass' ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
        )}
        <div>
          <p className="text-sm font-bold text-surface-900">{item.label}</p>
          {item.evidenceRef ? (
            <p className="mt-1 font-mono text-[10px] text-surface-500">
              Evidence reference: {item.evidenceRef}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function ReviewerActions({
  model,
  action,
}: {
  model: RequestDeliverySlotModel
  action?: RequestDeliveryServerAction
}) {
  if (!model.commands.canReview && !model.commands.canRequestRepair) return null
  const checks = model.acceptanceChecks

  return (
    <section className="border-t border-surface-200 px-4 py-5 sm:px-6" aria-labelledby="review-delivery-heading">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-brand-blue-dark" aria-hidden="true" />
        <h3 id="review-delivery-heading" className="text-sm font-black text-surface-900">
          Independent delivery review
        </h3>
      </div>
      <p className="mt-2 text-xs leading-5 text-surface-600">
        A verdict applies only to the exact current revision. A later builder revision requires a new review.
      </p>

      {!action ? (
        <p className="mt-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
          Review actions are temporarily unavailable. No review has been recorded.
        </p>
      ) : null}

      {model.commands.canReview && action ? (
        <form action={action} className="mt-4">
          <CommandContext command="approve_delivery" model={model} />
          <input
            type="hidden"
            name="delivery_revision_id"
            value={model.currentDeliveryRevisionId ?? ''}
          />
          <input type="hidden" name="safety_integrity_result" value="pass" />
          <fieldset>
            <legend className="text-xs font-bold text-surface-700">Acceptance checks</legend>
            <div className="mt-2 space-y-2">
              {checks.map((item) => (
                <div key={item.id} className="border border-surface-200 bg-white p-3">
                  <label className="flex min-h-11 items-center gap-3">
                    <input
                      type="checkbox"
                      name={`check_pass_${item.id}`}
                      value={item.id}
                      required
                      className="h-4 w-4 shrink-0 accent-surface-900"
                    />
                    <span className="block text-sm font-bold text-surface-900">{item.label}</span>
                  </label>
                  <label className="mt-3 block text-xs font-semibold text-surface-700">
                    Evidence reference
                    <input
                      type="text"
                      name={`evidence_ref_${item.id}`}
                      maxLength={160}
                      className="mt-1 min-h-11 w-full border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900"
                      placeholder="Optional evidence reference"
                    />
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
          <div className="mt-4">
            <label htmlFor="request-delivery-review-evidence" className="block text-xs font-bold text-surface-700">
              Review evidence
            </label>
            <textarea
              id="request-delivery-review-evidence"
              name="review_notes"
              rows={4}
              required
              className="mt-2 w-full border border-surface-300 bg-white px-3 py-2 text-base leading-6 text-surface-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:w-auto"
          >
            Approve exact revision
            <Check className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      ) : null}

      {model.commands.canRequestRepair && action ? (
        <form action={action} className="mt-5 border border-amber-300 bg-amber-50 p-4">
          <CommandContext command="request_repair" model={model} />
          <input
            type="hidden"
            name="delivery_revision_id"
            value={model.currentDeliveryRevisionId ?? ''}
          />
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-amber-950">Acceptance check results</legend>
            {checks.map(item => (
              <div key={item.id} className="border border-amber-300 bg-white p-3">
                <p className="text-sm font-bold text-surface-900">{item.label}</p>
                <label className="mt-2 block text-xs font-semibold text-surface-700">
                  Result
                  <select
                    name={`check_result_${item.id}`}
                    required
                    defaultValue="pass"
                    className="mt-1 min-h-11 w-full border border-surface-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                  </select>
                </label>
                <label className="mt-2 block text-xs font-semibold text-surface-700">
                  Evidence reference
                  <input
                    type="text"
                    name={`evidence_ref_${item.id}`}
                    maxLength={160}
                    className="mt-1 min-h-11 w-full border border-surface-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>
            ))}
          </fieldset>
          <label htmlFor="request-delivery-safety-result" className="mt-4 block text-xs font-bold text-amber-950">
            Safety and integrity result
          </label>
          <select
            id="request-delivery-safety-result"
            name="safety_integrity_result"
            required
            defaultValue="pass"
            className="mt-2 min-h-11 w-full border border-amber-400 bg-white px-3 py-2 text-sm"
          >
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
          <label htmlFor="request-delivery-repair-reason" className="mt-4 block text-xs font-bold text-amber-950">
            Repair reason
          </label>
          <textarea
            id="request-delivery-repair-reason"
            name="reason"
            rows={4}
            required
            className="mt-2 w-full border border-amber-400 bg-white px-3 py-2 text-base leading-6 text-surface-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:text-sm"
          />
          <label htmlFor="request-delivery-repair-instructions" className="mt-4 block text-xs font-bold text-amber-950">
            Repair instructions
          </label>
          <textarea
            id="request-delivery-repair-instructions"
            name="repair_instructions"
            rows={4}
            required
            className="mt-2 w-full border border-amber-400 bg-white px-3 py-2 text-base leading-6 text-surface-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:text-sm"
          />
          <button
            type="submit"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-amber-500 bg-white px-4 py-2.5 text-sm font-bold text-amber-950 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:w-auto"
          >
            Request repair
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      ) : null}
    </section>
  )
}

function RequesterOutcome({
  model,
  outcomeAction,
  acknowledgeAction,
}: {
  model: RequestDeliverySlotModel
  outcomeAction?: RequestDeliveryReceiptServerAction
  acknowledgeAction?: RequestDeliveryServerAction
}) {
  const canShow = model.commands.canRecordRequesterOutcome
    || model.commands.canAcknowledge
  if (!canShow) return null

  return (
    <section className="border-t border-surface-200 px-4 py-5 sm:px-6" aria-labelledby="delivery-outcome-heading">
      <h3 id="delivery-outcome-heading" className="text-sm font-black text-surface-900">
        Delivery outcome
      </h3>
      <p className="mt-2 text-xs leading-5 text-surface-600">
        Record whether the reviewed delivery met the original accepted checks.
      </p>

      {model.commands.canRecordRequesterOutcome && outcomeAction ? (
        <RequesterDeliveryOutcomeForms model={model} action={outcomeAction} />
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {model.commands.canAcknowledge && acknowledgeAction ? (
          <form action={acknowledgeAction}>
            <CommandContext command="acknowledge_delivery" model={model} />
            <input
              type="hidden"
              name="delivery_revision_id"
              value={model.currentDeliveryRevisionId ?? ''}
            />
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-surface-300 bg-white px-4 py-2.5 text-sm font-bold text-surface-900 hover:border-surface-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            >
              Acknowledge delivery
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        ) : null}
      </div>

      {(model.commands.canRecordRequesterOutcome && !outcomeAction)
        || (model.commands.canAcknowledge && !acknowledgeAction) ? (
        <p className="mt-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
          Delivery outcome actions are temporarily unavailable. No outcome has been recorded.
        </p>
      ) : null}
    </section>
  )
}

function ReviewHistory({ model }: { model: RequestDeliverySlotModel }) {
  const hasReview = model.review.status !== 'not_started'
  if (!hasReview && model.repairHistory.length === 0) return null
  const reviewedAt = formatTimestamp(model.review.reviewedAt)

  return (
    <section className="border-t border-surface-200 px-4 py-5 sm:px-6" aria-labelledby="delivery-history-heading">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-surface-500" aria-hidden="true" />
        <h3 id="delivery-history-heading" className="text-sm font-black text-surface-900">
          Review and repair history
        </h3>
      </div>

      {hasReview ? (
        <div className="mt-4 border border-surface-200 bg-surface-50 p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm font-bold capitalize text-surface-900">
              {model.review.status.replace('_', ' ')}
            </p>
            {model.review.reviewerDisplayName ? (
              <span className="text-xs text-surface-600">Reviewer: {model.review.reviewerDisplayName}</span>
            ) : null}
            {reviewedAt ? (
              <time className="text-xs text-surface-600" dateTime={model.review.reviewedAt ?? undefined}>
                {reviewedAt}
              </time>
            ) : null}
          </div>
          {model.review.reason ? (
            <p className="mt-2 text-sm leading-6 text-surface-700">{model.review.reason}</p>
          ) : null}
          {model.review.reviewNotes ? (
            <p className="mt-2 text-sm leading-6 text-surface-700">{model.review.reviewNotes}</p>
          ) : null}
          {model.review.repairInstructions ? (
            <p className="mt-2 text-sm leading-6 text-surface-700">
              Repair instructions: {model.review.repairInstructions}
            </p>
          ) : null}
          {model.review.checks.length > 0 ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Recorded review checks">
              {model.review.checks.map((item, index) => (
                <CheckResult key={`${item.label}-${index}`} item={item} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {model.repairHistory.length > 0 ? (
        <ol className="mt-4 space-y-2">
          {model.repairHistory.map((item, index) => {
            const timestamp = formatTimestamp(item.reviewedAt)
            return (
              <li key={`${item.revisionNumber ?? 'unknown'}-${index}`} className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-bold text-amber-950">Repair requested</p>
                  {item.revisionNumber !== null ? (
                    <span className="text-xs text-amber-900">Revision {item.revisionNumber}</span>
                  ) : null}
                  {timestamp ? (
                    <time className="text-xs text-amber-900" dateTime={item.reviewedAt ?? undefined}>
                      {timestamp}
                    </time>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-950">{item.reason}</p>
                <p className="mt-1 text-sm leading-6 text-amber-950">
                  Repair instructions: {item.repairInstructions}
                </p>
                {item.reviewerDisplayName ? (
                  <p className="mt-1 text-xs text-amber-900">Reviewed by {item.reviewerDisplayName}</p>
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : null}

      {model.requesterOutcomes.length > 0 ? (
        <ol className="mt-4 space-y-2" aria-label="Requester delivery outcomes">
          {model.requesterOutcomes.map((outcome, index) => (
            <li key={`${outcome.occurredAt}-${index}`} className="border border-surface-200 bg-white p-3">
              <p className="text-sm font-bold text-surface-900">
                {outcome.outcome === 'useful'
                  ? 'Requester marked this delivery useful'
                  : `Requester reported a failed check${outcome.acceptanceCheckLabel ? `: ${outcome.acceptanceCheckLabel}` : ''}`}
              </p>
              {outcome.reason ? (
                <p className="mt-1 text-sm leading-6 text-surface-700">{outcome.reason}</p>
              ) : null}
              <time className="mt-1 block text-xs text-surface-500" dateTime={outcome.occurredAt}>
                {formatTimestamp(outcome.occurredAt)}
              </time>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}

export function RequestDeliverySlot({ model, mode, actions }: RequestDeliverySlotProps) {
  if (model.visibility !== 'full') {
    return (
      <section
        id="request-delivery-workflow"
        className="w-full min-w-0 max-w-full overflow-hidden border border-surface-200 bg-white p-4 sm:p-6"
        aria-labelledby="request-delivery-heading"
        data-request-delivery-slot
        data-delivery-mode={mode}
      >
        <h2 id="request-delivery-heading" className="text-xl font-black text-surface-900">
          Private delivery unavailable
        </h2>
        <div className="mt-4">
          <StateNotice model={model} />
        </div>
      </section>
    )
  }

  return (
    <section
      id="request-delivery-workflow"
      className="w-full min-w-0 max-w-full overflow-hidden border border-surface-200 bg-white"
      aria-labelledby="request-delivery-heading"
      data-request-delivery-slot
      data-delivery-mode={mode}
    >
      <header className="px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-brand-orange-ink">
            Private delivery
          </p>
          {mode === 'admin' ? (
            <span className="border border-surface-300 bg-surface-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-surface-600">
              Admin view
            </span>
          ) : null}
        </div>
        <h2 id="request-delivery-heading" className="mt-2 text-xl font-black text-surface-900">
          Delivery, evidence, and review
        </h2>
        <p className="mt-2 text-sm leading-6 text-surface-600">
          This private area records the builder’s exact revision and its independent review. It is not a public project page.
        </p>
        <div className="mt-4">
          <StateNotice model={model} />
        </div>
      </header>

      <DeliveryEvidence model={model} />
      <BuilderSubmission model={model} />
      <ReviewerActions model={model} action={actions?.review} />
      <RequesterOutcome
        model={model}
        outcomeAction={actions?.requesterOutcome}
        acknowledgeAction={actions?.acknowledge}
      />
      <ReviewHistory model={model} />
    </section>
  )
}
