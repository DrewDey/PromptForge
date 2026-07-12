import Link from 'next/link'
import { ArrowRight, GitFork, Layers3 } from 'lucide-react'

export default function GuideLineage() {
  return (
    <section className="guide-lineage guide-section" id="fork" aria-labelledby="guide-fork-title">
      <div className="guide-shell">
        <div className="guide-section-heading guide-section-heading-split">
          <div>
            <div className="guide-step-mark"><span>03</span> Fork a response</div>
            <h2 id="guide-fork-title">Branch from the moment you want to change.</h2>
          </div>
          <p>
            A fork is not a loose copy. It starts from one exact response, preserves which artifact
            should continue, and keeps the shared history visible. You then attach or paste that
            artifact in the new model chat.
          </p>
        </div>

        <div className="guide-lineage-stage">
          <div className="guide-lineage-ancestor">
            <span className="guide-overline">Shared path · collapsed left</span>
            <div className="guide-ancestor-node"><span>Prompt 01</span><strong>Build the mixer</strong></div>
            <div className="guide-ancestor-node"><span>Response 01</span><strong>First artifact</strong></div>
            <div className="guide-ancestor-node"><span>Prompt 02</span><strong>Repair controls</strong></div>
            <div className="guide-ancestor-node guide-ancestor-node-active"><span>Response 02</span><strong>Fork point</strong></div>
          </div>

          <div className="guide-fork-junction" aria-hidden="true">
            <span />
            <div><GitFork /></div>
            <span />
          </div>

          <div className="guide-lineage-branch">
            <div className="guide-branch-top">
              <div>
                <span className="guide-overline">New branch · gets the focus</span>
                <h3>Travel Sleep Mixer</h3>
                <p>Add a hotel-friendly preset and keyboard controls without changing the original project.</p>
              </div>
              <span className="guide-green-chip"><GitFork aria-hidden="true" /> Fork of response 02</span>
            </div>
            <div className="guide-branch-path">
              <article><span>Prompt 03</span><strong>Add the Travel preset</strong><p>The new request begins after the inherited path.</p></article>
              <ArrowRight aria-hidden="true" />
              <article><span>Response 03</span><strong>Updated artifact</strong><p>The descendant keeps its own source run and, if approved, receives its own project page.</p></article>
            </div>
            <div className="guide-branch-actions">
              <span>The original stays intact.</span>
              <Link href="/calming-sleep-sound-mixer-demo#source-run-path">See a real response path <ArrowRight aria-hidden="true" /></Link>
            </div>
          </div>
        </div>

        <div className="guide-compare-cards">
          <article className="guide-compare-card guide-compare-model">
            <Layers3 aria-hidden="true" />
            <div><span>Model result</span><h3>Same brief. Another model.</h3><p>Use it to compare how models solve the same project. It is another view of the same product family.</p></div>
          </article>
          <article className="guide-compare-card guide-compare-fork">
            <GitFork aria-hidden="true" />
            <div><span>Fork</span><h3>Same history. A new direction.</h3><p>Use it when you want a descendant project from one exact response. The lineage remains visible.</p></div>
          </article>
        </div>
      </div>
    </section>
  )
}
