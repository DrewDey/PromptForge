import type { DiscoveryPreview } from '@/lib/path-discovery'

type ArtifactPreviewProps = {
  variant: DiscoveryPreview
  title: string
  large?: boolean
  live?: boolean
}

function PreviewBody({ variant }: { variant: DiscoveryPreview }) {
  if (variant === 'mixer') {
    return (
      <div className="path-preview-mixer">
        <div className="path-preview-disc" />
        {[68, 42, 24].map((width) => (
          <div key={width} className="path-preview-slider"><span style={{ width: `${width}%` }} /></div>
        ))}
      </div>
    )
  }

  if (variant === 'matrix') {
    return (
      <div className="path-preview-matrix">
        <div className="path-preview-matrix-label" />
        {Array.from({ length: 12 }, (_, index) => <span key={index} className={index === 7 ? 'active' : ''} />)}
      </div>
    )
  }

  if (variant === 'calculator') {
    return (
      <div className="path-preview-calculator">
        <div className="path-preview-screen">1,284.50</div>
        <div className="path-preview-keys">
          {Array.from({ length: 15 }, (_, index) => <span key={index} className={index > 11 ? 'accent' : ''} />)}
        </div>
      </div>
    )
  }

  if (variant === 'checklist') {
    return (
      <div className="path-preview-checklist">
        {[true, true, false, false].map((checked, index) => (
          <div key={index}><span className={checked ? 'checked' : ''} /><i style={{ width: `${86 - index * 9}%` }} /></div>
        ))}
      </div>
    )
  }

  if (variant === 'board') {
    return (
      <div className="path-preview-board">
        {[3, 2, 3].map((count, column) => (
          <div key={column}>
            <b />
            {Array.from({ length: count }, (_, index) => <span key={index} />)}
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'game') {
    return (
      <div className="path-preview-game">
        <div className="path-preview-hud"><span>Score 0240</span><span>03 lives</span></div>
        <div className="path-preview-player" />
        <div className="path-preview-target target-one" />
        <div className="path-preview-target target-two" />
        <div className="path-preview-track" />
      </div>
    )
  }

  if (variant === 'studio') {
    return (
      <div className="path-preview-studio">
        <div className="path-preview-stage"><span /><i /></div>
        <div className="path-preview-tools">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div>
      </div>
    )
  }

  return (
    <div className="path-preview-utility">
      <div className="path-preview-utility-chart"><span /><span /><span /><span /></div>
      <div className="path-preview-utility-copy"><span /><span /><span /></div>
    </div>
  )
}

export function ArtifactPreview({ variant, title, large = false, live = false }: ArtifactPreviewProps) {
  return (
    <div className={`path-preview has-${variant}${large ? ' is-large' : ''}`} aria-hidden="true">
      <div className="path-preview-chrome">
        <span /><span /><span />
        <b>{title}</b>
      </div>
      <div className="path-preview-canvas">
        <PreviewBody variant={variant} />
      </div>
      {live && <div className="path-preview-live"><span /> Working artifact</div>}
    </div>
  )
}
