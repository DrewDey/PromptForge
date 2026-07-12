'use client'

import { Fragment, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, ExternalLink, GitFork } from 'lucide-react'
import CopyButton from '@/app/prompt/[id]/CopyButton'
import MyForgeResumeTracker from '@/components/MyForgeResumeTracker'
import ProjectForkBuildPath, {
  type ProjectForkBuildPathCrumb,
} from '@/components/ProjectForkBuildPath'
import {
  artifactDocumentKey,
  currentArtifactLoad,
} from '@/lib/model-variant-ui.mjs'
import {
  artifactDownloadBridgeSource,
  buildProtectedArtifactWrapperDocument,
  PROTECTED_ARTIFACT_DOWNLOAD_DATA_URL_LIMIT,
} from '@/lib/protected-artifact-wrapper.mjs'
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
  srcDoc: string | null
  error: 'fetch-failed' | 'response-invalid' | 'too-large' | null
}

type MeasuredArtifact = {
  packageId: string
  size: ArtifactSize
}

const ARTIFACT_FRAME_HEIGHT = 'clamp(520px, calc(100svh - 160px), 760px)'
const MAX_AUTO_FIT_ARTIFACT_HEIGHT = 6000
const MAX_AUTO_FIT_ARTIFACT_WIDTH = 14000
const MAX_AUTO_FIT_HTML_BYTES = 2_000_000
const MAX_ARTIFACT_STORAGE_BYTES = 1_000_000
const MAX_ARTIFACT_STORAGE_ENTRIES = 500
const MAX_ARTIFACT_STORAGE_KEY_LENGTH = 1024
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
    window.parent.postMessage({ type: 'pathforge-artifact-size', width, height }, '*');
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      sendSize();
    });
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
) {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const csp = parsed.createElement('meta')
  csp.httpEquiv = 'Content-Security-Policy'
  csp.content = ARTIFACT_CSP

  const storageBootstrap = parsed.createElement('script')
  storageBootstrap.textContent = artifactStorageBootstrapSource(storageSnapshots)
  const downloadBridge = parsed.createElement('script')
  downloadBridge.textContent = artifactDownloadBridgeSource()

  // Insert trusted policy bytes into the actual parsed head. Text that merely
  // looks like <head> or </body> inside artifact comments and strings cannot
  // redirect these controls into attacker-owned content.
  parsed.head.prepend(downloadBridge)
  parsed.head.prepend(storageBootstrap)
  parsed.head.prepend(csp)

  const fitProbe = parsed.createElement('script')
  fitProbe.textContent = artifactFitProbeSource()
  parsed.body.append(fitProbe)

  return `<!doctype html>\n${parsed.documentElement.outerHTML}`
}

export function ProtectedArtifactFrame({
  selectedPackage,
  providerName,
  showOpenAction = true,
  frameHeight = ARTIFACT_FRAME_HEIGHT,
  contextLabel,
}: {
  selectedPackage: ArtifactPackage
  providerName: string
  showOpenAction?: boolean
  frameHeight?: string
  contextLabel?: string
}) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const lastDownloadAtRef = useRef(-Infinity)
  const [frameSize, setFrameSize] = useState<ArtifactSize | null>(null)
  const [loadedArtifact, setLoadedArtifact] = useState<LoadedArtifactSource | null>(null)
  const [measuredArtifact, setMeasuredArtifact] = useState<MeasuredArtifact | null>(null)
  const activeLoadedArtifact = currentArtifactLoad(selectedPackage.id, loadedArtifact)
  const srcDoc = activeLoadedArtifact?.srcDoc ?? null
  const loadError = activeLoadedArtifact?.error ?? null
  const sourceResolved = Boolean(activeLoadedArtifact)
  const artifactSize =
    measuredArtifact?.packageId === selectedPackage.id ? measuredArtifact.size : null

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return undefined

    const updateFrameSize = () => {
      const rect = frame.getBoundingClientRect()
      const nextSize = {
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      }

      setFrameSize((current) => {
        if (
          current &&
          Math.abs(current.width - nextSize.width) < 2 &&
          Math.abs(current.height - nextSize.height) < 2
        ) {
          return current
        }

        return nextSize
      })
    }

    updateFrameSize()
    const observer = new ResizeObserver(updateFrameSize)
    observer.observe(frame)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const packageId = selectedPackage.id

    async function loadArtifact() {
      try {
        const response = await fetch(selectedPackage.artifactPath, {
          signal: controller.signal,
          credentials: 'omit',
        })
        const contentLength = Number(response.headers.get('content-length'))

        if (!response.ok) {
          if (!controller.signal.aborted) {
            setLoadedArtifact({
              packageId,
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
              srcDoc: null,
              error: 'too-large',
            })
          }
          return
        }

        const storageSnapshots: ArtifactStorageSnapshots = {
          local: readArtifactStorageSnapshot('local', selectedPackage.artifactPath),
          session: readArtifactStorageSnapshot('session', selectedPackage.artifactPath),
        }

        if (!controller.signal.aborted) {
          const protectedArtifactDocument = injectArtifactFitProbe(html, storageSnapshots)
          setLoadedArtifact({
            packageId,
            srcDoc: buildProtectedArtifactWrapperDocument(protectedArtifactDocument),
            error: null,
          })
        }
      } catch {
        if (controller.signal.aborted) return
        setLoadedArtifact({
          packageId,
          srcDoc: null,
          error: 'fetch-failed',
        })
      }
    }

    loadArtifact()

    return () => {
      controller.abort()
    }
  }, [selectedPackage.artifactPath, selectedPackage.id])

  useEffect(() => {
    const packageId = selectedPackage.id

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
      if (!Number.isFinite(width) || !Number.isFinite(height)) return

      const nextSize = {
        width: Math.max(1, Math.ceil(width)),
        height: Math.max(1, Math.ceil(height)),
      }

      setMeasuredArtifact((current) => {
        if (
          current?.packageId === packageId &&
          Math.abs(current.size.width - nextSize.width) < 4 &&
          Math.abs(current.size.height - nextSize.height) < 4
        ) {
          return current
        }

        return { packageId, size: nextSize }
      })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [selectedPackage.artifactPath, selectedPackage.id])

  const canAutoFit =
    Boolean(srcDoc && frameSize && artifactSize) &&
    (artifactSize?.height ?? 0) <= MAX_AUTO_FIT_ARTIFACT_HEIGHT &&
    (artifactSize?.width ?? 0) <= MAX_AUTO_FIT_ARTIFACT_WIDTH
  const fitScale = canAutoFit && frameSize && artifactSize
    ? Math.min(
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
    : canAutoFit
      ? shouldScale ? 'scaled' : 'native'
      : srcDoc ? 'guarded-scroll' : 'loading'

  return (
    <div
      id="final-result"
      className="overflow-hidden border border-surface-800 bg-[#111827] shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-800 bg-surface-900 px-4 py-3 text-white">
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
      <div
        ref={frameRef}
        data-artifact-fit-mode={fitMode}
        data-artifact-scale={shouldScale ? fitScale.toFixed(3) : '1'}
        data-artifact-measured-height={artifactSize?.height ?? ''}
        data-artifact-measured-width={artifactSize?.width ?? ''}
        data-artifact-virtual-height={virtualHeight ?? ''}
        data-artifact-virtual-width={virtualWidth ?? ''}
        data-artifact-package-id={selectedPackage.id}
        data-artifact-path={selectedPackage.artifactPath}
        className="relative w-full overflow-hidden bg-[#111827]"
        style={{ height: frameHeight }}
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
            ref={iframeRef}
            key={artifactDocumentKey(selectedPackage.id)}
            title={`${selectedPackage.artifactTitle} generated from a ${providerName} source run`}
            srcDoc={srcDoc ?? undefined}
            sandbox="allow-scripts allow-pointer-lock"
            allow="clipboard-write"
            referrerPolicy="no-referrer"
            scrolling={canAutoFit ? 'no' : 'auto'}
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
        'group/fork-branch-card relative block min-w-0 w-full border bg-white px-3 py-2 text-left transition hover:border-[#07551f] hover:bg-[#effdf3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bd15f]',
        isActive ? 'border-[#07551f] bg-[#effdf3] ring-2 ring-[#2bd15f]/30' : 'border-[#07551f]/25',
      ].join(' ')}
      aria-label={`Show fork options for ${authorLabel}`}
      aria-pressed={isActive}
      title={tooltip}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-black text-surface-900 group-hover/fork-branch-card:text-[#07551f]">
          {authorLabel}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#07551f] transition group-hover/fork-branch-card:translate-x-0.5" aria-hidden="true" />
      </span>
      <span className="mt-1 block truncate text-xs leading-5 text-surface-600">
        {compactForkText(fork.description, fork.title, 76)}
      </span>
      <span className="mt-2 block font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#07551f]">
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
            ? 'min-w-0 border border-[#07551f]/25 bg-[#f8fff9] p-3'
            : 'min-w-0 border-2 border-[#07551f] bg-[#f8fff9] p-3 shadow-[0_18px_44px_rgba(7,85,31,0.16)]'}
          data-response-fork-destination-panel
        >
          <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#07551f]">
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
}: {
  forks: ProjectForkNetworkItem[]
  activeForkId?: string | null
  onSelectFork: (fork: ProjectForkNetworkItem) => void
}) {
  const hasForks = forks.length > 0
  if (!hasForks) return <div className="hidden xl:block" aria-hidden="true" />

  return (
    <div
      data-response-fork-hover-rail
      className="hidden min-h-full items-center overflow-visible xl:flex"
    >
      <span
        data-response-fork-socket
        data-response-fork-existing-branch="true"
        className="relative z-10 -ml-6 grid h-12 w-12 shrink-0 place-items-center border-4 border-[#07551f] bg-[#effdf3] shadow-[0_0_0_7px_rgba(43,209,95,0.16)] transition duration-300 motion-safe:animate-pulse group-hover/source-fork-node:shadow-[0_0_0_8px_rgba(43,209,95,0.18)] group-focus-within/source-fork-node:shadow-[0_0_0_8px_rgba(43,209,95,0.18)]"
        aria-hidden="true"
      >
        <span className="h-4 w-4 border-2 border-[#07551f] bg-[#2bd15f]" />
      </span>

      <div className="relative h-12 w-20 shrink-0" data-response-fork-middle-pipe aria-hidden="true">
        <span className="absolute left-0 top-1/2 h-5 w-full origin-left -translate-y-1/2 scale-x-0 border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_5px_0_rgba(255,255,255,0.2),inset_0_-5px_0_rgba(0,0,0,0.16)] transition-transform duration-300 scale-x-100 group-hover/source-fork-node:scale-x-100 group-focus-within/source-fork-node:scale-x-100" />
        <span className="absolute right-[-2px] top-1/2 h-9 w-9 -translate-y-1/2 border-4 border-[#07551f] bg-[#effdf3] shadow-[0_0_0_6px_rgba(43,209,95,0.16)]" />
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
    <article className={articleClassName} data-source-run-node={variant}>
      {!terminal && (
        <div className="absolute left-[22px] top-[80px] h-[calc(100%+30px)] w-8 border-x-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_5px_0_0_rgba(255,255,255,0.24),inset_-5px_0_0_rgba(0,0,0,0.2)]" />
      )}
      <div className="absolute left-0 top-8 h-16 w-12 border-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_6px_0_0_rgba(255,255,255,0.28),inset_-6px_0_0_rgba(0,0,0,0.18)]" />
      <div className="absolute left-11 top-[54px] h-7 w-12 border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_5px_0_rgba(255,255,255,0.18),inset_0_-5px_0_rgba(0,0,0,0.16)]" />
      <div className={cardClassName}>
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
        {canFork && forkHref && hasExistingForks && onSelectFork && (
          <div className="relative xl:hidden">
            <span className="absolute left-0 top-8 h-2 w-8 -translate-y-1/2 border-y border-[#07551f] bg-[#2bd15f]" aria-hidden="true" />
            <span className="absolute left-6 top-8 h-4 w-4 -translate-y-1/2 border-2 border-[#07551f] bg-white" aria-hidden="true" />
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
  onSelect?: (packageId: string) => void
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
          onClick={() => onSelect?.(detailPackage.id)}
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
                      onClick={() => onSelect(pkg.id)}
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
  sourceRunAccessNote,
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
  sourceRunAccessNote?: string | null
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
  const selectedPackage =
    displayPackages.find((pkg) => pkg.id === selectedPackageId) ?? defaultPackage ?? packages[0]
  const selectedPrimaryPackage = packages.find((pkg) => pkg.id === selectedPackage?.id)
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

    const grouped = groupProjectForkNetworkBySourceStep(forkSourceSteps, forkNetwork)
    for (const row of grouped.rows) {
      branches.set(row.step.id, row.forks)
    }

    return branches
  }, [forkNetwork, forkSourceSteps])
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
  const hasForkLane = allowForks && forkNetwork.length > 0
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
              key={selectedPackage.id}
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
            selectedArtifactPath={selectedPackage?.artifactPath}
            onDisplayArtifact={(artifactPath, _artifactTitle, artifactId) => {
              const artifactPackage = displayPackages.find((pkg) => (
                pkg.id === artifactId || pkg.artifactPath === artifactPath
              ))
              if (artifactPackage) setSelectedPackageId(artifactPackage.id)
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
              selectedArtifactPath={selectedPackage?.artifactPath}
              onDisplayArtifact={(artifactPath, _artifactTitle, artifactId) => {
                const artifactPackage = displayPackages.find((pkg) => (
                  pkg.id === artifactId || pkg.artifactPath === artifactPath
                ))
                if (artifactPackage) setSelectedPackageId(artifactPackage.id)
              }}
              onClose={() => {
                setActiveForkId(null)
                setSelectedPackageId(defaultPackage?.id ?? '')
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
                  <div className={pathRowClassName}>
                    <PipeNode
                      eyebrow={`Prompt ${String(step.stepNumber).padStart(2, '0')}`}
                      title={step.title}
                      terminal={false}
                      variant="prompt"
                    >
                      <PromptText text={step.prompt} />
                    </PipeNode>
                    {hasForkLane && <div className="hidden xl:block" aria-hidden="true" />}
                  </div>

                  <div className={pathRowClassName}>
                    <PipeNode
                      eyebrow={`Response ${String(step.stepNumber).padStart(2, '0')}`}
                      title={step.title}
                      terminal={index === steps.length - 1}
                      variant="response"
                      selected={Boolean(selectedStepPackage)}
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
                      onSelect={artifactPackages.length > 0 ? setSelectedPackageId : undefined}
                      providerName={providerName}
                    />
                    </PipeNode>
                    {hasForkLane && (
                      <ResponseForkHoverRail
                        forks={stepForks}
                        activeForkId={activeForkId}
                        onSelectFork={(fork) => setActiveForkId(fork.id)}
                      />
                    )}
                  </div>
                </Fragment>
              )
            })}
          </div>
        )}

        <div className="mt-8 border border-surface-200 bg-white p-4">
          {sourceRunHref ? (
            <div>
              <a
                href={sourceRunHref}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
              >
                Source run
                <ExternalLink className="h-4 w-4" />
              </a>
              {sourceRunAccessNote && (
                <p className="mt-2 text-xs leading-5 text-surface-500" data-source-run-access-note>
                  {sourceRunAccessNote}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-surface-700">
              <span className="font-semibold text-surface-900">Source run</span>
              <span>Local approval draft; provider link has not been captured yet.</span>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
