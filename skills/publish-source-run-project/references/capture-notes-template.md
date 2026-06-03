# Capture Notes Template

Save to `public/artifacts/<slug>-capture-notes.md`. This file is the faithful record of the real run. Every prompt and every result must be the exact text from the session. The page built later reads from here, so do not paraphrase the prompt or the visible response.

```markdown
# Capture — <Project Title> (<Provider Model Tier>)

Source: real <provider> run, model **<exact model + tier>**, <N>-prompt <one-shot|iterative> build.
Conversation: <source share URL>
Final artifact: `public/artifacts/<slug>.html`
Captured: <YYYY-MM-DD>

## Step 1
**Prompt:** <exact prompt text the user sent, verbatim>
**Result:** <exact / faithful description of what the model returned, including the visible response text>

## Step 2
**Prompt:** <exact prompt text>
**Result:** <exact result>

<...one block per step...>

## Capture findings (model-picker / tier / capture behavior)
- Which model tier was actually selected, and how it was selected (e.g. model picker not in ChatGPT a11y tree at rest — opened menu and selected "Instant" by ref).
- What the default model was on a fresh chat (e.g. defaulted to GPT 5.5 Thinking Heavy).
- How the code came back: INLINE in chat (Instant) vs hidden in a downloadable file (Thinking tiers).
- Any abandoned/slow model attempts that affected the final package.
- Verification note: artifact renders, main interaction works, no blank screen.
```

## Rules

- Exact prompts and exact responses only. Summaries allowed only in addition to the exact text.
- One Step block per prompt/response pair. Do not collapse a multi-prompt run into a single summary.
- If a step produced or changed an artifact file, name that file in the result so it can be tied to that response package on the page.
- Record the confirmed model tier — it is part of the page's `RunSummary`.
- If verification failed, say so and mark the run blocked instead of dressing it up.
