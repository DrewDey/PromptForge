'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp } from 'lucide-react'
import type {
  RequestDeliveryAcceptanceCheck,
  RequestDeliveryBuilderWorkspaceSummary,
} from '@/lib/build-requests/delivery-view'

const MAX_FILES = 5
const MAX_FILE_BYTES = 4_000_000
const MAX_TOTAL_BYTES = 12_000_000
const PREPARE_ROUTE = '/api/request-deliveries/prepare'
const UPLOAD_ROUTE = '/api/request-deliveries/artifacts'
const SUBMIT_ROUTE = '/api/request-deliveries/submit'
const SAFE_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  auth_required: 'Sign in again before continuing this private delivery.',
  forbidden: 'The current participant is not allowed to perform this delivery action.',
  held: 'This case is held. Delivery work is unavailable.',
  removed: 'This case was removed. Delivery work is unavailable.',
  stale_version: 'The case changed. Reload and try the action again.',
  rate_limited: 'Too many delivery attempts were made. Wait briefly and try again.',
  artifact_staging_limit: 'This revision reached its lifetime staging limit. Begin a fresh authorized repair or revision path if one is available.',
  invalid_upload: 'The file did not meet the private delivery requirements.',
  integrity_failed: 'The file could not pass the private integrity check.',
  unavailable: 'The private delivery service is temporarily unavailable.',
}

export type BuilderDeliveryUploaderProps = {
  requestId: string
  expectedVersion: number
  acceptanceChecks: readonly RequestDeliveryAcceptanceCheck[]
  workspace: RequestDeliveryBuilderWorkspaceSummary | null
  canStageArtifact: boolean
  canAbandonArtifact: boolean
  canPrepareRevision: boolean
  canContinue: boolean
  submitKind: 'submit_delivery' | 'resubmit_delivery' | null
}

class DeliveryUiError extends Error {}

async function safeJson(response: Response) {
  try {
    return await response.json() as Record<string, unknown>
  } catch {
    return {}
  }
}

function safeError(payload: Record<string, unknown>, fallback: string) {
  return typeof payload.code === 'string'
    ? SAFE_ERROR_MESSAGES[payload.code] ?? fallback
    : fallback
}

function receiptVersion(
  payload: Record<string, unknown>,
  expected: {
    minimumVersion: number
    requireArtifactId?: boolean
  },
) {
  if (
    typeof payload.requestVersion !== 'number'
    || !Number.isSafeInteger(payload.requestVersion)
    || payload.requestVersion < expected.minimumVersion
    || (
      expected.requireArtifactId
      && (
        typeof payload.artifactId !== 'string'
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          payload.artifactId,
        )
      )
    )
  ) {
    throw new DeliveryUiError('The delivery authority returned an inconsistent receipt.')
  }
  return payload.requestVersion
}

export function BuilderDeliveryUploader({
  requestId,
  expectedVersion,
  acceptanceChecks,
  workspace,
  canStageArtifact,
  canAbandonArtifact,
  canPrepareRevision,
  canContinue,
  submitKind,
}: BuilderDeliveryUploaderProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const needsPreparation = workspace === null || workspace.revisionState === 'staging'
  const canResume = workspace !== null

  async function abandonArtifact(artifactId: string) {
    if (busy || !workspace) return
    setBusy(true)
    setError(null)
    setProgress('Removing the staged file from this revision…')
    try {
      const response = await fetch(UPLOAD_ROUTE, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          deliveryRevisionId: workspace.deliveryRevisionId,
          artifactId,
          idempotencyKey: `delivery-abandon-${workspace.deliveryRevisionId}-${artifactId}`,
        }),
      })
      const payload = await safeJson(response)
      if (!response.ok) {
        throw new DeliveryUiError(safeError(payload, 'The staged file could not be removed.'))
      }
      receiptVersion(payload, { minimumVersion: expectedVersion })
      setProgress('Staged file removed.')
      router.refresh()
    } catch (caught) {
      setProgress(null)
      setError(caught instanceof DeliveryUiError
        ? caught.message
        : 'The private delivery service is temporarily unavailable.')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !canContinue) return
    setBusy(true)
    setError(null)

    try {
      const form = event.currentTarget
      const data = new FormData(form)
      const files = data.getAll('artifacts').filter((value): value is File => (
        value instanceof File && value.size > 0
      ))
      const existingArtifactCount = workspace?.artifacts.length ?? 0

      if (files.length + existingArtifactCount < 1 || files.length + existingArtifactCount > MAX_FILES) {
        throw new DeliveryUiError('The canonical workspace must contain one to five builder-produced files.')
      }
      if (files.length > 0 && !canStageArtifact) {
        throw new DeliveryUiError('The current authority does not allow another artifact to be staged.')
      }
      if (files.some(file => file.size > MAX_FILE_BYTES)) {
        throw new DeliveryUiError('Each private delivery file must be between 1 byte and 4 MB.')
      }
      const existingBytes = workspace?.artifacts.reduce(
        (total, artifact) => total + artifact.byteLength,
        0,
      ) ?? 0
      if (existingBytes + files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) {
        throw new DeliveryUiError('The private delivery may contain at most 12 MB total.')
      }

      const deliveryRevisionId = workspace?.deliveryRevisionId ?? crypto.randomUUID()
      let requestVersion = expectedVersion

      // Frozen custody order: stage each exact file, let the authenticated
      // route place it in custody, then prepare evidence, seal, and submit.
      for (const [index, file] of files.entries()) {
        const artifactOrdinal = existingArtifactCount + index + 1
        const clientFileId = crypto.randomUUID()
        setProgress(`Securing file ${index + 1} of ${files.length}…`)
        const upload = new FormData()
        upload.set('requestId', requestId)
        upload.set('expectedVersion', String(requestVersion))
        upload.set('deliveryRevisionId', deliveryRevisionId)
        upload.set('artifactOrdinal', String(artifactOrdinal))
        upload.set('clientFileId', clientFileId)
        upload.set(
          'idempotencyKey',
          `delivery-stage-${deliveryRevisionId}-${artifactOrdinal}-${clientFileId}`,
        )
        upload.set('artifact', file)

        const response = await fetch(UPLOAD_ROUTE, {
          method: 'POST',
          body: upload,
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        })
        const payload = await safeJson(response)
        if (!response.ok) {
          throw new DeliveryUiError(safeError(payload, `File ${index + 1} could not be secured.`))
        }
        requestVersion = receiptVersion(payload, {
          minimumVersion: requestVersion,
          requireArtifactId: true,
        })
      }

      if (needsPreparation) {
        if (!canPrepareRevision) {
          throw new DeliveryUiError('The current authority does not allow this revision to be prepared.')
        }
        const builderEvidence = acceptanceChecks.map(check => ({
          acceptanceCheckId: check.id,
          result: data.get(`evidence_result_${check.id}`),
          evidenceText: data.get(`evidence_${check.id}`),
          evidenceRef: null,
        }))
        setProgress('Preparing the exact evidence and rights record…')
        const preparationResponse = await fetch(PREPARE_ROUTE, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId,
            expectedVersion: requestVersion,
            deliveryRevisionId,
            idempotencyKey: `delivery-prepare-${deliveryRevisionId}`,
            revisionLabel: data.get('revision_label'),
            summary: data.get('summary'),
            builderEvidence,
            builderAttestation: data.get('builder_attestation'),
          }),
        })
        const preparationPayload = await safeJson(preparationResponse)
        if (!preparationResponse.ok) {
          throw new DeliveryUiError(safeError(
            preparationPayload,
            'The delivery revision could not be prepared.',
          ))
        }
        requestVersion = receiptVersion(preparationPayload, {
          minimumVersion: requestVersion,
        })
      }

      setProgress('Sealing the exact revision for independent review…')
      const response = await fetch(SUBMIT_ROUTE, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          expectedVersion: requestVersion,
          deliveryRevisionId,
          idempotencyKey: `delivery-seal-submit-${deliveryRevisionId}-${requestVersion}`,
          requestedCommand: submitKind,
        }),
      })
      const payload = await safeJson(response)
      if (!response.ok) {
        throw new DeliveryUiError(safeError(payload, 'The exact delivery revision could not be submitted.'))
      }
      receiptVersion(payload, {
        minimumVersion: requestVersion,
      })
      setProgress('Delivery secured and sent for independent review.')
      form.reset()
      router.refresh()
    } catch (caught) {
      setProgress(null)
      setError(caught instanceof DeliveryUiError
        ? caught.message
        : 'The private delivery service is temporarily unavailable.')
      // Any successful stage is canonical server state. Refresh instead of
      // treating browser-local progress as the retry authority.
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      {canResume ? (
        <div className="border border-accent-200 bg-accent-50 p-3 text-sm text-accent-900" role="status">
          <p className="font-bold">Canonical workspace found</p>
          <p className="mt-1 text-xs leading-5">
            Resume from {workspace.revisionState}. {workspace.artifacts.length} secured
            {workspace.artifacts.length === 1 ? ' file is' : ' files are'} recorded by the Request service.
          </p>
          {canAbandonArtifact
          && workspace.revisionState === 'staging'
          && workspace.artifacts.length > 0 ? (
            <ul className="mt-3 space-y-2" aria-label="Staged files">
              {workspace.artifacts.map(artifact => (
                <li
                  key={artifact.artifactId}
                  className="flex flex-col gap-2 border border-accent-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="break-words text-xs font-semibold text-surface-800">
                    {artifact.label}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void abandonArtifact(artifact.artifactId)}
                    className="min-h-11 border border-red-300 px-3 py-2 text-xs font-bold text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove staged file
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {needsPreparation ? (
        <>
          <div>
            <label htmlFor="request-delivery-revision-label" className="block text-xs font-bold text-surface-700">
              Revision label
            </label>
            <input
              id="request-delivery-revision-label"
              name="revision_label"
              required
              minLength={1}
              maxLength={80}
              placeholder="Initial delivery"
              className="mt-2 min-h-11 w-full border border-surface-300 bg-white px-3 py-2 text-base text-surface-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="request-delivery-summary" className="block text-xs font-bold text-surface-700">
              What is included
            </label>
            <textarea
              id="request-delivery-summary"
              name="summary"
              required
              minLength={1}
              maxLength={2_000}
              rows={3}
              className="mt-2 w-full border border-surface-300 bg-white px-3 py-2 text-base leading-6 text-surface-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:text-sm"
            />
          </div>
        </>
      ) : (
        <div className="border border-surface-200 bg-surface-50 p-3">
          <p className="text-sm font-bold text-surface-900">
            {workspace?.revisionLabel ?? 'Prepared private revision'}
          </p>
          {workspace?.summary ? (
            <p className="mt-1 text-xs leading-5 text-surface-600">{workspace.summary}</p>
          ) : null}
        </div>
      )}

      {workspace?.revisionState !== 'sealed' && canStageArtifact ? (
        <div>
          <label htmlFor="request-delivery-artifacts" className="block text-xs font-bold text-surface-700">
            Builder-produced files
          </label>
          <input
            id="request-delivery-artifacts"
            name="artifacts"
            type="file"
            required={(workspace?.artifacts.length ?? 0) === 0}
            multiple
            accept=".html,.htm,.txt,.md,.markdown,.json,.csv,.png,.jpg,.jpeg"
            className="mt-2 block min-h-11 w-full border border-surface-300 bg-white px-3 py-2 text-sm text-surface-700 file:mr-3 file:border-0 file:bg-surface-900 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          />
          <p className="mt-2 text-xs leading-5 text-surface-500">
            Up to five static HTML, Markdown, plain-text, JSON, CSV, PNG, or JPEG files; 4 MB each and 12 MB total. Active content, archives, and requester attachments are not accepted.
          </p>
        </div>
      ) : null}

      {needsPreparation ? (
        <>
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-surface-700">Evidence for the accepted checks</legend>
            {acceptanceChecks.map(check => (
              <div key={check.id} className="border border-surface-200 bg-surface-50 p-3">
                <p className="text-xs font-bold text-surface-700">{check.label}</p>
                <label htmlFor={`request-delivery-evidence-result-${check.id}`} className="mt-3 block text-xs font-semibold text-surface-700">
                  Result
                </label>
                <select
                  id={`request-delivery-evidence-result-${check.id}`}
                  name={`evidence_result_${check.id}`}
                  required
                  defaultValue="pass"
                  className="mt-1 min-h-11 w-full border border-surface-300 bg-white px-3 py-2 text-base text-surface-900 sm:text-sm"
                >
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                  <option value="not_run">Not run</option>
                </select>
                <label htmlFor={`request-delivery-evidence-${check.id}`} className="mt-3 block text-xs font-semibold text-surface-700">
                  Evidence
                </label>
                <textarea
                  id={`request-delivery-evidence-${check.id}`}
                  name={`evidence_${check.id}`}
                  rows={3}
                  required
                  minLength={1}
                  maxLength={2_000}
                  placeholder="Record the result and the evidence you checked."
                  className="mt-1 w-full border border-surface-300 bg-white px-3 py-2 text-base leading-6 text-surface-900 placeholder:text-surface-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:text-sm"
                />
              </div>
            ))}
          </fieldset>
          <label className="flex items-start gap-3 border border-surface-200 bg-surface-50 p-3 text-sm leading-6 text-surface-700">
            <input
              type="checkbox"
              name="builder_attestation"
              value="confirmed"
              required
              className="mt-1 h-4 w-4 shrink-0 accent-surface-900"
            />
            <span>
              I authored this revision, checked it against the accepted brief, and included no secrets or customer data.
            </span>
          </label>
        </>
      ) : null}

      {error ? <p role="alert" className="text-sm font-semibold text-red-800">{error}</p> : null}
      {progress ? <p role="status" className="text-sm text-surface-700">{progress}</p> : null}
      {canContinue ? (
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-surface-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-surface-700 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:w-auto"
        >
          {busy ? 'Securing private revision…' : 'Continue exact revision workflow'}
          <FileUp className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </form>
  )
}
