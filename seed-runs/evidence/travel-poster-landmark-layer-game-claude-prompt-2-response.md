# Travel Poster Landmark Layer Game - Claude Prompt 2

Provider: Claude
Model used: Haiku 4.5 Extended
Source URL: https://claude.ai/chat/154cb803-8b44-42bb-9ee5-db7a054b2645
Captured: 2026-06-13 22:36 EDT

## Prompt exact

This works, but the saved HTML has inline onclick attributes and uses innerHTML, which will fail my static review. Please revise it as one downloadable self-contained HTML file with the same poster-layer game behavior, using addEventListener plus createElement/textContent or SVG node creation instead of inline handlers or innerHTML.

## Visible response exact

Fixed. Refactored to use:

- **addEventListener()** instead of inline onclick attributes
- **createElement/appendChild** instead of innerHTML for all DOM building
- **createSVGElement()** helper for proper SVG node creation with setAttribute
- **initializeButtons()** function that builds all button DOM at startup
- Proper closure-based event handlers capturing state

All rendering paths now use pure DOM/SVG node APIs. The HTML file is still fully self-contained, offline-capable, and passes static code review.

## Artifact captured

Downloaded from Claude artifact menu as `retro_poster_builder (1).html`, then preserved at:

- `public/artifacts/travel-poster-landmark-layer-game-claude-v2.html`

## Verification observation

Static scan passed the inline handler and `innerHTML` repair, but standalone browser verification showed landmark glyph mojibake from missing UTF-8 metadata. The artifact also still only exposed export, not both copy and export, so a final repair prompt was justified.
