'use client'

import { useState } from 'react'
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

export function RequestDeliveryArtifactLinks({
  openPath,
  downloadPath,
}: {
  openPath: string | null
  downloadPath: string | null
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {openPath ? (
        <a
          href={openPath}
          data-request-delivery-interaction="open"
          onClick={() => emitInteraction('open')}
          className="inline-flex min-h-11 items-center justify-center gap-2 border border-surface-300 bg-white px-3 py-2 text-sm font-bold text-surface-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          Open safely
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}
      {downloadPath ? (
        <a
          href={downloadPath}
          download
          data-request-delivery-interaction="download"
          onClick={() => emitInteraction('download')}
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-surface-900 px-3 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          Download
          <Download className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}
    </div>
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

  function openPreview() {
    if (preview.readerPath) return
    setPreview(beginRequestDeliveryPreview(openPath))
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
          className="mt-2 h-80 w-full border border-surface-300 bg-white"
        />
      ) : (
        <button
          type="button"
          onClick={openPreview}
          data-request-delivery-interaction="preview"
          className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 border border-surface-300 bg-white px-3 py-2 text-sm font-bold text-surface-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          Preview safely
          <Eye className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <p className="mt-2 text-xs leading-5 text-surface-500">
        This untrusted file is fetched only after you choose Preview safely and is embedded without scripts, navigation privileges, forms, or same-origin access.
      </p>
    </div>
  )
}
