'use client'

import { Fragment, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, ExternalLink, GitFork } from 'lucide-react'
import CopyButton from '@/app/prompt/[id]/CopyButton'
import MyForgeResumeTracker from '@/components/MyForgeResumeTracker'
import ProjectForkBuildPath, {
  type ProjectForkBuildPathCrumb,
} from '@/components/ProjectForkBuildPath'
import { SourceRunEvidenceFooter } from '@/components/SourceRunEvidenceFooter'
import {
  artifactDocumentKey,
  currentArtifactLoad,
} from '@/lib/model-variant-ui.mjs'
import {
  artifactDownloadBridgeSource,
  buildProtectedArtifactWrapperDocument,
  PROTECTED_ARTIFACT_DOWNLOAD_DATA_URL_LIMIT,
} from '@/lib/protected-artifact-wrapper.mjs'
import { getPublicModelIdentityLabel } from '@/lib/public-model-labels'
import {
  resolvePublicSourceEvidence,
  type PublicEvidenceTruth,
} from '@/lib/public-source-evidence'
import {
  buildProjectResponseForkHref,
  groupProjectForkNetworkBySourceStep,
  type ProjectForkNetworkItem,
  type ProjectForkSourceStep,
} from '@/lib/project-forks'

export type SourceRunShowcaseCallout = {
  tone: 'warning' | 'success' | 'neutral'
  title: string
  body: string
}

export type SourceRunShowcaseStep = {
  id: string
  stepNumber: number
  title: string
  prompt: string
  response: string
  responseCopyText?: string
  artifactPath?: string | null
  artifactTitle?: string
  artifactVersions?: SourceRunShowcaseArtifactVersion[]
  callout?: SourceRunShowcaseCallout
}

export type SourceRunShowcaseArtifactVersion = {
  id?: string
  artifactPath: string
  artifactTitle: string
  artifactSha256?: string
  isDefault?: boolean
}

export type ArtifactPackage = Pick<
  SourceRunShowcaseStep,
  'id' | 'stepNumber' | 'title' | 'prompt' | 'response' | 'responseCopyText' | 'callout'
> & {
  stepId: string
  artifactPath: string
  artifactTitle: string
  artifactOrdinal: number
  artifactCount: number
  artifactSha256?: string
  providerName?: string
  isDefaultArtifact: boolean
}

export type SourceRunShowcaseForkContext = {
  sourceSteps: ProjectForkSourceStep[]
  branch: ProjectForkNetworkItem
  trail?: ProjectForkBuildPathCrumb[]
  sourceProjectHref?: string | null
  sourceRunHref?: string | null
  newForkHref?: string | null
}

type ArtifactSize = {
  width: number
  height: number
}

type LoadedArtifactSource = {
  packageId: string
  artifactPath: string
  srcDoc: string | null
  error: 'fetch-failed' | 'response-invalid' | 'too-large' | null
}

type MeasuredArtifact = {
  packageId: string
  artifactPath: string
  size: ArtifactSize & {
    viewportWidth: number
    viewportHeight: number
  }
}

const ARTIFACT_FRAME_HEIGHT = 'clamp(520px, calc(100svh - 160px), 760px)'
const MAX_MEASURED_ARTIFACT_FRAME_HEIGHT = 2400
const MAX_AUTO_FIT_ARTIFACT_HEIGHT = 6000
const MAX_AUTO_FIT_ARTIFACT_WIDTH = 14000
const MAX_AUTO_FIT_HTML_BYTES = 2_000_000
const MAX_ARTIFACT_STORAGE_BYTES = 1_000_000
const MAX_ARTIFACT_STORAGE_ENTRIES = 500
const MAX_ARTIFACT_STORAGE_KEY_LENGTH = 1024
const ARTIFACT_MEASUREMENT_SETTLE_MS = 1100
const ARTIFACT_STORAGE_PREFIX = 'pathforge:artifact-storage:v1'
const ARTIFACT_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'media-src data: blob:',
  'font-src data:',
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')
const STATIC_ARTIFACT_CSP = [
  "default-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  'img-src data:',
  'font-src data:',
  "media-src 'none'",
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function artifactViewerHref(artifact: Pick<ArtifactPackage, 'artifactPath' | 'artifactTitle'>, providerName: string) {
  const query = new URLSearchParams({
    path: artifact.artifactPath,
    title: artifact.artifactTitle,
    provider: providerName,
  })
  return `/artifact-viewer?${query.toString()}`
}

type ArtifactStorageScope = 'local' | 'session'
type ArtifactStorageSnapshot = Record<string, string>
type ArtifactStorageSnapshots = Record<ArtifactStorageScope, ArtifactStorageSnapshot>

function artifactStorageKey(scope: ArtifactStorageScope, artifactPath: string) {
  return `${ARTIFACT_STORAGE_PREFIX}:${scope}:${artifactPath}`
}

function normalizeArtifactStorageSnapshot(value: unknown): ArtifactStorageSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const entries = Object.entries(value)
  if (entries.length > MAX_ARTIFACT_STORAGE_ENTRIES) return null

  const snapshot = Object.create(null) as ArtifactStorageSnapshot
  const encoder = new TextEncoder()
  let totalBytes = 0

  for (const [key, entryValue] of entries) {
    if (
      key.length > MAX_ARTIFACT_STORAGE_KEY_LENGTH ||
      typeof entryValue !== 'string'
    ) {
      return null
    }

    totalBytes += encoder.encode(key).byteLength + encoder.encode(entryValue).byteLength
    if (totalBytes > MAX_ARTIFACT_STORAGE_BYTES) return null
    snapshot[key] = entryValue
  }

  return snapshot
}

function readArtifactStorageSnapshot(
  scope: ArtifactStorageScope,
  artifactPath: string,
): ArtifactStorageSnapshot {
  try {
    const storage = scope === 'local' ? window.localStorage : window.sessionStorage
    const raw = storage.getItem(artifactStorageKey(scope, artifactPath))
    if (!raw) return {}
    return normalizeArtifactStorageSnapshot(JSON.parse(raw)) ?? {}
  } catch {
    return {}
  }
}

function writeArtifactStorageSnapshot(
  scope: ArtifactStorageScope,
  artifactPath: string,
  value: unknown,
) {
  const snapshot = normalizeArtifactStorageSnapshot(value)
  if (!snapshot) return

  try {
    const storage = scope === 'local' ? window.localStorage : window.sessionStorage
    storage.setItem(artifactStorageKey(scope, artifactPath), JSON.stringify(snapshot))
  } catch {
    // Storage can be unavailable or full. The artifact keeps its in-frame copy.
  }
}

function scriptSafeJson(value: unknown) {
  return (JSON.stringify(value) ?? 'null')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function artifactStorageBootstrapSource(snapshots: ArtifactStorageSnapshots) {
  const initialState = scriptSafeJson(snapshots)

  return `
(() => {
  const initialState = ${initialState};
  const maxBytes = ${MAX_ARTIFACT_STORAGE_BYTES};
  const maxEntries = ${MAX_ARTIFACT_STORAGE_ENTRIES};
  const maxKeyLength = ${MAX_ARTIFACT_STORAGE_KEY_LENGTH};
  const encoder = new TextEncoder();

  const createStorage = (scope) => {
    const values = Object.assign(Object.create(null), initialState[scope] || {});
    const target = {};
    const keys = () => Object.keys(values);
    const snapshot = () => Object.fromEntries(keys().map((key) => [key, values[key]]));
    const withinQuota = () => {
      const currentKeys = keys();
      if (currentKeys.length > maxEntries) return false;
      let totalBytes = 0;
      for (const key of currentKeys) {
        if (key.length > maxKeyLength) return false;
        totalBytes += encoder.encode(key).byteLength + encoder.encode(values[key]).byteLength;
        if (totalBytes > maxBytes) return false;
      }
      return true;
    };
    const notify = () => {
      window.parent.postMessage({
        type: 'pathforge-artifact-storage',
        scope,
        entries: snapshot(),
      }, '*');
    };
    const methods = {
      clear() {
        for (const key of keys()) delete values[key];
        notify();
      },
      getItem(key) {
        const normalizedKey = String(key);
        return Object.prototype.hasOwnProperty.call(values, normalizedKey)
          ? values[normalizedKey]
          : null;
      },
      key(index) {
        const normalizedIndex = Number(index);
        return Number.isInteger(normalizedIndex) && normalizedIndex >= 0
          ? keys()[normalizedIndex] ?? null
          : null;
      },
      removeItem(key) {
        delete values[String(key)];
        notify();
      },
      setItem(key, value) {
        const normalizedKey = String(key);
        const hadValue = Object.prototype.hasOwnProperty.call(values, normalizedKey);
        const previousValue = values[normalizedKey];
        values[normalizedKey] = String(value);
        if (!withinQuota()) {
          if (hadValue) values[normalizedKey] = previousValue;
          else delete values[normalizedKey];
          throw new DOMException('Artifact storage quota exceeded.', 'QuotaExceededError');
        }
        notify();
      },
    };

    return new Proxy(target, {
      deleteProperty(_target, property) {
        if (typeof property === 'string') {
          methods.removeItem(property);
          return true;
        }
        return false;
      },
      get(_target, property) {
        if (property === 'length') return keys().length;
        if (property === Symbol.toStringTag) return 'Storage';
        if (typeof property === 'string' && property in methods) return methods[property];
        if (property in target) return Reflect.get(target, property);
        if (typeof property === 'string') return methods.getItem(property);
        return undefined;
      },
      getOwnPropertyDescriptor(_target, property) {
        if (typeof property === 'string' && Object.prototype.hasOwnProperty.call(values, property)) {
          return { configurable: true, enumerable: true, value: values[property], writable: true };
        }
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
      ownKeys() {
        return Reflect.ownKeys(target).concat(keys());
      },
      set(_target, property, value) {
        if (typeof property !== 'string') return false;
        methods.setItem(property, value);
        return true;
      },
    });
  };

  try {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorage('local'),
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: createStorage('session'),
    });
  } catch {
    // The artifact remains usable even when this browser refuses the shim.
  }
})();`
}

function artifactFitProbeSource() {
  return `
(() => {
  const sendSize = () => {
    const doc = document.documentElement;
    const body = document.body;
    const width = Math.max(doc ? doc.scrollWidth : 0, body ? body.scrollWidth : 0, window.innerWidth);
    const height = Math.max(doc ? doc.scrollHeight : 0, body ? body.scrollHeight : 0, window.innerHeight);
    window.parent.postMessage({
      type: 'pathforge-artifact-size',
      width,
      height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }, '*');
    window.dispatchEvent(new Event('pathforge-artifact-size-reported'));
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(() => {
      scheduled = false;
      sendSize();
    }, 0);
  };

  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
  }
  setTimeout(schedule, 60);
  setTimeout(schedule, 300);
  setTimeout(schedule, 1000);
})();`
}

function injectArtifactFitProbe(
  html: string,
  storageSnapshots: ArtifactStorageSnapshots,
  allowArtifactDownloads: boolean,
  allowArtifactScripts: boolean,
) {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const csp = parsed.createElement('meta')
  csp.httpEquiv = 'Content-Security-Policy'
  csp.content = allowArtifactScripts ? ARTIFACT_CSP : STATIC_ARTIFACT_CSP

  // Insert trusted policy bytes into the actual parsed head. Text that merely
  // looks like <head> or </body> inside artifact comments and strings cannot
  // redirect these controls into attacker-owned content.
  if (allowArtifactScripts) {
    const storageBootstrap = parsed.createElement('script')
    storageBootstrap.textContent = artifactStorageBootstrapSource(storageSnapshots)
    if (allowArtifactDownloads) {
      const downloadBridge = parsed.createElement('script')
      downloadBridge.textContent = artifactDownloadBridgeSource()
      parsed.head.prepend(downloadBridge)
    }
    parsed.head.prepend(storageBootstrap)

    const fitProbe = parsed.createElement('script')
    fitProbe.textContent = artifactFitProbeSource()
    parsed.body.append(fitProbe)
  }
  parsed.head.prepend(csp)

  return `<!doctype html>\n${parsed.documentElement.outerHTML}`
}

export function ProtectedArtifactFrame({
  selectedPackage,
  providerName,
  showOpenAction = true,
  frameHeight,
  contextLabel,
  bare = false,
  frameId = 'final-result',
  viewerFitControls = false,
  allowArtifactDownloads = true,
  allowArtifactScripts = true,
}: {
  selectedPackage: ArtifactPackage
  providerName: string
  showOpenAction?: boolean
  frameHeight?: string
  contextLabel?: string
  bare?: boolean
  frameId?: string
  viewerFitControls?: boolean
  allowArtifactDownloads?: boolean
  allowArtifactScripts?: boolean
}) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const artifactDocumentGenerationRef = useRef(0)
  const lastDownloadAtRef = useRef(-Infinity)
  const measuredArtifactRef = useRef<MeasuredArtifact | null>(null)
  const frameSizeRef = useRef<ArtifactSize | null>(null)
  const viewerModeRef = useRef<'readable' | 'fit-whole'>('readable')
  const viewerMeasurementRefreshPendingRef = useRef(false)
  const expansionFeedbackCountRef = useRef(new Map<string, number>())
  const [frameSize, setFrameSize] = useState<ArtifactSize | null>(null)
  const [loadedArtifact, setLoadedArtifact] = useState<LoadedArtifactSource | null>(null)
  const [measuredArtifact, setMeasuredArtifact] = useState<MeasuredArtifact | null>(null)
  const [settledArtifactPackageId, setSettledArtifactPackageId] = useState<string | null>(null)
  const [artifactDocumentGeneration, setArtifactDocumentGeneration] = useState(0)
  const [settledArtifactDocumentGeneration, setSettledArtifactDocumentGeneration] = useState(-1)
  const [viewerMode, setViewerMode] = useState<'readable' | 'fit-whole'>('readable')
  const [viewerMeasurementRefreshPending, setViewerMeasurementRefreshPending] = useState(false)
  const [guardedArtifactPackageIds, setGuardedArtifactPackageIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const selectedArtifactIdentity = artifactDocumentKey(
    selectedPackage.id,
    selectedPackage.artifactPath,
  )
  const activeLoadedArtifact = currentArtifactLoad(
    selectedPackage.id,
    selectedPackage.artifactPath,
    loadedArtifact,
  )
  const srcDoc = activeLoadedArtifact?.srcDoc ?? null
  const loadError = activeLoadedArtifact?.error ?? null
  const sourceResolved = Boolean(activeLoadedArtifact)
  const artifactSize = (
    measuredArtifact?.packageId === selectedPackage.id &&
    measuredArtifact.artifactPath === selectedPackage.artifactPath
  ) ? measuredArtifact.size : null
  const artifactDocumentRemounted =
    settledArtifactDocumentGeneration !== artifactDocumentGeneration
  const viewerUsesReadableSize = allowArtifactScripts && viewerFitControls && (
    viewerMode === 'readable' || viewerMeasurementRefreshPending
  )
  const viewerUsesAvailableHeight = viewerFitControls
  const usesMeasuredContentHeight = !bare && frameHeight === undefined
  const tracksArtifactMeasurement = allowArtifactScripts && (
    usesMeasuredContentHeight || viewerFitControls
  )
  const fallbackFrameHeight = frameHeight ?? ARTIFACT_FRAME_HEIGHT
  const setIframeElement = useCallback((node: HTMLIFrameElement | null) => {
    iframeRef.current = node
    if (!node) return
    artifactDocumentGenerationRef.current += 1
    setArtifactDocumentGeneration(artifactDocumentGenerationRef.current)
  }, [])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return undefined

    const updateFrameSize = () => {
      const rect = frame.getBoundingClientRect()
      const nextSize = {
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      }
      const current = frameSizeRef.current
      if (
        current &&
        Math.abs(current.width - nextSize.width) < 2 &&
        Math.abs(current.height - nextSize.height) < 2
      ) return

      frameSizeRef.current = nextSize
      if (
        current &&
        viewerFitControls &&
        viewerModeRef.current === 'fit-whole'
      ) {
        // Fit-whole owns a wider virtual viewport. Re-measure this same iframe
        // against the resized physical frame before scaling it again.
        viewerMeasurementRefreshPendingRef.current = true
        setViewerMeasurementRefreshPending(true)
        setSettledArtifactPackageId(null)
      }
      setFrameSize(nextSize)
    }

    updateFrameSize()
    const observer = new ResizeObserver(updateFrameSize)
    observer.observe(frame)

    return () => observer.disconnect()
  }, [viewerFitControls])

  useEffect(() => {
    const controller = new AbortController()
    const packageId = selectedPackage.id
    const artifactPath = selectedPackage.artifactPath

    async function loadArtifact() {
      try {
        const response = await fetch(selectedPackage.artifactPath, {
          signal: controller.signal,
          // Preview deployments can protect same-origin artifact routes with an
          // authentication cookie. Keep credentials origin-bound so protected
          // previews load without widening the artifact sandbox or leaking
          // credentials to another host.
          credentials: 'same-origin',
        })
        const contentLength = Number(response.headers.get('content-length'))

        if (!response.ok) {
          if (!controller.signal.aborted) {
            setLoadedArtifact({
              packageId,
              artifactPath,
              srcDoc: null,
              error: 'response-invalid',
            })
          }
          return
        }

        if (Number.isFinite(contentLength) && contentLength > MAX_AUTO_FIT_HTML_BYTES) {
          if (!controller.signal.aborted) {
            setLoadedArtifact({
              packageId,
              artifactPath,
              srcDoc: null,
              error: 'too-large',
            })
          }
          return
        }

        const html = await response.text()
        const htmlBytes = new TextEncoder().encode(html).byteLength
        if (htmlBytes > MAX_AUTO_FIT_HTML_BYTES) {
          if (!controller.signal.aborted) {
            setLoadedArtifact({
              packageId,
              artifactPath,
              srcDoc: null,
              error: 'too-large',
            })
          }
          return
        }

        const storageSnapshots: ArtifactStorageSnapshots = allowArtifactScripts
          ? {
              local: readArtifactStorageSnapshot('local', selectedPackage.artifactPath),
              session: readArtifactStorageSnapshot('session', selectedPackage.artifactPath),
            }
          : { local: {}, session: {} }

        if (!controller.signal.aborted) {
          const protectedArtifactDocument = injectArtifactFitProbe(
            html,
            storageSnapshots,
            allowArtifactDownloads,
            allowArtifactScripts,
          )
          setLoadedArtifact({
            packageId,
            artifactPath,
            srcDoc: buildProtectedArtifactWrapperDocument(protectedArtifactDocument, {
              allowArtifactScripts,
            }),
            error: null,
          })
        }
      } catch {
        if (controller.signal.aborted) return
        setLoadedArtifact({
          packageId,
          artifactPath,
          srcDoc: null,
          error: 'fetch-failed',
        })
      }
    }

    loadArtifact()

    return () => {
      controller.abort()
    }
  }, [allowArtifactDownloads, allowArtifactScripts, selectedPackage.artifactPath, selectedPackage.id])

  useEffect(() => {
    const packageId = selectedPackage.id
    const artifactPath = selectedPackage.artifactPath
    const artifactIdentity = artifactDocumentKey(packageId, artifactPath)
    let measurementSettleTimer = 0

    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'pathforge-artifact-storage') {
        if (data.scope !== 'local' && data.scope !== 'session') return
        writeArtifactStorageSnapshot(
          data.scope,
          selectedPackage.artifactPath,
          data.entries,
        )
        return
      }

      if (data.type === 'pathforge-artifact-download') {
        if (!allowArtifactDownloads) return
        const now = performance.now()
        if (
          now - lastDownloadAtRef.current < 750 ||
          typeof data.filename !== 'string' ||
          typeof data.dataUrl !== 'string' ||
          !data.dataUrl.startsWith('data:') ||
          data.dataUrl.length > PROTECTED_ARTIFACT_DOWNLOAD_DATA_URL_LIMIT
        ) return

        const filename = data.filename
          .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
          .replace(/^\.+/, '')
          .slice(0, 140) || 'artifact-download'
        lastDownloadAtRef.current = now
        const link = document.createElement('a')
        link.href = data.dataUrl
        link.download = filename
        link.rel = 'noreferrer'
        link.hidden = true
        document.body.append(link)
        link.click()
        link.remove()
        return
      }

      if (data.type !== 'pathforge-artifact-size') return
      const width = Number(data.width)
      const height = Number(data.height)
      const viewportWidth = Number(data.viewportWidth)
      const viewportHeight = Number(data.viewportHeight)
      if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        !Number.isFinite(viewportWidth) ||
        !Number.isFinite(viewportHeight)
      ) return

      // Fit-whole temporarily gives the iframe a much wider virtual viewport
      // before scaling it down. That responsive canvas is presentation state,
      // not the artifact's natural readable width. Never let it overwrite the
      // readable measurement, and reject a queued report if the iframe has
      // already changed viewport again during a rapid mode switch.
      if (
        viewerFitControls &&
        (
          frameRef.current?.dataset.artifactFitMode === 'scaled' ||
          Math.abs((iframeRef.current?.clientWidth ?? viewportWidth) - viewportWidth) >= 4
        )
      ) return

      const nextSize = {
        width: Math.max(1, Math.ceil(width)),
        height: Math.max(1, Math.ceil(height)),
        viewportWidth: Math.max(1, Math.ceil(viewportWidth)),
        viewportHeight: Math.max(1, Math.ceil(viewportHeight)),
      }
      if (tracksArtifactMeasurement) {
        const documentGeneration = artifactDocumentGenerationRef.current
        window.clearTimeout(measurementSettleTimer)
        setSettledArtifactPackageId(null)
        measurementSettleTimer = window.setTimeout(() => {
          setSettledArtifactPackageId(packageId)
          setSettledArtifactDocumentGeneration(documentGeneration)
          if (viewerMeasurementRefreshPendingRef.current) {
            viewerMeasurementRefreshPendingRef.current = false
            setViewerMeasurementRefreshPending(false)
          }
        }, ARTIFACT_MEASUREMENT_SETTLE_MS)
      }
      const current = measuredArtifactRef.current
      const followsExpandedViewport = Boolean(
        usesMeasuredContentHeight &&
        current?.packageId === packageId &&
        current.artifactPath === artifactPath &&
        Math.abs(nextSize.viewportHeight - current.size.height) < 4 &&
        nextSize.height > current.size.height + 4
      )
      if (followsExpandedViewport) {
        const expansionCount = (expansionFeedbackCountRef.current.get(artifactIdentity) ?? 0) + 1
        expansionFeedbackCountRef.current.set(artifactIdentity, expansionCount)
        if (expansionCount < 2) {
          const nextMeasurement = { packageId, artifactPath, size: nextSize }
          measuredArtifactRef.current = nextMeasurement
          setMeasuredArtifact(nextMeasurement)
          return
        }
        setGuardedArtifactPackageIds((current) => {
          if (current.has(artifactIdentity)) return current
          const next = new Set(current)
          next.add(artifactIdentity)
          return next
        })
        return
      }
      expansionFeedbackCountRef.current.delete(artifactIdentity)
      if (
        current?.packageId === packageId &&
        current.artifactPath === artifactPath &&
        Math.abs(current.size.width - nextSize.width) < 4 &&
        Math.abs(current.size.height - nextSize.height) < 4 &&
        Math.abs(current.size.viewportWidth - nextSize.viewportWidth) < 4 &&
        Math.abs(current.size.viewportHeight - nextSize.viewportHeight) < 4
      ) return

      const nextMeasurement = { packageId, artifactPath, size: nextSize }
      measuredArtifactRef.current = nextMeasurement
      setMeasuredArtifact(nextMeasurement)
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.clearTimeout(measurementSettleTimer)
    }
  }, [
    selectedPackage.artifactPath,
    selectedPackage.id,
    allowArtifactDownloads,
    allowArtifactScripts,
    tracksArtifactMeasurement,
    usesMeasuredContentHeight,
    viewerFitControls,
  ])

  const guardedFromMeasuredHeightFeedback = guardedArtifactPackageIds.has(selectedArtifactIdentity)
  const measuredWidthFitScale = frameSize && artifactSize
    ? Math.min(
        1,
        frameSize.width / Math.max(artifactSize.width, 1),
      )
    : 1
  const measuredRenderedHeight = artifactSize
    ? Math.max(1, Math.ceil(artifactSize.height * measuredWidthFitScale))
    : undefined
  const measuredFrameHeightLimit = MAX_MEASURED_ARTIFACT_FRAME_HEIGHT
  const exceedsMeasuredFrameHeightLimit = Boolean(
    usesMeasuredContentHeight &&
    measuredRenderedHeight &&
    measuredRenderedHeight > measuredFrameHeightLimit
  )
  const exceedsRawMeasurementLimit = Boolean(
    artifactSize && (
      artifactSize.height > MAX_AUTO_FIT_ARTIFACT_HEIGHT ||
      artifactSize.width > MAX_AUTO_FIT_ARTIFACT_WIDTH
    )
  )
  const canAutoFit =
    Boolean(srcDoc && frameSize && artifactSize) &&
    !guardedFromMeasuredHeightFeedback &&
    !exceedsMeasuredFrameHeightLimit &&
    !exceedsRawMeasurementLimit &&
    (artifactSize?.height ?? 0) <= MAX_AUTO_FIT_ARTIFACT_HEIGHT &&
    (artifactSize?.width ?? 0) <= MAX_AUTO_FIT_ARTIFACT_WIDTH
  const fitScale = canAutoFit && frameSize && artifactSize
    ? viewerUsesReadableSize
      ? 1
      : usesMeasuredContentHeight
      ? measuredWidthFitScale
      : Math.min(
          1,
          frameSize.height / Math.max(artifactSize.height, 1),
          frameSize.width / Math.max(artifactSize.width, 1),
        )
    : 1
  const shouldScale = canAutoFit && fitScale < 0.995
  const virtualWidth = shouldScale && frameSize
    ? Math.ceil(frameSize.width / fitScale)
    : undefined
  const virtualHeight = shouldScale && artifactSize
    ? Math.ceil(artifactSize.height)
    : undefined
  const measuredFrameHeight = usesMeasuredContentHeight && canAutoFit && artifactSize
    ? Math.max(1, Math.ceil(artifactSize.height * fitScale))
    : undefined
  const heightGuardMode = guardedFromMeasuredHeightFeedback
    ? 'feedback-loop'
    : exceedsRawMeasurementLimit
      ? 'measurement-limit'
      : exceedsMeasuredFrameHeightLimit
        ? 'expansion-limit'
        : 'none'
  const iframeStyle: CSSProperties = shouldScale
    ? {
        width: `${virtualWidth}px`,
        height: `${virtualHeight}px`,
        transform: `scale(${fitScale})`,
        transformOrigin: 'left top',
        border: 0,
      }
    : {
        width: '100%',
        height: '100%',
        border: 0,
      }
  const fitMode = loadError
    ? 'blocked'
    : viewerUsesReadableSize && srcDoc
      ? 'readable-scroll'
      : canAutoFit
      ? shouldScale ? 'scaled' : 'native'
      : srcDoc ? 'guarded-scroll' : 'loading'
  const artifactMeasurementPending = Boolean(
    tracksArtifactMeasurement &&
    !loadError &&
    (
      !srcDoc ||
      !artifactSize ||
      viewerMeasurementRefreshPending ||
      artifactDocumentRemounted ||
      settledArtifactPackageId !== selectedPackage.id
    ),
  )
  const renderedFrameHeight = measuredFrameHeight

  return (
    <div
      id={frameId}
      className={bare
        ? 'h-full overflow-hidden bg-[#111827]'
        : viewerUsesAvailableHeight
          ? 'flex h-full w-full flex-col overflow-hidden border border-surface-800 bg-[#111827] shadow-[0_28px_90px_rgba(0,0,0,0.28)]'
          : 'w-full overflow-hidden border border-surface-800 bg-[#111827] shadow-[0_28px_90px_rgba(0,0,0,0.28)]'}
      data-artifact-viewer-mode={viewerFitControls && allowArtifactScripts ? viewerMode : undefined}
      data-artifact-execution-mode={allowArtifactScripts ? 'interactive-trusted' : 'static-untrusted'}
    >
      {!bare && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-surface-800 bg-surface-900 px-4 py-3 text-white">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-orange">
              Current artifact
            </div>
            <div className="truncate text-sm font-semibold">{selectedPackage.artifactTitle}</div>
            <div className="mt-1 text-xs text-surface-400">
              {contextLabel ?? (
                `Prompt ${String(selectedPackage.stepNumber).padStart(2, '0')} version from ${providerName}`
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {viewerFitControls && allowArtifactScripts && (
              <div
                className="inline-flex border border-surface-700 bg-surface-950 p-0.5"
                aria-label="Artifact display size"
              >
                <button
                  type="button"
                  aria-pressed={viewerMode === 'readable'}
                  data-artifact-viewer-mode-control="readable"
                  onClick={() => {
                    viewerMeasurementRefreshPendingRef.current = false
                    viewerModeRef.current = 'readable'
                    setViewerMeasurementRefreshPending(false)
                    setViewerMode('readable')
                  }}
                  className={[
                    'px-3 py-1.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                    viewerMode === 'readable'
                      ? 'bg-brand-orange text-surface-950'
                      : 'text-surface-300 hover:text-white',
                  ].join(' ')}
                >
                  Readable
                </button>
                <button
                  type="button"
                  aria-pressed={viewerMode === 'fit-whole'}
                  data-artifact-viewer-mode-control="fit-whole"
                  onClick={() => {
                    viewerModeRef.current = 'fit-whole'
                    setViewerMode('fit-whole')
                  }}
                  className={[
                    'px-3 py-1.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                    viewerMode === 'fit-whole'
                      ? 'bg-brand-orange text-surface-950'
                      : 'text-surface-300 hover:text-white',
                  ].join(' ')}
                >
                  Fit whole
                </button>
              </div>
            )}
            {showOpenAction && (
              <Link
                href={artifactViewerHref(selectedPackage, providerName)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 border border-surface-700 px-3 py-1.5 text-xs font-semibold text-surface-300 transition hover:border-brand-orange hover:text-brand-orange"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open safely
              </Link>
            )}
          </div>
        </div>
      )}
      <div
        ref={frameRef}
        data-artifact-fit-mode={fitMode}
        data-artifact-scale={shouldScale ? fitScale.toFixed(3) : '1'}
        data-artifact-measured-height={artifactSize?.height ?? ''}
        data-artifact-measured-width={artifactSize?.width ?? ''}
        data-artifact-virtual-height={virtualHeight ?? ''}
        data-artifact-virtual-width={virtualWidth ?? ''}
        data-artifact-height-mode={usesMeasuredContentHeight ? 'measured-content' : 'fixed-viewport'}
        data-artifact-height-guard={heightGuardMode}
        data-artifact-height-pending={artifactMeasurementPending ? 'true' : 'false'}
        data-artifact-measurement-refresh={viewerMeasurementRefreshPending ? 'true' : 'false'}
        data-artifact-rendered-height={renderedFrameHeight ?? ''}
        data-artifact-package-id={selectedPackage.id}
        data-artifact-path={selectedPackage.artifactPath}
        className={viewerUsesAvailableHeight
          ? 'relative min-h-0 w-full flex-1 overflow-hidden bg-[#111827]'
          : 'relative w-full overflow-hidden bg-[#111827]'}
        style={viewerUsesAvailableHeight
          ? undefined
          : { height: renderedFrameHeight ? `${renderedFrameHeight}px` : fallbackFrameHeight }}
      >
        {loadError ? (
          <div
            className="absolute inset-0 grid place-items-center bg-surface-950 px-6 text-center text-sm text-surface-300"
            role="alert"
            data-artifact-load-error={loadError}
          >
            <div className="max-w-md">
              <div className="font-semibold text-white">This artifact cannot be previewed safely.</div>
              <p className="mt-2 leading-6 text-surface-400">
                {loadError === 'too-large'
                  ? 'The file exceeds the protected preview size limit. Use Open only if you trust this artifact.'
                  : 'The protected preview could not load this file. You can retry the page or use Open if you trust this artifact.'}
              </p>
            </div>
          </div>
        ) : sourceResolved ? (
          <iframe
            ref={setIframeElement}
            key={selectedArtifactIdentity}
            title={`${selectedPackage.artifactTitle} generated from a ${providerName} source run`}
            srcDoc={srcDoc ?? undefined}
            sandbox="allow-scripts allow-pointer-lock"
            allow="clipboard-write"
            referrerPolicy="no-referrer"
            scrolling={viewerUsesReadableSize ? 'auto' : canAutoFit ? 'no' : 'auto'}
            className="absolute left-0 top-0 max-w-none bg-[#111827]"
            style={iframeStyle}
          />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center bg-surface-950 px-6 text-center text-sm font-semibold text-surface-300"
            role="status"
            aria-live="polite"
            data-artifact-loading
          >
            Loading selected artifact…
          </div>
        )}
      </div>
    </div>
  )
}

function PromptText({ text }: { text: string }) {
  return (
    <div className="group/prompt relative pr-9">
      <p className="border-l-2 border-brand-orange pl-3 font-semibold text-surface-900">
        {text}
      </p>
      <div className="absolute right-0 top-0 opacity-70 transition-opacity duration-200 group-hover/prompt:opacity-100 focus-within:opacity-100">
        <CopyButton text={text} variant="ghost" label="Copy prompt" visibleLabel="Copy" />
      </div>
    </div>
  )
}

function compactForkText(value: string | null | undefined, fallback: string, max = 120) {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed
}

function forkAuthorLabel(fork: ProjectForkNetworkItem) {
  if (fork.authorUsername) return `@${fork.authorUsername}`
  return fork.authorDisplayName ?? compactForkText(fork.title, 'Forked path', 44)
}

function externalSourceRunHref(value?: string | null) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function ResponseForkBranchCard({
  fork,
  isActive = false,
  onSelect,
}: {
  fork: ProjectForkNetworkItem
  isActive?: boolean
  onSelect: (fork: ProjectForkNetworkItem) => void
}) {
  const tooltip = [
    fork.title,
    fork.description,
    fork.modelUsed ? `Model: ${fork.modelUsed}` : null,
  ].filter(Boolean).join('\n')
  const authorLabel = forkAuthorLabel(fork)

  return (
    <button
      type="button"
      onClick={() => onSelect(fork)}
      className={[
        'group/fork-branch-card relative block min-w-0 w-full border bg-white px-3 py-2 text-left transition hover:border-brand-orange hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
        isActive ? 'border-brand-orange bg-primary-50 ring-2 ring-brand-orange/30' : 'border-brand-orange/25',
      ].join(' ')}
      aria-label={`Show fork options for ${authorLabel}`}
      aria-pressed={isActive}
      title={tooltip}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-black text-surface-900 group-hover/fork-branch-card:text-brand-orange-ink">
          {authorLabel}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand-orange-ink transition group-hover/fork-branch-card:translate-x-0.5" aria-hidden="true" />
      </span>
      <span className="mt-1 block truncate text-xs leading-5 text-surface-600">
        {compactForkText(fork.description, fork.title, 76)}
      </span>
      <span className="mt-2 block font-mono text-[10px] font-black uppercase tracking-[0.12em] text-brand-orange-ink">
        View branch options
      </span>
    </button>
  )
}

function ResponseForkBranchPanel({
  forks,
  activeForkId,
  onSelectFork,
  compact = false,
}: {
  forks: ProjectForkNetworkItem[]
  activeForkId?: string | null
  onSelectFork: (fork: ProjectForkNetworkItem) => void
  compact?: boolean
}) {
  const hasForks = forks.length > 0
  if (!hasForks) return null

  return (
    <div
      data-response-fork-branch-panel
      className={compact
        ? 'mt-4 grid gap-3'
        : 'grid min-w-0 w-56 shrink-0 gap-3'}
    >
      {hasForks && (
        <div
          className={compact
            ? 'min-w-0 border border-brand-orange/25 bg-primary-50 p-3'
            : 'min-w-0 border-2 border-brand-orange bg-primary-50 p-3 shadow-[0_18px_44px_rgba(232,122,44,0.16)]'}
          data-response-fork-destination-panel
        >
          <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-brand-orange-ink">
            Forks from this response
          </div>
          <div className="mt-2 grid gap-2">
            {forks.map((fork) => (
              <ResponseForkBranchCard
                key={fork.id}
                fork={fork}
                isActive={activeForkId === fork.id}
                onSelect={onSelectFork}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ResponseForkHoverRail({
  forks,
  activeForkId,
  onSelectFork,
  sourceStepId,
}: {
  forks: ProjectForkNetworkItem[]
  activeForkId?: string | null
  onSelectFork: (fork: ProjectForkNetworkItem) => void
  sourceStepId: string
}) {
  const hasForks = forks.length > 0
  if (!hasForks) return <div className="hidden xl:block" aria-hidden="true" />

  return (
    <div
      data-response-fork-hover-rail
      data-fork-existing-branch-origin="response"
      data-fork-existing-branch-step={sourceStepId}
      className="hidden min-h-full items-center overflow-visible xl:flex"
    >
      <span
        data-response-fork-socket
        data-response-fork-existing-branch="true"
        className="relative z-10 -ml-6 grid h-12 w-12 shrink-0 place-items-center border-4 border-[#8f3f0a] bg-primary-50 shadow-[0_0_0_7px_rgba(232,122,44,0.16)] transition duration-300 motion-safe:animate-pulse group-hover/source-fork-node:shadow-[0_0_0_8px_rgba(232,122,44,0.18)] group-focus-within/source-fork-node:shadow-[0_0_0_8px_rgba(232,122,44,0.18)]"
        aria-hidden="true"
      >
        <span
          className="h-4 w-4 border-2 border-[#8f3f0a] bg-brand-orange"
          data-fork-existing-branch-node
        />
      </span>

      <div className="relative h-12 w-20 shrink-0" data-response-fork-middle-pipe aria-hidden="true">
        <span
          className="absolute left-0 top-1/2 h-5 w-full origin-left -translate-y-1/2 scale-x-0 border-y-4 border-[#8f3f0a] bg-brand-orange shadow-[inset_0_5px_0_rgba(255,255,255,0.2),inset_0_-5px_0_rgba(0,0,0,0.16)] transition-transform duration-300 scale-x-100 group-hover/source-fork-node:scale-x-100 group-focus-within/source-fork-node:scale-x-100"
          data-fork-existing-branch-pipe
        />
        <span className="absolute right-[-2px] top-1/2 h-9 w-9 -translate-y-1/2 border-4 border-[#8f3f0a] bg-primary-50 shadow-[0_0_0_6px_rgba(232,122,44,0.16)]" />
      </div>

      <div className="-translate-x-2">
        <ResponseForkBranchPanel
          forks={forks}
          activeForkId={activeForkId}
          onSelectFork={onSelectFork}
        />
      </div>
    </div>
  )
}

function PipeNode({
  eyebrow,
  title,
  children,
  terminal = false,
  variant = 'prompt',
  selected = false,
  forkHref,
  forkLabel,
  forks = [],
  activeForkId,
  onSelectFork,
  stepId,
  stepNumber,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  terminal?: boolean
  variant?: 'prompt' | 'response'
  selected?: boolean
  forkHref?: string
  forkLabel?: string
  forks?: ProjectForkNetworkItem[]
  activeForkId?: string | null
  onSelectFork?: (fork: ProjectForkNetworkItem) => void
  stepId: string
  stepNumber: number
}) {
  const cardClassName = [
    'relative border bg-white p-5 shadow-[0_18px_44px_rgba(24,24,27,0.07)]',
    variant === 'response' && selected
      ? 'border-brand-blue ring-2 ring-brand-blue/25'
      : 'border-surface-200',
  ].join(' ')
  const canFork = variant === 'response' && Boolean(forkHref)
  const hasExistingForks = forks.length > 0
  const articleClassName = 'group/source-fork-node relative pl-[88px]'

  return (
    <article
      className={articleClassName}
      data-source-run-node={variant}
      data-source-run-step-id={stepId}
      data-source-run-step-number={stepNumber}
    >
      {!terminal && (
        <div
          className="absolute left-[22px] top-[80px] h-[calc(100%+30px)] w-8 border-x-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_5px_0_0_rgba(255,255,255,0.24),inset_-5px_0_0_rgba(0,0,0,0.2)]"
          data-source-run-pipeline={variant}
          aria-hidden="true"
        />
      )}
      <div
        className="absolute left-0 top-8 h-16 w-12 border-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_6px_0_0_rgba(255,255,255,0.28),inset_-6px_0_0_rgba(0,0,0,0.18)]"
        data-source-run-pipe-node={variant}
        aria-hidden="true"
      />
      <div className="absolute left-11 top-[54px] h-7 w-12 border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_5px_0_rgba(255,255,255,0.18),inset_0_-5px_0_rgba(0,0,0,0.16)]" />
      <div className={cardClassName} data-source-run-card={variant}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-surface-500">
              {eyebrow}
            </div>
            <h3 className="mt-2 text-xl font-black text-surface-900">{title}</h3>
          </div>
          {canFork && forkHref && (
            <Link
              href={forkHref}
              data-response-fork-top-action
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-[#07551f] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#07551f] transition hover:bg-[#effdf3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bd15f]"
              aria-label={forkLabel}
            >
              <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
              Fork here
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
        <div className="mt-4 text-sm leading-6 text-surface-700">{children}</div>
        {hasExistingForks && onSelectFork && (
          <div className="relative xl:hidden">
            <span className="absolute left-0 top-8 h-2 w-8 -translate-y-1/2 border-y border-[#8f3f0a] bg-brand-orange" aria-hidden="true" />
            <span className="absolute left-6 top-8 h-4 w-4 -translate-y-1/2 border-2 border-[#8f3f0a] bg-white" aria-hidden="true" />
            <div className="pl-9">
              <ResponseForkBranchPanel
                forks={forks}
                activeForkId={activeForkId}
                onSelectFork={onSelectFork}
                compact
              />
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

function ExactResponseBlock({
  text,
  copyText,
}: {
  text: string
  copyText: string
}) {
  return (
    <details className="group/response border border-surface-200 bg-surface-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-white px-4 py-3">
        <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Model response
        </span>
        <span className="shrink-0 border border-surface-300 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-600 group-open/response:hidden">
          View
        </span>
        <span className="hidden shrink-0 border border-surface-300 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-600 group-open/response:inline-block">
          Hide
        </span>
      </summary>
      <div className="flex items-center justify-end border-t border-surface-200 bg-white px-4 py-2">
        <CopyButton text={copyText} variant="ghost" label="Copy response" visibleLabel="Copy" />
      </div>
      <pre className="max-h-[360px] whitespace-pre-wrap overflow-auto p-4 text-sm leading-7 text-surface-900">
        {text}
      </pre>
    </details>
  )
}

function ResponsePackageCard({
  step,
  artifactPackages,
  selectedPackage,
  onSelect,
  providerName,
}: {
  step: SourceRunShowcaseStep
  artifactPackages: ArtifactPackage[]
  selectedPackage?: ArtifactPackage
  onSelect?: (packageId: string, anchorElement?: HTMLElement) => void
  providerName: string
}) {
  const copyText = step.responseCopyText ?? step.response
  const hasArtifactPackages = artifactPackages.length > 0
  const selected = Boolean(selectedPackage)
  const detailPackage = selectedPackage ?? artifactPackages[0]
  const canSelectPackage = Boolean(detailPackage && onSelect)
  const selectLabel = selected ? 'Selected' : 'Select artifact'
  const headerContent = (
    <>
      <div className="min-w-0">
        <div className="block font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Artifact
        </div>
        <div className="mt-1 block text-sm font-semibold leading-6 text-surface-900">
          {hasArtifactPackages
            ? detailPackage?.artifactTitle
            : 'No artifact produced'}
        </div>
      </div>
      {detailPackage && (
        <span
          className={[
            'inline-flex shrink-0 items-center gap-1.5 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]',
            selected
              ? 'border-brand-blue bg-brand-blue text-white'
              : 'border-surface-300 bg-white text-surface-700',
          ].join(' ')}
        >
          {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
          {selectLabel}
        </span>
      )}
    </>
  )

  return (
    <div className="space-y-4">
      {canSelectPackage ? (
        <button
          type="button"
          onClick={(event) => onSelect?.(detailPackage.id, event.currentTarget)}
          aria-pressed={selected}
          data-artifact-package-select={detailPackage.id}
          className={[
            'flex w-full items-start justify-between gap-4 border p-4 text-left transition hover:bg-brand-blue/5',
            selected ? 'border-brand-blue bg-brand-blue/5' : 'border-surface-200 bg-surface-50',
          ].join(' ')}
        >
          {headerContent}
        </button>
      ) : (
        <div className="flex w-full items-start justify-between gap-4 border border-surface-200 bg-surface-50 p-4 text-left">
          {headerContent}
        </div>
      )}

      <div className="space-y-4 bg-white">
        {detailPackage ? (
          <div className="border border-surface-200 bg-surface-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href={artifactViewerHref(detailPackage, providerName)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border-b border-surface-400 text-sm font-semibold text-surface-900 transition hover:border-brand-orange hover:text-brand-orange"
              >
                Open artifact safely
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              {artifactPackages.length > 1 && onSelect && (
                <div className="flex flex-wrap gap-2">
                {artifactPackages.map((pkg) => {
                  const packageSelected = selectedPackage?.id === pkg.id
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={(event) => onSelect(pkg.id, event.currentTarget)}
                      aria-pressed={packageSelected}
                      data-artifact-version-select={pkg.id}
                      className={[
                        'border px-2.5 py-1.5 text-left font-mono text-[10px] uppercase tracking-[0.12em]',
                        packageSelected
                          ? 'border-brand-blue bg-brand-blue text-white'
                          : 'border-surface-300 bg-white text-surface-700 hover:border-brand-blue',
                      ].join(' ')}
                    >
                      Version {pkg.artifactOrdinal}
                    </button>
                  )
                })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border border-surface-200 bg-surface-50 px-4 py-3 text-sm leading-6 text-surface-700">
            No mountable artifact is attached to this response package.
          </div>
        )}

        <ExactResponseBlock text={step.response} copyText={copyText} />
      </div>
    </div>
  )
}

export default function SourceRunShowcase({
  sourceRunUrl,
  sourceEvidence,
  projectId,
  projectTitle,
  sourceModelVariantId,
  sourceRunId,
  sourceArtifactPath,
  sourceArtifactSha256,
  initialArtifactPath,
  trackResume = false,
  acknowledgeModelUpdates = false,
  providerName,
  steps,
  forkNetwork = [],
  forkContext,
  defaultStepNumber,
  allowForks = true,
}: {
  sourceRunUrl?: string | null
  sourceEvidence?: PublicEvidenceTruth
  projectId?: string
  projectTitle?: string
  sourceModelVariantId?: string
  sourceRunId?: string
  sourceArtifactPath?: string
  sourceArtifactSha256?: string
  initialArtifactPath?: string | null
  trackResume?: boolean
  acknowledgeModelUpdates?: boolean
  providerName: string
  steps: SourceRunShowcaseStep[]
  forkNetwork?: ProjectForkNetworkItem[]
  forkContext?: SourceRunShowcaseForkContext | null
  defaultStepNumber?: number
  allowForks?: boolean
}) {
  const sourceRunHref = externalSourceRunHref(sourceRunUrl)
  const publicSourceEvidence = sourceEvidence ?? resolvePublicSourceEvidence(null)
  const packages = useMemo<ArtifactPackage[]>(
    () =>
      steps.flatMap((step) => {
        const explicitVersions = (step.artifactVersions ?? []).filter((version) => (
          !!version.artifactPath &&
          !!version.artifactTitle
        ))

        if (explicitVersions.length > 0) {
          return explicitVersions.map((version, index) => ({
            id: version.id ?? `${step.id}-artifact-${index + 1}`,
            stepId: step.id,
            stepNumber: step.stepNumber,
            title: step.title,
            prompt: step.prompt,
            response: step.response,
            responseCopyText: step.responseCopyText,
            callout: step.callout,
            artifactPath: version.artifactPath,
            artifactTitle: version.artifactTitle,
            artifactSha256: version.artifactSha256,
            artifactOrdinal: index + 1,
            artifactCount: explicitVersions.length,
            isDefaultArtifact: Boolean(version.isDefault),
          }))
        }

        if (!step.artifactPath || !step.artifactTitle) {
          return []
        }

        return [{
          id: step.id,
          stepId: step.id,
          stepNumber: step.stepNumber,
          title: step.title,
          prompt: step.prompt,
          response: step.response,
          responseCopyText: step.responseCopyText,
          callout: step.callout,
          artifactPath: step.artifactPath,
          artifactTitle: step.artifactTitle,
          artifactOrdinal: 1,
          artifactCount: 1,
          artifactSha256: undefined,
          isDefaultArtifact: false,
        }]
      }),
    [steps],
  )
  const forkArtifactPackages = useMemo(
    () => forkNetwork.flatMap((fork) => (
      (fork.continuationSteps ?? []).flatMap((step) => {
        const versions = [...(step.artifactVersions ?? [])]
        if (
          step.artifactPath &&
          !versions.some((version) => version.artifactPath === step.artifactPath)
        ) {
          versions.push({
            id: `${step.id}:artifact`,
            artifactPath: step.artifactPath,
            artifactTitle: `${step.promptTitle} artifact`,
            isDefault: versions.length === 0,
          })
        }

        return versions.map<ArtifactPackage>((version, index) => ({
          id: version.id,
          stepId: step.id,
          stepNumber: step.stepNumber,
          title: step.promptTitle,
          prompt: step.promptText,
          response: step.responseText ?? '',
          responseCopyText: step.responseText ?? '',
          artifactPath: version.artifactPath,
          artifactTitle: version.artifactTitle,
          artifactOrdinal: index + 1,
          artifactCount: versions.length,
          isDefaultArtifact: Boolean(version.isDefault),
          providerName: fork.childProviderName ?? undefined,
        }))
      })
    )),
    [forkNetwork],
  )
  const displayPackages = useMemo(
    () => [...packages, ...forkArtifactPackages],
    [forkArtifactPackages, packages],
  )
  const defaultStepPackages = packages.filter((pkg) => pkg.stepNumber === defaultStepNumber)
  const defaultPackage =
    packages.find((pkg) => pkg.isDefaultArtifact) ??
    defaultStepPackages[defaultStepPackages.length - 1] ??
    packages[packages.length - 1]
  const resumedPackage = initialArtifactPath
    ? packages.find((pkg) => (
      pkg.artifactPath === initialArtifactPath ||
      `public${pkg.artifactPath}` === initialArtifactPath
    ))
    : undefined
  const [selectedPackageId, setSelectedPackageId] = useState(resumedPackage?.id ?? defaultPackage?.id ?? '')
  const [activeForkId, setActiveForkId] = useState<string | null>(null)
  const activeForkStageRef = useRef<HTMLDivElement | null>(null)
  const sourceRunPathRef = useRef<HTMLElement | null>(null)
  const pendingArtifactSelectionViewportRef = useRef<{
    anchorElement: HTMLElement
    anchorTop: number
  } | null>(null)
  const displayForkNetwork = useMemo(() => forkNetwork.map((fork) => ({
    ...fork,
    modelUsed: fork.modelUsed
      ? getPublicModelIdentityLabel({
          provider: fork.childProviderName,
          model: fork.modelUsed,
        })
      : fork.modelUsed,
  })), [forkNetwork])
  const selectedPackage =
    displayPackages.find((pkg) => pkg.id === selectedPackageId) ?? defaultPackage ?? packages[0]
  const selectedPrimaryPackage = packages.find((pkg) => pkg.id === selectedPackage?.id)
  const selectArtifactPackage = (packageId: string, clickedElement?: HTMLElement) => {
    if (packageId === selectedPackage?.id) return
    const sourceRunPath = sourceRunPathRef.current
    const sourceRunPathRect = sourceRunPath?.getBoundingClientRect()
    const artifactRect = document.getElementById('final-result')?.getBoundingClientRect()
    const artifactBottomVisible = Boolean(
      artifactRect && artifactRect.bottom > 0 && artifactRect.bottom <= window.innerHeight,
    )
    const artifactPathSeamVisible = Boolean(
      artifactBottomVisible || (
        sourceRunPathRect &&
        sourceRunPathRect.top >= 0 &&
        sourceRunPathRect.top <= window.innerHeight
      ),
    )
    const anchorElement = artifactPathSeamVisible
      ? sourceRunPath
      : clickedElement ?? sourceRunPath
    const anchorTop = anchorElement?.getBoundingClientRect().top
    pendingArtifactSelectionViewportRef.current = !anchorElement || anchorTop === undefined
      ? null
      : { anchorElement, anchorTop }
    setSelectedPackageId(packageId)
  }
  const forkSourceSteps = useMemo<ProjectForkSourceStep[]>(() => steps.map((step) => ({
    id: step.id,
    stepNumber: step.stepNumber,
    promptTitle: step.title,
    promptText: step.prompt,
    responseText: step.response,
    responsePackageId: step.id,
    artifactPath: step.artifactPath,
  })), [steps])
  const forkBranchesByStepId = useMemo(() => {
    const branches = new Map<string, ProjectForkNetworkItem[]>()

    const grouped = groupProjectForkNetworkBySourceStep(forkSourceSteps, displayForkNetwork)
    for (const row of grouped.rows) {
      branches.set(row.step.id, row.forks)
    }

    return branches
  }, [displayForkNetwork, forkSourceSteps])
  const activeForkContext = (() => {
    if (!allowForks || !activeForkId || !projectId) return null

    for (const step of steps) {
      const fork = (forkBranchesByStepId.get(step.id) ?? []).find((branch) => branch.id === activeForkId)
      if (!fork) continue

      const sourceStepPackages = packages.filter((pkg) => pkg.stepId === step.id)
      const sourceArtifactPackage =
        (selectedPackage?.stepId === step.id ? selectedPackage : undefined) ??
        sourceStepPackages.find((pkg) => pkg.isDefaultArtifact) ??
        sourceStepPackages.at(-1)

      const forkHref = buildProjectResponseForkHref({
        sourceProjectId: projectId,
        sourceProjectTitle: projectTitle,
        sourceModelVariantId,
        sourceRunId,
        sourceStepId: step.id,
        sourceStepNumber: step.stepNumber,
        sourceArtifactPath: sourceArtifactPackage?.artifactPath
          ? `public${sourceArtifactPackage.artifactPath}`
          : step.stepNumber === defaultStepNumber ? sourceArtifactPath : undefined,
        sourceArtifactSha256: sourceArtifactPackage?.artifactSha256
          ?? (step.stepNumber === defaultStepNumber ? sourceArtifactSha256 : undefined),
        promptFamilyId: `${projectId}:${step.id}`,
      })
      if (!forkHref) return null

      return {
        fork,
        sourceStep: step,
        forkHref,
      }
    }

    return null
  })()
  const activeForkSourceEvidence = activeForkContext
    ? resolvePublicSourceEvidence({
        sourceRunId: activeForkContext.fork.childSourceRunId,
        pathforgeRecordChecked: Boolean(activeForkContext.fork.childSourceRunId),
      })
    : resolvePublicSourceEvidence(null)
  const hasForkLane = allowForks && displayForkNetwork.length > 0
  const pathRowClassName = hasForkLane
    ? 'grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]'
    : undefined

  useEffect(() => {
    if (!activeForkId) return
    activeForkStageRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [activeForkId])

  useEffect(() => {
    sourceRunPathRef.current?.setAttribute('data-source-run-showcase-hydrated', 'true')
  }, [])

  useLayoutEffect(() => {
    const pending = pendingArtifactSelectionViewportRef.current
    if (!pending) return

    const startedAt = window.performance.now()
    let active = true
    let animationFrame = 0
    let previousFrameHeight: number | null = null
    let stableFrames = 0
    const userInputEvents: Array<keyof WindowEventMap> = [
      'keydown',
      'pointerdown',
      'touchstart',
      'wheel',
    ]
    const cleanup = () => {
      if (!active) return
      active = false
      window.cancelAnimationFrame(animationFrame)
      for (const eventName of userInputEvents) {
        window.removeEventListener(eventName, stopForUserInput)
      }
    }
    function stopForUserInput() {
      pendingArtifactSelectionViewportRef.current = null
      cleanup()
    }
    for (const eventName of userInputEvents) {
      window.addEventListener(eventName, stopForUserInput, { passive: true, once: true })
    }

    const restoreWhenReady = () => {
      if (!active) return

      const sourceRunPath = sourceRunPathRef.current
      const frame = document.querySelector<HTMLElement>('[data-artifact-package-id]')
      const framePackageId = frame?.dataset.artifactPackageId
      const fitMode = frame?.dataset.artifactFitMode
      const heightGuard = frame?.dataset.artifactHeightGuard
      const heightPending = frame?.dataset.artifactHeightPending === 'true'
      const destinationSettled = Boolean(
        sourceRunPath &&
        framePackageId === selectedPackageId &&
        frame?.querySelector('iframe[srcdoc], [data-artifact-load-error]') &&
        !heightPending &&
        (
          fitMode === 'native' ||
          fitMode === 'scaled' ||
          fitMode === 'blocked' ||
          heightGuard !== 'none'
        ),
      )
      const timedOut = window.performance.now() - startedAt >= 12_000

      const anchorElement = pending.anchorElement.isConnected
        ? pending.anchorElement
        : sourceRunPath
      if (anchorElement) {
        const destinationTop = anchorElement.getBoundingClientRect().top
        const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
        const desiredScrollY = Math.max(
          0,
          window.scrollY + destinationTop - pending.anchorTop,
        )
        window.scrollTo(0, Math.min(desiredScrollY, maxScrollY))

        const restoredTop = anchorElement.getBoundingClientRect().top
        const frameHeight = frame?.getBoundingClientRect().height ?? null
        const heightStable = destinationSettled && frameHeight !== null && previousFrameHeight !== null && (
          Math.abs(frameHeight - previousFrameHeight) <= 1
        )
        stableFrames = heightStable ? stableFrames + 1 : 0
        previousFrameHeight = frameHeight
        if (
          timedOut ||
          (
            destinationSettled &&
            Math.abs(restoredTop - pending.anchorTop) <= 1 &&
            stableFrames >= 2
          )
        ) {
          pendingArtifactSelectionViewportRef.current = null
          cleanup()
          return
        }
      }

      animationFrame = window.requestAnimationFrame(restoreWhenReady)
    }
    restoreWhenReady()
    return cleanup
  }, [selectedPackageId])

  return (
    <>
      {projectId && sourceRunId && selectedPrimaryPackage && (
        <MyForgeResumeTracker
          enabled={trackResume}
          projectId={projectId}
          sourceRunId={sourceRunId}
          stepId={selectedPrimaryPackage.stepId}
          stepNumber={selectedPrimaryPackage.stepNumber}
          artifactPath={selectedPrimaryPackage.artifactPath}
          artifactSha256={selectedPrimaryPackage.artifactSha256}
          acknowledgeModelUpdates={acknowledgeModelUpdates}
        />
      )}
      {selectedPackage && (
        <section className="border-b border-surface-200 bg-surface-50 px-4 pb-9 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <ProtectedArtifactFrame
              selectedPackage={selectedPackage}
              providerName={selectedPackage.providerName ?? providerName}
            />
          </div>
        </section>
      )}

      <section
        ref={sourceRunPathRef}
        id="source-run-path"
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        data-source-run-showcase-hydrated="false"
      >
        <div className="mb-7 border-l-4 border-[#2bd15f] pl-4">
          <h2 className="text-3xl font-black text-surface-900">
            Build path
          </h2>
        </div>

        {forkContext ? (
          <ProjectForkBuildPath
            mode="child"
            sourceSteps={forkContext.sourceSteps}
            branch={forkContext.branch}
            trail={forkContext.trail}
            sourceProjectHref={forkContext.sourceProjectHref}
            branchHref={forkContext.branch.childRoute}
            newForkHref={forkContext.newForkHref}
            sourceRunHref={forkContext.sourceRunHref ?? forkContext.branch.childSourceUrl}
            sourceEvidence={publicSourceEvidence}
            selectedArtifactPath={selectedPackage?.artifactPath}
            onDisplayArtifact={(artifactPath, _artifactTitle, artifactId) => {
              const artifactPackage = displayPackages.find((pkg) => (
                pkg.id === artifactId || pkg.artifactPath === artifactPath
              ))
              if (artifactPackage) selectArtifactPackage(artifactPackage.id)
            }}
          />
        ) : activeForkContext ? (
          <div ref={activeForkStageRef}>
            <ProjectForkBuildPath
              mode="parent"
              sourceSteps={forkSourceSteps}
              branch={activeForkContext.fork}
              branchHref={activeForkContext.fork.childRoute}
              newForkHref={activeForkContext.forkHref}
              sourceRunHref={activeForkContext.fork.childSourceUrl}
              sourceEvidence={activeForkSourceEvidence}
              selectedArtifactPath={selectedPackage?.artifactPath}
              onDisplayArtifact={(artifactPath, _artifactTitle, artifactId) => {
                const artifactPackage = displayPackages.find((pkg) => (
                  pkg.id === artifactId || pkg.artifactPath === artifactPath
                ))
                if (artifactPackage) selectArtifactPackage(artifactPackage.id)
              }}
              onClose={() => {
                setActiveForkId(null)
                selectArtifactPackage(defaultPackage?.id ?? '')
              }}
            />
          </div>
        ) : (
          <div className="space-y-7">
            {steps.map((step, index) => {
              const artifactPackages = packages.filter((pkg) => pkg.stepId === step.id)
              const selectedStepPackage = artifactPackages.find((pkg) => selectedPackage?.id === pkg.id)
              const sourceArtifactPackage =
                selectedStepPackage ??
                artifactPackages.find((pkg) => pkg.isDefaultArtifact) ??
                artifactPackages.at(-1)
              const forkHref = allowForks && projectId
                ? buildProjectResponseForkHref({
                  sourceProjectId: projectId,
                  sourceProjectTitle: projectTitle,
                  sourceModelVariantId,
                  sourceRunId,
                  sourceStepId: step.id,
                  sourceStepNumber: step.stepNumber,
                  sourceArtifactPath: sourceArtifactPackage?.artifactPath
                    ? `public${sourceArtifactPackage.artifactPath}`
                    : step.stepNumber === defaultStepNumber ? sourceArtifactPath : undefined,
                  sourceArtifactSha256: sourceArtifactPackage?.artifactSha256
                    ?? (step.stepNumber === defaultStepNumber ? sourceArtifactSha256 : undefined),
                  promptFamilyId: `${projectId}:${step.id}`,
                })
                : null
              const stepForks = forkBranchesByStepId.get(step.id) ?? []

              return (
                <Fragment key={step.id}>
                  <div className={pathRowClassName} data-source-run-prompt-row={step.id}>
                    <PipeNode
                      eyebrow={`Prompt ${String(step.stepNumber).padStart(2, '0')}`}
                      title={step.title}
                      terminal={false}
                      variant="prompt"
                      stepId={step.id}
                      stepNumber={step.stepNumber}
                    >
                      <PromptText text={step.prompt} />
                    </PipeNode>
                    {hasForkLane && <div className="hidden xl:block" aria-hidden="true" />}
                  </div>

                  <div className={pathRowClassName} data-source-run-response-row={step.id}>
                    <PipeNode
                      eyebrow={`Response ${String(step.stepNumber).padStart(2, '0')}`}
                      title={step.title}
                      terminal={index === steps.length - 1}
                      variant="response"
                      selected={Boolean(selectedStepPackage)}
                      stepId={step.id}
                      stepNumber={step.stepNumber}
                      forkHref={forkHref ?? undefined}
                      forkLabel={`Fork ${projectTitle ?? 'this path'} from response ${String(step.stepNumber).padStart(2, '0')}`}
                      forks={stepForks}
                      activeForkId={activeForkId}
                      onSelectFork={(fork) => setActiveForkId(fork.id)}
                    >
                    <ResponsePackageCard
                      step={step}
                      artifactPackages={artifactPackages}
                      selectedPackage={selectedStepPackage}
                      onSelect={artifactPackages.length > 0 ? selectArtifactPackage : undefined}
                      providerName={providerName}
                    />
                    </PipeNode>
                    {hasForkLane && (
                      <ResponseForkHoverRail
                        forks={stepForks}
                        activeForkId={activeForkId}
                        onSelectFork={(fork) => setActiveForkId(fork.id)}
                        sourceStepId={step.id}
                      />
                    )}
                  </div>
                </Fragment>
              )
            })}
          </div>
        )}

        <SourceRunEvidenceFooter
          sourceRunHref={sourceRunHref}
          evidence={publicSourceEvidence}
        />
      </section>
    </>
  )
}
