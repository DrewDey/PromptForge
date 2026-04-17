---
name: pathforge-design-iteration
description: Hourly design & UX iteration on PathForge. Read four short files, make one real change, commit.
---

You are running an hourly iteration on PathForge (Next.js community platform for sharing AI projects).

## The point
Make ONE visible, **structural** improvement and commit it. "Structural" means the diff changes what the page IS — what renders first, what the dominant visual block is, how components compose, which affordance is prominent. NOT "2px nudge" level — and specifically **not a pure-spacing diff**. If the entire diff consists of swapping padding/margin/font-size Tailwind utilities (`mb-4 → mb-5`, `py-1 → py-1.5`, `text-base → text-lg`, `gap-2 → gap-y-2.5`) with no structural rearrangement, the iteration fails — pick a different task from BACKLOG's Polish queue. Spacing tweaks are fine as a *side effect* of a structural change; they are not a valid standalone iteration. The bar: a visitor (not a designer running devtools) would notice the difference.

## Depth floor (what a complete iteration actually looks like)

The routine is generous on time, not tight on cadence — each iteration has a full hour of wall-clock before the next fires. A **complete iteration** is ~15–25 minutes of real work, not a 2-minute drive-by. Before committing, confirm your iteration hits all five:

1. **Reference-grounded.** For any visual/structural change, `WebFetch` at least one external reference page that embodies the target aesthetic and cite the specific pattern you're borrowing (or deliberately diverging from) in your log entry. Starting points:
   - `https://linear.app/changelog` — editorial timeline; output-as-hero
   - `https://vercel.com/templates` — gallery card treatment; large hero previews
   - `https://stripe.com/docs` or `https://read.cv` — build-log / case-study prose aesthetic
   - `https://dev.to` featured posts — magazine-article prose treatment
   
   This directly closes the "words→pixels translation gap." Grounding design choices in a reference you can point at beats guessing from convention. If all three of your WebFetch attempts fail, note the attempts in the log and proceed — don't hard-halt the iteration.

2. **Design rationale in the log.** One paragraph: the approach you chose, at least one alternative you considered, why you went that way. Forces thinking; coding-only is how iterations drift back to convention.

3. **Comprehensive implementation, not slices.** Ship desktop layout AND mobile responsive behavior AND empty state AND loading state (if applicable) AND interactive states (hover/focus/active) AND at least one edge case you actually thought about. Do NOT ship a desktop-only slice and leave mobile as "follow-on" — that's how halves accumulate and polish work creeps back.

4. **Site-scope visual verify, not 2 pages.** Chrome MCP every page that renders the changed component, not just `/browse` and `/prompt/new`. If you touched `PromptCard`, hit `/browse`, category filters, `/prompt/[id]`'s "More in this category" section. If you touched `CodeBlock`, every page rendering it. Read console on each; note any regression before committing.

5. **Rich iteration log entry.** Include: what shipped (concrete diff summary), why this approach (1-para rationale from #2), references consulted (from #1), responsive/edge cases covered (from #3), verification coverage (from #4), and a `Follow-ups spotted:` bullet list noting 1–2 specific polish observations for future iterations. The old 3-sentence cap is lifted for structural iterations — write as much as the work deserves.

An iteration that skips any of the five ships smaller than it should. Use the wall-clock headroom — you have it.

## Loop

1. **Orient (5 min cap)** — Read `BACKLOG.md`, `ITERATION_LOG.md` top entry, `QUESTIONS.md`, `MEMORY.md`. All four are short on purpose. **Pick only from `BACKLOG.md`'s Polish queue** unless you're in a live session with Drew telling you otherwise — Structural items and Drew actions are off-limits to unattended iterations. If the top Polish item is larger than one iteration, carve off one visible slice.

2. **Change it** — Before writing code, do Depth floor #1 (reference fetch + cite) and #2 (design rationale draft). Then edit, implementing per Depth floor #3 (comprehensive — not slices). Follow existing patterns: Tailwind v4 (surface-* tokens, not raw gray-*), Next.js 16 App Router, data through `src/lib/data.ts`, brand orange `#E87A2C` and blue `#3B8FE4`, sharp corners, modern dev-tool aesthetic (Linear / Vercel / Raycast). No new dependencies. No schema changes.

3. **Verify — two gates, both required:**
   - **Types:** `npx tsc --noEmit` must pass.
   - **Visual (Chrome MCP preferred):** with `npm run dev` running (start it backgrounded if needed), follow Depth floor #4 — site-scope visual verification, not just two priority pages. `mcp__Claude_in_Chrome__navigate` to every page that renders the changed component or page. `read_page` / `get_page_text` / `read_console_messages` on each. Don't ship a design change you haven't seen; code can't catch a visual regression, eyes can.
   - **Chrome unreachable fallback:** if the Chrome MCP is genuinely not connected (extension offline, Drew's Chrome closed), run `npm run build` and confirm it completes cleanly, and write `Chrome unreachable — build-only verify` in your iteration-log entry. This is degraded; the change still ships but the next human review is more important. Don't silently skip.

   A genuinely non-visual change (types/lib refactor already covered by tsc) can skip the visual gate — say so in the iteration log. Don't use "non-visual" as an escape hatch.

4. **Commit + push + log** — `git add` the touched source files + `BACKLOG.md` + `ITERATION_LOG.md`, commit with a short message, then `git push` to `origin main`. Add a rich entry at the top of `ITERATION_LOG.md` per Depth floor #5 (not just 3 sentences — include rationale, references, responsive coverage, verification scope, and follow-ups spotted). Move the completed item to `BACKLOG.md`'s Done table with a one-line summary (the Done table stays tight; depth lives in the log).

## Hard rules

- **Finish your own iteration — commit AND push.** Never ask Drew to `rm`, `supabase sql`, `npm install`, "paste this config", or any other command. If completing the iteration would require Drew to run something, you haven't finished — find another way (git plumbing, bypass the index, whatever). The earlier version of this rule said Drew pushes manually; that was a Cowork-sandbox constraint. Claude Code has git creds and pushes directly.
- **Commit via plumbing when the index is locked.** `git hash-object -w` → `git mktree` → `git commit-tree` → `echo <sha> > .git/refs/heads/main` works even when `.git/index.lock` and `.git/HEAD.lock` are FUSE-stuck from prior runs. Don't abandon a commit because `git add` failed.
- No reviewer / audit / research sub-agents. They produce inflated certainty, not quality. Read the files yourself.
- Push to `origin main` at the end of every iteration. If the push fails, surface the real error (auth, protected branch, upstream diverged) — don't silently leave the commit unpushed.
- `ITERATION_LOG.md` structural-iteration entries follow Depth floor #5 (rationale + references + responsive coverage + verification scope + follow-ups spotted). The old 3-sentence cap is OFF for structural work. Keep `BACKLOG.md` Done entries to one line (the table stays tight; depth lives in the log). Keep `QUESTIONS.md` to actual decisions you can't make yourself — no "here are 4 options, which do you prefer."

## If the build is broken
Fix the actual TypeScript / import error in source.
