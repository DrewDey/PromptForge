# PathForge Content Swarm — Final 30 Projects (171-200)

The last 30 slots of the 200-project Content queue are built by 6 parallel Opus 4.7 Max agents instead of the 2/hour routine. Each agent writes exactly 5 projects into its own file. No file collisions — each agent has a dedicated target. No UUID collisions — slots are pre-assigned.

Routines cap at 170 (see `BACKLOG.md` Content queue). Slots 171–200 are reserved for the swarm.

## Slot assignments

| Agent | Project IDs | Project UUID range | Step UUID range | Output file |
|-------|-------------|--------------------|-----------------|-------------|
| A | 171–175 | `550171`–`550175` | `777777171001`–`777777175008` | `agent-a.sql` |
| B | 176–180 | `550176`–`550180` | `777777176001`–`777777180008` | `agent-b.sql` |
| C | 181–185 | `550181`–`550185` | `777777181001`–`777777185008` | `agent-c.sql` |
| D | 186–190 | `550186`–`550190` | `777777186001`–`777777190008` | `agent-d.sql` |
| E | 191–195 | `550191`–`550195` | `777777191001`–`777777195008` | `agent-e.sql` |
| F | 196–200 | `550196`–`550200` | `777777196001`–`777777200008` | `agent-f.sql` |

Full UUID form:
- Project: `55555555-5555-5555-5555-5555555501PP` — last 3 hex chars = project number 171-200
- Step: `77777777-7777-7777-7777-777777PPPSSS` — PPP = project (171-200), SSS = step number (001-008)

This matches the existing pattern used by projects 100+ in `seed-content-chains.sql`. Projects 1-99 used a different prefix (66666666-...) that has run out of keyspace at 3-digit project IDs.

## Six prompts to dispatch

`AGENT-SWARM-PROMPTS.md` at the repo root contains six self-contained prompts — one per agent. Each is copy-paste-ready. Drew dispatches them to 6 Opus 4.7 Max sessions. Each session works independently.

## Applying swarm output to Supabase

Once all six files are populated:

```bash
# Using psql with the Supabase session pooler
for f in supabase/swarm/agent-*.sql; do
  psql "$SUPABASE_POOLER_URL" -f "$f"
done
```

Or paste each file directly into the Supabase SQL Editor — each file is ~5 projects worth of SQL, small enough that the editor's query-size limit isn't an issue.

## Coordination safety

- **UUIDs pre-assigned** — two agents cannot accidentally write the same row.
- **Each agent writes only its own file** — no merge conflicts on content.
- **Routines cap at 170** — BACKLOG.md's Content queue spec is updated to reserve 171-200.
- **Git push races handled by `git pull --rebase`** — different files, no conflicts.
- **Agents do NOT touch** `seed-content-chains.sql`, `BACKLOG.md`, `ITERATION_LOG.md`, `QUESTIONS.md`, `SKILL.md`, or any source file outside their own `agent-X.sql`.

## Post-swarm cleanup (after all 6 complete)

Any subsequent session can:
1. Concatenate `supabase/swarm/agent-*.sql` into `supabase/seed-content-chains.sql` for a single source of truth.
2. Update BACKLOG.md to mark the Content queue CLOSED at 200.
3. Pivot iterations to the Polish queue.

This is a post-swarm cleanup step, NOT a swarm job.
