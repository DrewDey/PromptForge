import Link from 'next/link'
import { ExternalLink, Moon, Play, Timer } from 'lucide-react'

const levels = [
  ['Rain', '0%', '0%'],
  ['Fan', '0%', '0%'],
  ['Brown noise', '0%', '0%'],
  ['Master volume', '100%', '100%'],
]

export default function SleepMixerPreview({ artifactHref }: { artifactHref: string }) {
  return (
    <div className="guide-sleep-preview" aria-label="Preview of the Calming Sleep-Sound Mixer artifact">
      <div className="guide-sleep-glow" aria-hidden="true" />
      <div className="guide-sleep-card">
        <div className="guide-sleep-brand">
          <span><Moon aria-hidden="true" /></span>
          <div><strong>Nightsound</strong><small>Steady sound for falling asleep</small></div>
        </div>
        <div className="guide-sleep-play"><Play aria-hidden="true" /><span>Play</span></div>
        <div className="guide-sleep-presets">
          <span>Rainy night</span><span>Box fan</span><span>Deep hum</span><span>Storm cabin</span>
        </div>
        <div className="guide-sleep-levels">
          {levels.map(([label, value, width]) => (
            <div key={label}>
              <p><strong>{label}</strong><span>{value}</span></p>
              <i aria-hidden="true"><b style={{ width }}><em /></b></i>
            </div>
          ))}
        </div>
        <div className="guide-sleep-timer">
          <Timer aria-hidden="true" />
          <div><span>Sleep timer</span><strong>Off · options up to 90 minutes</strong></div>
          <span>Ready</span>
        </div>
        <Link
          href={artifactHref}
          target="_blank"
          rel="noopener"
          className="guide-sleep-open"
        >
          Open the working mixer <ExternalLink aria-hidden="true" />
        </Link>
      </div>
      <p className="guide-sleep-hint">The real artifact opens separately so its code stays safely isolated from the PathForge page.</p>
    </div>
  )
}
