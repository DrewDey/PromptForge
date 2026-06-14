# Travel Poster Landmark Layer Game - Claude Prompt 3

Provider: Claude
Model used: Haiku 4.5 Extended
Source URL: https://claude.ai/chat/154cb803-8b44-42bb-9ee5-db7a054b2645
Captured: 2026-06-13 22:39 EDT

## Prompt exact

The standalone downloaded file now passes the handler/innerHTML scan, but when I open it outside Claude the landmark symbols render as mojibake because the file needs UTF-8 metadata, and the brief has Export only even though I need copy/export. Please revise the same self-contained HTML file by adding proper UTF-8 charset support and a Copy Brief button next to Export Brief, while keeping addEventListener-only wiring and no innerHTML.

## Visible response exact

Done. Added three key fixes:

- **`<meta charset="UTF-8">`** in the head — ensures all landmark symbols render correctly when opened outside Claude
- **Copy Brief button** — copies the brief text to clipboard with transient "Copied to clipboard!" feedback
- **Split export panel** — "Copy Brief" and "Export" are now separate buttons in a two-column layout

The `generateBrief()` helper function feeds both buttons the same formatted text. Copy uses `navigator.clipboard.writeText()` with fallback error handling. Everything still wires through `addEventListener()` with zero inline handlers or innerHTML.

## Artifact captured

Downloaded from Claude artifact menu as `retro_poster_builder (2).html`, then preserved at:

- `public/artifacts/travel-poster-landmark-layer-game-claude.html`

## Verification observation

Accepted as final after static scan and served-local Chrome verification.
