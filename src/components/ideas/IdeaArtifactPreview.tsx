import type { DiscoveryPreview } from '@/lib/path-discovery'

type IdeaArtifactPreviewProps = {
  title: string
  variant: DiscoveryPreview
  compact?: boolean
}

function PreviewScene({ variant }: { variant: DiscoveryPreview }) {
  if (variant === 'game') {
    return (
      <div className="idea-artifact-game">
        <span className="idea-game-score">SCORE 0240</span>
        <i className="idea-game-target target-one" />
        <i className="idea-game-target target-two" />
        <b className="idea-game-player" />
        <span className="idea-game-floor" />
      </div>
    )
  }

  if (variant === 'calculator' || variant === 'matrix') {
    return (
      <div className={`idea-artifact-numbers is-${variant}`}>
        <strong>{variant === 'calculator' ? '1,284.50' : '7.8 / 10'}</strong>
        <div>
          {Array.from({ length: 12 }, (_, index) => <span key={index} className={index === 7 ? 'is-active' : ''} />)}
        </div>
      </div>
    )
  }

  if (variant === 'mixer') {
    return (
      <div className="idea-artifact-mixer">
        <b />
        {[72, 48, 29].map(width => <span key={width}><i style={{ width: `${width}%` }} /></span>)}
      </div>
    )
  }

  if (variant === 'board') {
    return (
      <div className="idea-artifact-board">
        {[3, 2, 3].map((count, column) => (
          <div key={column}>
            <b />
            {Array.from({ length: count }, (_, index) => <span key={index} />)}
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'checklist') {
    return (
      <div className="idea-artifact-list">
        {[true, true, false, false].map((checked, index) => (
          <span key={index}><i className={checked ? 'is-checked' : ''} /><b style={{ width: `${78 - index * 7}%` }} /></span>
        ))}
      </div>
    )
  }

  return (
    <div className={`idea-artifact-studio is-${variant}`}>
      <div><b /><i /></div>
      <span />
      <span />
      <span />
    </div>
  )
}

export function IdeaArtifactPreview({ title, variant, compact = false }: IdeaArtifactPreviewProps) {
  return (
    <div className={`idea-artifact idea-artifact-${variant}${compact ? ' is-compact' : ''}`} aria-hidden="true">
      <div className="idea-artifact-bar">
        <span /><span /><span />
        <b>{title}</b>
      </div>
      <div className="idea-artifact-stage">
        <PreviewScene variant={variant} />
      </div>
    </div>
  )
}
