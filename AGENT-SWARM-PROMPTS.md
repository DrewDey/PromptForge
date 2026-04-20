# PathForge Content Swarm — 6 Agent Prompts

Dispatch one prompt per Opus 4.7 Max agent. Each prompt is self-contained — a fresh agent with no prior context can read, execute, commit, and push without asking questions. Agents work fully in parallel; slot assignments prevent UUID collisions; file assignments prevent merge conflicts.

**Before dispatching:** confirm routines are capped at project 170 (`BACKLOG.md` Content queue spec says so). Swarm owns 171–200.

**Copy everything between the `=== AGENT [X] PROMPT START ===` and `=== AGENT [X] PROMPT END ===` markers** — those markers are meta-comments for you, not for the agent. Paste only what's between them.

---

## === AGENT A PROMPT START ===

You are Agent A of a 6-agent parallel content swarm for PathForge. Your mission: write 5 real Claude-generated prompt chain projects (projects 171–175 of a 200-project corpus) and commit them. You are one of six agents running in parallel — the others handle slots 176–200. Your slot and your output file are yours alone; don't touch anything else.

## What PathForge is

PathForge is a community platform where builders share **real finished AI projects** — what they built, the actual prompts they used step by step, and the real results each prompt produced. It is NOT a prompt-template library. Every project represents a real person sitting down with Claude, asking for real help on a real problem, and getting real working output. The corpus to date (125 projects) reflects this: each entry is a credible build story with substantive Claude output at every step.

Your 5 projects must match that bar. No fill-in-the-blank templates. No placeholder text. No `[INSERT HERE]`. Every word you write, prompt or response, must read like it came from a real human or from real Claude answering that human.

## Your slot (DO NOT deviate from these UUIDs)

- **Project IDs**: `55555555-5555-5555-5555-555555550171` through `55555555-5555-5555-5555-555555550175`
- **Step IDs**: `77777777-7777-7777-7777-777777PPPSSS` where `PPP` = project number (171–175) and `SSS` = step number (001–008). Example: project 171 step 1 = `77777777-7777-7777-7777-777777171001`. Project 175 step 4 = `77777777-7777-7777-7777-777777175004`.
- **Output file**: `supabase/swarm/agent-a.sql` — the ONLY file you write to.

## Files you MUST read first (in this order)

1. `CLAUDE.md` — project overview, content vision, architecture, quality directives. Read in full. Internalize: "This is a project showcase platform, not a prompt template library."
2. `supabase/swarm/README.md` — swarm coordination spec.
3. `supabase/seed-fix.sql` lines 28–37 (category UUIDs) and lines 68–80 (author UUIDs). Both tables live there.
4. `supabase/seed-content-chains.sql` — read project 0001 in full (starts around line 39; ends around line 190). This is your quality reference. Then skim 3–4 other projects at random to calibrate variety.
5. `src/lib/models.ts` (briefly) — the Claude model IDs available for attribution.

Read before writing. Do not shortcut this.

## Categories (10 total)

| UUID | Slug | Name |
|------|------|------|
| `11111111-1111-1111-1111-111111111101` | finance | Finance & Accounting |
| `11111111-1111-1111-1111-111111111102` | marketing | Marketing & Sales |
| `11111111-1111-1111-1111-111111111103` | writing | Writing & Content |
| `11111111-1111-1111-1111-111111111104` | coding | Coding & Development |
| `11111111-1111-1111-1111-111111111105` | design | Design & Creative |
| `11111111-1111-1111-1111-111111111106` | education | Education & Learning |
| `11111111-1111-1111-1111-111111111107` | productivity | Productivity |
| `11111111-1111-1111-1111-111111111108` | data | Data & Analysis |
| `11111111-1111-1111-1111-111111111109` | strategy | Business Strategy |
| `11111111-1111-1111-1111-111111111110` | personal | Personal & Fun |

**Your category mix**: pick 5 categories with emphasis on the corpus's currently-underrepresented ones: **Personal, Strategy, Design, Education, Data** are slightly thin. Suggested set for Agent A: **Personal, Strategy, Design, Education, Data** (one each). Adjust if a specific topic demands a different category, but don't use any single category more than twice.

## Authors (10 available)

| UUID | Username | Display | Natural category fit |
|------|----------|---------|----------------------|
| `22222222-2222-2222-2222-222222222201` | marcusdev | Marcus Chen | Coding |
| `22222222-2222-2222-2222-222222222202` | sarahgrows | Sarah Mitchell | Marketing |
| `22222222-2222-2222-2222-222222222203` | jakefinance | Jake Torres | Finance |
| `22222222-2222-2222-2222-222222222204` | priya_creates | Priya Sharma | Design |
| `22222222-2222-2222-2222-222222222205` | teacherben | Ben Okafor | Education |
| `22222222-2222-2222-2222-222222222206` | ops_nina | Nina Kowalski | Productivity |
| `22222222-2222-2222-2222-222222222207` | dataraj | Raj Patel | Data |
| `22222222-2222-2222-2222-222222222208` | emwriter | Emily Zhao | Writing |
| `22222222-2222-2222-2222-222222222209` | cto_derek | Derek Lawson | Coding, Strategy |
| `22222222-2222-2222-2222-222222222210` | lena_solopreneur | Lena Morales | Personal, Strategy |

Match author to project category. Bios (from seed-fix.sql line 68–79) should inform the first-person voice of each project's `content` field.

## Models (rotate across your 5)

- `claude-sonnet-4-6` / "Claude 4.6 Sonnet" — straightforward tasks
- `claude-opus-4-6` / "Claude 4.6 Opus" — heavier thinking
- `claude-opus-4-7` / "Claude 4.7 Opus" — most recent, most capable

Use at least 2 of these 3 across your 5 projects. Ideally hit all 3.

## Chain lengths (rotate across your 5)

Mix 3-step, 4-step, 5-step. At minimum, include one 4-step and one 5-step. Don't ship five 3-step chains.

## Quality bar (MUST hit all four — this is non-negotiable)

1. **Prompts are verbose and contextual.** 80+ words per step prompt. First person. Includes what they're building, constraints, prior context, specific output requested. Reads like a human who sat down and typed a real ask.
2. **Responses are substantive real artifacts.** 300–600 words per step result (code can be longer). Actual working code with comments, real drafts, real calculations with sanity-checks, real copy. NOT summaries of what Claude would produce — actually generate the artifact.
3. **Chain coherence.** Step N+1's prompt references step N's output naturally. Transitions like "Great — now let's add…" or "Good catch on the edge case. Next piece:". Reader follows without extra context.
4. **Real Claude voice.** Substantive, occasionally opinionated, flags edge cases and gotchas a domain expert would. Doesn't hedge with "it depends."

## SQL format — copy this structure for each of your 5 projects

Replace your first project block into `supabase/swarm/agent-a.sql` (remove the file's header comment once you start writing projects). Subsequent projects append below.

```sql
-- =========================================================================
-- Project 55-0171 | [Short title] | [Author display name] | [Category] | [N] steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550171';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550171';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550171',
  $pf$[Project title — 5-12 words, specific, not generic]$pf$,
  $pf$[1-2 sentence description — what they built, in past tense, third-person-neutral]$pf$,
  $pf$[Story — 80-150 word first-person narrative from the author explaining why they built this, what the problem was, what the chain produced.]$pf$,
  $pf$[Outcome — 200-400 word first-person account of what they got at the end, why it worked, what they learned, any numbers/stats/observations that make it real.]$pf$,
  '[category UUID from table above]',
  '[beginner | intermediate | advanced]',
  '[claude-sonnet-4-6 | claude-opus-4-6 | claude-opus-4-7]',
  '[Claude 4.6 Sonnet | Claude 4.6 Opus | Claude 4.7 Opus]',
  ARRAY['Claude', '[other tools/libraries used]'],
  ARRAY['[3-6 real specific tags]'],
  'approved',
  '[author UUID from table above]',
  0,
  0
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('77777777-7777-7777-7777-777777171001',
 '55555555-5555-5555-5555-555555550171',
 1,
 $pf$[Step title — 5-10 words, what this step produces]$pf$,
 $pf$[Prompt — 80+ words, first person, contextual. The person is writing to Claude asking for this step.]$pf$,
 $pf$[Claude's real response to that prompt — 300-600 words, substantive artifact. If it's code, include the code with comments. If it's copy, include the copy. If it's analysis, include the numbers.]$pf$,
 NULL),

-- Step 2 --
('77777777-7777-7777-7777-777777171002',
 '55555555-5555-5555-5555-555555550171',
 2,
 $pf$[Step 2 title]$pf$,
 $pf$[Step 2 prompt — references step 1's output naturally]$pf$,
 $pf$[Claude's response]$pf$,
 NULL),

-- Continue for all steps. Last step ends with `);` instead of `),`.

-- Step N --
('77777777-7777-7777-7777-77777717100N',
 '55555555-5555-5555-5555-555555550171',
 N,
 $pf$[Final step title]$pf$,
 $pf$[Final step prompt]$pf$,
 $pf$[Final step response]$pf$,
 NULL);
```

Project 172 repeats the structure with UUID ending `...550172` and step prefixes `...777777172001`, `...777777172002`, etc. Same for 173, 174, 175.

## Rules (don't break these)

- **Only edit `supabase/swarm/agent-a.sql`.** Do NOT touch `supabase/seed-content-chains.sql`, `BACKLOG.md`, `ITERATION_LOG.md`, `QUESTIONS.md`, `SKILL.md`, `CLAUDE.md`, or any file in `src/`. Any change outside your swarm file breaks coordination with the routines and the other 5 swarm agents.
- **Use dollar-quoted strings** (`$pf$...$pf$`) for all text content. This avoids apostrophe-escape hell.
- **vote_count = 0, bookmark_count = 0** for every project. Non-negotiable — zero engagement policy.
- **status = 'approved'** for every project (matches routine behavior).
- **Topic freshness**: before finalizing a topic, grep `supabase/seed-content-chains.sql` for key terms. If a similar project already exists in the corpus, pick a different angle or a different topic. The 125 existing projects cover a lot of ground — read them first.
- **No fake-looking numbers.** 2026 tax brackets, market stats, company metrics must be plausible. If you cite a number, it should stand up to a sanity check.
- **No fake company names like "Acme".** Use real-sounding businesses and products. "Helm Financial", "Brightwheel", "Layerset", "Northbound Logistics" — plausible over generic.

## Commit and push when done

```bash
# From repo root
git add supabase/swarm/agent-a.sql
git commit -m "swarm: agent A adds projects 171-175"
git pull --rebase origin main  # handle any race with other agents
git push origin main
```

If `git push` fails due to a concurrent push from another agent, rerun `git pull --rebase origin main` and push again. Your file is independent so there should be no merge conflicts on content — only on commit ordering.

## Self-verify before commit

- [ ] All 5 projects present (IDs 550171 through 550175).
- [ ] Every project has at least 3 steps, at least one project has 4+ steps, at least one has 5.
- [ ] Every step's `content` is 80+ words and reads like a real ask.
- [ ] Every step's `result_content` is 300+ words and is a real artifact (code / copy / analysis), not a summary.
- [ ] No `[PLACEHOLDER]`, `[TODO]`, `[INSERT]`, or filler text remaining anywhere in the file.
- [ ] All step IDs follow `77777777-7777-7777-7777-777777PPPSSS` pattern.
- [ ] Categories + authors are matched sensibly.
- [ ] Model attribution rotates (at least 2 different models across 5 projects).
- [ ] Chain lengths vary (at minimum one 4-step and one 5-step).
- [ ] vote_count = 0 and bookmark_count = 0 on every project.
- [ ] `npx tsc --noEmit` passes (should be a no-op for SQL changes, but run it once).

Begin now. Read the reference files first, then write. Budget ~2–3 hours of real effort for 5 real projects at this quality bar.

## === AGENT A PROMPT END ===

---

## === AGENT B PROMPT START ===

You are Agent B of a 6-agent parallel content swarm for PathForge. Your mission: write 5 real Claude-generated prompt chain projects (projects 176–180 of a 200-project corpus) and commit them. You are one of six agents running in parallel — the others handle slots 171–175 and 181–200. Your slot and your output file are yours alone; don't touch anything else.

## What PathForge is

PathForge is a community platform where builders share **real finished AI projects** — what they built, the actual prompts they used step by step, and the real results each prompt produced. It is NOT a prompt-template library. Every project represents a real person sitting down with Claude, asking for real help on a real problem, and getting real working output. The corpus to date (125 projects) reflects this: each entry is a credible build story with substantive Claude output at every step.

Your 5 projects must match that bar. No fill-in-the-blank templates. No placeholder text. No `[INSERT HERE]`. Every word you write, prompt or response, must read like it came from a real human or from real Claude answering that human.

## Your slot (DO NOT deviate from these UUIDs)

- **Project IDs**: `55555555-5555-5555-5555-555555550176` through `55555555-5555-5555-5555-555555550180`
- **Step IDs**: `77777777-7777-7777-7777-777777PPPSSS` where `PPP` = project number (176–180) and `SSS` = step number (001–008). Example: project 176 step 1 = `77777777-7777-7777-7777-777777176001`. Project 180 step 4 = `77777777-7777-7777-7777-777777180004`.
- **Output file**: `supabase/swarm/agent-b.sql` — the ONLY file you write to.

## Files you MUST read first (in this order)

1. `CLAUDE.md` — project overview, content vision, architecture, quality directives. Read in full.
2. `supabase/swarm/README.md` — swarm coordination spec.
3. `supabase/seed-fix.sql` lines 28–37 (category UUIDs) and lines 68–80 (author UUIDs).
4. `supabase/seed-content-chains.sql` — read project 0001 in full (starts around line 39). Then skim 3–4 other projects at random to calibrate variety.
5. `src/lib/models.ts` (briefly).

Read before writing. Do not shortcut this.

## Categories (10 total)

| UUID | Slug | Name |
|------|------|------|
| `11111111-1111-1111-1111-111111111101` | finance | Finance & Accounting |
| `11111111-1111-1111-1111-111111111102` | marketing | Marketing & Sales |
| `11111111-1111-1111-1111-111111111103` | writing | Writing & Content |
| `11111111-1111-1111-1111-111111111104` | coding | Coding & Development |
| `11111111-1111-1111-1111-111111111105` | design | Design & Creative |
| `11111111-1111-1111-1111-111111111106` | education | Education & Learning |
| `11111111-1111-1111-1111-111111111107` | productivity | Productivity |
| `11111111-1111-1111-1111-111111111108` | data | Data & Analysis |
| `11111111-1111-1111-1111-111111111109` | strategy | Business Strategy |
| `11111111-1111-1111-1111-111111111110` | personal | Personal & Fun |

**Your category mix**: Suggested set for Agent B: **Writing, Marketing, Personal, Strategy, Design** (one each). Adjust if a specific topic demands a different category, but don't use any single category more than twice.

## Authors (10 available)

| UUID | Username | Display | Natural category fit |
|------|----------|---------|----------------------|
| `22222222-2222-2222-2222-222222222201` | marcusdev | Marcus Chen | Coding |
| `22222222-2222-2222-2222-222222222202` | sarahgrows | Sarah Mitchell | Marketing |
| `22222222-2222-2222-2222-222222222203` | jakefinance | Jake Torres | Finance |
| `22222222-2222-2222-2222-222222222204` | priya_creates | Priya Sharma | Design |
| `22222222-2222-2222-2222-222222222205` | teacherben | Ben Okafor | Education |
| `22222222-2222-2222-2222-222222222206` | ops_nina | Nina Kowalski | Productivity |
| `22222222-2222-2222-2222-222222222207` | dataraj | Raj Patel | Data |
| `22222222-2222-2222-2222-222222222208` | emwriter | Emily Zhao | Writing |
| `22222222-2222-2222-2222-222222222209` | cto_derek | Derek Lawson | Coding, Strategy |
| `22222222-2222-2222-2222-222222222210` | lena_solopreneur | Lena Morales | Personal, Strategy |

Match author to project category. Bios (from seed-fix.sql line 68–79) should inform the first-person voice of each project's `content` field.

## Models (rotate across your 5)

- `claude-sonnet-4-6` / "Claude 4.6 Sonnet"
- `claude-opus-4-6` / "Claude 4.6 Opus"
- `claude-opus-4-7` / "Claude 4.7 Opus"

Use at least 2 of these 3 across your 5 projects. Ideally hit all 3.

## Chain lengths (rotate across your 5)

Mix 3-step, 4-step, 5-step. At minimum, one 4-step and one 5-step.

## Quality bar (MUST hit all four — non-negotiable)

1. **Prompts verbose and contextual.** 80+ words per step prompt. First person. Real ask, with context, constraints, output requested.
2. **Responses are substantive real artifacts.** 300–600 words per step result. Actual code with comments, real drafts, real calculations sanity-checked, real copy.
3. **Chain coherence.** Step N+1 references step N naturally.
4. **Real Claude voice.** Opinionated, flags edge cases, doesn't hedge.

## SQL format

Your first project, to go in `supabase/swarm/agent-b.sql` (remove the file's header comment before writing):

```sql
-- =========================================================================
-- Project 55-0176 | [Short title] | [Author display name] | [Category] | [N] steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550176';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550176';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550176',
  $pf$[Project title]$pf$,
  $pf$[1-2 sentence description — past tense, what they built]$pf$,
  $pf$[Story — 80-150 word first-person narrative]$pf$,
  $pf$[Outcome — 200-400 word first-person account of the result, with real details]$pf$,
  '[category UUID]',
  '[difficulty]',
  '[model slug]',
  '[model human name]',
  ARRAY['Claude', '[other tools]'],
  ARRAY['[3-6 tags]'],
  'approved',
  '[author UUID]',
  0,
  0
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('77777777-7777-7777-7777-777777176001',
 '55555555-5555-5555-5555-555555550176',
 1,
 $pf$[Step title]$pf$,
 $pf$[Prompt — 80+ words, contextual]$pf$,
 $pf$[Real Claude response — 300+ words, substantive]$pf$,
 NULL),

-- ...continue for each step. Last step ends with `);` instead of `),`.
-- Step numbering continues: 176002, 176003, ..., then 177001 for project 177, etc.
```

Repeat for projects 177, 178, 179, 180 with UUIDs ending in those numbers.

## Rules (don't break these)

- **Only edit `supabase/swarm/agent-b.sql`.** Do NOT touch any other file.
- **Dollar-quoted strings** (`$pf$...$pf$`) everywhere.
- **vote_count = 0, bookmark_count = 0**.
- **status = 'approved'**.
- **Topic freshness**: grep corpus for overlaps before committing to a topic.
- **No fake numbers or fake company names.**

## Commit and push

```bash
git add supabase/swarm/agent-b.sql
git commit -m "swarm: agent B adds projects 176-180"
git pull --rebase origin main
git push origin main
```

## Self-verify checklist

- [ ] All 5 projects present (550176 through 550180).
- [ ] Each project has at least 3 steps; at least one has 4+ and at least one has 5.
- [ ] Every prompt is 80+ words, first person, contextual.
- [ ] Every result is 300+ words, real artifact.
- [ ] No placeholders anywhere.
- [ ] All step IDs follow `777777PPPSSS` pattern.
- [ ] Categories + authors matched.
- [ ] At least 2 different models used.
- [ ] vote_count = 0, bookmark_count = 0 everywhere.
- [ ] `npx tsc --noEmit` passes.

Begin now.

## === AGENT B PROMPT END ===

---

## === AGENT C PROMPT START ===

You are Agent C of a 6-agent parallel content swarm for PathForge. Your mission: write 5 real Claude-generated prompt chain projects (projects 181–185 of a 200-project corpus) and commit them. You are one of six agents running in parallel. Your slot and your output file are yours alone.

## What PathForge is

PathForge is a community platform where builders share **real finished AI projects** — what they built, the actual prompts they used step by step, and the real results each prompt produced. NOT a prompt-template library. Every project = a real person using Claude on a real problem. Your 5 projects must match that bar: no templates, no placeholders, no `[INSERT HERE]`. Every word reads like a real human or real Claude.

## Your slot (DO NOT deviate)

- **Project IDs**: `55555555-5555-5555-5555-555555550181` through `...550185`
- **Step IDs**: `77777777-7777-7777-7777-777777PPPSSS` where `PPP`=181–185, `SSS`=001–008. E.g., project 181 step 1 = `777777181001`.
- **Output file**: `supabase/swarm/agent-c.sql` — ONLY this file.

## Read first (in order)

1. `CLAUDE.md`
2. `supabase/swarm/README.md`
3. `supabase/seed-fix.sql` lines 28–37 (categories) and 68–80 (authors)
4. `supabase/seed-content-chains.sql` project 0001 in full, plus 3–4 other projects at random
5. `src/lib/models.ts`

## Categories

| UUID | Slug | Name |
|------|------|------|
| `11111111-1111-1111-1111-111111111101` | finance | Finance & Accounting |
| `11111111-1111-1111-1111-111111111102` | marketing | Marketing & Sales |
| `11111111-1111-1111-1111-111111111103` | writing | Writing & Content |
| `11111111-1111-1111-1111-111111111104` | coding | Coding & Development |
| `11111111-1111-1111-1111-111111111105` | design | Design & Creative |
| `11111111-1111-1111-1111-111111111106` | education | Education & Learning |
| `11111111-1111-1111-1111-111111111107` | productivity | Productivity |
| `11111111-1111-1111-1111-111111111108` | data | Data & Analysis |
| `11111111-1111-1111-1111-111111111109` | strategy | Business Strategy |
| `11111111-1111-1111-1111-111111111110` | personal | Personal & Fun |

**Your category mix**: Suggested set for Agent C: **Data, Education, Writing, Personal, Finance** (one each). Adjust if a topic demands it, but no single category more than twice.

## Authors

| UUID | Username | Display | Fit |
|------|----------|---------|-----|
| `22222222-2222-2222-2222-222222222201` | marcusdev | Marcus Chen | Coding |
| `22222222-2222-2222-2222-222222222202` | sarahgrows | Sarah Mitchell | Marketing |
| `22222222-2222-2222-2222-222222222203` | jakefinance | Jake Torres | Finance |
| `22222222-2222-2222-2222-222222222204` | priya_creates | Priya Sharma | Design |
| `22222222-2222-2222-2222-222222222205` | teacherben | Ben Okafor | Education |
| `22222222-2222-2222-2222-222222222206` | ops_nina | Nina Kowalski | Productivity |
| `22222222-2222-2222-2222-222222222207` | dataraj | Raj Patel | Data |
| `22222222-2222-2222-2222-222222222208` | emwriter | Emily Zhao | Writing |
| `22222222-2222-2222-2222-222222222209` | cto_derek | Derek Lawson | Coding, Strategy |
| `22222222-2222-2222-2222-222222222210` | lena_solopreneur | Lena Morales | Personal, Strategy |

## Models (rotate)

`claude-sonnet-4-6` / "Claude 4.6 Sonnet", `claude-opus-4-6` / "Claude 4.6 Opus", `claude-opus-4-7` / "Claude 4.7 Opus". At least 2 different models across your 5.

## Chain lengths

Mix 3/4/5 step. At least one 4-step and one 5-step.

## Quality bar (non-negotiable)

1. **Prompts verbose and contextual.** 80+ words, first person, real ask.
2. **Responses are substantive real artifacts.** 300–600 words, actual code/copy/analysis.
3. **Chain coherence.** Step N+1 references step N naturally.
4. **Real Claude voice.** Opinionated, flags edge cases.

## SQL format

First project skeleton in `supabase/swarm/agent-c.sql` (remove the header comment first):

```sql
-- =========================================================================
-- Project 55-0181 | [Title] | [Author] | [Category] | [N] steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550181';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550181';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550181',
  $pf$[Title]$pf$, $pf$[Description]$pf$, $pf$[Story]$pf$, $pf$[Outcome]$pf$,
  '[category UUID]', '[difficulty]', '[model slug]', '[model human name]',
  ARRAY['Claude', '[other tools]'], ARRAY['[3-6 tags]'],
  'approved', '[author UUID]', 0, 0
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES
-- Step 1 --
('77777777-7777-7777-7777-777777181001',
 '55555555-5555-5555-5555-555555550181', 1,
 $pf$[Step title]$pf$, $pf$[Prompt]$pf$, $pf$[Response]$pf$, NULL),
-- ... more steps, last one uses `);`
```

Continue for projects 182, 183, 184, 185.

## Rules

- Only edit `supabase/swarm/agent-c.sql`. Do NOT touch any other file.
- `$pf$...$pf$` dollar-quoting everywhere.
- vote_count = 0, bookmark_count = 0. status = 'approved'.
- Check corpus (`supabase/seed-content-chains.sql`) for topic overlap before committing to a topic.
- No fake names like "Acme". No fake numbers.

## Commit and push

```bash
git add supabase/swarm/agent-c.sql
git commit -m "swarm: agent C adds projects 181-185"
git pull --rebase origin main
git push origin main
```

## Self-verify

- [ ] 5 projects (550181–550185), 3+ steps each, at least one 4-step and one 5-step.
- [ ] Prompts 80+ words, responses 300+ words, real artifacts.
- [ ] No placeholders.
- [ ] Step IDs `777777PPPSSS`.
- [ ] Categories, authors matched. 2+ models used.
- [ ] Engagement counts zero.
- [ ] `npx tsc --noEmit` passes.

Begin now.

## === AGENT C PROMPT END ===

---

## === AGENT D PROMPT START ===

You are Agent D of a 6-agent parallel content swarm for PathForge. Your mission: write 5 real Claude-generated prompt chain projects (projects 186–190 of a 200-project corpus) and commit them. You are one of six agents running in parallel. Your slot and your output file are yours alone.

## What PathForge is

PathForge is a community platform where builders share **real finished AI projects** — what they built, the actual prompts they used step by step, and the real results each prompt produced. NOT a prompt-template library. Every project = a real person using Claude on a real problem. Your 5 projects must match that bar: no templates, no placeholders, no `[INSERT HERE]`. Every word reads like a real human or real Claude.

## Your slot (DO NOT deviate)

- **Project IDs**: `55555555-5555-5555-5555-555555550186` through `...550190`
- **Step IDs**: `77777777-7777-7777-7777-777777PPPSSS` where `PPP`=186–190, `SSS`=001–008. E.g., project 186 step 1 = `777777186001`.
- **Output file**: `supabase/swarm/agent-d.sql` — ONLY this file.

## Read first (in order)

1. `CLAUDE.md`
2. `supabase/swarm/README.md`
3. `supabase/seed-fix.sql` lines 28–37 (categories) and 68–80 (authors)
4. `supabase/seed-content-chains.sql` project 0001 in full, plus 3–4 other projects at random
5. `src/lib/models.ts`

## Categories

| UUID | Slug | Name |
|------|------|------|
| `11111111-1111-1111-1111-111111111101` | finance | Finance & Accounting |
| `11111111-1111-1111-1111-111111111102` | marketing | Marketing & Sales |
| `11111111-1111-1111-1111-111111111103` | writing | Writing & Content |
| `11111111-1111-1111-1111-111111111104` | coding | Coding & Development |
| `11111111-1111-1111-1111-111111111105` | design | Design & Creative |
| `11111111-1111-1111-1111-111111111106` | education | Education & Learning |
| `11111111-1111-1111-1111-111111111107` | productivity | Productivity |
| `11111111-1111-1111-1111-111111111108` | data | Data & Analysis |
| `11111111-1111-1111-1111-111111111109` | strategy | Business Strategy |
| `11111111-1111-1111-1111-111111111110` | personal | Personal & Fun |

**Your category mix**: Suggested set for Agent D: **Strategy, Marketing, Data, Design, Productivity** (one each). Adjust if a topic demands it, but no single category more than twice.

## Authors

| UUID | Username | Display | Fit |
|------|----------|---------|-----|
| `22222222-2222-2222-2222-222222222201` | marcusdev | Marcus Chen | Coding |
| `22222222-2222-2222-2222-222222222202` | sarahgrows | Sarah Mitchell | Marketing |
| `22222222-2222-2222-2222-222222222203` | jakefinance | Jake Torres | Finance |
| `22222222-2222-2222-2222-222222222204` | priya_creates | Priya Sharma | Design |
| `22222222-2222-2222-2222-222222222205` | teacherben | Ben Okafor | Education |
| `22222222-2222-2222-2222-222222222206` | ops_nina | Nina Kowalski | Productivity |
| `22222222-2222-2222-2222-222222222207` | dataraj | Raj Patel | Data |
| `22222222-2222-2222-2222-222222222208` | emwriter | Emily Zhao | Writing |
| `22222222-2222-2222-2222-222222222209` | cto_derek | Derek Lawson | Coding, Strategy |
| `22222222-2222-2222-2222-222222222210` | lena_solopreneur | Lena Morales | Personal, Strategy |

## Models (rotate)

`claude-sonnet-4-6`, `claude-opus-4-6`, `claude-opus-4-7`. At least 2 across your 5.

## Chain lengths

Mix 3/4/5 step. At least one 4-step and one 5-step.

## Quality bar (non-negotiable)

1. **Prompts verbose and contextual.** 80+ words, first person, real ask.
2. **Responses are substantive real artifacts.** 300–600 words, actual code/copy/analysis.
3. **Chain coherence.** Step N+1 references step N naturally.
4. **Real Claude voice.** Opinionated, flags edge cases.

## SQL format

First project skeleton in `supabase/swarm/agent-d.sql` (remove the header comment first):

```sql
-- =========================================================================
-- Project 55-0186 | [Title] | [Author] | [Category] | [N] steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550186';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550186';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550186',
  $pf$[Title]$pf$, $pf$[Description]$pf$, $pf$[Story]$pf$, $pf$[Outcome]$pf$,
  '[category UUID]', '[difficulty]', '[model slug]', '[model human name]',
  ARRAY['Claude', '[other tools]'], ARRAY['[3-6 tags]'],
  'approved', '[author UUID]', 0, 0
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES
-- Step 1 --
('77777777-7777-7777-7777-777777186001',
 '55555555-5555-5555-5555-555555550186', 1,
 $pf$[Step title]$pf$, $pf$[Prompt]$pf$, $pf$[Response]$pf$, NULL),
-- ... more steps, last one uses `);`
```

Continue for projects 187, 188, 189, 190.

## Rules

- Only edit `supabase/swarm/agent-d.sql`. Do NOT touch any other file.
- `$pf$...$pf$` dollar-quoting everywhere.
- vote_count = 0, bookmark_count = 0. status = 'approved'.
- Check corpus for topic overlap.
- No fake names or numbers.

## Commit and push

```bash
git add supabase/swarm/agent-d.sql
git commit -m "swarm: agent D adds projects 186-190"
git pull --rebase origin main
git push origin main
```

## Self-verify

- [ ] 5 projects (550186–550190), 3+ steps each, at least one 4-step and one 5-step.
- [ ] Prompts 80+ words, responses 300+ words, real artifacts.
- [ ] No placeholders.
- [ ] Step IDs `777777PPPSSS`.
- [ ] Categories, authors matched. 2+ models used.
- [ ] Engagement counts zero.
- [ ] `npx tsc --noEmit` passes.

Begin now.

## === AGENT D PROMPT END ===

---

## === AGENT E PROMPT START ===

You are Agent E of a 6-agent parallel content swarm for PathForge. Your mission: write 5 real Claude-generated prompt chain projects (projects 191–195 of a 200-project corpus) and commit them. You are one of six agents running in parallel. Your slot and your output file are yours alone.

## What PathForge is

PathForge is a community platform where builders share **real finished AI projects** — what they built, the actual prompts they used step by step, and the real results each prompt produced. NOT a prompt-template library. Every project = a real person using Claude on a real problem. Your 5 projects must match that bar: no templates, no placeholders, no `[INSERT HERE]`. Every word reads like a real human or real Claude.

## Your slot (DO NOT deviate)

- **Project IDs**: `55555555-5555-5555-5555-555555550191` through `...550195`
- **Step IDs**: `77777777-7777-7777-7777-777777PPPSSS` where `PPP`=191–195, `SSS`=001–008. E.g., project 191 step 1 = `777777191001`.
- **Output file**: `supabase/swarm/agent-e.sql` — ONLY this file.

## Read first (in order)

1. `CLAUDE.md`
2. `supabase/swarm/README.md`
3. `supabase/seed-fix.sql` lines 28–37 (categories) and 68–80 (authors)
4. `supabase/seed-content-chains.sql` project 0001 in full, plus 3–4 other projects at random
5. `src/lib/models.ts`

## Categories

| UUID | Slug | Name |
|------|------|------|
| `11111111-1111-1111-1111-111111111101` | finance | Finance & Accounting |
| `11111111-1111-1111-1111-111111111102` | marketing | Marketing & Sales |
| `11111111-1111-1111-1111-111111111103` | writing | Writing & Content |
| `11111111-1111-1111-1111-111111111104` | coding | Coding & Development |
| `11111111-1111-1111-1111-111111111105` | design | Design & Creative |
| `11111111-1111-1111-1111-111111111106` | education | Education & Learning |
| `11111111-1111-1111-1111-111111111107` | productivity | Productivity |
| `11111111-1111-1111-1111-111111111108` | data | Data & Analysis |
| `11111111-1111-1111-1111-111111111109` | strategy | Business Strategy |
| `11111111-1111-1111-1111-111111111110` | personal | Personal & Fun |

**Your category mix**: Suggested set for Agent E: **Writing, Personal, Education, Coding, Finance** (one each). Adjust if a topic demands it, but no single category more than twice.

## Authors

| UUID | Username | Display | Fit |
|------|----------|---------|-----|
| `22222222-2222-2222-2222-222222222201` | marcusdev | Marcus Chen | Coding |
| `22222222-2222-2222-2222-222222222202` | sarahgrows | Sarah Mitchell | Marketing |
| `22222222-2222-2222-2222-222222222203` | jakefinance | Jake Torres | Finance |
| `22222222-2222-2222-2222-222222222204` | priya_creates | Priya Sharma | Design |
| `22222222-2222-2222-2222-222222222205` | teacherben | Ben Okafor | Education |
| `22222222-2222-2222-2222-222222222206` | ops_nina | Nina Kowalski | Productivity |
| `22222222-2222-2222-2222-222222222207` | dataraj | Raj Patel | Data |
| `22222222-2222-2222-2222-222222222208` | emwriter | Emily Zhao | Writing |
| `22222222-2222-2222-2222-222222222209` | cto_derek | Derek Lawson | Coding, Strategy |
| `22222222-2222-2222-2222-222222222210` | lena_solopreneur | Lena Morales | Personal, Strategy |

## Models (rotate)

`claude-sonnet-4-6`, `claude-opus-4-6`, `claude-opus-4-7`. At least 2 across your 5.

## Chain lengths

Mix 3/4/5 step. At least one 4-step and one 5-step.

## Quality bar (non-negotiable)

1. **Prompts verbose and contextual.** 80+ words, first person, real ask.
2. **Responses are substantive real artifacts.** 300–600 words, actual code/copy/analysis.
3. **Chain coherence.** Step N+1 references step N naturally.
4. **Real Claude voice.** Opinionated, flags edge cases.

## SQL format

First project skeleton in `supabase/swarm/agent-e.sql` (remove the header comment first):

```sql
-- =========================================================================
-- Project 55-0191 | [Title] | [Author] | [Category] | [N] steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550191';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550191';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550191',
  $pf$[Title]$pf$, $pf$[Description]$pf$, $pf$[Story]$pf$, $pf$[Outcome]$pf$,
  '[category UUID]', '[difficulty]', '[model slug]', '[model human name]',
  ARRAY['Claude', '[other tools]'], ARRAY['[3-6 tags]'],
  'approved', '[author UUID]', 0, 0
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES
-- Step 1 --
('77777777-7777-7777-7777-777777191001',
 '55555555-5555-5555-5555-555555550191', 1,
 $pf$[Step title]$pf$, $pf$[Prompt]$pf$, $pf$[Response]$pf$, NULL),
-- ... more steps, last one uses `);`
```

Continue for projects 192, 193, 194, 195.

## Rules

- Only edit `supabase/swarm/agent-e.sql`. Do NOT touch any other file.
- `$pf$...$pf$` dollar-quoting everywhere.
- vote_count = 0, bookmark_count = 0. status = 'approved'.
- Check corpus for topic overlap.
- No fake names or numbers.

## Commit and push

```bash
git add supabase/swarm/agent-e.sql
git commit -m "swarm: agent E adds projects 191-195"
git pull --rebase origin main
git push origin main
```

## Self-verify

- [ ] 5 projects (550191–550195), 3+ steps each, at least one 4-step and one 5-step.
- [ ] Prompts 80+ words, responses 300+ words, real artifacts.
- [ ] No placeholders.
- [ ] Step IDs `777777PPPSSS`.
- [ ] Categories, authors matched. 2+ models used.
- [ ] Engagement counts zero.
- [ ] `npx tsc --noEmit` passes.

Begin now.

## === AGENT E PROMPT END ===

---

## === AGENT F PROMPT START ===

You are Agent F of a 6-agent parallel content swarm for PathForge. Your mission: write 5 real Claude-generated prompt chain projects (projects 196–200 — the final 5 of a 200-project corpus) and commit them. You are one of six agents running in parallel. Your slot and your output file are yours alone. Your projects close the Content queue.

## What PathForge is

PathForge is a community platform where builders share **real finished AI projects** — what they built, the actual prompts they used step by step, and the real results each prompt produced. NOT a prompt-template library. Every project = a real person using Claude on a real problem. Your 5 projects must match that bar: no templates, no placeholders, no `[INSERT HERE]`. Every word reads like a real human or real Claude.

## Your slot (DO NOT deviate)

- **Project IDs**: `55555555-5555-5555-5555-555555550196` through `...550200`
- **Step IDs**: `77777777-7777-7777-7777-777777PPPSSS` where `PPP`=196–200, `SSS`=001–008. E.g., project 200 step 1 = `777777200001`.
- **Output file**: `supabase/swarm/agent-f.sql` — ONLY this file.

## Read first (in order)

1. `CLAUDE.md`
2. `supabase/swarm/README.md`
3. `supabase/seed-fix.sql` lines 28–37 (categories) and 68–80 (authors)
4. `supabase/seed-content-chains.sql` project 0001 in full, plus 3–4 other projects at random
5. `src/lib/models.ts`

## Categories

| UUID | Slug | Name |
|------|------|------|
| `11111111-1111-1111-1111-111111111101` | finance | Finance & Accounting |
| `11111111-1111-1111-1111-111111111102` | marketing | Marketing & Sales |
| `11111111-1111-1111-1111-111111111103` | writing | Writing & Content |
| `11111111-1111-1111-1111-111111111104` | coding | Coding & Development |
| `11111111-1111-1111-1111-111111111105` | design | Design & Creative |
| `11111111-1111-1111-1111-111111111106` | education | Education & Learning |
| `11111111-1111-1111-1111-111111111107` | productivity | Productivity |
| `11111111-1111-1111-1111-111111111108` | data | Data & Analysis |
| `11111111-1111-1111-1111-111111111109` | strategy | Business Strategy |
| `11111111-1111-1111-1111-111111111110` | personal | Personal & Fun |

**Your category mix**: You close the corpus — prioritize variety and freshness. Suggested set for Agent F: **Strategy, Design, Education, Data, Productivity** (one each). Adjust if a topic demands it, but no single category more than twice. Because you're last, scan the full `supabase/seed-content-chains.sql` and the other swarm agent files (if already committed) to pick topics that round out what's missing.

## Authors

| UUID | Username | Display | Fit |
|------|----------|---------|-----|
| `22222222-2222-2222-2222-222222222201` | marcusdev | Marcus Chen | Coding |
| `22222222-2222-2222-2222-222222222202` | sarahgrows | Sarah Mitchell | Marketing |
| `22222222-2222-2222-2222-222222222203` | jakefinance | Jake Torres | Finance |
| `22222222-2222-2222-2222-222222222204` | priya_creates | Priya Sharma | Design |
| `22222222-2222-2222-2222-222222222205` | teacherben | Ben Okafor | Education |
| `22222222-2222-2222-2222-222222222206` | ops_nina | Nina Kowalski | Productivity |
| `22222222-2222-2222-2222-222222222207` | dataraj | Raj Patel | Data |
| `22222222-2222-2222-2222-222222222208` | emwriter | Emily Zhao | Writing |
| `22222222-2222-2222-2222-222222222209` | cto_derek | Derek Lawson | Coding, Strategy |
| `22222222-2222-2222-2222-222222222210` | lena_solopreneur | Lena Morales | Personal, Strategy |

## Models (rotate)

`claude-sonnet-4-6`, `claude-opus-4-6`, `claude-opus-4-7`. At least 2 across your 5.

## Chain lengths

Mix 3/4/5 step. At least one 4-step and one 5-step. Since you close the corpus, consider including one longer 6- or 7-step chain — something that shows depth.

## Quality bar (non-negotiable)

1. **Prompts verbose and contextual.** 80+ words, first person, real ask.
2. **Responses are substantive real artifacts.** 300–600 words, actual code/copy/analysis.
3. **Chain coherence.** Step N+1 references step N naturally.
4. **Real Claude voice.** Opinionated, flags edge cases.

## SQL format

First project skeleton in `supabase/swarm/agent-f.sql` (remove the header comment first):

```sql
-- =========================================================================
-- Project 55-0196 | [Title] | [Author] | [Category] | [N] steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550196';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550196';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550196',
  $pf$[Title]$pf$, $pf$[Description]$pf$, $pf$[Story]$pf$, $pf$[Outcome]$pf$,
  '[category UUID]', '[difficulty]', '[model slug]', '[model human name]',
  ARRAY['Claude', '[other tools]'], ARRAY['[3-6 tags]'],
  'approved', '[author UUID]', 0, 0
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES
-- Step 1 --
('77777777-7777-7777-7777-777777196001',
 '55555555-5555-5555-5555-555555550196', 1,
 $pf$[Step title]$pf$, $pf$[Prompt]$pf$, $pf$[Response]$pf$, NULL),
-- ... more steps, last one uses `);`
```

Continue for projects 197, 198, 199, 200.

## Rules

- Only edit `supabase/swarm/agent-f.sql`. Do NOT touch any other file.
- `$pf$...$pf$` dollar-quoting everywhere.
- vote_count = 0, bookmark_count = 0. status = 'approved'.
- Check corpus for topic overlap (plus other swarm files if present).
- No fake names or numbers.

## Commit and push

```bash
git add supabase/swarm/agent-f.sql
git commit -m "swarm: agent F adds projects 196-200"
git pull --rebase origin main
git push origin main
```

## Self-verify

- [ ] 5 projects (550196–550200), 3+ steps each, at least one 4-step and one 5-step (ideally one 6+).
- [ ] Prompts 80+ words, responses 300+ words, real artifacts.
- [ ] No placeholders.
- [ ] Step IDs `777777PPPSSS`.
- [ ] Categories, authors matched. 2+ models used.
- [ ] Engagement counts zero.
- [ ] `npx tsc --noEmit` passes.

Begin now.

## === AGENT F PROMPT END ===
