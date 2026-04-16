# PathForge — Questions for Drew

> Each iteration can add questions here when they need Drew's input.
> Drew: Add your response under each question in the **Response** section, then the next iteration will act on it.

---

## Open Questions

### Q5: Build page — should we add progressive disclosure (collapsible sections)?
The Build page currently shows all 3 sections at once (Project Basics, Build Journey, Details & Publish). This creates a "form wall" feel. Research shows that hiding sections 2 and 3 by default (accordion-style, revealed as the user progresses) significantly reduces cognitive load and makes the experience feel more guided, like a builder vs a form. However, it adds complexity and some users may prefer seeing everything upfront. Should we implement collapsible sections, or is the current all-visible layout preferred?

**Drew's Response:**
Go ahezd and implement those collapsible sections and improve how you see fit.

**Action taken** (Iteration 16): Noted — collapsible sections for the Build page are now a priority. Next iteration touching the Build page should implement progressive disclosure (accordion sections).

---

### Q6: Header — should we add a Cmd+K command palette?
Research into Linear, Vercel, and Raycast showed that command palettes (Cmd+K / Ctrl+K) are a defining feature of modern dev tools. Adding a small "Cmd+K" hint button in the header would signal "this is a technical tool" and provide keyboard-first navigation for power users. However, it's a meaningful engineering investment (search index, action registry, keyboard handling) and may be premature before the core pages are fully polished. Should we add this to the backlog? If so, how high priority?

**Drew's Response:**

---

## Answered Questions

### Q1: Design reference — are there sites you love the look of?
**Drew's Response**: No specific site — wants "Flappy Bird pipe" visual flow with connected boxes showing prompts→responses→forks. Creative freedom given.
**Action taken** (Iteration 1): Implemented pulsing pipe connectors between sections, mini flow preview in hero, directional flow diagram in solution section.
**Update** (2026-04-16): Drew later specified he wants a **modern dev tool** aesthetic (Linear, Vercel, Raycast). This supersedes the earlier creative freedom.

### Q2: Brand tone — technical or approachable?
**Drew's Response**: Somewhere in between.
**Action taken** (Iteration 1): Landing page redesigned with clean/technical structure balanced with warm copy.
**Update** (2026-04-16): Leaning more technical/premium now per new design direction (modern dev tool).

### Q3: Mobile priority
**Drew's Response**: Desktop first is fine for now.
**Action taken** (Iteration 1): Desktop-first approach with responsive fallbacks.

### Q4: Content tone for seed/example projects
**Drew's Response**: Wants step-by-step prompt→result flows with pictures and explanations. Also wants comments and forking.
**Action taken** (Iteration 1): Noted — comments and forking are in the Next Sprint backlog. Focus remains on design overhaul for now.
