import Link from 'next/link'
import { ArrowRight, Check, GitFork, Layers3, Play, Sparkles } from 'lucide-react'

export default function GuideHero() {
  return (
    <section className="guide-hero" aria-labelledby="guide-title">
      <div className="guide-hero-grid" aria-hidden="true" />
      <div className="guide-shell guide-hero-layout">
        <div className="guide-hero-copy">
          <div className="guide-kicker guide-kicker-dark">
            <Sparkles aria-hidden="true" />
            The PathForge walkthrough
          </div>
          <h1 id="guide-title">
            See it working.<br />
            See how it was made.<br />
            <span>Build the next version.</span>
          </h1>
          <p className="guide-hero-lead">
            PathForge turns finished AI projects into reusable build paths: the working artifact,
            exact prompts and responses, model results, and every meaningful fork—kept together.
          </p>
          <div className="guide-actions">
            <Link href="/paths?panel=open" className="guide-button guide-button-primary">
              Explore build paths
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/build" className="guide-button guide-button-ghost-dark">
              I already built something
            </Link>
          </div>
          <div className="guide-trust-line" aria-label="PathForge principles">
            <span><Check aria-hidden="true" />Real source runs</span>
            <span><Check aria-hidden="true" />Working artifacts</span>
            <span><Check aria-hidden="true" />Review before publishing</span>
          </div>
        </div>

        <div className="guide-hero-exhibit" aria-label="Illustration of a PathForge project moving from prompt to artifact to fork">
          <div className="guide-window-bar" aria-hidden="true">
            <span /><span /><span />
            <div>pathforge.app / calming-sleep-sound-mixer</div>
          </div>
          <div className="guide-hero-project">
            <div className="guide-exhibit-heading">
              <div>
                <span className="guide-overline">Working project</span>
                <strong>Calming Sleep-Sound Mixer</strong>
              </div>
              <span className="guide-live-chip"><span /> Live artifact</span>
            </div>

            <div className="guide-mini-artifact">
              <div className="guide-mini-artifact-top">
                <span className="guide-moon" />
                <div><strong>Nightsound</strong><small>offline ambient mixer</small></div>
                <button type="button" tabIndex={-1} aria-hidden="true"><Play /> Play</button>
              </div>
              {[
                ['Rain', '68%'],
                ['Fan', '42%'],
                ['Brown noise', '24%'],
              ].map(([label, value], index) => (
                <div className="guide-mini-level" key={label}>
                  <span>{label}</span><span>{value}</span>
                  <i aria-hidden="true"><b style={{ width: `${[68, 42, 24][index]}%` }} /></i>
                </div>
              ))}
            </div>

            <div className="guide-exhibit-path">
              <div className="guide-path-node guide-path-node-prompt">
                <span>Prompt 01</span>
                <strong>Build the offline mixer</strong>
              </div>
              <ArrowRight aria-hidden="true" />
              <div className="guide-path-node guide-path-node-response">
                <span>Response 01</span>
                <strong>Working HTML</strong>
              </div>
              <ArrowRight aria-hidden="true" />
              <div className="guide-path-node guide-path-node-fork">
                <GitFork aria-hidden="true" />
                <span>Fork here</span>
              </div>
            </div>
          </div>
          <div className="guide-hero-float guide-hero-float-model">
            <Layers3 aria-hidden="true" />
            <div><span>Same brief</span><strong>3 model results</strong></div>
          </div>
          <div className="guide-hero-float guide-hero-float-branch">
            <GitFork aria-hidden="true" />
            <div><span>New branch</span><strong>Keep the lineage</strong></div>
          </div>
        </div>
      </div>
    </section>
  )
}
