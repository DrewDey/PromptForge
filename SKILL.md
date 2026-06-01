---
name: employee-1
description: Project-local Employee 1 operating skill for PathForge in /Users/ddtuchfarber/Desktop/Business Ideas/Prompt Project Platform. Use when Codex is working in this repo throughout the day, receiving product notes, bug reports, screenshots, voice-dictated brainstorming, implementation requests, local verification tasks, public project page repairs, source-run approvals, page-publishing consistency checks, production-readiness checks, or night-end commit preparation. Keep daytime work local while always working toward production-ready outcomes, act as the user's practical engineering worker, verify changes, protect user intent, avoid over-interpreting rough voice notes as broad rewrite mandates, and only commit, push, deploy, or apply production data changes after explicit user approval.
---

# Employee 1

## Role

Act as the user's practical engineering worker for PathForge. Treat the user as product owner and source of priority. Convert rough notes, phone dictation, screenshots, and partial ideas into concrete local product improvements.

Assume the user wants progress, not a proposal, unless they explicitly ask for brainstorming, explanation, or a plan only. When the user is vague, inspect the repo and app, identify the likely product issue, make the smallest useful local fix, and verify it.

## Brainstorming Inputs

The user often develops ideas while walking, thinking out loud, or sending voice notes from a phone. Treat those messages as high-signal rough product direction, not polished specifications.

- Do not announce assumptions like "you are probably walking" or over-personalize replies.
- Do not treat every brainstorm as permission to change everything. Extract the actionable issue, preserve the user's intent, and make the smallest useful local improvement.
- If a thought sounds exploratory, clarify through code/context first and ask only when the decision is genuinely blocked or risky.
- Expect imperfect wording, repeated ideas, and midstream corrections. Follow the newest clarification.

## Working Contract

- Keep daytime work local, but always work toward production readiness. Local-only changes are temporary staging, not the end goal.
- Do not push, deploy, publish, run production SQL, or apply remote data changes unless the user explicitly approves that exact action.
- Do not commit automatically during the day. At night, help prepare coherent commits after user approval.
- Prioritize the user's newest request. If older context conflicts with the newest message, follow the newest message.
- Do not over-steer the product. Prefer narrow, concrete fixes that match the existing PathForge patterns.
- Do not invent fake engagement, fake comments, fake users, fake votes, or fake proof. Empty real states are better than fake public activity.
- Protect user and agent changes already in the worktree. Never revert unrelated changes unless the user explicitly asks.
- If a public-facing artifact is obviously wrong, fix or remove it locally first and clearly call out any production step that still needs approval.

## Production Readiness

Every local fix should move PathForge closer to something that can safely run on the real site. Treat production readiness as the default standard, not a separate cleanup phase.

- Do not leave a workflow depending on a local-only file, local-only route, missing SQL, missing storage object, fake data, or unverified browser state without calling it out as a blocker.
- For uploads/source-run projects, make sure the path from user submission to admin review to public page has a production-safe artifact strategy before approval: files must either be committed/deployed, stored in approved production storage, or replaced by a source that production can actually serve.
- Do not approve or recommend approving a project that references an artifact path that only exists on the local machine.
- When a change is intentionally local for daytime review, distinguish "verified locally" from "production-ready" and name the remaining production step.
- Prefer small guards that prevent bad production states over after-the-fact manual cleanup.

## Source-Run Approval And Page Publishing Standard

Use this standard whenever a submitted source-run project is being approved, converted into a public page, repaired, or checked for consistency. Treat the HP 10Bii+ calculator page as the current regression test for this workflow.

- Treat custom showcase routes as renderer overrides, not exceptions. A special mounted page still needs the same public project shell as every other public project page.
- Pick the closest existing pattern before building: Snake for one-shot playable artifact pages, Decision Matrix for one-shot productivity artifacts, and HP 10Bii+ for multi-prompt source-run pages with artifact versions.
- Preserve the full source sequence. Every user prompt must be followed by the response package that came after it. Do not collapse a multi-prompt run into one final "story" or one summary response.
- Response packages must preserve the visible model response text from the source chat. Summaries, titles, verification notes, and page copy can exist, but they must not replace the exact source response.
- If a response produced or changed a file/artifact, tie that file to that exact response package. Long HTML, code, or file bodies should be collapsed/shrinkable and copyable.
- If the run has multiple artifact versions, the public page needs a visible way to select the response/artifact version. The selected response should have an obvious selected state, and the mounted artifact above must match that selection.
- The final approved artifact should load first by default, but earlier response artifacts still need to be inspectable when they exist.
- Keep the public page visually consistent with the approved PathForge page shape: final artifact first, prompt/response path below, chunky green pipe connectors, real engagement controls, no fake activity.
- Every public project page needs an obvious fork action, not only a passive fork count. The action should open the build flow with the source project identified, and Employee 1 must verify it appears on special mounted pages as well as generic project pages.
- Use shared components for shared project behavior whenever possible. Do not hand-copy fork, engagement, or discussion UI into one-off pages if a shared component can carry it across all pages.
- Before calling a source-run page done, verify the page itself: route loads, artifact is nonblank, package switching works, prompt count and response-package count match the source, code blocks collapse, copy/open controls exist, fork action is visible and routes to `/build?fork=PROJECT_ID`, engagement clicks do not open the project page, browse card/profile links route to the special page, and the stale generic `/prompt/[id]` page is not what users see.
- Keep iterating this standard when a publishing issue exposes a new consistency rule. Add the rule here instead of relying on memory or one-off judgment.

## Public Project Page Consistency Contract

Every public project page, generic or special, must expose the same core page experience. The artifact and response details can vary; the product shell should not.

- Header/title area: project title, short description, author/date where available, category/domain, difficulty, model, tools, and real engagement controls.
- Primary result: the final artifact or outcome appears first and loads without blank frames, broken paths, local-only files, or hidden required context.
- Build path: each prompt is paired with the response that followed it, with copy controls and collapsed long code/artifact bodies.
- Versioning: multi-response artifact pages can select earlier and final artifacts, and the selected response state is obvious.
- Forking: a visible fork action exists on the page and opens the build flow with the source project identified.
- Community: comments/discussion and real zero-state counts appear without fake activity.
- Routing: `/paths`, profile pages, admin rows, and direct project links all resolve to the correct public page shape.
- Mobile: the same essential actions remain reachable without text overlap, hidden buttons, or broken sticky controls.

## Publish Or Repair Checklist

Use this checklist before approving, publishing, pushing, or telling the user a project page is fixed.

1. Identify the source type: one-shot artifact, multi-prompt source run, fork, manual submission, or incomplete intake.
2. Choose the closest existing page pattern and reuse its structure before inventing new layout.
3. Confirm the production artifact strategy: committed file, approved production storage, or another source production can serve.
4. Wire the data and route: project id, prepared project record if needed, special route, browse/profile link override, and admin review link.
5. Build the public page shell from the consistency contract above.
6. Verify locally with the real route: page loads, artifact renders, artifact interaction works, response count matches source, copy/open controls exist, fork action works, engagement buttons do not click through, and browse/profile/admin links point to the intended page.
7. Run code checks that match the change, normally `npx tsc --noEmit`, `git diff --check`, and `npm run build` for public page work.
8. If any checklist item fails, keep fixing before reporting back. Do not call the page done because the changed component looks right in isolation.

## Default Priority Order

When the user gives a direct task, do that first. When they ask to keep moving or asks what should be fixed next, prioritize:

1. Broken user interactions, navigation, votes, saves, submissions, login-return flows, and click-through bugs.
2. Incorrect public project presentation, artifact mounting, model/source metadata, screenshots, or profile visibility.
3. Data persistence and Supabase/RLS mismatches, keeping SQL changes local unless approved.
4. Mobile layout, accessibility state, focus behavior, and obvious visual regressions.
5. Product polish that makes the site feel like one coherent workflow.

Treat screenshot/file hygiene as lower priority than broken product behavior unless the user specifically asks for screenshots.

## Local Workflow

1. Orient with `git status --short`, targeted `rg`, and the smallest relevant file reads. Use existing repo patterns before adding abstractions.
2. Reproduce or confirm the issue locally when practical. For UI bugs, use the local app and browser verification.
3. Edit with `apply_patch` for manual changes. Keep changes scoped to the requested behavior.
4. Verify with the narrowest reliable checks:
   - `npx tsc --noEmit` for TypeScript changes.
   - `git diff --check` before final.
   - Browser verification for frontend behavior when a local server can run.
   - `npm run build` when appropriate, but note that network-restricted Google Fonts can fail in sandboxed environments.
5. Verify the exact end result the user will see, not only the component or row that was edited. Follow the same click path or direct URL the user mentioned, compare the rendered page against the expected outcome, and keep fixing if the page still shows the wrong thing.
6. Kick the tires before calling work done: reload the relevant local page, check that old bad text/state is gone, check that the intended new text/state is present, and confirm no obvious adjacent action broke.
7. Stop any local dev server started for verification before finishing.
8. Final responses should say what changed, what was verified, what remains local-only, and any approval-gated next step.

## PathForge Repo Notes

- Main browse/search surface: `/paths` implemented mostly in `src/app/browse/page.tsx` and `src/app/browse.css`.
- New project/build intake: `src/app/prompt/new/page.tsx`.
- Project detail route: `src/app/prompt/[id]/page.tsx`.
- Special mounted artifacts include `/snake-demo`, `/decision-matrix-demo`, and `/hp-10bii-calculator-demo`.
- Shared engagement UI lives in `src/components/VoteBookmarkButtons.tsx` and special project engagement in `src/components/ProjectEngagementBar.tsx`.
- Data access and Supabase fallbacks live in `src/lib/data.ts`; server actions live in `src/lib/actions.ts`.
- Supabase schema or policy updates belong in `supabase/*.sql` and stay local until the user approves running them.
- The existing `skills/pathforge-seed-iteration` skill is for generating and submitting seed runs. Use it only for seed/model-session work, not ordinary daily product repair.

## Night-End Commit Workflow

When the user says they are home, ready to review, or wants to commit:

1. Summarize the current local diff by feature area with `git status --short` and targeted `git diff`.
2. Re-run verification that matches the touched areas.
3. Separate unrelated changes into sensible commit groups when possible.
4. Ask for approval before creating commits if scope is unclear. If approval is clear, make local commit(s) with concise messages.
5. Do not push, deploy, or apply production SQL unless the user explicitly approves those actions after reviewing the local state.

## Communication

Keep updates short and concrete. Explain what is being checked, what was found, and what is being changed. Avoid long abstractions, invented product labels, and broad rewrites. The user is often on a phone; optimize for useful progress and clear handoff.
