import Link from 'next/link'
import type { Metadata } from 'next'
import { BROAD_DOMAINS, formatPathCount, getBroadDomainPromptCounts } from '@/lib/broad-domains'
import { getCategories, getPrompts } from '@/lib/data'
import { canonicalMetadata } from '@/lib/site-url'
import './home.css'

export const metadata: Metadata = {
  title: 'PathForge — Real AI Build Paths, Prompts, and Artifacts',
  description: 'Explore real AI build paths with the exact prompts, outputs, artifacts, and branches behind finished projects you can fork and ship.',
  ...canonicalMetadata('/'),
}

/* ─────────────────────────────────────────────────────────
   Homepage — implemented from design handoff 2026-04-19
   (design/handoff/pathforge/project/Homepage.html).
   Scoped under .pf-home; styles live in ./home.css.

   Real-data wiring:
   • Domain tiles stay intentionally broad while the library is seeded.
   • Hero stats + popular paths removed per design comments (must not ship
     fabricated engagement numbers). Community quotes kept as static
     illustrative copy — they read as example stories, not engagement metrics.
   ───────────────────────────────────────────────────────── */

export default async function HomePage() {
  const [categories, allPrompts] = await Promise.all([
    getCategories(),
    getPrompts({ sort: 'popular', limit: 300 }),
  ])
  const countsByDomain = getBroadDomainPromptCounts(allPrompts, categories)

  return (
    <div className="pf-home">
      {/* ═══════════ HERO ═══════════ */}
      <section className="hero">
        <div className="hero-wrap">
          <div>
            <div className="hero-eyebrow">
              <span className="pulse" />
              <span>Real builds. Real prompts. Real results.</span>
            </div>
            <h1>
              Stop staring at<br />the blank chat.<br />
              <span className="serif">Forge</span>{' '}
              <span className="underline">your path.</span>
            </h1>
            <p className="lead">
              See exactly how real projects were built — every prompt, every result, every branch. Fork a path, swap in your context, and have something real to show by bedtime.
            </p>
            <div className="hero-ctas">
              <Link href="/paths" className="btn-primary">
                Build Paths
                <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square"><path d="M5 12H19M13 6L19 12L13 18" /></svg>
              </Link>
              <Link href="/build" className="btn-secondary">
                Build a path
              </Link>
            </div>
            {/* Hero stats strip intentionally omitted — live counts not yet
                wired. See design/handoff README for the planned data shape. */}
          </div>

          {/* Exhibit: a realistic build path preview */}
          <div className="exhibit">
            <div className="exhibit-frame">
              <div className="exhibit-chrome">
                <span className="dot" /><span className="dot" /><span className="dot" />
                <span className="url">pathforge.app/<b>snake-demo</b></span>
              </div>
              <div className="exhibit-inner">
                <div className="ex-tag-row">
                  <span className="ex-tag orange">Approved seed</span>
                  <span className="ex-tag ghost">Games · Playable build</span>
                </div>
                <h3 className="ex-title">Playable Snake game — one-shot path</h3>
                <div className="ex-sub">PathForge Projects · 1 prompt · GPT 5.5 Pro · live artifact</div>

                <div className="ex-step active">
                  <div className="ex-step-num">1</div>
                  <div className="ex-step-body">
                    <div className="ex-prompt">Make me a playable Snake game as a single self-contained HTML file.</div>
                    <div className="ex-result">Returns a full HTML artifact with game logic, controls, and styling</div>
                  </div>
                </div>
                <div className="ex-step">
                  <div className="ex-step-num">2</div>
                  <div className="ex-step-body">
                    <div className="ex-prompt">Mount the generated file as the final result.</div>
                    <div className="ex-result">The playable game renders directly at the top of the project page</div>
                  </div>
                </div>
                <div className="ex-step">
                  <div className="ex-step-num">3</div>
                  <div className="ex-step-body">
                    <div className="ex-prompt">Keep the exact response package collapsed below the preview.</div>
                    <div className="ex-result">Prompt, response, attachments, and verification stay tied together</div>
                  </div>
                </div>

                <div className="ex-footer">
                  <div className="who">
                    <div className="ava">P</div>
                    <span>by <b style={{ color: 'var(--color-surface-800)', fontWeight: 600 }}>PathForge Projects</b> · approved seed</span>
                  </div>
                  <div className="metrics">
                    <span>1 prompt</span>
                    <span>1 artifact</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="exhibit-badge">
              <small>Live path</small>
              Play the artifact
            </div>
            <div className="exhibit-fork">
              <div className="ic">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="18" cy="6" r="2.5" /><circle cx="6" cy="6" r="2.5" /><circle cx="12" cy="20" r="2.5" /><path d="M6 8.5V13A3 3 0 009 16H15A3 3 0 0018 13V8.5M12 16V17.5" /></svg>
              </div>
              <div>
                <b>Seed #1</b><br />
                <span style={{ color: 'var(--color-surface-500)', fontSize: '10.5px', fontFamily: 'var(--font-mono)' }}>approved</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ MARQUEE ═══════════ */}
      <div className="marquee">
        <div className="marquee-wrap">
          <span className="lbl">Works with</span>
          <span className="model"><span className="sq" style={{ background: '#d97706' }} />Claude</span>
          <span className="model"><span className="sq" style={{ background: '#10a37f' }} />GPT-4 / 5</span>
          <span className="model"><span className="sq" style={{ background: '#4285f4' }} />Gemini</span>
          <span className="model"><span className="sq" style={{ background: '#000' }} />xAI Grok</span>
          <span className="model"><span className="sq" style={{ background: '#7c3aed' }} />Mistral</span>
          <span className="model"><span className="sq" style={{ background: 'var(--color-surface-600)' }} />Llama</span>
          <span className="lbl">+ any custom model</span>
        </div>
      </div>

      {/* ═══════════ PROBLEM ═══════════ */}
      <section className="problem">
        <div className="sect-wrap">
          <div>
            <div className="eyebrow">The blank chat tax</div>
            <h2>Everyone has the tools.<br /><span className="serif">Nobody</span> knows what to build.</h2>
            <p>
              You&apos;ve got tokens. You&apos;ve got an evening. You open a new chat and rebuild something someone else already figured out — every single time. The best AI work is buried in private sessions, screenshots, and memory. Nobody else can learn from it.
            </p>
          </div>
          <div className="problem-visual" aria-hidden="true">
            <div className="pv-line"><span className="caret">$</span> new chat <span style={{ color: 'var(--color-surface-600)' }}>// 11:47 PM</span></div>
            <div className="pv-line you">&gt; help me build a <span className="strike">thing</span> <span className="strike">tool</span> <span className="strike">something productive</span><span className="blink" /></div>
            <div className="pv-line ai">What are you trying to accomplish?</div>
            <div className="pv-line you">&gt; idk. something useful with my evening</div>
            <div className="pv-line ai">I can help! What domain are you interested in?</div>
            <div className="pv-line you">&gt; <span className="strike">coding</span> <span className="strike">writing</span> <span className="strike">finance</span> nvm</div>
            <div className="pv-line" style={{ marginTop: 16 }}><span className="caret">$</span> <span style={{ color: 'var(--color-surface-600)' }}>session abandoned — 0 tokens of useful output</span></div>
            <div className="overlay">Blank Chat Tax</div>
          </div>
        </div>
      </section>

      {/* ═══════════ ANATOMY ═══════════ */}
      <section className="anatomy">
        <div className="sect-wrap">
          <div className="anatomy-header">
            <div>
              <div className="eyebrow">What&apos;s a build path?</div>
              <h2 className="section-title">The whole journey, not a <span className="serif">one-line</span> prompt.</h2>
            </div>
            <p>
              Templates give you fill-in-the-blank prompts. Build Paths give you the full context: the finished project, every prompt that produced it, every result, every branch you tried. Fork it, adapt it, ship yours.
            </p>
          </div>

          <div className="anatomy-diagram">
            <div className="anatomy-side">
              <div className="anatomy-label"><b>Metadata</b><span className="anatomy-tag">header</span></div>
              <div className="box"><div className="k">Domain</div><div className="v">Games</div></div>
              <div className="box"><div className="k">Difficulty</div><div className="v">Beginner</div></div>
              <div className="box"><div className="k">Model</div><div className="v orange">GPT 5.5 Pro</div></div>
              <div className="box"><div className="k">Steps</div><div className="v">1</div></div>
            </div>

            <div className="anatomy-center">
              <div className="anatomy-label" style={{ marginBottom: 8 }}><b>The chain</b><span className="anatomy-tag">prompt → result × N</span></div>
              <div className="astep orange">
                <div className="astep-num">1</div>
                <div className="astep-body">
                  <h4>Send one plain prompt</h4>
                  <div className="prompt-line">Make me a playable Snake game as a single self-contained HTML file.</div>
                  <div className="result-line"><b>Output</b> complete HTML game file</div>
                </div>
              </div>
              <div className="astep">
                <div className="astep-num">2</div>
                <div className="astep-body">
                  <h4>Capture the response</h4>
                  <div className="prompt-line">Store the exact response package and attached file.</div>
                  <div className="result-line"><b>Output</b> collapsed response with verification context</div>
                </div>
              </div>
              <div className="astep">
                <div className="astep-num">3</div>
                <div className="astep-body">
                  <h4>Mount the artifact</h4>
                  <div className="prompt-line">Render the final file at the top of the page.</div>
                  <div className="result-line"><b>Output</b> playable Snake game inside the project page</div>
                </div>
              </div>
            </div>

            <div className="anatomy-side">
              <div className="anatomy-label"><b>Outcome</b><span className="anatomy-tag">result</span></div>
              <div className="box" style={{ background: 'var(--color-brand-orange)', borderColor: 'var(--color-brand-orange-dark)', color: '#fff' }}>
                <div className="k" style={{ color: 'rgba(255,255,255,.7)' }}>Shipped</div>
                <div className="v" style={{ color: '#fff', fontWeight: 700 }}>Playable Snake game, ready to run tonight</div>
              </div>
              <div className="box"><div className="k">Your turn</div><div className="v">Fork &amp; change the rules</div></div>
              <div className="box"><div className="k">Est. time</div><div className="v">10 min</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CATEGORIES ═══════════ */}
      <section className="cats">
        <div className="sect-wrap">
          <div className="cats-header">
            <div>
              <div className="eyebrow">Explore by domain</div>
              <h2 className="section-title">A path for <span className="serif">every</span> kind of evening.</h2>
            </div>
            <Link href="/paths?panel=open" className="btn-secondary">
              Search all paths
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square"><path d="M5 12H19M13 6L19 12L13 18" /></svg>
            </Link>
          </div>
          <div className="cats-grid">
            {BROAD_DOMAINS.map((domain) => (
              <Link
                key={domain.slug}
                href={`/paths?domain=${domain.slug}&panel=open`}
                className={`domain-tile ${domain.slug}`}
              >
                <div className="domain-tile-art" aria-hidden="true">
                  <div className="domain-main-thumb">
                    {domain.slug === 'productivity' ? (
                      <div className="workflow-thumb">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : null}
                  </div>
                  {domain.previewLabels.slice(0, 3).map((label, index) => (
                    <div key={label} className={`domain-mini-thumb mini-${index + 1}`}>
                      {label}
                    </div>
                  ))}
                </div>
                <div className="domain-tile-body">
                  <div className="domain-eyebrow">{domain.eyebrow}</div>
                  <h3>{domain.label}</h3>
                  <p>{domain.description}</p>
                  <div className="domain-foot">
                    <span>{formatPathCount(countsByDomain[domain.slug] ?? 0)}</span>
                    <span>Open paths →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="finalcta">
        <div className="sect-wrap">
          <div className="eyebrow">Your turn</div>
          <h2>You&apos;ve got the tools.<br /><span className="serif">You&apos;ve got</span> tonight.</h2>
          <p>Open a build path, fork the prompts, swap in your context, and have a real thing to show by bedtime. No blank chat. No guessing what to build.</p>
          <div className="finalcta-btns">
            <Link href="/paths" className="btn-primary">
              Find tonight&apos;s build
              <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square"><path d="M5 12H19M13 6L19 12L13 18" /></svg>
            </Link>
            <Link href="/auth/signup" className="btn-secondary">Create free account</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
