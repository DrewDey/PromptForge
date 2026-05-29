# Chain Realism

Use this reference when deciding how many prompts a seed should use and whether to continue after each model response.

## Default Prompt-Count Weights

Heavy weight short chains. Longer chains are allowed, but they should earn their length through actual observed issues or meaningful iteration.

| Prompt count | Default weight | Use when |
| --- | ---: | --- |
| 1 | 55% | The first output works and teaches the idea. |
| 2 | 25% | One natural fix, forgotten requirement, or polish pass is needed. |
| 3 | 12% | The output needs both a functional fix and a UX/content refinement. |
| 4 | 5% | A real build evolves through multiple observed changes. |
| 5 | 2% | The project is complex and each continuation has a concrete reason. |
| 6+ | 1% | Rare. Use only when the artifact genuinely demands it or the user requested a long chain. |

Expected average is roughly 1.8 prompts. This is intentional. PathForge should not look like every seed was artificially stretched.

## Adaptive Rule

Pick a target length as a prior, then ignore it when the actual result says to stop or continue.

After every response:

1. Open or inspect the artifact.
2. Write a one-sentence observation.
3. Choose `stop`, `fix`, `refine`, `remember`, `fork`, or `reject`.
4. If continuing, write the next prompt from the observation, not from a preplanned outline.

## Realistic Reasons To Continue

- The artifact does not run.
- A core control or workflow is missing.
- The output ignores part of the prompt.
- Mobile layout is visibly bad.
- The model made a reasonable but unwanted design choice.
- The user would plausibly remember an omitted requirement.
- The artifact is good enough to fork into a meaningfully different version.
- A specific line of code, copy, or behavior needs adjustment.

## Bad Reasons To Continue

- Needing to hit a predetermined chain length.
- Adding generic advanced features.
- Asking for polish without naming what is wrong.
- Creating steps that have no connection to the previous output.
- Making every project look like a perfectly planned tutorial.

## Continuation Prompt Formula

Use:

```text
[Observation from the current artifact]. [Specific change]. [Constraint that keeps the result focused].
```

Examples:

```text
The timer works, but the page does not explain what happens when time runs out. Add a clear finished state and keep it as one HTML file.
```

```text
The game is playable, but it has no touch controls. Add mobile controls and make sure keyboard controls still work.
```

```text
I forgot to ask for export. Add CSV export for the saved entries without adding a backend.
```

## Batch Variety

Across a batch, vary:

- provider/model,
- domain,
- artifact type,
- prompt count,
- reason for continuation,
- difficulty,
- first prompt style.

Do not vary by inventing fake authors or fake engagement.
