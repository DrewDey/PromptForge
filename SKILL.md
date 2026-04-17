---
name: pathforge-design-iteration
description: Hourly design & UX iteration on PathForge. Read four short files, make one real change, commit.
---

You are running an hourly iteration on PathForge (Next.js community platform for sharing AI projects).

## The point
Make ONE visible improvement and commit it. A real change, not a 2px nudge. One file is fine; four files is fine; what matters is that a human looking at the live site would notice.

## Loop

1. **Orient (5 min cap)** — Read `BACKLOG.md`, `ITERATION_LOG.md` top entry, `QUESTIONS.md`, `MEMORY.md`. All four are short on purpose. **Pick only from `BACKLOG.md`'s Polish queue** unless you're in a live session with Drew telling you otherwise — Structural items and Drew actions are off-limits to unattended iterations. If the top Polish item is larger than one iteration, carve off one visible slice.

2. **Change it** — Edit the files. Follow existing patterns: Tailwind v4 (surface-* tokens, not raw gray-*), Next.js 16 App Router, data through `src/lib/data.ts`, brand orange `#E87A2C` and blue `#3B8FE4`, sharp corners, modern dev-tool aesthetic (Linear / Vercel / Raycast). No new dependencies. No schema changes.

3. **Verify — two gates, both required:**
   - **Types:** `npx tsc --noEmit` must pass.
   - **Visual (Chrome MCP preferred):** with `npm run dev` running (start it backgrounded if needed), open the touched page(s) in the Chrome MCP (`mcp__Claude_in_Chrome__navigate`, then `read_page` / `get_page_text` / `read_console_messages`) at `localhost:3000`. Always spot-check `/browse` and `/prompt/new` — the two priority pages — plus `/prompt/[any-id]` if you touched shared components, `CodeBlock`, or `globals.css`. Don't ship a design change you haven't seen; code can't catch iter 29's four-orange-accent regression, eyes can.
   - **Chrome unreachable fallback:** if the Chrome MCP is genuinely not connected (extension offline, Drew's Chrome closed), run `npm run build` and confirm it completes cleanly, and write `Chrome unreachable — build-only verify` in your iteration-log entry. This is degraded; the change still ships but the next human review is more important. Don't silently skip.

   A genuinely non-visual change (types/lib refactor already covered by tsc) can skip the visual gate — say so in the iteration log. Don't use "non-visual" as an escape hatch.

4. **Commit + push + log** — `git add` the touched source files + `BACKLOG.md` + `ITERATION_LOG.md`, commit with a short message, then `git push` to `origin main`. Add a 3-sentence entry at the top of `ITERATION_LOG.md`. Move the completed item to `BACKLOG.md`'s Done table with a one-line summary.

## Hard rules

- **Finish your own iteration — commit AND push.** Never ask Drew to `rm`, `supabase sql`, `npm install`, "paste this config", or any other command. If completing the iteration would require Drew to run something, you haven't finished — find another way (git plumbing, bypass the index, whatever). The earlier version of this rule said Drew pushes manually; that was a Cowork-sandbox constraint. Claude Code has git creds and pushes directly.
- **Commit via plumbing when the index is locked.** `git hash-object -w` → `git mktree` → `git commit-tree` → `echo <sha> > .git/refs/heads/main` works even when `.git/index.lock` and `.git/HEAD.lock` are FUSE-stuck from prior runs. Don't abandon a commit because `git add` failed.
- No reviewer / audit / research sub-agents. They produce inflated certainty, not quality. Read the files yourself.
- Push to `origin main` at the end of every iteration. If the push fails, surface the real error (auth, protected branch, upstream diverged) — don't silently leave the commit unpushed.
- Keep `ITERATION_LOG.md` entries to 3 sentences. Keep `BACKLOG.md` Done entries to one line. Keep `QUESTIONS.md` to actual decisions you can't make yourself — no "here are 4 options, which do you prefer."

## If the build is broken
Fix the actual TypeScript / import error in source.
