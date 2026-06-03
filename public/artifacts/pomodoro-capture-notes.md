# Capture — Pomodoro Focus Timer (GPT 5.5 Instant)

Source: real ChatGPT run, model **GPT 5.5 Instant**, 4-prompt iterative build.
Conversation: https://chatgpt.com/c/6a1f9bc4-c390-832f-88a5-d978d2e42577
Final artifact: `public/artifacts/pomodoro-focus-timer-gpt55-instant.html`

## Step 1
**Prompt:** Build a Pomodoro focus timer as a single self-contained HTML file. It should run 25-minute work sessions and 5-minute breaks, with Start, Pause, and Reset buttons, a big readable countdown, and a clean minimal look. Put all the HTML, CSS, and JavaScript in one file I can save and open directly in a browser.
**Result:** A single-file Pomodoro timer — light card UI, 25:00 countdown, Start/Pause/Reset, auto-switch between 25-min work and 5-min break, title-bar updates with remaining time.

## Step 2
**Prompt:** Nice. Now add two things to the same single HTML file: a counter that tracks how many work sessions I've completed, and let me set my own work and break lengths in minutes with number inputs before I start. Keep everything in the one file.
**Result:** Added Work/Break minute inputs (validated, disabled while running) and a "Work sessions completed" counter that increments each time a work block finishes.

## Step 3
**Prompt:** Great. Two more upgrades to the same single file: draw a circular progress ring around the countdown that empties as the current session runs down, and play a soft chime when a work or break session ends. Keep it fully self-contained — no external files or libraries, so generate the chime with the Web Audio API.
**Result:** Added an SVG progress ring (stroke-dashoffset driven by time left) and a self-contained Web Audio chime — a 3-note ascending arpeggio (C5/E5/G5 sine oscillators) generated on the fly, no audio files.

## Step 4
**Prompt:** Last step: give it a polished modern dark theme with nicer typography, smooth out the spacing, and make sure it looks and works great on mobile. Keep it the same single self-contained HTML file.
**Result:** Polished dark theme (CSS variables, #0b1020 base with purple/cyan radial glows), Inter typography, glassmorphism card (backdrop-blur), a purple→cyan gradient progress ring, tabular-nums countdown, and a responsive @media(max-width:420px) layout. This is the final artifact.

## Capture findings (for the upload-system question)
- The model picker is NOT in ChatGPT's accessibility tree at rest — had to open the menu and select "Instant" by element ref. A new chat had defaulted to **5.5 Thinking Heavy**.
- On **Thinking Heavy**, GPT returned the code as a **downloadable file** (not inline) — would force a download step to capture. On **Instant**, it pasted the full code **inline**, which is far easier to capture as text.
