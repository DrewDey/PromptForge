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
}

export function ProjectPreview({
  artifactPath,
  title,
  label = 'Real artifact preview',
  className = '',
}: ProjectPreviewProps) {
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
    <div className={`${styles.preview} ${className}`.trim()}>
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
            />
          </div>
          <div className={styles.chrome} aria-hidden="true">
            <span>{label}</span>
            <span className={styles.status}>Working result</span>
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
