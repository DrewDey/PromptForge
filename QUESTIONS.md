# PathForge — Questions for Drew

> Each iteration can add questions here when they need Drew's input.
> Drew: Add your response under each question in the **Response** section, then the next iteration will act on it.
> Once a question has been answered and acted on, it moves to "Answered Questions" at the bottom with the full question preserved.

---

## Open Questions

### Q12: Landing page flow diagram — keep, simplify further, or remove entirely?

Iteration 22 kept the 5-box horizontal flow diagram (Blank Chat → Build Path → Fork → Adapt → Result) but cleaned it up — removed the green color leak, restricted colors to orange/blue/surface, tightened the connector widths. However, the design research found that NONE of the premium dev-tool landing pages we looked at (Linear, Vercel, Raycast, Resend, Supabase) use horizontal step/process diagrams on their homepages. They either (a) show a product screenshot, (b) use outcome-based messaging, or (c) show nothing and let the Solution headline do the work.

Three options for next time:
- **(A) Keep it as-is** — The cleaned-up diagram is on-brand now and explains the concept clearly, especially for non-technical visitors
- **(B) Simplify further** — Replace the 5 boxes with just 3 (Blank Chat → Build Path → Result) or drop boxes entirely and use numbered inline steps (1. Start with blank chat. 2. Follow a proven build path. 3. Get your result.)
- **(C) Remove it** — Let "Build paths, not prompts." + the supporting paragraph stand alone, and invest the saved vertical space in a larger / more visual Popular Build Paths grid (the actual product)

**Drew's Response:**

---

### Q11: Build page — should step results use the same dark code-editor style as the detail page?

On the detail page (where people view finished projects), prompt blocks use a dark terminal-style background and result blocks use a blue-tinted background. On the Build page, we currently use a light surface-50 tint for prompts and a green-50 tint for results — which feels more like "editing mode." Should we bring the dark code-editor aesthetic into the Build page too (at least for the prompt textareas), or does the lighter "editing" feel make more sense when people are actively typing? There's a tension between "preview what it'll look like" and "comfortable editing environment."

**Drew's Response:**

---

### Q10: Browse page cards — should cards show a thumbnail/preview image when available?

Currently, project cards are text-only (title, description, category, step flow visualization, metadata). Iteration 20 improved the hierarchy so titles lead, but the cards still lack any visual "hook" — there's no screenshot or preview image to make someone stop scrolling. Adding an image thumbnail at the top of each card (when a project has uploaded images) would make the grid feel more like a gallery and help projects "sell themselves." However, it would also make cards taller, reduce the number visible above the fold, and require that we prioritize getting the image upload pipeline working. Should we: (A) keep text-only cards for now and focus on other pages, (B) add placeholder/decorative images to make cards more visual, or (C) prioritize wiring up real image uploads so cards can show actual project screenshots?

**Drew's Response:**

---

### Q9: Seed content quality — are the filled-in project results convincing enough?

Iteration 19 filled in all 10 steps that previously had empty results (including the SaaS Dashboard which had ALL steps empty). The content includes actual code snippets, email templates, structured documents, and migration plans. However, these are generated examples — they're designed to look realistic but aren't from actual user projects. Two questions: (1) Does the level of detail feel right, or should some results be shorter/longer? (2) Should we prioritize getting REAL projects from actual users (even if just Drew's own AI projects) to replace some of the seed data, or is realistic generated content good enough for launch?

**Drew's Response:**

---

### Q8: Project detail page — prompt blocks now use dark (code-editor) backgrounds. Too dark or just right?

The step-by-step prompt blocks now use a dark terminal-style background (`surface-900` / near-black) with light text, making them look like code editor / terminal output. Results use a lighter blue-tinted background to create clear input→output directionality. This is a significant visual shift from the previous all-white layout. Does this feel right for PathForge's audience (mix of technical and non-technical users), or is the dark prompt styling too intimidating for beginners?

**Drew's Response:**

---

## Answered Questions

### Q1: Design reference — are there sites you love the look of?
Are there specific websites or apps whose design you love and want PathForge to feel like? Any visual references would help guide the aesthetic direction.

**Drew's Response**: No specific site — wants "Flappy Bird pipe" visual flow with connected boxes showing prompts→responses→forks. Creative freedom given.
**Action taken** (Iteration 1): Implemented pulsing pipe connectors between sections, mini flow preview in hero, directional flow diagram in solution section.
**Update** (2026-04-16): Drew later specified he wants a **modern dev tool** aesthetic (Linear, Vercel, Raycast). This supersedes the earlier creative freedom.

### Q2: Brand tone — technical or approachable?
Should PathForge feel more technical and developer-oriented, or more approachable and friendly to non-technical users? This affects copy, visual density, and overall design language.

**Drew's Response**: Somewhere in between.
**Action taken** (Iteration 1): Landing page redesigned with clean/technical structure balanced with warm copy.
**Update** (2026-04-16): Leaning more technical/premium now per new design direction (modern dev tool).

### Q3: Mobile priority
How important is mobile responsiveness right now? Should we invest heavily in mobile layouts, or is desktop-first acceptable for the current stage?

**Drew's Response**: Desktop first is fine for now.
**Action taken** (Iteration 1): Desktop-first approach with responsive fallbacks.

### Q4: Content tone for seed/example projects
What tone and depth should the example/seed projects have? Should they be detailed technical walkthroughs, quick showcases, or something in between? Any specific types of projects you'd want featured?

**Drew's Response**: Wants step-by-step prompt→result flows with pictures and explanations. Also wants comments and forking.
**Action taken** (Iteration 1): Noted — comments and forking are in the Next Sprint backlog. Focus remains on design overhaul for now.

### Q5: Build page — should we add progressive disclosure (collapsible sections)?
The Build page currently shows all 3 sections at once (Project Basics, Build Journey, Details & Publish). This creates a "form wall" feel. Research shows that hiding sections 2 and 3 by default (accordion-style, revealed as the user progresses) significantly reduces cognitive load and makes the experience feel more guided, like a builder vs a form. However, it adds complexity and some users may prefer seeing everything upfront. Should we implement collapsible sections, or is the current all-visible layout preferred?

**Drew's Response**: Go ahead and implement collapsible sections and improve as seen fit.
**Action taken** (Iteration 17): Implemented. Build page now has single-active accordion with 3 collapsible sections, completion indicators, scroll anchoring, and full accessibility (aria-controls, focus-visible, keyboard navigation).

### Q6: Header — should we add a Cmd+K command palette?
Research into Linear, Vercel, and Raycast showed that command palettes (Cmd+K / Ctrl+K) are a defining feature of modern dev tools. Adding a small "Cmd+K" hint button in the header would signal "this is a technical tool" and provide keyboard-first navigation for power users. However, it's a meaningful engineering investment (search index, action registry, keyboard handling) and may be premature before the core pages are fully polished. Should we add this to the backlog? If so, how high priority?

**Drew's Response**: Add to the backlog as a lower priority item.
**Action taken** (Iteration 17): Added "Cmd+K command palette" to the Backlog — Future section in BACKLOG.md.

### Q7: Build page accordion — should users be able to open multiple sections at once?

The current implementation uses a "single-active" accordion where only one section is open at a time (like Typeform/Vercel setup wizards). This keeps the page clean and guides users sequentially. However, some users might want to reference Section 1 while filling in Section 2, or jump between sections freely. An alternative is "multi-open" mode where clicking a section toggles it independently. Which feels more right for PathForge's audience?

**Drew's Response:** I like being able to jump through the sections freely I think.
**Action taken** (Iteration 18): Implemented multi-open accordion. Sections now toggle independently — clicking one doesn't close others. Guard prevents closing ALL sections (at least one stays open). Error handling is additive — opens the error section without closing others.
