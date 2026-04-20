import Link from 'next/link'
import { getCategories } from '@/lib/data'
import './home.css'

/* ─────────────────────────────────────────────────────────
   Homepage — implemented from design handoff 2026-04-19
   (design/handoff/pathforge/project/Homepage.html).
   Scoped under .pf-home; styles live in ./home.css.

   Real-data wiring:
   • Category tiles pull from getCategories() (icon + slug + name + count).
   • Hero stats + popular paths removed per design comments (must not ship
     fabricated engagement numbers). Community quotes kept as static
     illustrative copy — they read as example stories, not engagement metrics.
   ───────────────────────────────────────────────────────── */

export default async function HomePage() {
  const categories = await getCategories()

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
              <Link href="/browse" className="btn-primary">
                Browse build paths
                <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square"><path d="M5 12H19M13 6L19 12L13 18" /></svg>
              </Link>
              <Link href="/prompt/new" className="btn-secondary">
                Share a build
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
                <span className="url">pathforge.app/path/<b>cfp-study-companion</b></span>
              </div>
              <div className="exhibit-inner">
                <div className="ex-tag-row">
                  <span className="ex-tag orange">Trending</span>
                  <span className="ex-tag ghost">Education · Finance</span>
                </div>
                <h3 className="ex-title">CFP study companion — prompt chain</h3>
                <div className="ex-sub">Marcus Chen · 4 steps · Claude Sonnet 4.5 · 312 forks</div>

                <div className="ex-step active">
                  <div className="ex-step-num">1</div>
                  <div className="ex-step-body">
                    <div className="ex-prompt">You are a CFP® tutor. Quiz me on <b>{'{module}'}</b> — 5 multiple-choice, explain wrong answers.</div>
                    <div className="ex-result">Returns 5 scenario-based questions tied to the CFP Board domain list</div>
                  </div>
                </div>
                <div className="ex-step">
                  <div className="ex-step-num">2</div>
                  <div className="ex-step-body">
                    <div className="ex-prompt">Summarize my misses into a flashcard deck, JSON format.</div>
                    <div className="ex-result">Structured deck — drop straight into Anki or Quizlet</div>
                  </div>
                </div>
                <div className="ex-step">
                  <div className="ex-step-num">3</div>
                  <div className="ex-step-body">
                    <div className="ex-prompt">Build a 14-day spaced-repetition plan around my weak domains.</div>
                    <div className="ex-result">Day-by-day schedule with diminishing review cadence</div>
                  </div>
                </div>

                <div className="ex-footer">
                  <div className="who">
                    <div className="ava">M</div>
                    <span>by <b style={{ color: 'var(--color-surface-800)', fontWeight: 600 }}>marcusdev</b> · shipped today</span>
                  </div>
                  <div className="metrics">
                    <span>↑ 847</span>
                    <span>⎇ 312</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="exhibit-badge">
              <small>Live path</small>
              See every step
            </div>
            <div className="exhibit-fork">
              <div className="ic">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="18" cy="6" r="2.5" /><circle cx="6" cy="6" r="2.5" /><circle cx="12" cy="20" r="2.5" /><path d="M6 8.5V13A3 3 0 009 16H15A3 3 0 0018 13V8.5M12 16V17.5" /></svg>
              </div>
              <div>
                <b>+312 forks</b><br />
                <span style={{ color: 'var(--color-surface-500)', fontSize: '10.5px', fontFamily: 'var(--font-mono)' }}>this week</span>
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
              Templates give you fill-in-the-blank prompts. Build paths give you the full context: the finished project, every prompt that produced it, every result, every branch you tried. Fork it, adapt it, ship yours.
            </p>
          </div>

          <div className="anatomy-diagram">
            <div className="anatomy-side">
              <div className="anatomy-label"><b>Metadata</b><span className="anatomy-tag">header</span></div>
              <div className="box"><div className="k">Category</div><div className="v">📚 Education</div></div>
              <div className="box"><div className="k">Difficulty</div><div className="v">Intermediate</div></div>
              <div className="box"><div className="k">Model</div><div className="v orange">Claude Sonnet 4.5</div></div>
              <div className="box"><div className="k">Steps</div><div className="v">3</div></div>
            </div>

            <div className="anatomy-center">
              <div className="anatomy-label" style={{ marginBottom: 8 }}><b>The chain</b><span className="anatomy-tag">prompt → result × N</span></div>
              <div className="astep orange">
                <div className="astep-num">1</div>
                <div className="astep-body">
                  <h4>Generate quiz questions</h4>
                  <div className="prompt-line">You are a CFP® tutor. Quiz me on {'{module}'}…</div>
                  <div className="result-line"><b>Output</b> 5 scenario-based MCQs tied to CFP domains</div>
                </div>
              </div>
              <div className="astep">
                <div className="astep-num">2</div>
                <div className="astep-body">
                  <h4>Convert misses to flashcards</h4>
                  <div className="prompt-line">Summarize my wrong answers into a JSON flashcard deck…</div>
                  <div className="result-line"><b>Output</b> Anki-ready JSON with prompt/answer pairs</div>
                </div>
              </div>
              <div className="astep">
                <div className="astep-num">3</div>
                <div className="astep-body">
                  <h4>Build study schedule</h4>
                  <div className="prompt-line">Build a 14-day spaced-repetition plan around my weak domains…</div>
                  <div className="result-line"><b>Output</b> Day-by-day schedule with review cadence</div>
                </div>
              </div>
            </div>

            <div className="anatomy-side">
              <div className="anatomy-label"><b>Outcome</b><span className="anatomy-tag">result</span></div>
              <div className="box" style={{ background: 'var(--color-brand-orange)', borderColor: 'var(--color-brand-orange-dark)', color: '#fff' }}>
                <div className="k" style={{ color: 'rgba(255,255,255,.7)' }}>Shipped</div>
                <div className="v" style={{ color: '#fff', fontWeight: 700 }}>CFP study kit, ready to run tonight</div>
              </div>
              <div className="box"><div className="k">Your turn</div><div className="v">Fork &amp; swap {'{module}'}</div></div>
              <div className="box"><div className="k">Est. time</div><div className="v">35 min</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CATEGORIES ═══════════ */}
      <section className="cats">
        <div className="sect-wrap">
          <div className="cats-header">
            <div>
              <div className="eyebrow">Browse by domain</div>
              <h2 className="section-title">A path for <span className="serif">every</span> kind of evening.</h2>
            </div>
            <Link href="/browse" className="btn-secondary">
              See all categories
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square"><path d="M5 12H19M13 6L19 12L13 18" /></svg>
            </Link>
          </div>
          <div className="cats-grid">
            {categories.map((cat) => {
              const count = cat.prompt_count ?? 0
              const countLabel = count > 0 ? `${count} paths` : 'New'
              return (
                <Link
                  key={cat.id}
                  href={`/browse?category=${cat.slug}`}
                  className="cat"
                >
                  <div className="cat-icon">{cat.icon}</div>
                  <h3>{cat.name}</h3>
                  <div className="count">{countLabel}</div>
                  <div className="arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ COMMUNITY ═══════════ */}
      <section className="community">
        <div className="sect-wrap">
          <div className="community-header">
            <div className="eyebrow" style={{ justifyContent: 'center' }}>From the community</div>
            <h2 className="section-title" style={{ marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>Built <span className="serif">tonight</span>. Shared by morning.</h2>
            <p className="section-sub" style={{ textAlign: 'center' }}>What builders actually did with their last evening.</p>
          </div>
          <div className="community-grid">
            <div className="quote">
              <p>I copied Marcus&apos;s CFP chain, swapped {'{module}'} for &ldquo;estate planning,&rdquo; and had a real study deck in Anki by 11. I&apos;d tried this same idea from scratch twice and given up both times.</p>
              <div className="quote-who">
                <div className="quote-ava" style={{ background: 'linear-gradient(135deg,#E87A2C,#C45A1A)' }}>S</div>
                <div className="quote-meta"><div className="nm">Sarah M.</div><div className="rl">@sarahgrows · marketing</div></div>
              </div>
              <div className="quote-shipped">⎇ Forked <b>CFP study companion</b></div>
            </div>
            <div className="quote">
              <p>The &ldquo;bank CSV → cashflow&rdquo; path saved me an hour. I already had the prompts floating around but never chained them. Seeing someone else&apos;s result gave me the template I needed.</p>
              <div className="quote-who">
                <div className="quote-ava" style={{ background: 'linear-gradient(135deg,#3B8FE4,#2563EB)' }}>J</div>
                <div className="quote-meta"><div className="nm">Jake T.</div><div className="rl">@jakefinance · CFO</div></div>
              </div>
              <div className="quote-shipped">⎇ Forked <b>Freelance cashflow forecast</b></div>
            </div>
            <div className="quote">
              <p>First time I&apos;ve finished an AI project I&apos;d started. Having the outputs next to each prompt meant I could tell when my version was drifting — I knew exactly which step to retune.</p>
              <div className="quote-who">
                <div className="quote-ava" style={{ background: 'linear-gradient(135deg,#18181b,#3f3f46)' }}>P</div>
                <div className="quote-meta"><div className="nm">Priya S.</div><div className="rl">@priya_creates · designer</div></div>
              </div>
              <div className="quote-shipped">⎇ Forked <b>Figma → handoff spec</b></div>
            </div>
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
            <Link href="/browse" className="btn-primary">
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
