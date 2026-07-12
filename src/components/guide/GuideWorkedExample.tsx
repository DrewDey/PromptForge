import Link from 'next/link'
import { ArrowRight, Check, ChevronRight, ExternalLink, GitFork, Layers3, MousePointer2 } from 'lucide-react'
import SleepMixerPreview from '@/components/guide/SleepMixerPreview'

const modelRuns = [
  {
    provider: 'ChatGPT',
    model: 'GPT-5.6 Luna · Extra High',
    href: '/calming-sleep-sound-mixer-demo?run=cf73efd5-2fb6-48fe-a9fd-a1a0df336d18',
    active: false,
  },
  {
    provider: 'Claude',
    model: 'Fable 5 High · High reasoning',
    href: '/calming-sleep-sound-mixer-demo',
    active: true,
  },
  {
    provider: 'Gemini',
    model: 'Gemini 3.1 Pro · Pro mode',
    href: '/calming-sleep-sound-mixer-demo?run=7d9524c0ede185b2',
    active: false,
  },
]

const verifiedArtifactHref = `/artifact-viewer?${new URLSearchParams({
  path: '/artifacts/sleep-sound-mixer-claude-fable-5-high-final.html',
  title: 'Calming Sleep-Sound Mixer · Claude final',
  provider: 'Claude',
}).toString()}`

export default function GuideWorkedExample() {
  return (
    <>
      <section className="guide-example guide-section" id="find" aria-labelledby="guide-find-title">
        <div className="guide-shell">
          <div className="guide-section-heading guide-section-heading-split">
            <div>
              <div className="guide-step-mark"><span>01</span> Find a result</div>
              <h2 id="guide-find-title">Start at the finish line.</h2>
            </div>
            <div>
              <p>
                Browse for a result you can picture yourself using. Open the artifact first. If the
                outcome is right, the build path underneath shows exactly how it came together.
              </p>
              <Link href="/calming-sleep-sound-mixer-demo" className="guide-text-link">
                Open this real project <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="guide-artifact-stage">
            <div className="guide-artifact-copy">
              <div className="guide-stage-number">A</div>
              <span className="guide-overline">Try the finished thing</span>
              <h3>Calming Sleep-Sound Mixer</h3>
              <p>
                The preview mirrors the real browser artifact from the project page. Open the artifact
                to use its controls, generated audio, presets, and timer without a hosted AI call.
              </p>
              <ul>
                <li><Check aria-hidden="true" />Use the artifact before reading any prompts</li>
                <li><Check aria-hidden="true" />Open it larger when you want the full workspace</li>
                <li><Check aria-hidden="true" />Decide whether the outcome is worth adapting</li>
              </ul>
              <Link href="/calming-sleep-sound-mixer-demo" className="guide-inline-button">
                View the full project <ExternalLink aria-hidden="true" />
              </Link>
            </div>

            <div className="guide-artifact-browser">
              <div className="guide-window-bar guide-window-bar-light" aria-hidden="true">
                <span /><span /><span />
                <div>Working artifact · product preview</div>
              </div>
              <SleepMixerPreview artifactHref={verifiedArtifactHref} />
              <div className="guide-artifact-caption">
                <span><span className="guide-status-dot" /> Previewing the source-run artifact</span>
                <Link href={verifiedArtifactHref} target="_blank" rel="noopener">
                  Try the real artifact <ExternalLink aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="guide-inspect guide-section" id="inspect" aria-labelledby="guide-inspect-title">
        <div className="guide-shell">
          <div className="guide-section-heading guide-section-heading-light">
            <div className="guide-step-mark"><span>02</span> Read the path</div>
            <h2 id="guide-inspect-title">When the result is useful, reveal the recipe.</h2>
            <p>
              Every response stays connected to its prompt and any artifact version it produced. You
              can inspect the exact text, switch versions, or continue from the response that matters.
            </p>
          </div>

          <div className="guide-path-demo">
            <div className="guide-model-strip" aria-label="Example model result selector">
              <div className="guide-model-strip-title">
                <Layers3 aria-hidden="true" />
                <div><span>Model results</span><strong>Same project brief, different runs</strong></div>
              </div>
              <div className="guide-model-list">
                {modelRuns.map(({ provider, model, href, active }) => (
                  <Link
                    href={href}
                    className={`guide-model-item ${active ? 'is-active' : ''}`}
                    aria-label={`Open the ${provider} ${model} Sleep-Sound Mixer run`}
                    key={provider}
                  >
                    <span className={`guide-provider-dot guide-provider-${provider.toLowerCase()}`} />
                    <div><strong>{provider}</strong><small>{model}</small></div>
                    {active ? <span className="guide-viewing">Viewing here</span> : <ChevronRight aria-hidden="true" />}
                  </Link>
                ))}
              </div>
              <p className="guide-model-note">
                Each row opens that real run. The list stays in the same alphabetical order so it
                never becomes a moving target when you choose one.
              </p>
            </div>

            <div className="guide-path-canvas">
              <div className="guide-path-canvas-top">
                <div><span className="guide-overline">Build path</span><strong>2 prompts · 2 artifact versions</strong></div>
                <span className="guide-exact-badge"><Check aria-hidden="true" /> Exact source preserved</span>
              </div>

              <div className="guide-timeline">
                <div className="guide-timeline-rail" aria-hidden="true" />
                <article className="guide-timeline-card guide-timeline-prompt">
                  <div className="guide-timeline-index">01</div>
                  <div>
                    <span>Prompt</span>
                    <h3>Build the invariant sleep-sound mixer brief</h3>
                    <p>
                      Build me a calming sleep-sound mixer I can save as one file and open in my
                      browser. I want adjustable rain, fan, and brown-noise layers…
                    </p>
                  </div>
                </article>

                <article className="guide-timeline-card guide-timeline-response">
                  <div className="guide-timeline-index">01</div>
                  <div>
                    <div className="guide-card-title-row">
                      <div><span>Response</span><h3>First working artifact</h3></div>
                      <button type="button" tabIndex={-1} aria-hidden="true"><GitFork /> Fork here</button>
                    </div>
                    <p>The exact visible model response stays available below the project preview.</p>
                    <div className="guide-artifact-version">
                      <span>Artifact</span><strong>Sleep-Sound Mixer · first pass</strong><em>Available</em>
                    </div>
                  </div>
                </article>

                <article className="guide-timeline-card guide-timeline-prompt guide-timeline-muted">
                  <div className="guide-timeline-index">02</div>
                  <div>
                    <span>Prompt</span>
                    <h3>Repair the master, pause, and timer defects</h3>
                    <p>A verification-driven follow-up fixes concrete mixer-state defects without losing the first version.</p>
                  </div>
                </article>

                <article className="guide-timeline-card guide-timeline-response guide-timeline-selected">
                  <div className="guide-timeline-index">02</div>
                  <div>
                    <div className="guide-card-title-row">
                      <div><span>Response</span><h3>Final verified artifact</h3></div>
                      <span className="guide-selected-pill"><MousePointer2 aria-hidden="true" /> Current</span>
                    </div>
                    <p>The final version becomes the default, while the earlier real artifact remains selectable.</p>
                    <div className="guide-artifact-version guide-artifact-version-selected">
                      <span>Artifact</span><strong>Calming Sleep-Sound Mixer · final</strong><em>Selected</em>
                    </div>
                  </div>
                </article>
              </div>

              <div className="guide-reading-key">
                <span><i className="is-orange" aria-hidden="true" />Prompt: what the person asked</span>
                <span><i className="is-blue" aria-hidden="true" />Response: what the model returned</span>
                <span><i className="is-dark" aria-hidden="true" />Artifact: the working file</span>
                <span><i className="is-green" aria-hidden="true" />Fork: where a new branch begins</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
