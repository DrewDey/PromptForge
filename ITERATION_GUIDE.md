# PathForge — Hourly Iteration Guide

> This document defines how each autonomous hourly iteration should operate.
> You are a product team: a PM who prioritizes and thinks about UX, supported by engineers who implement.
> Drew (the founder) sleeps, and you ship.

## Your Role

You are a **product manager with a team of engineers**. That means you don't just code — you research, plan, implement, and review as separate disciplines. Use **parallel agents** to simulate a real team:

- **PM agent** — audits the current state, identifies what matters most to users, scopes the work
- **Research agent** — looks at how similar platforms solve the same UX problem, gathers patterns and inspiration
- **Engineer agent(s)** — implements the changes in code
- **Review agent** — reviews the diff with fresh eyes, checks for accessibility, responsiveness, and consistency

Not every iteration needs all four roles, but you should always separate "thinking about what to do" from "doing it", and always have someone review the work who didn't write it.

## Design Direction (CRITICAL — READ THIS)

**Drew has explicitly defined the design direction. Every iteration must follow this:**

1. **Vibe: Modern dev tool.** Think Linear, Vercel, Raycast. Dark/neutral tones, crisp typography, minimal but premium. Developer-focused energy. NOT generic startup template. NOT Bootstrap-looking. NOT flat and lifeless.

2. **Browse + Build are the priority.** These are the two pages that matter most. The browse page is how people discover projects. The build page is how people share them. Both need to be dramatically better than they are. Every iteration should be pushing one of these forward.

3. **Build page = Rich project builder.** Not a form. A builder. Think Notion's page editor, Linear's issue creation, Vercel's project setup. Live preview, polished interactions, drag-and-drop steps, premium image upload. People should feel like they're crafting a portfolio piece.

4. **Keep orange + sharp corners, execute them better.** The orange accent and sharp edges ARE the brand. Don't change them. But use them at a much higher level — orange should pop against darker/cooler surfaces, sharp edges should feel intentional and modern (like Linear), not dated and rigid.

5. **The old design was shit.** Drew's words. Don't preserve old design decisions out of caution. Be bold. Make dramatic visual improvements. Small tweaks are not what's needed — the whole feel needs to change.

## Design References

When making design decisions, think about these products:
- **Linear** — Clean, dark, sharp, fast. Great use of subtle borders and muted colors with selective bold accents.
- **Vercel** — Minimal, confident, black/white with pops of color. Typography does most of the work.
- **Raycast** — Premium feel, great spacing, beautiful cards, smooth interactions.
- **GitHub Explore** — Good model for browse/discovery. Cards that communicate what a project is.
- **Notion** — For the build/editor experience. How it feels to create something.

## Design Principles for PathForge

These guide every UX decision:

1. **Modern dev tool, not generic startup.** Every pixel should feel intentional. No filler content, no generic patterns, no "looks like every other SaaS landing page."
2. **Show, don't tell.** The best way to explain what PathForge is: show real projects with real outputs.
3. **The journey matters.** Step-by-step prompt→result flows are the core differentiator. Make them beautiful and easy to follow.
4. **Cards should sell the project.** A card in the browse grid needs to make you want to click. Show the wow factor — what was built, how complex it was, what tool was used.
5. **The build experience is a product.** Submitting a project should feel like crafting something, not filling out a form.
6. **Respect the craft.** People put real work into their AI projects. Present them with the quality they deserve.

## Iteration Process

Every hourly session follows this sequence:

### 1. Orient (2 minutes)
- Read `CLAUDE.md` (architecture, patterns, current state)
- Read `BACKLOG.md` (what to work on, priority order)
- Read `QUESTIONS.md` (check if Drew left any responses to act on — if he did, act on them, then move the question from "Open Questions" to "Answered Questions" with a summary of what action was taken)
- Read `ITERATION_LOG.md` (see what the last iteration did)
- Check `MEMORY.md` for any feedback from Drew
- Quick `git log --oneline -5` to see recent commits

### 2. Audit & Research (5 minutes — use parallel agents)

Launch two agents in parallel:

**Agent 1: UX Audit** — Examine the current state of the page/component you're about to improve. Read the code, understand the user flow, identify specific pain points. Be brutal — if something looks generic or unpolished, say so. Output a short list of concrete problems.

**Agent 2: Research** — Look at how Linear, Vercel, Raycast, or similar modern dev tools handle the same UX pattern. Output 3-5 concrete, actionable patterns worth borrowing (specific things like "Linear uses a muted gray-800 card bg with a 1px border that brightens on hover").

### 3. Decide (3 minutes)
- Synthesize the audit and research into a plan
- Pick the **top unblocked item** from the Current Sprint in `BACKLOG.md`
- If the top item is blocked or needs Drew's input, move to the next one
- Scope it: What specifically will you do in this hour? Write 3-5 bullet points of concrete changes
- **Be ambitious.** Drew wants dramatic improvements, not incremental tweaks.

### 4. Execute (35 minutes)
- Implement the change
- Think like a user — open the page, look at it, ask "does this look like Linear? Or does it look like a free template?"
- Consider mobile viewports (Tailwind responsive classes)
- Follow existing patterns (see CLAUDE.md for architecture rules)
- Use the existing component structure — don't create unnecessary abstractions

### 5. Review (5 minutes — use a separate agent)

Launch a **Review agent** that did NOT write the code. This agent should:
- Read the git diff of all changes
- Check: Does this look like a modern dev tool? Or does it still look generic?
- Check: Does the orange accent pop against the dark/neutral backgrounds?
- Check: Mobile responsiveness — are there responsive classes where needed?
- Check: Accessibility — proper contrast, semantic HTML, focus states?
- Check: Did we break anything? Are imports correct? Any dead code?
- Output: A short review with "approve", "approve with nits", or "request changes" and specific feedback

If the review has substantive issues, fix them before moving on.

### 6. Verify (5 minutes)
- Run `npm run build` — must pass clean. Note: if the `.next` cache has permission issues in the sandbox, try `rm -rf .next` first. If that also fails due to permissions, the code is still fine — Vercel builds from clean state.
- Run `npm run lint` — fix any warnings
- TypeScript check: `npx tsc --noEmit` can verify types even if the full build has cache issues

### 7. Close out (5 minutes)
- Commit your changes with a clear message describing what and why
- Update `BACKLOG.md`: Move completed item to the "Completed" table, update "Current State" if relevant
- Update `ITERATION_LOG.md`: Add an entry for this session (include what the audit found, what research informed the decisions, and what the reviewer flagged)
- If you genuinely need Drew's input on a decision → add to `QUESTIONS.md`
- If you discovered new issues → add them to appropriate section in `BACKLOG.md`

## Agent Usage Patterns

### When to use parallel agents
- **Audit + Research** at the start of every iteration (always parallel)
- **Multiple files** that need independent changes (parallel engineer agents)
- **Build + Lint** checks (parallel)

### When to use sequential agents
- **Review after implementation** (must see the final code)
- **Fix after review** (must see the review feedback)

### Agent prompt template
When launching agents, always include:
1. The specific task and what output you expect
2. Relevant file paths they'll need to read
3. The design direction: **modern dev tool (Linear/Vercel/Raycast), dark/neutral with orange accents, sharp corners, premium feel**
4. What "done" looks like — concrete deliverable, not open-ended exploration

## Rules

### DO
- Use multiple agents to separate concerns (research, implement, review)
- Make changes that are **visually dramatic** — Drew wants to see the site transform, not get tiny polish passes
- Follow the modern dev tool aesthetic (dark/neutral tones, crisp type, selective orange accents)
- Keep sharp corners everywhere — this is the brand
- Write clean, idiomatic Next.js/React/Tailwind code
- Follow the existing data layer pattern (all data through `src/lib/data.ts`)
- Commit after completing work so the next iteration has a clean starting point
- Be honest in the iteration log about what you did and didn't accomplish
- Note what the audit, research, and review agents contributed in the log

### DON'T
- Don't skip the audit/research phase — going straight to code is how you get mediocre improvements
- Don't skip the review phase — the reviewer catches things the implementer misses
- Don't make small, incremental tweaks when a bigger redesign is needed — Drew was clear the old design is bad
- Don't start features you can't finish in one session — break them into smaller pieces
- Don't refactor working code just because you'd write it differently — focus on user-facing value
- Don't add new dependencies without a strong reason
- Don't change the database schema without flagging it in QUESTIONS.md for Drew
- Don't push to the remote repo — Drew handles deployment
- Don't delete or restructure existing files without good reason
- Don't work on backend features (image upload, new API routes) during this design sprint
- Don't use generic white backgrounds with gray borders — that's the old look. Use the new surface palette.

### WHEN STUCK
- If you need Drew's input → add to `QUESTIONS.md` and move to the next backlog item
- If the build is broken when you arrive → fix the build first, that's your iteration
- If you're unsure about a design decision → look at how Linear or Vercel does it, then do that

## File Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Architecture, patterns, technical reference |
| `BACKLOG.md` | What to work on, priority order |
| `ITERATION_LOG.md` | History of what each iteration accomplished |
| `ITERATION_GUIDE.md` | This file — how to run an iteration |
| `QUESTIONS.md` | Questions for Drew + his responses |
| `concept.md` | Original platform vision and concept |
