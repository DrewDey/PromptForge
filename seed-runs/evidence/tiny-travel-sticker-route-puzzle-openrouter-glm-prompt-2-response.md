# Tiny Travel Sticker Route Puzzle - Prompt 2 Response

Source URL: https://openrouter.ai/chat?room=orc-1781408032-1BiJAFkeHopU6LmJv1L0

## Prompt exact

The game is close, but the HTML uses innerHTML in several render paths, including route and sticker/card rendering. Please return a complete replacement single-file HTML that keeps the same game but uses createElement/textContent/setAttribute only for dynamic DOM updates, with no innerHTML, no inline event handlers, and no alert/confirm/prompt calls.

## Response exact

10 minutes ago
GLM 5.1
Reasoning

Here is the complete, single-file HTML replacement. It maintains the same gameplay and visual style but strictly uses createElement, textContent, and setAttribute for all dynamic DOM construction, with no innerHTML, no inline event handlers, and no blocking dialogs.

html
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">

<title>Postcard Route Puzzle</title>

<style>

  :root {

    --paper: #f5e6c8;

    --paper-dark: #e8d4a8;

    --ink: #3d2b1f;

    --ink-light: #7a6248;

    --route: #c4713b;

    --accent: #b8342e;

    --stamp: #2e6b4f;

    --gold: #c9a227;

    --ocean: #5b8fa8;

  }



  * { margin: 0; padding: 0; box-sizing: border-box; }



  body {

    font-family: 'Georgia', 'Palatino', serif;

    background: #2a1f14;

    overflow: hidden;

    height: 100vh;

    width: 100vw;

    display: flex;

    align-items: center;

    justify-content: center;

    touch-action: none;

    -webkit-user-select: none;

    user-select: none;

  }



  /* Postcard Frame */

  .postcard {

    width: min(96vw, 860px);

    height: min(92vh, 640px);

    background: var(--paper);

    border-radius: 6px;

    box-shadow: 

      0 2px 20px rgba(0,0,0,0.5),

      inset 0 0 80px rgba(139,109,71,0.2);

    position: relative;

    overflow: hidden;

    display: grid;

    grid-template-columns: 1fr 260px;

    grid-template-rows: auto 1fr;

  }



  /* Postmark Decoration */

  .postmark {

    position: absolute;

    top: -20px;

    right: 40px;

    width: 120px;

    height: 120px;

    border: 3px solid rgba(180,60,50,0.15);

    border-radius: 50%;

    transform: rotate(-15deg);

    pointer-events: none;

    z-index: 0;

  }

  .postmark::after {

    content: 'AIRMAIL';

    position: absolute;

    top: 50%;

    left: 50%;

    transform: translate(-50%, -50%);

    font-size: 11px;

    letter-spacing: 3px;

    color: rgba(180,60,50,0.15);

    font-weight: bold;

  }



  /* Header */

  .header {

    grid-column: 1 / -1;

    padding: 14px 24px 10px;

    border-bottom: 2px solid var(--paper-dark);

    display: flex;

    align-items: center;

    justify-content: space-between;

    position: relative;

    z-index: 2;

  }

  .header h1 {

    font-size: 20px;

    color: var(--ink);

    font-weight: normal;

    letter-spacing: 1px;

  }

  .header-actions {

    display: flex;

    gap: 10px;

    align-items: center;

  }

  .btn {

    background: var(--ink);

    color: var(--paper);

    border: none;

    padding: 5px 14px;

    font-family: inherit;

    font-size: 12px;

    border-radius: 3px;

    cursor: pointer;

    letter-spacing: 0.5px;

    transition: opacity 0.2s;

  }

  .btn:hover { opacity: 0.85; }

  .btn-sm { padding: 4px 10px; font-size: 11px; }

  .status-text {

    font-size: 12px;

    color: var(--ink-light);

    font-style: italic;

  }



  /* Map Area */

  .map-area {

    position: relative;

    padding: 20px;

    overflow: hidden;

  }



  /* Ocean patches */

  .ocean-patch {

    position: absolute;

    background: var(--ocean);

    opacity: 0.2;

    border-radius: 40% 50% 45% 55%;

    pointer-events: none;

  }



  /* Route Path (SVG) */

  .route-svg {

    position: absolute;

    top: 0; left: 0;

    width: 100%; height: 100%;

    pointer-events: none;

    z-index: 1;

  }

  .route-line {

    fill: none;

    stroke: var(--route);

    stroke-width: 3;

    stroke-dasharray: 8 4;

    stroke-linecap: round;

    opacity: 0.6;

  }



  /* Stops */

  .stop {

    position: absolute;

    width: 72px;

    height: 72px;

    transform: translate(-50%, -50%);

    z-index: 3;

    cursor: pointer;

    transition: transform 0.15s;

  }

  .stop:hover { transform: translate(-50%, -50%) scale(1.06); }

  .stop.highlight {

    transform: translate(-50%, -50%) scale(1.1);

  }

  .stop-ring {

    position: absolute;

    inset: 0;

    border: 2.5px dashed var(--route);

    border-radius: 50%;

    background: rgba(245,230,200,0.7);

    transition: all 0.2s;

  }

  .stop.has-sticker .stop-ring {

    border-style: solid;

    border-color: var(--stamp);

    background: rgba(46,107,79,0.08);

  }

  .stop.wrong .stop-ring {

    border-color: var(--accent);

    background: rgba(184,52,46,0.1);

    animation: shake 0.4s;

  }

  .stop-number {

    position: absolute;

    top: -8px;

    left: -8px;

    width: 22px;

    height: 22px;

    background: var(--ink);

    color: var(--paper);

    border-radius: 50%;

    font-size: 11px;

    display: flex;

    align-items: center;

    justify-content: center;

    font-weight: bold;

    z-index: 2;

  }

  .stop-label {

    position: absolute;

    bottom: -18px;

    left: 50%;

    transform: translateX(-50%);

    font-size: 10px;

    color: var(--ink-light);

    white-space: nowrap;

    font-style: italic;

  }



  /* Placed sticker in stop */

  .placed-sticker {

    position: absolute;

    inset: 4px;

    display: flex;

    align-items: center;

    justify-content: center;

    font-size: 32px;

    transition: transform 0.2s;

    cursor: grab;

  }

  .placed-sticker:active { cursor: grabbing; }

  .placed-sticker.pop {

    animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  }



  /* Sidebar */

  .sidebar {

    border-left: 2px solid var(--paper-dark);

    display: flex;

    flex-direction: column;

    overflow: hidden;

  }



  /* Sticker Tray */

  .sticker-tray {

    padding: 12px;

    border-bottom: 2px solid var(--paper-dark);

  }

  .sticker-tray h2 {

    font-size: 13px;

    color: var(--ink);

    margin-bottom: 8px;

    font-weight: bold;

    letter-spacing: 0.5px;

    text-transform: uppercase;

  }

  .stickers-grid {

    display: grid;

    grid-template-columns: 1fr 1fr;

    gap: 6px;

  }

  .sticker {

    background: rgba(255,255,255,0.6);

    border: 1.5px solid var(--paper-dark);

    border-radius: 6px;

    padding: 6px 4px;

    display: flex;

    flex-direction: column;

    align-items: center;

    gap: 3px;

    cursor: grab;

    transition: all 0.15s;

    position: relative;

  }

  .sticker:hover {

    background: rgba(255,255,255,0.9);

    transform: translateY(-2px);

    box-shadow: 0 3px 8px rgba(0,0,0,0.12);

  }

  .sticker:active { cursor: grabbing; }

  .sticker.placed {

    opacity: 0.25;

    pointer-events: none;

    transform: scale(0.95);

  }

  .sticker-emoji { font-size: 26px; }

  .sticker-name {

    font-size: 9px;

    color: var(--ink-light);

    text-align: center;

    line-height: 1.1;

  }



  /* Clue Cards */

  .clue-panel {

    flex: 1;

    padding: 12px;

    overflow-y: auto;

  }

  .clue-panel h2 {

    font-size: 13px;

    color: var(--ink);

    margin-bottom: 8px;

    font-weight: bold;

    letter-spacing: 0.5px;

    text-transform: uppercase;

  }

  .clue-card {

    background: rgba(255,255,255,0.55);

    border: 1px solid var(--paper-dark);

    border-radius: 5px;

    padding: 8px 10px;

    margin-bottom: 6px;

    font-size: 12px;

    color: var(--ink);

    line-height: 1.45;

    position: relative;

    transition: all 0.2s;

  }

  .clue-card::before {

    content: '';

    position: absolute;

    top: 4px;

    left: 4px;

    width: 8px;

    height: 8px;

    background: var(--gold);

    border-radius: 50%;

    opacity: 0.4;

  }

  .clue-card.satisfied {

    background: rgba(46,107,79,0.1);

    border-color: var(--stamp);

  }

  .clue-card.satisfied::before {

    background: var(--stamp);

    opacity: 0.7;

  }



  /* Drag ghost */

  .drag-ghost {

    position: fixed;

    pointer-events: none;

    z-index: 1000;

    font-size: 48px;

    transform: translate(-50%, -50%);

    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));

    transition: none;

  }



  /* Win overlay */

  .win-overlay {

    position: absolute;

    inset: 0;

    background: rgba(42,31,20,0.85);

    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center;

    z-index: 100;

    opacity: 0;

    pointer-events: none;

    transition: opacity 0.5s;

  }

  .win-overlay.show {

    opacity: 1;

    pointer-events: auto;

  }

  .win-title {

    font-size: 36px;

    color: var(--gold);

    margin-bottom: 8px;

    letter-spacing: 3px;

    text-transform: uppercase;

  }

  .win-sub {

    font-size: 16px;

    color: var(--paper);

    margin-bottom: 24px;

    font-style: italic;

  }

  .win-stamps {

    display: flex;

    gap: 12px;

    margin-bottom: 28px;

  }

  .win-stamp {

    width: 50px;

    height: 50px;

    background: var(--paper);

    border-radius: 50%;

    display: flex;

    align-items: center;

    justify-content: center;

    font-size: 28px;

    animation: float 2s ease-in-out infinite;

  }

  .win-stamp:nth-child(2) { animation-delay: 0.2s; }

  .win-stamp:nth-child(3) { animation-delay: 0.4s; }

  .win-stamp:nth-child(4) { animation-delay: 0.6s; }



  /* Level indicator */

  .level-badge {

    font-size: 11px;

    background: var(--ink);

    color: var(--paper);

    padding: 2px 8px;

    border-radius: 2px;

    letter-spacing: 0.5px;

  }



  /* Animations */

  @keyframes shake {

    0%, 100% { transform: translate(-50%, -50%) translateX(0); }

    25% { transform: translate(-50%, -50%) translateX(-4px); }

    75% { transform: translate(-50%, -50%) translateX(4px); }

  }

  @keyframes popIn {

    0% { transform: scale(0.5); }

    100% { transform: scale(1); }

  }

  @keyframes float {

    0%, 100% { transform: translateY(0); }

    50% { transform: translateY(-6px); }

  }



  /* Stamp decorations on postcard edges */

  .corner-stamp {

    position: absolute;

    width: 40px;

    height: 40px;

    opacity: 0.08;

    pointer-events: none;

    z-index: 0;

  }

  .corner-stamp.tl { top: 8px; left: 8px; }

  .corner-stamp.tr { top: 8px; right: 8px; transform: scaleX(-1); }

  .corner-stamp.bl { bottom: 8px; left: 8px; transform: scaleY(-1); }

  .corner-stamp.br { bottom: 8px; right: 8px; transform: scale(-1); }



  /* Responsive */

  @media (max-width: 700px) {

    .postcard {

      grid-template-columns: 1fr;

      grid-template-rows: auto 1fr auto;

      width: 98vw;

      height: 98vh;

    }

    .sidebar {

      border-left: none;

      border-top: 2px solid var(--paper-dark);

      flex-direction: row;

      max-height: 200px;

    }

    .sticker-tray { border-bottom: none; border-right: 2px solid var(--paper-dark); }

    .clue-panel { overflow-y: auto; }

  }

</style>

</head>

<body>



<div class="postcard" id="postcard">

  <div class="postmark"></div>

  

  <!-- Corner stamps (decorative) -->

  <svg class="corner-stamp tl" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="M20 8 L20 32 M8 20 L32 20" stroke="currentColor" stroke-width="1.5"></path></svg>

  <svg class="corner-stamp tr" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="M20 8 L20 32 M8 20 L32 20" stroke="currentColor" stroke-width="1.5"></path></svg>



  <!-- Header -->

  <div class="header">

    <h1>&#9993; Route Puzzle</h1>

    <div class="header-actions">

      <span class="level-badge" id="levelBadge">Puzzle 1</span>

      <span class="status-text" id="statusText">Place all stickers</span>

      <button class="btn btn-sm" id="resetBtn">Reset</button>

      <button class="btn btn-sm" id="nextBtn" style="display:none;">Next &rarr;</button>

    </div>

  </div>



  <!-- Map Area -->

  <div class="map-area" id="mapArea">

    <!-- Ocean patches for atmosphere -->

    <div class="ocean-patch" style="width:160px;height:100px;bottom:10px;left:10px;"></div>

    <div class="ocean-patch" style="width:120px;height:80px;top:20px;right:20px;border-radius:50% 40% 55% 45%;"></div>

    

    <!-- Route SVG path will be drawn here -->

    <svg class="route-svg" id="routeSvg"></svg>

    

    <!-- Stops will be injected here -->

  </div>



  <!-- Sidebar -->

  <div class="sidebar">

    <div class="sticker-tray">

      <h2>Stickers</h2>

      <div class="stickers-grid" id="stickersGrid"></div>

    </div>

    <div class="clue-panel" id="cluePanel">

      <h2>Clue Cards</h2>

      <div id="clueCards"></div>

    </div>

  </div>



  <!-- Win Overlay -->

  <div class="win-overlay" id="winOverlay">

    <div class="win-title">Route Complete!</div>

    <div class="win-sub">All landmarks placed correctly</div>

    <div class="win-stamps" id="winStamps"></div>

    <button class="btn" id="winNextBtn">Next Puzzle &rarr;</button>

  </div>

</div>



<!-- Drag ghost element -->

<div class="drag-ghost" id="dragGhost" style="display:none;"></div>



<script>

// ============================================

// PUZZLE DATA

// ============================================

const PUZZLES = [

  {

    name: "Mediterranean Tour",

    stops: [

      { id: 1, x: 14, y: 18, label: "Lisbon" },

      { id: 2, x: 30, y: 35, label: "Madrid" },

      { id: 3, x: 52, y: 22, label: "Rome" },

      { id: 4, x: 70, y: 42, label: "Athens" },

      { id: 5, x: 55, y: 62, label: "Cairo" },

      { id: 6, x: 78, y: 72, label: "Istanbul" }

    ],

    stickers: [

      { id: "pyramids", name: "Pyramids", emoji: "🏛️" },

      { id: "colosseum", name: "Colosseum", emoji: "🏟️" },

      { id: "tower", name: "Eiffel Tower", emoji: "🗼" },

      { id: "bigben", name: "Big Ben", emoji: "🕰️" },

      { id: "taj", name: "Taj Mahal", emoji: "🕌" },

      { id: "liberty", name: "Statue of Liberty", emoji: "🗽" }

    ],

    clues: [

      { text: "The Pyramids belong at stop 5 — the gateway to Cairo.", check: (p) => p[5] === "pyramids" },

      { text: "The Colosseum is exactly 1 stop before the Eiffel Tower.", check: (p) => { let c=Object.entries(p).find(([k,v])=>v==="colosseum"); let e=Object.entries(p).find(([k,v])=>v==="tower"); return c && e && +e[0] - +c[0] === 1; }},

      { text: "Big Ben is not next to the Eiffel Tower.", check: (p) => { let b=Object.entries(p).find(([k,v])=>v==="bigben"); let e=Object.entries(p).find(([k,v])=>v==="tower"); return b && e && Math.abs(+b[0] - +e[0]) > 1; }},

      { text: "The Taj Mahal rests at an even-numbered stop.", check: (p) => { let t=Object.entries(p).find(([k,v])=>v==="taj"); return t && +t[0] % 2 === 0; }},

      { text: "The Statue of Liberty is adjacent to the Taj Mahal.", check: (p) => { let l=Object.entries(p).find(([k,v])=>v==="liberty"); let t=Object.entries(p).find(([k,v])=>v==="taj"); return l && t && Math.abs(+l[0] - +t[0]) === 1; }},

      { text: "The Colosseum is not at stop 6.", check: (p) => { let c=Object.entries(p).find(([k,v])=>v==="colosseum"); return c && +c[0] !== 6; }}

    ]

  },

  {

    name: "Nordic Voyage",

    stops: [

      { id: 1, x: 20, y: 72, label: "Edinburgh" },

      { id: 2, x: 38, y: 55, label: "Oslo" },

      { id: 3, x: 58, y: 30, label: "Stockholm" },

      { id: 4, x: 42, y: 18, label: "Helsinki" },

      { id: 5, x: 75, y: 25, label: "Tallinn" },

      { id: 6, x: 82, y: 55, label: "Riga" },

      { id: 7, x: 65, y: 75, label: "Gdansk" }

    ],

    stickers: [

      { id: "castle", name: "Castle", emoji: "🏰" },

      { id: "fjord", name: "Fjord", emoji: "🏔️" },

      { id: "ship", name: "Viking Ship", emoji: "⛵" },

      { id: "aurora", name: "Aurora", emoji: "🌌" },

      { id: "lighthouse", name: "Lighthouse", emoji: "🏗️" },

      { id: "church", name: "Stave Church", emoji: "⛪" },

      { id: "fish", name: "Fish Market", emoji: "🐟" }

    ],

    clues: [

      { text: "The Fjord is at stop 2 — Oslo's pride.", check: (p) => p[2] === "fjord" },

      { text: "The Viking Ship sails 2 stops after the Castle.", check: (p) => { let c=Object.entries(p).find(([k,v])=>v==="castle"); let s=Object.entries(p).find(([k,v])=>v==="ship"); return c && s && +s[0] - +c[0] === 2; }},

      { text: "The Aurora shines at an odd-numbered stop north of stop 4.", check: (p) => { let a=Object.entries(p).find(([k,v])=>v==="aurora"); return a && +a[0] % 2 === 1 && +a[0] < 5; }},

      { text: "The Lighthouse and Fish Market are at the two ends of the route.", check: (p) => { let l=Object.entries(p).find(([k,v])=>v==="lighthouse"); let f=Object.entries(p).find(([k,v])=>v==="fish"); return l && f && ((+l[0]===1 && +f[0]===7) || (+l[0]===7 && +f[0]===1)); }},

      { text: "The Stave Church is next to the Fjord.", check: (p) => { let c=Object.entries(p).find(([k,v])=>v==="church"); let f=Object.entries(p).find(([k,v])=>v==="fjord"); return c && f && Math.abs(+c[0] - +f[0]) === 1; }},

      { text: "The Castle is not at stop 1.", check: (p) => { let c=Object.entries(p).find(([k,v])=>v==="castle"); return c && +c[0] !== 1; }},

      { text: "The Fish Market is at stop 7.", check: (p) => p[7] === "fish" }

    ]

  },

  {

    name: "Asian Express",

    stops: [

      { id: 1, x: 12, y: 45, label: "Mumbai" },

      { id: 2, x: 32, y: 30, label: "Delhi" },

      { id: 3, x: 55, y: 18, label: "Kathmandu" },

      { id: 4, x: 75, y: 35, label: "Bangkok" },

      { id: 5, x: 60, y: 58, label: "Singapore" },

      { id: 6, x: 35, y: 72, label: "Bali" },

      { id: 7, x: 82, y: 68, label: "Tokyo" },

      { id: 8, x: 85, y: 15, label: "Seoul" }

    ],

    stickers: [

      { id: "temple", name: "Temple", emoji: "⛩️" },

      { id: "elephant", name: "Elephant", emoji: "🐘" },

      { id: "dragon", name: "Dragon Gate", emoji: "🐉" },

      { id: "lotus", name: "Lotus Garden", emoji: "🪷" },

      { id: "lantern", name: "Lanterns", emoji: "🏮" },

      { id: "wave", name: "Wave Temple", emoji: "🌊" },

      { id: "spice", name: "Spice Market", emoji: "🫖" },

      { id: "yak", name: "Yak Lodge", emoji: "🦬" }

    ],

    clues: [

      { text: "The Spice Market opens at stop 1 in Mumbai.", check: (p) => p[1] === "spice" },

      { text: "The Lotus Garden is 3 stops after the Spice Market.", check: (p) => { let s=Object.entries(p).find(([k,v])=>v==="spice"); let l=Object.entries(p).find(([k,v])=>v==="lotus"); return s && l && +l[0] - +s[0] === 3; }},

      { text: "The Elephant and Dragon Gate are adjacent, but neither is at stop 3.", check: (p) => { let e=Object.entries(p).find(([k,v])=>v==="elephant"); let d=Object.entries(p).find(([k,v])=>v==="dragon"); return e && d && Math.abs(+e[0] - +d[0]) === 1 && +e[0] !== 3 && +d[0] !== 3; }},

      { text: "The Lanterns are at an even-numbered stop east of stop 4.", check: (p) => { let l=Object.entries(p).find(([k,v])=>v==="lantern"); return l && +l[0] % 2 === 0 && +l[0] > 4; }},

      { text: "The Wave Temple sits at stop 7, facing the Pacific.", check: (p) => p[7] === "wave" },

      { text: "The Yak Lodge is next to Kathmandu (stop 3).", check: (p) => { let y=Object.entries(p).find(([k,v])=>v==="yak"); return y && Math.abs(+y[0] - 3) === 1; }},

      { text: "The Temple is not at stop 8.", check: (p) => { let t=Object.entries(p).find(([k,v])=>v==="temple"); return t && +t[0] !== 8; }},

      { text: "The Dragon Gate is at a stop numbered lower than the Elephant.", check: (p) => { let d=Object.entries(p).find(([k,v])=>v==="dragon"); let e=Object.entries(p).find(([k,v])=>v==="elephant"); return d && e && +d[0] < +e[0]; }}

    ]

  }

];



// ============================================

// GAME STATE

// ============================================

let currentPuzzleIndex = 0;

let placements = {};  // stopId -> stickerId

let dragData = null;



// ============================================

// DOM REFERENCES

// ============================================

const mapArea = document.getElementById('mapArea');

const routeSvg = document.getElementById('routeSvg');

const stickersGrid = document.getElementById('stickersGrid');

const clueCards = document.getElementById('clueCards');

const statusText = document.getElementById('statusText');

const levelBadge = document.getElementById('levelBadge');

const resetBtn = document.getElementById('resetBtn');

const nextBtn = document.getElementById('nextBtn');

const winOverlay = document.getElementById('winOverlay');

const winStamps = document.getElementById('winStamps');

const winNextBtn = document.getElementById('winNextBtn');

const dragGhost = document.getElementById('dragGhost');



// ============================================

// HELPER FUNCTIONS

// ============================================

function clearElement(el) {

  while (el.firstChild) {

    el.removeChild(el.firstChild);

  }

}



// ============================================

// INIT PUZZLE

// ============================================

function loadPuzzle(index) {

  const puzzle = PUZZLES[index];

  currentPuzzleIndex = index;

  placements = {};

  

  levelBadge.textContent = 'Puzzle ' + (index + 1);

  statusText.textContent = 'Place all stickers';

  nextBtn.style.display = 'none';

  winOverlay.classList.remove('show');

  

  // Clear only dynamic stops from map

  const existingStops = mapArea.querySelectorAll('.stop');

  existingStops.forEach(s => s.remove());

  

  // Draw route

  drawRoute(puzzle.stops);

  

  // Create stops

  puzzle.stops.forEach(stop => {

    const el = document.createElement('div');

    el.className = 'stop';

    el.setAttribute('data-stop-id', stop.id);

    el.style.left = stop.x + '%';

    el.style.top = stop.y + '%';

    

    const ring = document.createElement('div');

    ring.className = 'stop-ring';

    

    const num = document.createElement('div');

    num.className = 'stop-number';

    num.textContent = stop.id;

    

    const label = document.createElement('div');

    label.className = 'stop-label';

    label.textContent = stop.label;

    

    el.appendChild(ring);

    el.appendChild(num);

    el.appendChild(label);

    mapArea.appendChild(el);

    

    // Drop events on stop

    el.addEventListener('pointerup', onStopPointerUp);

  });

  

  // Create stickers

  clearElement(stickersGrid);

  puzzle.stickers.forEach(sticker => {

    const el = document.createElement('div');

    el.className = 'sticker';

    el.setAttribute('data-sticker-id', sticker.id);

    

    const emojiSpan = document.createElement('span');

    emojiSpan.className = 'sticker-emoji';

    emojiSpan.textContent = sticker.emoji;

    

    const nameSpan = document.createElement('span');

    nameSpan.className = 'sticker-name';

    nameSpan.textContent = sticker.name;

    

    el.appendChild(emojiSpan);

    el.appendChild(nameSpan);

    stickersGrid.appendChild(el);

    

    // Drag start from tray

    el.addEventListener('pointerdown', (e) => startDrag(e, sticker));

  });

  

  // Create clue cards

  clearElement(clueCards);

  puzzle.clues.forEach((clue, i) => {

    const el = document.createElement('div');

    el.className = 'clue-card';

    el.setAttribute('data-clue-index', i);

    el.textContent = clue.text;

    clueCards.appendChild(el);

  });

}



// ============================================

// DRAW ROUTE

// ============================================

function drawRoute(stops) {

  clearElement(routeSvg);

  const points = stops.map(s => s.x + ',' + s.y).join(' ');

  

  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');

  polyline.setAttribute('class', 'route-line');

  polyline.setAttribute('points', points);

  routeSvg.appendChild(polyline);

}



// ============================================

// DRAG & DROP

// ============================================

function startDrag(e, sticker) {

  e.preventDefault();

  

  // If already placed, remove from stop first

  const existingStop = Object.entries(placements).find(([k,v]) => v === sticker.id);

  if (existingStop) {

    const stopEl = mapArea.querySelector('[data-stop-id="' + existingStop[0] + '"]');

    if (stopEl) {

      stopEl.classList.remove('has-sticker');

      const placed = stopEl.querySelector('.placed-sticker');

      if (placed) placed.remove();

    }

    delete placements[existingStop[0]];

  }

  

  // Update sticker tray

  const trayEl = stickersGrid.querySelector('[data-sticker-id="' + sticker.id + '"]');

  if (trayEl) trayEl.classList.remove('placed');

  

  // Create ghost

  dragData = { sticker: sticker, fromTray: !existingStop, fromStop: existingStop ? existingStop[0] : null };

  dragGhost.textContent = sticker.emoji;

  dragGhost.style.display = 'block';

  moveGhost(e);

  

  document.addEventListener('pointermove', onDragMove);

  document.addEventListener('pointerup', onDragEnd);

}



function moveGhost(e) {

  const x = e.clientX || (e.touches && e.touches[0].clientX);

  const y = e.clientY || (e.touches && e.touches[0].clientY);

  if (x !== undefined) {

    dragGhost.style.left = x + 'px';

    dragGhost.style.top = y + 'px';

  }

}



function onDragMove(e) {

  e.preventDefault();

  moveGhost(e);

  

  // Highlight nearest stop

  const stops = mapArea.querySelectorAll('.stop');

  stops.forEach(s => s.classList.remove('highlight'));

  

  const nearest = getNearestStop(e);

  if (nearest) nearest.classList.add('highlight');

}



function onDragEnd(e) {

  document.removeEventListener('pointermove', onDragMove);

  document.removeEventListener('pointerup', onDragEnd);

  

  dragGhost.style.display = 'none';

  

  // Remove highlights

  mapArea.querySelectorAll('.stop').forEach(s => s.classList.remove('highlight'));

  

  if (!dragData) return;

  

  const targetStop = getNearestStop(e);

  

  if (targetStop) {

    const stopId = +targetStop.getAttribute('data-stop-id');

    placeSticker(dragData.sticker, stopId, targetStop);

  }

  

  dragData = null;

  checkClues();

}



function onStopPointerUp(e) {

  // If we're dragging and release on a stop

  if (dragData) return; // handled by onDragEnd

  

  // If there's a sticker on this stop, pick it up

  const stopEl = e.currentTarget;

  const stopId = +stopEl.getAttribute('data-stop-id');

  const stickerId = placements[stopId];

  

  if (stickerId) {

    const puzzle = PUZZLES[currentPuzzleIndex];

    const sticker = puzzle.stickers.find(s => s.id === stickerId);

    

    // Remove from stop

    stopEl.classList.remove('has-sticker');

    const placed = stopEl.querySelector('.placed-sticker');

    if (placed) placed.remove();

    delete placements[stopId];

    

    // Update tray

    const trayEl = stickersGrid.querySelector('[data-sticker-id="' + stickerId + '"]');

    if (trayEl) trayEl.classList.remove('placed');

    

    // Start dragging

    startDrag(e, sticker);

  }

}



function getNearestStop(e) {

  const x = e.clientX || (e.touches && e.touches[0].clientX);

  const y = e.clientY || (e.touches && e.touches[0].clientY);

  if (x === undefined) return null;

  

  let nearest = null;

  let minDist = 50; // max snap distance

  

  mapArea.querySelectorAll('.stop').forEach(stopEl => {

    const rect = stopEl.getBoundingClientRect();

    const cx = rect.left + rect.width / 2;

    const cy = rect.top + rect.height / 2;

    const dist = Math.hypot(x - cx, y - cy);

    if (dist < minDist) {

      minDist = dist;

      nearest = stopEl;

    }

  });

  

  return nearest;

}



// ============================================

// PLACE STICKER

// ============================================

function placeSticker(sticker, stopId, stopEl) {

  // If stop already has a sticker, return it to tray

  const existingStickerId = placements[stopId];

  if (existingStickerId) {

    const existingTrayEl = stickersGrid.querySelector('[data-sticker-id="' + existingStickerId + '"]');

    if (existingTrayEl) existingTrayEl.classList.remove('placed');

    

    const existingPlaced = stopEl.querySelector('.placed-sticker');

    if (existingPlaced) existingPlaced.remove();

  }

  

  // Place new sticker

  placements[stopId] = sticker.id;

  

  stopEl.classList.add('has-sticker');

  stopEl.classList.remove('wrong');

  

  const placedEl = document.createElement('div');

  placedEl.className = 'placed-sticker pop';

  placedEl.textContent = sticker.emoji;

  stopEl.appendChild(placedEl);

  

  // Mark sticker as placed in tray

  const trayEl = stickersGrid.querySelector('[data-sticker-id="' + sticker.id + '"]');

  if (trayEl) trayEl.classList.add('placed');

}



// ============================================

// CHECK CLUES

// ============================================

function checkClues() {

  const puzzle = PUZZLES[currentPuzzleIndex];

  let satisfiedCount = 0;

  

  puzzle.clues.forEach((clue, i) => {

    const el = clueCards.querySelector('[data-clue-index="' + i + '"]');

    const isSatisfied = clue.check(placements);

    

    if (isSatisfied) {

      el.classList.add('satisfied');

      satisfiedCount++;

    } else {

      el.classList.remove('satisfied');

    }

  });

  

  const totalStickers = puzzle.stickers.length;

  const placedCount = Object.keys(placements).length;

  

  // Update status

  if (placedCount === totalStickers && satisfiedCount === puzzle.clues.length) {

    statusText.textContent = 'All clues satisfied!';

    statusText.style.color = 'var(--stamp)';

    setTimeout(showWin, 500);

  } else if (placedCount === totalStickers) {

    statusText.textContent = satisfiedCount + '/' + puzzle.clues.length + ' clues satisfied';

    statusText.style.color = 'var(--accent)';

    highlightWrongStops();

  } else {

    statusText.textContent = placedCount + '/' + totalStickers + ' placed \u00B7 ' + satisfiedCount + ' clues met';

    statusText.style.color = '';

  }

}



function highlightWrongStops() {

  const puzzle = PUZZLES[currentPuzzleIndex];

  const allSatisfied = puzzle.clues.every(c => c.check(placements));

  

  if (!allSatisfied && Object.keys(placements).length === puzzle.stickers.length) {

    // Briefly highlight that something is wrong

    mapArea.querySelectorAll('.stop.has-sticker').forEach(s => {

      s.classList.add('wrong');

      setTimeout(() => s.classList.remove('wrong'), 600);

    });

  }

}



// ============================================

// WIN STATE

// ============================================

function showWin() {

  const puzzle = PUZZLES[currentPuzzleIndex];

  

  clearElement(winStamps);

  puzzle.stickers.forEach((s, i) => {

    const stamp = document.createElement('div');

    stamp.className = 'win-stamp';

    stamp.textContent = s.emoji;

    stamp.style.animationDelay = (i * 0.15) + 's';

    winStamps.appendChild(stamp);

  });

  

  winOverlay.classList.add('show');

  nextBtn.style.display = 'inline-block';

}



// ============================================

// RESET

// ============================================

function resetPuzzle() {

  placements = {};

  

  mapArea.querySelectorAll('.stop').forEach(stopEl => {

    stopEl.classList.remove('has-sticker', 'wrong');

    const placed = stopEl.querySelector('.placed-sticker');

    if (placed) placed.remove();

  });

  

  stickersGrid.querySelectorAll('.sticker').forEach(s => s.classList.remove('placed'));

  clueCards.querySelectorAll('.clue-card').forEach(c => c.classList.remove('satisfied'));

  

  statusText.textContent = 'Place all stickers';

  statusText.style.color = '';

  nextBtn.style.display = 'none';

  winOverlay.classList.remove('show');

}



// ============================================

// NAVIGATION

// ============================================

function nextPuzzle() {

  const nextIndex = (currentPuzzleIndex + 1) % PUZZLES.length;

  loadPuzzle(nextIndex);

}



// ============================================

// EVENT LISTENERS

// ============================================

resetBtn.addEventListener('click', resetPuzzle);

nextBtn.addEventListener('click', nextPuzzle);

winNextBtn.addEventListener('click', function() {

  winOverlay.classList.remove('show');

  nextPuzzle();

});



// Prevent context menu on long press (mobile)

document.addEventListener('contextmenu', function(e) { e.preventDefault(); });



// ============================================

// START

// ============================================

loadPuzzle(0);

</script>

</body>

</html>
