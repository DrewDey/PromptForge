import styles from './ProjectPreview.module.css'
import {
  ProtectedArtifactFrame,
  type ArtifactPackage,
} from './SourceRunShowcase'

type ProjectPreviewProps = {
  artifactPath: string | null
  title: string
  label?: string
  className?: string
  /**
   * Public community artifacts always render as non-executable visual previews.
   * The path check below remains a second boundary for every call site that
   * reaches the private community-artifact route without carrying this flag.
   */
  isCommunityArtifact?: boolean
}

function isCommunityArtifactPath(artifactPath: string | null) {
  const pathname = artifactPath?.split(/[?#]/, 1)[0] ?? ''
  return /^\/api\/community-artifacts\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pathname)
}

export function ProjectPreview({
  artifactPath,
  title,
  label = 'Real artifact preview',
  className = '',
  isCommunityArtifact = false,
}: ProjectPreviewProps) {
  const isStaticCommunityPreview = isCommunityArtifact || isCommunityArtifactPath(artifactPath)
  const previewLabel = isStaticCommunityPreview ? 'Visual-only community preview' : label
  const selectedPackage: ArtifactPackage | null = artifactPath ? {
    id: `discovery-preview:${artifactPath}`,
    stepId: `discovery-preview:${artifactPath}`,
    stepNumber: 1,
    title,
    prompt: '',
    response: '',
    artifactPath,
    artifactTitle: title,
    artifactOrdinal: 1,
    artifactCount: 1,
    isDefaultArtifact: true,
  } : null
  const frameId = artifactPath
    ? `artifact-preview-${artifactPath.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
    : undefined

  return (
    <div
      className={`${styles.preview} ${className}`.trim()}
      data-project-preview-mode={isStaticCommunityPreview ? 'static-untrusted' : 'interactive-trusted'}
    >
      {selectedPackage ? (
        <>
          <div className={styles.frame} aria-hidden="true" inert>
            <ProtectedArtifactFrame
              selectedPackage={selectedPackage}
              providerName="AI"
              showOpenAction={false}
              frameHeight="100%"
              bare
              frameId={frameId}
              allowArtifactDownloads={!isStaticCommunityPreview}
              allowArtifactScripts={!isStaticCommunityPreview}
            />
          </div>
          <div className={styles.chrome} aria-hidden="true">
            <span>{previewLabel}</span>
            <span className={styles.status}>{isStaticCommunityPreview ? 'Visual preview' : 'Working result'}</span>
          </div>
          <div className={styles.caption} aria-hidden="true">
            <strong>{title}</strong>
            <span>Open project →</span>
          </div>
        </>
      ) : (
        <div className={styles.fallback} aria-hidden="true">
          <strong>{title}</strong>
        </div>
      )}
    </div>
  )
}
