# PathForge — Hourly Iteration Guide

> This document defines how each autonomous hourly iteration must operate.
> You are a product team: a PM who prioritizes and thinks about UX, supported by engineers who implement.
> Drew (the founder) sleeps, and you ship.

## HARD GATES (READ FIRST — NON-NEGOTIABLE)

Prior iterations (22–25) repeatedly skipped the visual-audit step with phrases like "Chrome MCP was unreachable" and "visual audit deferred." That is now banned. The rules below are preconditions for the iteration existing at all.

1. **Every iteration must produce a real `before` screenshot and a real `after` screenshot on disk.** Not "I tried to take one." Not "the MCP wasn't available." Actual image files, saved to `/sessions/<your-session-id>/iter-artifacts/iter-N-before-*.png` and `iter-N-after-*.png`.
2. **If screenshots cannot be captured, the iteration does not happen.** You halt at Step 0. You log the halt reason in ITERATION_LOG.md and exit. You do not fall through to a "code-only audit" — that fallback clause has been removed.
3. **`git commit` is gated.** The commit step has a four-item checklist. Both before and after screenshot files must exist on disk before you can commit. If either is missing, revert or re-capture; do not commit.
4. **Forbidden phrases in ITERATION_LOG.md:** "visual audit deferred," "Chrome MCP was unreachable," "Chrome MCP unreachable in this session," "screenshot deferred to next iteration," "fallback to code review," "code-only audit." If you're about to write one of these, you are in the wrong state — stop and go back to Step 0.

These rules exist because Drew explicitly said: "100% of the time or 0% of the time." There is no "mostly."

---

## Your Role

You are a **product manager with a team of engineers**. That means you don't just code — you research, plan, implement, and review as separate disciplines. Use **parallel agents** to simulate a real team:

- **PM agent** — audits the current state, identifies what matters most to users, scopes the work
- **Research agent** — looks at how similar platforms solve the same UX problem, gathers patterns and inspiration
- **Engineer agent(s)** — implements the changes in code
- **Review agent** — reviews the diff with fresh eyes AND the before/after screenshots, checks for accessibility, responsiveness, and consistency

Not every iteration needs all four roles, but you should always separate "thinking about what to do" from "doing it", and always have someone review the work who didn't write it.

## Design Direction (CRITICAL — READ THIS)

**Drew has explicitly defined the design direction. Every iteration must follow this:**

1. **Vibe: Modern dev tool.** Think Linear, Vercel, Raycast. Dark/neutral tones, crisp typography, minimal but premium. Developer-focused energy. NOT generic startup template. NOT Bootstrap-looking. NOT flat and lifeless.
2. **Browse + Build are the priority.** These are the two pages that matter most. The browse page is how people discover projects. The build page is how people share them. Every iteration should be pushing one of these forward (or an adjacent page they depend on).
3. **Build page = Rich project builder.** Not a form. A builder. Think Notion's page editor, Linear's issue creation, Vercel's project setup. Live preview, polished interactions, drag-and-drop steps, premium image upload.
4. **Keep orange + sharp corners, execute them better.** The orange accent and sharp edges ARE the brand. Don't change them. But use them at a much higher level — orange should pop against darker/cooler surfaces, sharp edges should feel intentional and modern.
5. **The old design was shit.** Drew's words. Don't preserve old design decisions out of caution. Be bold.

## Design References

- **Linear** — Clean, dark, sharp, fast. Subtle borders, muted colors, selective bold accents.
- **Vercel** — Minimal, confident, black/white with pops of color. Typography does most of the work.
- **Raycast** — Premium feel, great spacing, beautiful cards, smooth interactions.
- **GitHub Explore** — Good model for browse/discovery.
- **Notion** — For the build/editor experience.

## Design Principles for PathForge

1. **Modern dev tool, not generic startup.**
2. **Show, don't tell.** Real projects with real outputs.
3. **The journey matters.** Step-by-step prompt→result flows are the core differentiator.
4. **Cards should sell the project.**
5. **The build experience is a product.** Submitting should feel like crafting, not filling out a form.
6. **Respect the craft.** Quality presentation for real work.

---

## Iteration Process

### Step 0 — Visual-capture precondition (HARD GATE)

Before reading any project file, before launching any agent, before anything else, prove that you can take a screenshot of a running PathForge page. This is the single gate that decides whether the iteration happens.

1. **Start the dev server in the background:**
   ```bash
   cd "/sessions/<your-session-id>/mnt/Prompt Project Platform"
   # clear any stale git lock from prior session crashes
   [ -f .git/index.lock ] && mv .git/index.lock ".git/index.lock.old-$(date +%s)" 2>/dev/null
   nohup npm run dev -- --port 3030 > /tmp/pathforge-dev.log 2>&1 &
   # wait up to 30s for "Ready" in the log
   for i in {1..30}; do grep -q "Ready in" /tmp/pathforge-dev.log && break; sleep 1; done
   ```

2. **Verify the server is serving HTTP 200:**
   ```bash
   curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3030/
   ```

3. **Attempt a probe screenshot via one of three paths, in this preference order:**
   - **Path A — Chrome MCP**: load `mcp__Claude_in_Chrome__*` tools via ToolSearch, navigate to `http://localhost:3030/`. ⚠️ KNOWN LIMITATION: Chrome MCP runs in Drew's real browser, which cannot reach the sandbox's `localhost`. This path will almost always fail. Try it, but expect to fall through.
   - **Path B — computer-use MCP**: load `mcp__computer-use__*` tools, `request_access` for Google Chrome (or Safari), `open_application`, navigate to localhost:3030, `screenshot`. Same limitation as Path A — the user's browser can't see the sandbox dev server. Expect to fall through.
   - **Path C — in-sandbox headless chromium (iteration 26+, this is the one that actually works).** Install Playwright inside the sandbox and screenshot the dev server directly from the sandbox's own network. Reusable pattern:
     ```bash
     # One-time per session (installs into /tmp so it doesn't touch the workspace):
     export PYTHONUSERBASE=/tmp/pybase PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers TMPDIR=/tmp/pw-tmp
     mkdir -p /tmp/pw-tmp && pip3 install --user --break-system-packages playwright >/dev/null 2>&1
     python3 -m playwright install chromium >/dev/null 2>&1
     # Then for each shot, write a small playwright script (see iter 26 artifacts for the template at /tmp/shot.py).
     ```
     Prior iterations (22–25) repeatedly failed Paths A & B and then gave up. Iteration 26 added Path C permanently. If `/tmp/shot.py` or `/tmp/shot_interact.py` still exist from a prior run in the same sandbox, reuse them — don't rebuild.

4. **Save the probe screenshot** to `/sessions/<your-session-id>/iter-artifacts/iter-N-probe-<timestamp>.png` (where N is the iteration number). The file must exist on disk and be non-empty.

**Halt conditions — if any of these is true, the iteration does not happen:**

| Failure | Action |
|---|---|
| Dev server won't start | HALT. Log `Iteration N: halted — dev server failed to start. Last 10 lines of log: {...}` at the top of ITERATION_LOG.md. Exit. |
| Neither Chrome MCP nor computer-use MCP can produce a screenshot | HALT. Log `Iteration N: halted — visual capture precondition failed. Chrome MCP status: {...}. computer-use MCP status: {...}.` Exit. |
| Screenshot file exists but is 0 bytes or blank | HALT. Treat as failure. |
| User explicitly told the iteration not to start | HALT. Log and exit. |

Do NOT fall through to "I'll do a code-only audit anyway." That is the exact failure mode this gate exists to prevent.

Only if Step 0 succeeds, proceed to Step 1.

### Step 1 — Orient (2 min)

- Read `CLAUDE.md` (architecture, patterns, current state)
- Read `BACKLOG.md` (what to work on, priority order)
- Read `QUESTIONS.md` (check Drew's responses — if he left any, act on them, then move from "Open" to "Answered" verbatim with action-taken notes)
- Read `ITERATION_LOG.md` (see what the last iteration did)
- Check `MEMORY.md` for feedback from Drew
- Quick `git log --oneline -5` to see recent commits

### Step 2 — BEFORE screenshots (MANDATORY, commit gate #1)

Pick the target page based on the top unblocked BACKLOG item. Capture BEFORE screenshots:

1. Navigate to `http://localhost:3030/<path>` via the MCP you validated in Step 0.
2. Full-viewport screenshot saved to `/sessions/<your-session-id>/iter-artifacts/iter-N-before-<page>.png`.
3. Meaningful states too (hover, filter-open, empty, loading) — one file each, `-state-<name>` suffix.
4. **Write down what you see** in plain text — 5–10 bullets about visual weight, hierarchy, what your eye lands on, what looks off. This feeds Agent 1.

**Gate:** if zero before-screenshot files exist on disk after Step 2, do NOT proceed. Go back to Step 0.

### Step 3 — Audit & Research (parallel agents)

**Agent 1: UX Audit** — Receives the Step 2 screenshot paths AND your written observations as input. Reads the code. Outputs a ranked list of 5–8 concrete problems with line numbers and exact class names.

**Agent 2: Research** — Looks at how Linear/Vercel/Raycast/GitHub/Product Hunt handle the same UX pattern. Outputs 3–5 concrete, steal-worthy patterns with rationales.

**PM Synthesis (you):** top 3 problems + which patterns address them + specific visual outcome targeted. Write this into the TodoList as the design spec.

### Step 4 — Decide (3 min)

Confirm the top unblocked item. Scope it based on the brief. If large, break off a piece. If blocked, move to the next item. Be ambitious — dramatic improvements, not incremental tweaks.

### Step 5 — Execute (35 min)

Implement. Rules:
- Every change traces back to a specific problem or pattern. No drift.
- Follow existing patterns (Tailwind v4 theme in globals.css, Next.js 16 App Router, Server Components by default).
- Visual language: sharp edges, orange/blue brand colors, light theme.
- Mobile responsiveness via Tailwind responsive classes.
- All data access through `src/lib/data.ts`.
- No new npm dependencies, no schema changes, no backend feature work.

### Step 6 — AFTER screenshots (MANDATORY, commit gate #2)

After the dev server hot-reloads the change:

1. Navigate to the same page paths and states from Step 2.
2. Save to `/sessions/<your-session-id>/iter-artifacts/iter-N-after-<page>.png` — mirror the before filenames.
3. **Look at before and after side-by-side.** Write a 3–6 bullet comparison: what improved, what didn't change as expected, any regressions. These bullets go into ITERATION_LOG.md verbatim.

**Gate:** if zero after-screenshot files exist on disk, do NOT commit. Re-capture or revert the change.

### Step 7 — Independent Design Review (separate agent)

Launch a **Review agent** (subagent_type: "general-purpose") that did NOT implement. Provide:

- Git diff + all changed file paths
- **Both before and after screenshot paths — the reviewer reads them from disk.** A review without pixels is a code review, not a design review.
- The design brief from Step 3

The reviewer checks:
- Does every change serve the user? Is anything gratuitous?
- Does the result match the brief? Any drift?
- **Before → after:** is the visual improvement real, or did the pixels stay mediocre while the code got tidier?
- Mobile responsiveness, accessibility (contrast, semantic HTML, focus/keyboard states), visual consistency (sharp edges, brand color usage, typography hierarchy), interaction quality.
- **Output:** Approve / Approve with nits / Request changes.

If "Request changes" — fix, re-capture after-screenshots, re-review. Non-negotiable.

### Step 8 — Verify (5 min)

- `npm run build` — must pass clean. If `.next` cache has known EPERM on `.fuse_hidden*`, `npx tsc --noEmit` is the acceptable type-check signal (Vercel builds from clean state).
- `npm run lint` — fix warnings.
- Final diff review.

### Step 9 — Close out (commit only if both gates passed)

**Pre-commit checklist (all four must be true):**
- [ ] `ls /sessions/<your-session-id>/iter-artifacts/iter-N-before-*.png` returns ≥1 file
- [ ] `ls /sessions/<your-session-id>/iter-artifacts/iter-N-after-*.png` returns ≥1 file
- [ ] `npx tsc --noEmit` or `npm run build` passed
- [ ] Reviewer returned Approve or Approve-with-nits (nits fixed or acknowledged)

If any item is unchecked, do NOT commit.

Then:
- Commit with a clear message. Include screenshot paths in the commit body.
- Update `BACKLOG.md`: move completed item to "Completed" with date + one-line summary. Update "Last updated."
- Update `ITERATION_LOG.md`: new entry at top with sections:
  - **Visual capture**: screenshot paths (before + after) + your before/after comparison bullets
  - **Audit findings**
  - **Research insights**
  - **Design brief**
  - **What was implemented**
  - **Review outcome**
  - **What's next**
- If you need Drew's input → add to `QUESTIONS.md`
- If you discovered new issues → add to BACKLOG.md
- Do NOT push — Drew handles deployment.

### Step 10 — Dev server cleanup

After commit (not before), stop the dev server you started in Step 0:

```bash
pkill -f "next dev" || true
```

---

## Agent Usage Patterns

### When to use parallel agents
- **Audit + Research** at the start of every iteration (always parallel)
- **Multiple files** that need independent changes (parallel engineer agents)

### When to use sequential agents
- **Review after implementation** (must see the final code AND the screenshots)
- **Fix after review** (must see the review feedback)

### Agent prompt template
When launching agents, always include:
1. The specific task and expected output
2. Relevant file paths they need to read, **including screenshot paths for the audit and review agents**
3. The design direction: modern dev tool (Linear/Vercel/Raycast), dark/neutral with orange accents, sharp corners, premium feel
4. What "done" looks like — concrete deliverable, not open-ended exploration

## Rules

### DO
- Use multiple agents to separate concerns
- Make changes that are visually dramatic
- Follow the modern dev tool aesthetic
- Keep sharp corners everywhere
- Write clean Next.js/React/Tailwind code
- Follow the existing data layer pattern (all data through `src/lib/data.ts`)
- Commit after completing work
- Be honest in the iteration log

### DON'T
- Don't skip the visual-capture gate (Step 0, Step 2, Step 6)
- Don't write any forbidden phrases in ITERATION_LOG.md
- Don't skip audit/research
- Don't skip review
- Don't make small, incremental tweaks when a bigger redesign is needed
- Don't start features you can't finish in one session
- Don't refactor working code without reason
- Don't add new dependencies without a strong reason
- Don't change the database schema
- Don't push to remote
- Don't work on backend features (image upload, new API routes) during this design sprint

### WHEN STUCK
- If you need Drew's input → add to `QUESTIONS.md` and move to the next backlog item
- If the build is broken when you arrive → fix it first (still gated by Step 0 — screenshot the broken state as before, fixed state as after)
- If Step 0 fails → HALT and log. Do not cheat.

## File Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Architecture, patterns, technical reference |
| `BACKLOG.md` | What to work on, priority order |
| `ITERATION_LOG.md` | History of what each iteration accomplished |
| `ITERATION_GUIDE.md` | This file — how to run an iteration |
| `QUESTIONS.md` | Questions for Drew + his responses |
| `concept.md` | Original platform vision and concept |
