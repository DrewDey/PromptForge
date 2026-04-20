# PathForge — Backlog

Live: https://prompt-forge-sandy.vercel.app

## How this file works

Four queues. **Content queue is top priority** — iterations pull from it first. Polish queue is second. Structural + Drew actions are off-limits to unattended iterations.

**Vision anchor:** PathForge serves someone sitting there with AI tools, time, and no clear idea what to build. Every item should make "look at what was built" the dominant moment, and "here's how it was built" a secondary layer you expand when you want it. Build-log / case-study aesthetic — NOT prompt-library aesthetic.

**The grudge against padding work:** iters 43–48 shipped 2–8px spacing tweaks that no visitor would ever notice. That is officially over. If an iteration is about to commit a diff whose only change is `mb-X → mb-Y`, `py-A → py-B`, `text-base → text-lg`, or any pure-spacing / pure-type-size utility swap, the iteration fails. Pick a task that touches PAGE STRUCTURE (Polish) or generates REAL CONTENT (Content) — not how much air is between things.

Pick the top item in your queue. Ship it. Move to Done with one line.

---

## Content queue — REAL Claude-generated prompt chains (APPROVED, ACTIVE) — **TARGET 200, 5 PER FIRING**

**Target:** 200 total projects in `supabase/seed-content-chains.sql` (bumped from 75 by Drew on 2026-04-18). **Currently at 109/200, 91 slots remaining.** The 50-project all-author/all-category 5-peat milestone is preserved in the historical line below; from 51+ forward, balance constraints loosen and iterations prioritize topic freshness (no repeat of any topic already covered in earlier projects) and chain-length diversity over strict per-author rotation.

**Throughput:** **2 projects per iteration** (lowered from 5 by Drew on 2026-04-19 — the 5-target was overshooting time budget; iterations were defaulting to 3 with the quality escape hatch. Hard reset to 2 so iterations focus on depth without rationing). Depth floor 15–25 min should comfortably fit 2 projects at full quality. No escape hatch — ship exactly 2, both at the project-0001 quality bar.

**Production-readiness note:** Production-readiness tasks (corpus audits, ITERATION_LOG hygiene, doc polish, deploy hygiene) are bonus work when one fits naturally — they do NOT replace a content project slot. Throughput is always 2 content projects per iteration; production-readiness work is additive, not a substitute. At 200, Content closes; iterations work the Polish queue.

Drew: repaste `supabase/seed-content-chains.sql` into Supabase SQL Editor to refresh live rows whenever you want to see the latest.

**Historical target line (preserved):** 50 total projects in `supabase/seed-content-chains.sql`. **Was at 49 at iter-80 end.** Covered at least once across ALL 10 categories as of iter 61. Project `55...5550001` (Freelancer Tax Estimator, Jake Torres, Finance, 3 steps — Drew approved 2026-04-17 as the quality bar); `55...5550002` (B2B SaaS cold email launch, Sarah Mitchell, Marketing, 4 steps — iter 57); `55...5550003` (useDebouncedSearch refactor, Marcus Chen, Coding, 2 steps — iter 57); `55...5550004` (Cohort retention from a 14M-row events table, Raj Patel, Data, 5 steps — iter 58); `55...5550005` (Differentiated 9th-grade biology lesson, Ben Okafor, Education, 3 steps — iter 58); `55...5550006` (B2B fintech launch post ghostwriting, Emily Zhao, Writing, 4 steps — iter 59); `55...5550007` (Sunset a niche site go/no-go, Lena Morales, Strategy, 4 steps — iter 59); `55...5550008` (Monday leadership-sync prep workflow, Nina Kowalski, Productivity, 3 steps — iter 60); `55...5550009` (PHI data boundary RFC, Derek Lawson, Coding, 5 steps — iter 60); `55...5550010` (UX research synthesis → exec deck, Priya Sharma, Design, 4 steps — iter 61); `55...5550011` (30th-birthday Sequoia camping trip, Lena Morales, Personal, 3 steps — iter 61); `55...5550012` (Reconstruction DBQ for mixed-skill APUSH, Ben Okafor, Education, 4 steps — iter 62); `55...5550013` (Q1-miss runway reset + board memo, Jake Torres, Finance, 5 steps — iter 62); `55...5550014` (Pricing page rewrite for a PLG SaaS, Sarah Mitchell, Marketing, 3 steps — iter 63); `55...5550015` (Suspicious 34% A/B test lift investigation, Raj Patel, Data, 4 steps — iter 63); `55...5550016` (Q4 all-hands letter ghostwriting after a missed quarter, Emily Zhao, Writing, 5 steps — iter 64); `55...5550017` (Quarterly capacity-planning memo, Nina Kowalski, Productivity, 4 steps — iter 64); `55...5550018` (Dashboard-redesign pre-crit, Priya Sharma, Design, 3 steps — iter 65); `55...5550019` (18-month eng roadmap board memo, Derek Lawson, Strategy, 5 steps — iter 65); `55...5550020` (Bay Area FAANG offer decision framework, Marcus Chen, Personal, 3 steps — iter 66); `55...5550021` (cellular-respiration unit-test re-teach plan, Ben Okafor, Education, 3 steps — iter 66); `55...5550022` (Flaky 1-in-40 Playwright test debugging workflow, Marcus Chen, Coding, 4 steps — iter 67); `55...5550023` (Seat→usage pricing migration analysis, Jake Torres, Finance, 5 steps — iter 67); `55...5550024` (Emily Zhao / emwriter, "Founder's open letter responding to a viral customer complaint thread", Writing, 4 steps — iter 68); `55...5550025` (Raj Patel / dataraj, "Live MRR dashboard diverged from finance close by $340K six days before board", Data, 5 steps — iter 68). Iterations append 2–3 more per firing until 50. **Halfway milestone reached at iter 68 (25/50); 35/50 as of iter 73.** Author distribution across 35: 5 at 3 (marcusdev, jakefinance, cto_derek, ops_nina, priya_creates), 5 at 4 (sarahgrows, dataraj, lena_solopreneur, teacherben + emwriter — teacherben/emwriter advanced 3→4 in iter 73). Category counts: Coding 4, Marketing 4, Data 4, Education 4, Writing 4, Design 3, Finance 3, Productivity 3, Strategy 3, Personal 3. Chain length: 13×3-step / 12×4-step / 2×2-step / 7×5-step / 1×6-step / 1×7-step / 1×8-step. Models: Sonnet 4.6 = 12, Opus 4.6 = 12, Opus 4.7 = 11 — within-1 balance maintained. Difficulty: 9 beginner / 16 intermediate / 10 advanced. Flag for iter 74: (a) 5 categories at 4 (Coding/Marketing/Data/Education/Writing) vs 5 at 3 (Design/Finance/Productivity/Strategy/Personal) — rotate toward the at-3 categories to keep spread; (b) 5 authors at 4-peat, 5 at 3 — iter 74 should advance one of still-at-3 (marcusdev/jakefinance/cto_derek/ops_nina/priya_creates) to close "all authors at ≥4" milestone OR spread to 5-peats only with exceptional fit; (c) model balance 12/12/11 — pick Opus 4.7 for at least one slot to re-tighten 3-way balance if natural; (d) chain-length is 3-heavy (13) + 4-heavy (12) — a 5- or 6-step slot would add diversity; (e) beginner at 26% (9/35) — an accessible beginner chain is a reasonable pick.

### Quality bar — review project 0001 before starting

Read `supabase/seed-content-chains.sql` end-to-end before drafting anything. You must match or beat it. Specifically:

- **Prompts are verbose and contextual.** 80+ words. First-person voice. Explains what they're building, what constraints they have, their prior context, and specifies exactly what they want in the output. Reads like a real person who sat down to type a real ask, not a one-liner.
- **Responses are substantive real artifacts.** 300–600 words per step result. Actual working code / real drafts / real calculations — NOT summaries of what an AI would produce. Annotate code with inline comments. Sanity-check math where applicable ("for $92k: federal ≈ $10,424, verify: 10% × 11,925 = ..."). Flag edge cases a CPA / engineer / writer / designer would actually appreciate.
- **Chain coherence.** Step N+1's prompt references step N's output. Natural transitions ("Nice, that matches my mental math. Now add…", "Great. Last piece…", "Good catch on the ordering — here's why…"). A reader should follow the build without extra context.
- **Real Claude voice.** Substantive, occasionally opinionated, doesn't hedge with "it depends." Mentions gotchas. Reads the way Claude actually responds when asked to do real work.

### Constraints

- **Varied chain lengths:** mix of 2-step, 3-step, 4-step, 5-step, up to 8-step. Don't ship a streak of same-length chains.
- **Varied categories:** rotate through all 10 before repeating. Finance (3 ids: `...11101`), Marketing (`...11102`), Writing (`...11103`), Coding (`...11104`), Design (`...11105`), Education (`...11106`), Productivity (`...11107`), Data (`...11108`), Strategy (`...11109`), Personal (`...11110`). Aim for ~5 projects per category at 50.
- **Match author to category fit:** `jakefinance` (Finance), `sarahgrows` (Marketing), `emwriter` (Writing), `marcusdev` or `cto_derek` (Coding), `priya_creates` (Design), `teacherben` (Education), `ops_nina` (Productivity), `dataraj` (Data), `cto_derek` or `lena_solopreneur` (Strategy), `lena_solopreneur` (Personal). Profile IDs in `supabase/seed-fix.sql` at `22222222-2222-2222-2222-22222222XXXX`.
- **Varied Claude models:** rotate `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-opus-4-7`. Sonnet for straightforward, Opus for heavier thinking. `model_recommendation` string should be the human-readable version ("Claude 4.6 Sonnet", "Claude 4.6 Opus", "Claude 4.7 Opus").
- **UUID sequence:** continue from `55555555-5555-5555-5555-555555550001`. Next project is `...550002`, then `...550003`, etc. Steps use `66666666-6666-6666-6666-6666666XYSS` where X is the 2-digit project counter hex and SS is step 01+ (e.g. project 0002 step 1 = `66666666-6666-6666-6666-666666620101`).
- **Engagement counts: ZERO.** `vote_count = 0`, `bookmark_count = 0` for every project. Drew's directive 2026-04-18: nothing implies anyone has touched the project. Real engagement accrues only from real users.
- **Tags:** 3–6 real tags per project. Don't pad with generic ones.
- **Screenshot slots:** leave empty. Drew fills them once Structural #1 (image upload) lands.

### Iteration work shape

1. Read `supabase/seed-content-chains.sql` to see what's already there and what categories are covered.
2. Pick **2** project ideas — vary chain lengths, vary categories, prioritize topic freshness (no repeat of topics covered in 0001–current). Always 2 content projects; production-readiness work is additive bonus, never a replacement.
3. For each project: draft the story / result_content at the prompt level; then generate each step's verbose prompt and real response. Don't cheat — actually generate the response as if you were Claude being asked the question cold.
4. Append the new projects to `supabase/seed-content-chains.sql` ABOVE the `END OF FILE` marker comment. Do not modify existing projects.
5. `npx tsc --noEmit` to make sure nothing downstream broke (should be no-op for SQL-only changes).
6. Commit + push.
7. Log entry in ITERATION_LOG.md notes which project IDs + categories + chain lengths landed, plus a brief note on quality choices (why this topic, what's strong about the chain).

### What NOT to do

- **No placeholder content** (`[RESULT HERE]`, `{TODO: fill in}`, etc). Every response must be real.
- **No fake-looking numbers.** 2026 tax brackets must be plausible. A marketing email's company/product names must sound real, not "Acme Widget Corp."
- **No modifying project 0001** or any prior iteration's projects. Append-only.
- **No short, terse prompts.** "Build a blog post" is too thin. Prompts should sound like a human with context wrote them.
- **No generic filler responses.** If you can't generate a real artifact for a prompt, rewrite the prompt until you can.

### Done when

`supabase/seed-content-chains.sql` contains 200 unique projects across 10 categories with varied chain lengths. (Production-readiness work runs in parallel from 100 onward.) Drew repastes the file into Supabase to see them live.

---

## Polish queue — VISION-ALIGNED STRUCTURAL TASKS — **SITE-WIDE REDESIGN PASS**

Restocked 2026-04-20 (post-homepage-redesign) with the three ASAP items Drew flagged. The new homepage (commit `77b94a1`) introduced a distinct editorial aesthetic — Instrument Serif display accents, grid-pattern hero background, eyebrow pills with mono labels, dark surface-900 bookend sections, hairline cards. The rest of the site has not caught up. Priority now: bring the 3 highest-visitor-impact pages into that system. All three are routine-safe with the specs below (styles already live in `src/app/home.css`, scoped under `.pf-home`).

**⚠ Design rule — shared vocabulary, NOT shared structure** (Drew, 2026-04-20). The homepage's sections (hero-with-exhibit / marquee / problem / anatomy / cats / community / finalcta) are specific to the homepage's job. Other pages MUST NOT copy that structure wholesale. Each page has its own shape that fits its job. What DOES carry across every page: the typography (Inter / Instrument Serif / JetBrains Mono), the eyebrow-with-mono-label pattern, Instrument Serif accents on one evocative word per h1, the orange+blue accent pair, sharp corners, `btn-primary` / `btn-secondary`, surface-900 dark bookends USED SPARINGLY (not on every page — reserve them for pages that actually benefit). Iterations: if a page redesign is turning into "paste the homepage layout and change the copy," stop and pick a different composition. The site should feel cohesive, not repetitive. A visitor clicking through five pages should recognize they're on the same site without feeling like they're re-reading the same template.

**This queue supersedes any Content-queue work once the Content queue closes at 200.** If the Content queue hits its 200 target mid-overnight-run, the next iteration switches to this list, in order.

1. **Browse page (`/browse`) — match the new homepage aesthetic.** This is the #2 page in the funnel (every hero CTA lands here). Current page predates the redesign and feels disconnected from the homepage when a visitor clicks through.
   - Apply the homepage hero pattern: eyebrow pill (mono + pulse dot optional), h1 with Instrument Serif accent on one key word (e.g., *"Find your next build path."*), lead paragraph in `--color-surface-600`, supporting filter chrome below.
   - Rewrite filter/search chrome to use the mono-label + dark border pattern from the homepage (`.eyebrow` + `1px solid var(--color-surface-200)`); avoid competing with the cards visually.
   - Card grid uses the existing `PromptCard` (iter 53 result-first treatment is close enough). Gap/padding to match the homepage `.cats-grid` rhythm.
   - Bottom of page: echo the homepage's dark `finalcta` section with a "Can't find what you're looking for? Share yours." or similar.
   - Scope: extend `src/app/home.css` with a `.pf-home .browse-*` subtree, OR create `src/app/browse/browse.css` using the same token set. Wrap the page in `<div className="pf-home">` (or rename to `.pf-page` + refactor). Aim for 1–2 firings.

2. **Auth pages (`/auth/login`, `/auth/signup`) — polish to match.** Almost certainly still template-default Tailwind forms. On a site this distinctive, default-styled auth breaks trust at the exact conversion moment.
   - Split-panel layout: left side editorial (eyebrow + h1 with serif accent + lead copy + value prop bullets), right side clean form. Or centered + single column with the same type system; either is fine.
   - Form inputs: `1px solid var(--color-surface-300)` baseline, `border-color: var(--color-brand-orange)` on focus, `--font-sans` body, mono placeholders if they'd add texture.
   - Submit button: `.btn-primary` from home.css (surface-900 → brand-orange on hover).
   - Footer-of-page cross-link pair ("Already have an account? Log in." / vice versa) in the homepage's mono-eyebrow style.
   - Copy: keep current field names, lift the voice into the same editorial register ("Forge an account" vs generic "Sign up").
   - Scope: ~1 firing per page, or 1 firing for both if the layouts mirror.

3. **Detail page (`/prompt/[id]`) — editorial build-log pass.** Iters 51–54 shipped foundations (case-study hero, Prose variant, editorial Story treatment) but the page still carries the prompt-library feel overall — step cards are visually neutral, chain doesn't read like a journey, metadata pills are doing too much.
   - Mirror the homepage's anatomy diagram: three-rail composition (Metadata sidebar | Chain body | Outcome sidebar) on `lg+`, stacking on mobile. The existing step cards become the Chain middle rail.
   - Step cards: adopt the `.astep` pattern from home.css — numbered tile left, bordered card right, `h4` step title, mono prompt line, result line with dashed top border + mono `OUTPUT` label. Deprecate the current CodeBlock-heavy step chrome in favor of this lighter editorial frame.
   - Rename the page's H1 family to use the homepage's Instrument Serif accent on ~1 word (project-specific — could be the verb in the project title, e.g., *"**Forge** a freelance tax estimator"*).
   - Move the fork CTA above the fold again but style it as the homepage does — sharp, primary button, not a sticky sidebar unless it earns it.
   - Scope: 2–3 firings (structural rewrite). Depth floor #1 (reference-grounded) applies — WebFetch a Linear changelog article or Stripe docs case-study page to calibrate the editorial pattern.

Each of the three items above is a real structural change (no padding-only diffs) and matches the Depth floor. Spec is detailed enough that an iteration shouldn't need product judgment at each step — if it does, halt and add to QUESTIONS.md.

---

## Structural queue — Drew + live-session only

Items that need Drew's product calls, new deps, schema work, or non-trivial UX spec. **Items 1 and 2 are the two highest-impact gaps between the site's promise and delivery** — Drew flagged both explicitly on 2026-04-20. These should get live-session priority as soon as Content queue closes or a scheduled session opens.

1. **Wire image uploads to Supabase Storage.** `ImageUpload` component exists but doesn't persist. Needs Storage bucket (Drew-click in Supabase dashboard OR service-role key), signed-URL policy, RLS, upload handler, persistence wiring. **This is the single biggest gap between the homepage promise ("see what was built") and the detail-page reality (text + code boxes only).** Until this ships, every design polish elsewhere is makeup on an incomplete product — the Exhibit card on the homepage looks great because it's a static mockup; real detail pages can't match.
2. **Build page (`/prompt/new`) — Notion-style builder, not a form.** Drew's stated vision from day one. Currently a vertical-field form; should be a live-preview editor with drag-to-reorder steps, rich-text prompt/result editing, inline screenshot drop zones (blocked on #1), and the preview pane mirroring the detail-page render in real time. **This is the submission flow that populates the library** — its aesthetic directly affects the quality bar of what authors contribute. Big lift, biggest payoff after detail-page rework.
3. **Browse card thumbnail slot.** Blocked on #1. Card top becomes a 16:9 image when present — the card-level "look what they made" moment.
4. **CodeBlock `showLineNumbers` wiring + code-vs-prose toggle in the builder.** Natural-language content shouldn't number; literal code should. Iter 52 shipped the auto-detection heuristic (`src/lib/content-kind.ts`); the remaining structural work is the explicit builder-side toggle so authors can override when the heuristic guesses wrong.
5. **Fork / remix flow — actual data wiring.** The homepage and About page both center fork-and-remix as the core value loop. The actual prefill-a-new-draft-from-this-project flow needs schema thought (fork_of FK on prompts?), copy-on-fork semantics (steps cloned? attribution line auto-prefilled?), and UX for "your version" vs "original." Spec before shipping.

---

## Drew actions

Blocked on a non-code op from Drew. Not an iteration target.

1. **Run the seed SQL on live Supabase.** `supabase/seed-fix.sql` — paste into Supabase SQL Editor. Until done, the live site shows old/empty seed data and every design change is invisible on production.

---

## Done (rolling last 5)
History older than this lives in `git log`.

| Date | Change |
|------|--------|
| 2026-04-20 | Iter 114 — **Content queue +2 (109/200)** — sarahgrows Marketing 4-step Opus 4.6 intermediate (0108 B2B customer referral program: mechanics design $200 payout + 2-month free offer + in-product trigger → in-product modal + pre-filled referral email + referred-account email → launch email to 480 customers "$200 to tell a friend" → 90-day measurement plan 3-layer metric stack + day-90 decision framework); teacherben Education 3-step Opus 4.7 beginner (0109 6th-grade argument writing rubric CCSS.W.6.1: rubric design 5-category Proficient/Approaching/Emerging/Beginning rationale → full rubric with 4-level descriptors all five categories → student self-assessment checklist + model evidence+reasoning paragraph with annotated scaffold); model 36/36/36 PERFECT; beginner tier 29/109=26.6%; tsc clean. |
| 2026-04-20 | Iter 113 — **Content queue +2 (107/200)** — dataraj Data 5-step Opus 4.6 intermediate (0106 B2B SaaS churn survival analysis: Cox vs logistic regression → feature engineering from event/support/billing tables → Cox model with lifelines + hazard ratios → capacity-aware threshold calibration → dbt weekly model + Slack alert); lena_solopreneur Strategy 4-step Sonnet 4.6 intermediate (0107 solo SaaS competitive intelligence workflow: landscape mapping + signal taxonomy → free monitoring stack Google Alerts+Visualping+PH → decision-oriented competitive matrix → Q2 positioning memo free tier + price drop + trial extension); model 36/35/35 within-1 ✓; tsc clean. |
| 2026-04-20 | Iter 112 — **Content queue +2 (105/200)** — ops_nina Productivity 4-step Sonnet 4.6 beginner (0104 async-first remote comms protocol: diagnostic interview + sync/async decision tree → one-page channel/SLA handbook insert → weekly project card template replacing two standups → Monday rollout email + cheat sheet); priya_creates Design 8-step Opus 4.7 advanced (0105 design system governance framework: component audit methodology → three-tier classification taxonomy → two-tier token architecture → Button component doc template → governance RFC → ADR-style decision log + border-radius example → contributor guide → Q2 roadmap with OKRs); model 35/34/35 within-1 ✓; beginner tier 28/105=26.7%; tsc clean. |
| 2026-04-20 | Iter 111 — **Content queue +2 (103/200)** — jakefinance Finance 4-step Opus 4.6 intermediate (0102 first angel investment decision on a friend's pre-seed SaaS SAFE: evaluation rubric for pre-seed stage → SAFE terms analysis ($8M cap, 20% discount, MFN, missing pro-rata) → portfolio construction for first-time angel with $80K available → final go/no-go decision memo with conditions); cto_derek Coding 7-step Opus 4.7 advanced (0103 OpenTelemetry distributed tracing for 5-service Node.js platform: tool selection OTel+Tempo vs Datadog vs X-Ray → SDK bootstrap with ECS sidecar Collector → W3C context propagation across service boundary → business span attributes with PHI-safe hashing → tail-based sampling strategy → Grafana spanmetrics dashboard + P95 alert → N+1 root cause traced to 28 serial queries, fixed with ANY operator to 185ms); model rotation 34/34/34 PERFECT balance (Opus 4.6 +1 for 0102, Opus 4.7 +1 for 0103); beginner tier 27/103=26.2%; tsc clean. |
| 2026-04-20 | Iter 110 — **Content queue +1 (101/200) + production-readiness** — emwriter Writing 5-step Sonnet 4.6 intermediate (0101 food recall crisis comms package: crisis framework with stakeholder notification order + message pillars + phrase-strike-list → customer recall email 310w to 4,100 affected recipients → Instagram/Twitter statements → AP-style press release → CS team Q&A 10 scenarios); model rotation 33/33/33 → 34/33/33 (within-1 ✓); beginner tier 27/101=26.7% (on target ✓); corpus sequence audit confirmed all 0001–0101 present, no UUID gaps, step UUIDs 777777101001..101005; tsc clean. |


