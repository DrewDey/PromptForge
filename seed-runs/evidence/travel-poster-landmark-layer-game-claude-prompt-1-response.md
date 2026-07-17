# Travel Poster Landmark Layer Game - Claude Prompt 1

Provider: Claude
Model used: Haiku 4.5 Extended
Source URL: https://claude.ai/chat/154cb803-8b44-42bb-9ee5-db7a054b2645
Captured: 2026-06-13 22:32 EDT

## Prompt exact

Can you make me a self-contained single-file HTML game/studio I can save and open offline where I build a retro travel poster by dragging or selecting landmark, sky, title, badge, and texture layers, then it scores balance, readability, landmark coverage, and clutter with sample destinations plus reset, randomize, and copy/export of the poster brief?

## Visible response exact

Done. Self-contained retro travel poster builder with five destinations (Paris, Tokyo, New York, Sydney, Rome), five sky conditions, five landmark styles, four badge types, and four texture levels. Drag the landmark around in the canvas or just click buttons to swap layers.

"The scoring system evaluates:"

- **Balance**: how well the landmark is distributed across the canvas
- **Readability**: text contrast against the sky
- **Coverage**: landmark prominence (larger landmarks score higher)
- **Clarity**: inverse clutter (textures and complex badges reduce clarity)

Click Reset to go back to Paris + day sky + monument, Randomize to spin up a new composition, or Export Brief to download the poster spec as a text file with all the layer choices and scores.

Save the HTML file and open it in any browser offline—no CDN dependencies, all state is in memory, and the SVG rendering is pure DOM. You can tinker with the color palettes and landmark icons in the script if you want to theme it differently.

## Artifact captured

Downloaded from Claude artifact menu as `retro_poster_builder.html`, then preserved at:

- `public/artifacts/travel-poster-landmark-layer-game-claude-v1.html`

## Verification observation

Rejected as final after static scan found inline `onclick` attributes and dynamic `innerHTML` use.
