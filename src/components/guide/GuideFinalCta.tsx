import Link from 'next/link'
import { ArrowRight, Hammer, Search } from 'lucide-react'

export default function GuideFinalCta() {
  return (
    <section className="guide-final" aria-labelledby="guide-final-title">
      <div className="guide-final-grid" aria-hidden="true" />
      <div className="guide-shell guide-final-inner">
        <div className="guide-final-copy">
          <div className="guide-eyebrow">The blank chat is optional</div>
          <h2 id="guide-final-title">Start from a path that already <em>goes somewhere.</em></h2>
          <p>
            Open a finished project, try the artifact, inspect the exact work, and choose the response
            where your version should begin.
          </p>
        </div>
        <div className="guide-final-actions">
          <Link href="/paths?panel=open" className="guide-final-card guide-final-card-primary">
            <Search aria-hidden="true" />
            <span>Find your starting point</span>
            <strong>Explore build paths</strong>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/build" className="guide-final-card">
            <Hammer aria-hidden="true" />
            <span>Already finished something?</span>
            <strong>Share your finished run</strong>
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
