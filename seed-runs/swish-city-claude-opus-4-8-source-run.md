# Swish City Timing Hoops Source Run

## Status

- Status: submitted to PathForge source-run intake, queued for review
- Source-run submission id: `f3918d0e-5261-4600-b1da-45199e38b224`
- Admin detail URL: https://prompt-forge-sandy.vercel.app/admin/source-runs/f3918d0e-5261-4600-b1da-45199e38b224
- Submitted profile: `pathforge-seed-008`, Eli Harper, `/user/EliHarper`
- Submission command: `node scripts/import-pathforge-source-run.mjs --package seed-runs/swish-city-claude-opus-4-8-source-run.json --username EliHarper --displayName "Eli Harper" --auth-mode public-signup`
- Intended PathForge path: source-run intake only, no public prompt page, no approval, no votes/comments/forks.

## Reference Identification

- Identified game: Megatouch Hoop Jones
- Confidence: high
- User confirmation: user provided a screenshot matching Hoop Jones and said, "This is the game im imagining btw i think you got it right."
- Evidence:
  - Arcade History's Megatouch XL page says Hoop Jones challenges timing each shot, awards lightning bonus points after three consecutive baskets, and moves the basket farther away each round while shifting side to side.
  - Iphonetech78's Hoop Jones review says the game has four persons shooting, requires quick reflexes/aiming, uses airball language, and the basket becomes farther away as levels progress.
  - TouchArcade's Megatouch Hoop Jones listing describes a fast-paced basketball skill game where the ball is in your hands and asks whether you will throw an air ball or hit nothing but net.
- Source links:
  - https://www.arcade-history.com/?id=33445&n=megatouch-xl&page=detail
  - https://iphonetech78.wordpress.com/2009/04/26/hoop-jones-game-review/
  - https://toucharcade.com/games/megatouch-hoop-jones

## Claude Run

- Provider: Claude
- Model/settings observed before prompt 1: `Model: Opus 4.8 Max`; model menu showed `Opus 4.8` and `Effort Max`; effort submenu exposed a `Thinking` switch.
- Recovery note: Prompt 1 on Max/Thinking failed before producing HTML. Prompt 2 returned no useful visible response. Before prompt 3, the only visible Thinking switch was toggled for recovery, but the composer still displayed `Opus 4.8 Max`.
- Claude session URL: https://claude.ai/chat/63c97ec5-905b-4c88-8267-0d19b0e6e9bb
- Share-link blocker: Browser policy rejected using `https://claude.ai` after the run, so no public Claude share link was created. The private Claude chat URL above is the real AI session URL captured from the active run.

## Exact Prompts

### Prompt 1

```text
Make me a single-file browser arcade basketball game inspired by Megatouch Hoop Jones, without using its name, branding, or copyrighted art. Core loop: the ball moves back and forth across hands/players, the player clicks/taps at the right timing to shoot, the action moves left to right through multiple shooters, each round starts close to the hoop and then backs up farther, misses get arcade callouts like BRICK and AIRBALL, and three makes trigger a lightning/backboard bonus for extra points. Keep it family-safe, polished, and playable in one HTML file.
```

### Prompt 2

```text
Claude couldn't finish that response before producing the file. Please continue by outputting one complete, working single-file HTML game now. Keep the Hoop-Jones-inspired mechanics: four shooters across the bottom, ball timing across hands, click/tap to shoot, round-by-round distance increase, BRICK/AIRBALL/SWISH callouts, and a lightning backboard bonus after three makes. Please put the entire artifact in one html code block and skip further planning.
```

### Prompt 3

```text
Please output ONLY a complete single-file HTML document now, no explanation before or after. It must be playable: four red-jersey shooters across the bottom, a basketball timing sweep across their hands, click/tap/space to shoot, hoop/backboard at the top, rounds that move the shooters farther away, SWISH/BRICK/AIRBALL callouts, and a lightning backboard bonus after 3 makes. Use plain canvas/JS/CSS in one file.
```

## Exact Responses

- Response 1: Claude began an extended visible reasoning/planning response and failed before producing an HTML artifact. The UI showed "Claude couldn't finish this response. Try again in a moment."
- Response 2: no usable visible assistant response or code block was returned.
- Response 3: exact HTML code block saved verbatim at `public/artifacts/swish-city-claude-opus-4-8.html`.

## Artifact

- Final artifact path: `public/artifacts/swish-city-claude-opus-4-8.html`
- Artifact type: single-file HTML canvas game
- Mechanics present in saved file:
  - four shooters
  - click/tap/space timing shot
  - ball sweep across hands
  - round-by-round distance progression
  - SWISH/BRICK/AIRBALL callouts
  - lightning/backboard bonus after streaks
  - family-safe fictional title and art

## Verification

- Browser smoke test passed on continuation:
  - Local preview URL: `http://127.0.0.1:8079/swish-city-claude-opus-4-8.html`
  - Start screen rendered with four shooters, hoop/backboard, Swish City title, and timing instructions.
  - Click entered Round 1 gameplay.
  - Second click interacted with the shooting loop.
  - Browser console error logs were empty.
- Earlier browser verification blocker, now resolved:
  - Direct `file://` load was blocked by the in-app browser URL policy.
  - Local preview server command initially failed in sandbox with `PermissionError: [Errno 1] Operation not permitted`.
  - Escalated local preview server request was initially rejected while usage was unavailable.
- Static verification passed:
  - Extracted JavaScript compiled with `vm.Script`.
  - HTML contains `<canvas id="c">`.
  - HTML contains `const SHOOTERS = 4`.
  - HTML contains `triggerLightning`.
  - HTML contains `BRICK!`, `AIRBALL!`, and `SWISH!`.

## PathForge Submission

- Submitted: yes
- Source-run submission id: `f3918d0e-5261-4600-b1da-45199e38b224`
- Admin URL: https://prompt-forge-sandy.vercel.app/admin/source-runs/f3918d0e-5261-4600-b1da-45199e38b224
- Profile registry id/username used: `pathforge-seed-008` / `EliHarper`
- Import result: queued source-run intake only. No public prompt/project page was created, approved, published, upvoted, commented on, or forked.
- Admin detail verification: page showed `PENDING SOURCE-RUN REVIEW`, title `Swish City Timing Hoops`, submitted by Eli Harper, the Claude session link, and agent notes. The detail text did not contain `Public page published`, `View public page`, or `Prepared public page`.
- Admin queue verification: `/admin?tab=pending` showed the row as `Source run`, `queued`, author `Eli Harper`, with the title and Claude session URL.
