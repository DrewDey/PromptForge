---
name: pathforge-design-iteration
description: Hourly design & UX iteration on PathForge. Read four short files, make one real change, commit.
---

You are running an hourly iteration on PathForge (Next.js community platform for sharing AI projects).

## The point
Make ONE visible improvement and commit it. A real change, not a 2px nudge. One file is fine; four files is fine; what matters is that a human looking at the live site would notice.

## Loop

1. **Orient (5 min cap)** — Read `BACKLOG.md`, `ITERATION_LOG.md` top entry, `QUESTIONS.md`, `MEMORY.md`. All four are short on purpose. If `BACKLOG.md` top item is huge, carve off one visible slice of it.

2. **Change it** — Edit the files. Follow existing patterns: Tailwind v4 (surface-* tokens, not raw gray-*), Next.js 16 App Router, data through `src/lib/data.ts`, brand orange `#E87A2C` and blue `#3B8FE4`, sharp corners, modern dev-tool aesthetic (Linear / Vercel / Raycast). No new dependencies. No schema changes.

3. **Verify** — `npx tsc --noEmit` must pass. That's the only gate. Skip `npm run dev`, `npm run build`, `npm run lint` — they've been flaky in the sandbox.

4. **Commit + log** — `git add` the touched source files + `BACKLOG.md` + `ITERATION_LOG.md` and commit with a short message. Do NOT push — Drew pushes manually. Add a 3-sentence entry at the top of `ITERATION_LOG.md`. Move the completed item to `BACKLOG.md`'s Done table with a one-line summary.

## Hard rules

- **The only thing you ever ask Drew to run is `git push`.** Never `rm`, never `supabase sql`, never `npm install`, never "paste this config", never any other command. If completing the iteration would require Drew to run something else, you haven't finished the iteration — find another way (git plumbing, bypass the index, whatever). Drew has said this plainly: any instruction that asks him to do something other than push means the iteration failed.
- **Commit via plumbing when the index is locked.** `git hash-object -w` → `git mktree` → `git commit-tree` → `echo <sha> > .git/refs/heads/main` works even when `.git/index.lock` and `.git/HEAD.lock` are FUSE-stuck from prior runs. Don't abandon a commit because `git add` failed.
- No screenshots. Chrome MCP targets Drew's real browser — not the sandbox — and the handshake costs 20 min per session. Reason from the code.
- No reviewer / audit / research sub-agents. They produce inflated certainty, not quality. Read the files yourself.
- No dev server. Don't run `npm run dev`, don't rsync to a sibling directory, don't delete `.next.*` or `.gone` files — they're FUSE-locked from prior runs.
- No pushing to GitHub. Sandbox can't authenticate. Drew pushes, and that is the ONE thing he does.
- Keep `ITERATION_LOG.md` entries to 3 sentences. Keep `BACKLOG.md` Done entries to one line. Keep `QUESTIONS.md` to actual decisions you can't make yourself — no "here are 4 options, which do you prefer."

## If the build is broken
Fix the actual TypeScript / import error in source. Don't fix the sandbox environment — that's a local cleanup for Drew.
