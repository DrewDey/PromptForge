'use client'

import { useRef, useState } from 'react'
import { Download, ExternalLink, Eye } from 'lucide-react'
import {
  beginRequestDeliveryPreview,
  INITIAL_REQUEST_DELIVERY_PREVIEW_STATE,
} from '@/lib/build-requests/delivery-interaction-state'

export const REQUEST_DELIVERY_INTERACTION_BROWSER_EVENT =
  'pathforge:request-delivery-interaction'

export type RequestDeliveryInteractionBrowserEventDetail = {
  event: 'delivery_opened'
  interaction: 'open' | 'download' | 'preview'
}

function emitInteraction(
  interaction: RequestDeliveryInteractionBrowserEventDetail['interaction'],
) {
  const detail: RequestDeliveryInteractionBrowserEventDetail = {
    event: 'delivery_opened',
    interaction,
  }
  window.dispatchEvent(new CustomEvent(
    REQUEST_DELIVERY_INTERACTION_BROWSER_EVENT,
    { detail },
  ))
}

async function confirmProtectedReader(path: string) {
  try {
    const response = await fetch(path, {
      method: 'HEAD',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: '*/*' },
    })
    return response.ok
  } catch {
    return false
  }
}

export function RequestDeliveryArtifactLinks({
  openPath,
  downloadPath,
}: {
  openPath: string | null
  downloadPath: string | null
}) {
  const [busy, setBusy] = useState<'open' | 'download' | null>(null)
  const [error, setError] = useState(false)

  async function openAfterConfirmation(
    path: string,
    interaction: 'open' | 'download',
  ) {
    if (busy) return
    setBusy(interaction)
    setError(false)
    const ready = await confirmProtectedReader(path)
    if (!ready) {
      setBusy(null)
      setError(true)
      return
    }
    emitInteraction(interaction)
    window.location.assign(path)
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {openPath ? (
          <button
            type="button"
            disabled={busy !== null}
            data-request-delivery-interaction="open"
            onClick={() => void openAfterConfirmation(openPath, 'open')}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-surface-300 bg-white px-3 py-2 text-sm font-bold text-surface-900 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            {busy === 'open' ? 'Verifying…' : 'Open safely'}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        {downloadPath ? (
          <button
            type="button"
            disabled={busy !== null}
            data-request-delivery-interaction="download"
            onClick={() => void openAfterConfirmation(downloadPath, 'download')}
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-surface-900 px-3 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            {busy === 'download' ? 'Verifying…' : 'Download'}
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-800" role="alert">
          The private artifact could not be verified for access. Reload before trying again.
        </p>
      ) : null}
    </>
  )
}

export function RequestDeliveryArtifactPreview({
  openPath,
  label,
}: {
  openPath: string
  label: string
}) {
  const [preview, setPreview] = useState(
    INITIAL_REQUEST_DELIVERY_PREVIEW_STATE,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const previewEventEmitted = useRef(false)

  async function openPreview() {
    if (preview.readerPath || busy) return
    setBusy(true)
    setError(false)
    const ready = await confirmProtectedReader(openPath)
    if (!ready) {
      setBusy(false)
      setError(true)
      return
    }
    setPreview(beginRequestDeliveryPreview(openPath))
    setBusy(false)
  }

  function recordLoadedPreview() {
    if (previewEventEmitted.current) return
    previewEventEmitted.current = true
    emitInteraction('preview')
  }

  return (
    <div className="mt-4 border border-surface-200 bg-surface-50 p-3">
      <p className="text-xs font-bold text-surface-700">
        Script-disabled private preview: {label}
      </p>
      {preview.readerPath ? (
        <iframe
          src={preview.readerPath}
          title={`Private delivery preview: ${label}`}
          sandbox=""
          referrerPolicy="no-referrer"
          onLoad={recordLoadedPreview}
          className="mt-2 h-80 w-full border border-surface-300 bg-white"
        />
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void openPreview()}
          data-request-delivery-interaction="preview"
          className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 border border-surface-300 bg-white px-3 py-2 text-sm font-bold text-surface-900 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          {busy ? 'Verifying…' : 'Preview safely'}
          <Eye className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-800" role="alert">
          The private preview could not be verified. Reload before trying again.
        </p>
      ) : null}
      <p className="mt-2 text-xs leading-5 text-surface-500">
        This untrusted file is fetched only after you choose Preview safely and is embedded without scripts, navigation privileges, forms, or same-origin access.
      </p>
    </div>
  )
}
