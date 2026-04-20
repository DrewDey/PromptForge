import Link from 'next/link'
import '../home.css'

export const metadata = {
  title: 'About — PathForge',
  description: 'Why PathForge exists, what a build path actually is, and the long game behind the platform.',
}

/* ─────────────────────────────────────────────────────────
   About / Why page — explains the product, the problem it's
   solving, and where it's headed. Reuses .pf-home design
   system (home.css) so it reads as part of the same site.
   ───────────────────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <div className="pf-home">
      {/* ═══════════ HERO ═══════════ */}
      <section className="hero">
        <div className="hero-wrap" style={{ gridTemplateColumns: '1fr', textAlign: 'left', maxWidth: 820, padding: '96px 24px 72px' }}>
          <div>
            <div className="hero-eyebrow">
              <span className="pulse" />
              <span>About PathForge</span>
            </div>
            <h1 style={{ fontSize: 68 }}>
              Why this <span className="serif">exists</span>.
            </h1>
            <p className="lead" style={{ maxWidth: 680, fontSize: 20 }}>
              PathForge is a library of real AI build paths — the actual projects people built with AI, the prompts that produced them, and every result along the way. This page explains what that means, why it matters, and where the platform is headed.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ THE PROBLEM (extended) ═══════════ */}
      <section className="problem">
        <div className="sect-wrap">
          <div>
            <div className="eyebrow">The problem</div>
            <h2>The best AI work is <span className="serif">hidden</span>.</h2>
            <p style={{ marginBottom: 18 }}>
              Millions of people have AI subscriptions. Very few of them are doing anything interesting with them. Not because they&apos;re lazy or uncreative — because every good AI workflow has to be re-invented from a blank chat, by one person, in private, every single time.
            </p>
            <p style={{ marginBottom: 18 }}>
              The best work happens in Slack DMs and personal Notion pages and screenshot archives. It lives inside someone&apos;s head. The rest of us open a new chat at 10pm, type &ldquo;help me build a thing,&rdquo; give up after three tries, and close the tab.
            </p>
            <p>
              The tool isn&apos;t the bottleneck. Access to examples is.
            </p>
          </div>
          <div className="problem-visual" aria-hidden="true" style={{ maxWidth: 560 }}>
            <div className="pv-line"><span className="caret">$</span> average evening with AI <span style={{ color: 'var(--color-surface-600)' }}>// n=you</span></div>
            <div className="pv-line you">&gt; I should use my Claude subscription more</div>
            <div className="pv-line ai">Great! What would you like to work on?</div>
            <div className="pv-line you">&gt; I don&apos;t know</div>
            <div className="pv-line ai">What are your goals?</div>
            <div className="pv-line you">&gt; I don&apos;t know</div>
            <div className="pv-line" style={{ marginTop: 16 }}><span className="caret">$</span> <span style={{ color: 'var(--color-surface-600)' }}>close tab — open Netflix</span></div>
            <div className="overlay">Wasted tokens</div>
          </div>
        </div>
      </section>

      {/* ═══════════ WHAT A BUILD PATH IS ═══════════ */}
      <section>
        <div className="sect-wrap" style={{ maxWidth: 920 }}>
          <div className="eyebrow">The unit of work</div>
          <h2 className="section-title">A build path isn&apos;t a <span className="serif">prompt template</span>.</h2>
          <p className="section-sub" style={{ marginBottom: 36 }}>
            This is the single most important distinction on the platform. Everything else follows from it.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>
            <div style={{ background: '#fff', border: '1px solid var(--color-surface-200)', padding: 28 }}>
              <div className="eyebrow" style={{ color: 'var(--color-surface-500)' }}>What it isn&apos;t</div>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--color-surface-600)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <li>❌ <b style={{ color: 'var(--color-surface-900)' }}>Not a prompt library.</b> No generic &ldquo;write me an email about [TOPIC]&rdquo; templates. Those are already everywhere and they don&apos;t work.</li>
                <li>❌ <b style={{ color: 'var(--color-surface-900)' }}>Not a tutorial.</b> Tutorials tell you what to type. A build path shows you what someone actually typed and what came back.</li>
                <li>❌ <b style={{ color: 'var(--color-surface-900)' }}>Not a case study.</b> Case studies tell you about work that&apos;s already done. A build path is watching it get done.</li>
                <li>❌ <b style={{ color: 'var(--color-surface-900)' }}>Not AI marketing copy.</b> No &ldquo;10x your productivity&rdquo; anything. The paths are built by normal people solving normal problems.</li>
              </ul>
            </div>
            <div style={{ background: 'var(--color-surface-900)', color: '#fff', border: '1px solid var(--color-surface-900)', padding: 28 }}>
              <div className="eyebrow" style={{ color: 'var(--color-brand-orange)' }}>What it is</div>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--color-surface-300)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <li>✓ <b style={{ color: '#fff' }}>A finished project.</b> Something real, built with AI, that you can actually ship or use.</li>
                <li>✓ <b style={{ color: '#fff' }}>The full chain.</b> Every prompt the author typed, in order, with its actual output visible underneath.</li>
                <li>✓ <b style={{ color: '#fff' }}>The context.</b> Why they built it, what constraints they had, what model they used, what they tried that didn&apos;t work.</li>
                <li>✓ <b style={{ color: '#fff' }}>Fork-ready.</b> Designed to be copied, tweaked, and re-run with your own context. Not read once and forgotten.</li>
              </ul>
            </div>
          </div>

          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--color-surface-700)', maxWidth: 720 }}>
            The closest analog is a Jupyter notebook someone shared on GitHub — the code runs, the outputs are visible, and you can fork it and start changing things. PathForge is that, but for the domain you actually work in: finance, marketing, writing, design, code, study plans, tax prep, anything you&apos;d actually open a chat for.
          </p>
        </div>
      </section>

      {/* ═══════════ NO FABRICATION ═══════════ */}
      <section>
        <div className="sect-wrap" style={{ maxWidth: 920 }}>
          <div className="eyebrow">The ethos</div>
          <h2 className="section-title">Every output is <span className="serif">real</span>.</h2>
          <p className="section-sub" style={{ marginBottom: 28 }}>
            The engagement counts start at zero. The projects start as real work. This is non-negotiable.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 760 }}>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-surface-700)' }}>
              It would be trivial to pad the site with fabricated engagement metrics and AI-generated prompt chains that merely <em>look</em> like real work. Most content platforms do this. We don&apos;t.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-surface-700)' }}>
              Every build path shows real prompts typed by someone solving a real problem, and real outputs returned by the AI at the time. If the project used Claude Sonnet 4.6, the response in the card is what Claude Sonnet 4.6 actually said. If a step failed or needed three attempts, that lives in the chain too — not airbrushed.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-surface-700)' }}>
              Why this matters: the value of the platform is trust. If you fork a path that shipped a real tax estimator for its author, it has to actually work when you run the same prompts with your numbers. If half the paths are fabricated, the library collapses into another SEO farm.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-surface-700)' }}>
              Engagement counts — votes, bookmarks, forks — are zero on day one for every project. They can only go up by real humans using the site. No bot army, no fake activity, no implied-social-proof on projects nobody has actually touched.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ FORK & REMIX ═══════════ */}
      <section style={{ background: '#fff' }}>
        <div className="sect-wrap" style={{ maxWidth: 920 }}>
          <div className="eyebrow">The loop</div>
          <h2 className="section-title">Take it. <span className="serif">Change it.</span> Ship yours.</h2>
          <p className="section-sub" style={{ marginBottom: 28 }}>
            The value of someone else&apos;s build path isn&apos;t that you&apos;ll copy it verbatim. It&apos;s that you&apos;ll save the first three hours of guessing.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
            <div style={{ padding: 22, border: '1px solid var(--color-surface-200)', background: 'var(--color-surface-50)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-brand-orange)', fontWeight: 600, marginBottom: 8 }}>01 / Find</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Find a path that&apos;s close</div>
              <p style={{ fontSize: 13.5, color: 'var(--color-surface-600)', lineHeight: 1.55 }}>
                It doesn&apos;t have to match your problem exactly. It has to match the <em>shape</em> — the same kind of chain, the same kind of output. Close enough that you can see where your version diverges.
              </p>
            </div>
            <div style={{ padding: 22, border: '1px solid var(--color-surface-200)', background: 'var(--color-surface-50)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-brand-orange)', fontWeight: 600, marginBottom: 8 }}>02 / Fork</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Fork the chain</div>
              <p style={{ fontSize: 13.5, color: 'var(--color-surface-600)', lineHeight: 1.55 }}>
                One click copies the whole build path into your own draft — every prompt, every note, every tool reference. You edit from there. No blank chat.
              </p>
            </div>
            <div style={{ padding: 22, border: '1px solid var(--color-surface-200)', background: 'var(--color-surface-50)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-brand-orange)', fontWeight: 600, marginBottom: 8 }}>03 / Ship</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Swap your context, run it</div>
              <p style={{ fontSize: 13.5, color: 'var(--color-surface-600)', lineHeight: 1.55 }}>
                Replace their variables with yours, run the chain, get a real artifact by bedtime. Share yours back if it&apos;s worth sharing — that&apos;s how the library gets better.
              </p>
            </div>
          </div>

          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-surface-700)', maxWidth: 720 }}>
            You&apos;re not trying to recreate someone else&apos;s work. You&apos;re trying to build <em>yours</em>, and theirs is the fastest starting point. Every path on the site is designed to be a launching pad, not a monument.
          </p>
        </div>
      </section>

      {/* ═══════════ WHO IT'S FOR ═══════════ */}
      <section>
        <div className="sect-wrap" style={{ maxWidth: 920 }}>
          <div className="eyebrow">Audience</div>
          <h2 className="section-title">Who this is <span className="serif">for</span>.</h2>
          <p className="section-sub" style={{ marginBottom: 32 }}>
            One specific person, and a few more behind them.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 760 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-brand-orange)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>The core user</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, color: 'var(--color-surface-900)', letterSpacing: '-0.01em' }}>You, at 10pm, with a subscription and no plan.</h3>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-surface-700)' }}>
                The whole site is designed around this moment. You&apos;ve paid for AI tools. You&apos;ve got an hour. You don&apos;t know what to do with it. PathForge exists so you land on the homepage, skim a few paths, fork one that looks close to something you&apos;d actually want, and have a real thing to show by bedtime. That&apos;s the success metric.
              </p>
            </div>

            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-brand-orange)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>Also</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, color: 'var(--color-surface-900)', letterSpacing: '-0.01em' }}>Freelancers and operators systemizing their work.</h3>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-surface-700)' }}>
                If you&apos;re a freelance consultant who&apos;s been quietly using Claude to triple your output, the paths you&apos;ve built are genuinely valuable. Publishing them here is a credible portfolio — and a way to attract clients who understand the work. &ldquo;Here&apos;s how I actually deliver&rdquo; beats any case study.
              </p>
            </div>

            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-brand-orange)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>And</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, color: 'var(--color-surface-900)', letterSpacing: '-0.01em' }}>The curious who want to see what&apos;s actually possible.</h3>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-surface-700)' }}>
                AI coverage online is mostly hype screenshots and doomer thinkpieces. If you want to know what people are actually doing with these tools on an average Tuesday, this is the library. Browse without logging in. Read without remixing. It&apos;s fine.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ QUALITY BAR ═══════════ */}
      <section style={{ background: 'var(--color-surface-900)', color: '#fff' }}>
        <div className="sect-wrap" style={{ maxWidth: 920 }}>
          <div className="eyebrow">Editorial standards</div>
          <h2 className="section-title" style={{ color: '#fff' }}>What makes a <span className="serif">great</span> path.</h2>
          <p className="section-sub" style={{ color: 'var(--color-surface-400)', marginBottom: 32, maxWidth: 720 }}>
            Not every contribution makes it onto the homepage. The quality bar is explicit, and it exists so the library actually stays useful when there are thousands of paths instead of dozens.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, maxWidth: 760 }}>
            {[
              {
                label: 'Verbose, contextual prompts',
                body: 'A great path doesn\'t ship with "write me an email." It ships with a prompt that reads like a real person typed it — 80+ words, with the author\'s constraints, prior context, voice, and specific asks. The prompt is half the value.',
              },
              {
                label: 'Substantive real outputs',
                body: 'Every step\'s result is a real artifact — working code, actual drafts, real calculations, 300+ words of substance. Not a summary of what an AI would produce. If the result is generic, the prompt needs rewriting until it produces something specific.',
              },
              {
                label: 'Coherent chains',
                body: 'Step N+1 references step N\'s output. A reader should be able to follow along without extra context. If a chain jumps around or repeats itself, it isn\'t a build path — it\'s a collection of prompts.',
              },
              {
                label: 'Real voice',
                body: 'The best paths mention gotchas, flag edge cases, push back on bad premises. The AI is working with the author, not performing for them. If a chain reads like marketing copy, it isn\'t a build path.',
              },
              {
                label: 'Screenshots when applicable',
                body: 'For anything visual — design, code output, dashboards, renders — a screenshot at the right step is worth more than any prose description. The image-upload feature is being wired; early paths ship without.',
              },
            ].map((item) => (
              <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, padding: '22px 0', borderBottom: '1px solid var(--color-surface-800)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--color-brand-orange)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--color-surface-300)' }}>
                  {item.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ THE LONG GAME ═══════════ */}
      <section>
        <div className="sect-wrap" style={{ maxWidth: 920 }}>
          <div className="eyebrow">The long game</div>
          <h2 className="section-title">Where this is <span className="serif">headed</span>.</h2>
          <p className="section-sub" style={{ marginBottom: 28 }}>
            PathForge is being built in public, iteratively, for the long haul. It is not a launch.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 760 }}>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-surface-700)' }}>
              The short-term roadmap is boring on purpose: wire image uploads so paths can ship with real screenshots, finish the one-click fork-to-draft flow, let authors attach their own assets, grow the seed library until there&apos;s a genuinely useful path in every category an ordinary person would search for.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-surface-700)' }}>
              The medium-term goal is one specific outcome: when someone tells a friend they&apos;re stuck on how to use their AI subscription, the friend says &ldquo;have you checked PathForge?&rdquo; That&apos;s it. That&apos;s the product-market fit. Not viral traffic, not growth hacking — just becoming the default place people go.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-surface-700)' }}>
              The long-term bet is that shared AI workflow knowledge becomes its own genre, the way open-source code or Stack Overflow answers or GitHub Gists did. Nobody assumed those would matter at the start. They did because they were the simplest place to find the answer.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-surface-700)' }}>
              PathForge is not trying to be a prompt-engineering course, a SaaS tool, a marketplace, a newsletter, or a YouTube channel. It&apos;s a library. Libraries win by being reliable, legible, and consulted — not by optimizing engagement loops or extracting value from attention. If the site makes your next Tuesday evening more useful, it&apos;s working.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="finalcta">
        <div className="sect-wrap">
          <div className="eyebrow">Your turn</div>
          <h2>Browse the library. <span className="serif">Fork</span> something.</h2>
          <p>If one path saves you an evening of blank-chat guessing, the whole site has paid for itself. If you end up with something worth sharing, add it back.</p>
          <div className="finalcta-btns">
            <Link href="/browse" className="btn-primary">
              Browse build paths
              <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square"><path d="M5 12H19M13 6L19 12L13 18" /></svg>
            </Link>
            <Link href="/prompt/new" className="btn-secondary">Share a build</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
