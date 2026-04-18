-- PathForge Real-Content Seed Chains
--
-- Purpose: additive seed of REAL Claude-generated prompt chains. Each project
-- has (a) a verbose, contextual prompt — the way a human actually types — and
-- (b) a substantive real Claude response (working code, actual drafts, real
-- calculations). Screenshots are left empty; authors (or future seed work)
-- fill them once Structural #1 (image upload to Supabase Storage) lands.
--
-- This file is APPEND-ONLY. Iterations working the Content queue in BACKLOG.md
-- add 2–3 new projects per iteration by appending to the bottom. Do NOT
-- rewrite existing projects — they're already reviewed and shipped.
--
-- Target: 20 projects initial, varied chain lengths (2–8 steps), varied
-- categories, 10 categories ideally covered 2× each.
--
-- UUID conventions for this file:
--   Prompts: 55555555-5555-5555-5555-55555555XXXX  (XXXX = 0001..)
--   Steps:   66666666-6666-6666-6666-6666666XYSS   (X = project counter hex,
--                                                    SS = step 01+)
--
-- Authors: reuse existing profile IDs from seed-fix.sql (22222222-...-22XX).
-- Categories: reuse existing category IDs from seed-fix.sql (11111111-...-110X).
--
-- How to apply: run this after supabase/seed-fix.sql. Idempotent (DELETEs
-- before INSERTs, keyed by fixed UUIDs).
--
-- Content-quality bar (iterations: match or beat this):
--   - Prompts: 80+ words, contextual (what the author is building, constraints,
--     voice, prior context), specify exactly what they want in the output.
--   - Responses: 300–600 words each, real working artifact (code runs, numbers
--     check out, prose reads professionally). Annotate math/code; don't be
--     lazy about it.
--   - Chain coherence: step N+1's prompt references or builds on step N's
--     output. A reader should be able to follow along without context.

ALTER TABLE prompts DISABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_steps DISABLE ROW LEVEL SECURITY;

-- =========================================================================
-- Project 55-0001 | Freelancer tax estimator | Jake Torres | Finance | 3 steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550001';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550001';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550001',
  $pf$Freelancer tax estimator — federal + SE + California in one React component$pf$,
  $pf$Built a React component to estimate my 2026 taxes as a CA-based freelance developer. Federal income tax, self-employment tax, and CA state tax in one flow — so I can actually plan my quarterly payments instead of guessing.$pf$,
  $pf$I'm a freelance dev in California and every April I scramble to figure out my quarterly estimates. Last year I underpaid because I didn't realize SE tax stacks on top of federal — ate a small penalty for it. This year I wanted a calculator I could actually run numbers through.

I used Claude Sonnet 4.6 over three rounds. First pass got the core calculation down (federal brackets + SE tax with the SS wage cap). Second pass added CA state tax and the deductible-SE-tax adjustment that reduces federal AGI — that's where most DIY calcs go wrong. Third pass added a quarterly payment breakdown with safe-harbor notes.

The whole thing is one file, no deps beyond React, every calculation annotated so I can verify by hand against an IRS worksheet. It's a personal tool — not a polished app — but it's saved me the annual "what do I owe?" panic.$pf$,
  $pf$Final tool runs at localhost:5173 on my machine. For a typical $92k year, single-filer in CA: federal ~$10,400, SE tax ~$13,000, CA ~$3,990, total ~$27,400. Quarterly payments land at ~$6,850. Compared to last year's hand-built spreadsheet I'm within $120 on every number — close enough to trust.

What I got out of running this: a clean mental model of how SE tax interacts with federal AGI (you deduct half the SE tax before computing federal income tax), and a realization that CA's quarterly split is 30/40/0/30, NOT 25/25/25/25. That's a common underpayment trap Claude flagged on the third pass — I had been splitting evenly to CA for three years.$pf$,
  '11111111-1111-1111-1111-111111111101',
  'intermediate',
  'claude-sonnet-4-6',
  'Claude 4.6 Sonnet',
  ARRAY['Claude','React','TypeScript','Vite'],
  ARRAY['tax','finance','freelance','react','self-employment','california'],
  'approved',
  '22222222-2222-2222-2222-222222222203',
  42, 18
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('66666666-6666-6666-6666-666666610101',
 '55555555-5555-5555-5555-555555550001',
 1,
 $pf$Core: federal brackets + self-employment tax$pf$,
 $pf$I'm a freelance developer in California, and this year (tax year 2026) I'll clear roughly $92,000 in 1099 income. I want to build a small React app to estimate my total tax burden so I can plan my quarterly estimated payments instead of scrambling in April.

Start by building a single TypeScript React component that takes three inputs:
- Annual self-employment net income (number, in dollars)
- Filing status (just 'single' for now — I'll add the others later)
- State (string, 'CA' for now)

And computes + displays:
1. Federal income tax, using 2026 brackets for single filers, after applying the standard deduction
2. Self-employment tax: 15.3% on 92.35% of net SE income. Respect the Social Security wage cap ($176,100 for 2026) — only 12.4% (SS portion) is capped; 2.9% Medicare applies to all of it
3. A subtotal showing federal + SE tax

Use HTML form inputs. Output should be a clean breakdown showing each component. Annotate the math with comments so I can verify every step against an IRS worksheet. No dependencies beyond React. Keep it to one file.$pf$,
 $pf$Here's a working component. Single file, no deps — drop it in a fresh Vite React+TS project.

```tsx
import { useState } from 'react'

// ---- 2026 tax constants (single filer) ----
const FEDERAL_STANDARD_DEDUCTION_SINGLE_2026 = 15_000

// Federal brackets (single), 2026 — [upper bound, marginal rate]
const FEDERAL_BRACKETS_SINGLE_2026: Array<[number, number]> = [
  [11_925, 0.10],
  [48_475, 0.12],
  [103_350, 0.22],
  [197_300, 0.24],
  [250_525, 0.32],
  [626_350, 0.35],
  [Infinity, 0.37],
]

// Self-employment tax constants
const SE_NET_EARNINGS_FRACTION = 0.9235     // only 92.35% of SE income is subject
const SS_TAX_RATE = 0.124                   // combined employer+employee Social Security
const SS_WAGE_BASE_2026 = 176_100           // Social Security cap for 2026
const MEDICARE_TAX_RATE = 0.029             // combined Medicare (no cap)

// ---- Calculations ----
function computeFederalTax(gross: number): number {
  const taxable = Math.max(0, gross - FEDERAL_STANDARD_DEDUCTION_SINGLE_2026)
  let tax = 0
  let prev = 0
  for (const [bound, rate] of FEDERAL_BRACKETS_SINGLE_2026) {
    if (taxable <= prev) break
    tax += (Math.min(taxable, bound) - prev) * rate
    prev = bound
  }
  return tax
}

function computeSETax(seNet: number): number {
  const base = seNet * SE_NET_EARNINGS_FRACTION
  const ssPortion = Math.min(base, SS_WAGE_BASE_2026) * SS_TAX_RATE
  const medicarePortion = base * MEDICARE_TAX_RATE
  return ssPortion + medicarePortion
}

export default function TaxEstimator() {
  const [income, setIncome] = useState(92_000)
  const federal = computeFederalTax(income)
  const se = computeSETax(income)
  const subtotal = federal + se

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 600, padding: 24 }}>
      <h1>2026 Tax Estimator — CA, single</h1>
      <label>
        SE net income (USD)
        <input type="number" value={income}
          onChange={e => setIncome(Number(e.target.value))}
          style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }} />
      </label>
      <table style={{ width: '100%', marginTop: 24, borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td>Federal income tax</td><td align="right">${'{'}federal.toFixed(2){'}'}</td></tr>
          <tr><td>Self-employment tax</td><td align="right">${'{'}se.toFixed(2){'}'}</td></tr>
          <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
            <td>Subtotal (federal only)</td><td align="right">${'{'}subtotal.toFixed(2){'}'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
```

Sanity check for $92k:
- Taxable federal: 92,000 − 15,000 = $77,000
- 10% × 11,925 = $1,193
- 12% × (48,475 − 11,925) = $4,386
- 22% × (77,000 − 48,475) = $6,276
- Federal tax ≈ $11,854
- SE base: 92,000 × 0.9235 = $84,962
- SS portion: 84,962 × 0.124 = $10,535 (under $176,100 cap, no cutoff)
- Medicare: 84,962 × 0.029 = $2,464
- SE tax ≈ $12,999
- Subtotal: ~$24,853

Matches a CPA pencil-out. Next pass: add CA state tax + the deductible-SE-tax adjustment (half of SE tax reduces federal AGI — I left that out of this first pass so you can see the gross math first and verify it against a worksheet).$pf$,
 $pf$Establishes the calculation scaffolding and federal + SE tax math before layering state tax and AGI adjustments. Verifies against hand math at $92k.$pf$),

-- Step 2 --
('66666666-6666-6666-6666-666666610102',
 '55555555-5555-5555-5555-555555550001',
 2,
 $pf$Add California state tax + the deductible-SE-tax adjustment$pf$,
 $pf$Nice, that matches my mental math. Now add:

1. California state income tax using 2026 CA brackets (single filer)
2. The deductible-SE-tax adjustment — half of SE tax reduces federal AGI, which changes the federal tax calc

Walk me through the order of operations — specifically where the SE deduction hits the federal calc vs the CA calc. I want to make sure I'm not double-counting. Show the breakdown cleanly: federal, SE, CA, total.$pf$,
 $pf$Good catch on the ordering — this is where a lot of DIY calcs go wrong. Order matters:

1. Compute SE tax (independent)
2. Deductible SE tax = 0.5 × SE tax → this is an "adjustment to income"
3. Federal AGI = gross income − deductible SE tax
4. Federal taxable = federal AGI − federal standard deduction
5. Federal income tax = computed on federal taxable
6. CA state starts from federal AGI (not federal taxable), subtracts CA standard deduction, applies CA brackets

CA starts from federal AGI — which already has the SE adjustment baked in — so you don't double-count the deduction.

Updated component:

```tsx
// ---- 2026 California constants (single filer) ----
const CA_STANDARD_DEDUCTION_SINGLE_2026 = 5_540

// CA 2026 brackets (single)
const CA_BRACKETS_SINGLE_2026: Array<[number, number]> = [
  [10_756, 0.01],
  [25_499, 0.02],
  [40_245, 0.04],
  [55_866, 0.06],
  [70_606, 0.08],
  [360_659, 0.093],
  [432_787, 0.103],
  [721_314, 0.113],
  [Infinity, 0.123],
]

function computeCATax(federalAGI: number): number {
  const taxable = Math.max(0, federalAGI - CA_STANDARD_DEDUCTION_SINGLE_2026)
  let tax = 0
  let prev = 0
  for (const [bound, rate] of CA_BRACKETS_SINGLE_2026) {
    if (taxable <= prev) break
    tax += (Math.min(taxable, bound) - prev) * rate
    prev = bound
  }
  return tax
}

export default function TaxEstimator() {
  const [income, setIncome] = useState(92_000)

  // 1. SE tax (no dependencies)
  const se = computeSETax(income)
  // 2. Deductible SE = half SE tax, reduces federal AGI
  const deductibleSE = se / 2
  const federalAGI = income - deductibleSE
  // 3. Federal income tax on (AGI − federal standard deduction)
  const federal = computeFederalTax(federalAGI)
  // 4. CA uses federal AGI as starting point
  const ca = computeCATax(federalAGI)

  const total = federal + se + ca

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 600, padding: 24 }}>
      <h1>2026 Tax Estimator — CA, single</h1>
      <label>
        SE net income (USD)
        <input type="number" value={income}
          onChange={e => setIncome(Number(e.target.value))} />
      </label>
      <table style={{ width: '100%', marginTop: 24 }}>
        <tbody>
          <tr><td colSpan={2} style={{ fontWeight: 'bold' }}>Adjustments</td></tr>
          <tr><td>Deductible SE tax (½ of SE)</td><td align="right">${'{'}deductibleSE.toFixed(2){'}'}</td></tr>
          <tr><td>Federal AGI</td><td align="right">${'{'}federalAGI.toFixed(2){'}'}</td></tr>

          <tr><td colSpan={2} style={{ fontWeight: 'bold' }}>Taxes</td></tr>
          <tr><td>Federal income tax</td><td align="right">${'{'}federal.toFixed(2){'}'}</td></tr>
          <tr><td>Self-employment tax</td><td align="right">${'{'}se.toFixed(2){'}'}</td></tr>
          <tr><td>CA state income tax</td><td align="right">${'{'}ca.toFixed(2){'}'}</td></tr>
          <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
            <td>Total estimated tax</td><td align="right">${'{'}total.toFixed(2){'}'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
```

Walking through $92k again:
- SE tax: ~$12,999 (unchanged)
- Deductible SE: $6,499
- Federal AGI: 92,000 − 6,499 = $85,501
- Federal taxable: 85,501 − 15,000 = $70,501
  - Bracket math → Federal ≈ $10,424 (saves you $1,430 vs the gross calc)
- CA taxable: 85,501 − 5,540 = $79,961
  - Bracket math → CA ≈ $3,990
- Total: 10,424 + 12,999 + 3,990 ≈ $27,413

If you applied CA to federal *taxable* (post-federal-deduction) instead of AGI, you'd under-collect CA by a few hundred. The deduction-stacking order is the whole point of using AGI as the CA starting line.$pf$,
 $pf$Introduces CA brackets and the critical ordering rule: SE deduction → federal AGI → federal & CA calcs branch from the same AGI. Flags the common deduction-stacking mistake.$pf$),

-- Step 3 --
('66666666-6666-6666-6666-666666610103',
 '55555555-5555-5555-5555-555555550001',
 3,
 $pf$Quarterly payment breakdown with safe-harbor notes$pf$,
 $pf$Great. Last piece: quarterly estimated payments.

I know the IRS wants pay-as-you-go (safe harbor is lesser of 90% of this year's liability or 100–110% of last year's depending on AGI). I don't have last year's AGI in the component yet — that's a later pass.

For now: add a breakdown that splits the total estimated tax into 4 quarterly payments with the IRS due dates (Apr 15, Jun 15, Sep 15, Jan 15 next year). Table below the current breakdown. Add a small "safe harbor" note pointing out this is just an even-split estimate and doesn't account for prior-year AGI rules or lumpy income.$pf$,
 $pf$Here's the update. Quarterly payments aren't literally "total ÷ 4" the way the IRS structures the deadline calendar (Q1 covers Jan–Mar, Q2 Apr–May, Q3 Jun–Aug, Q4 Sep–Dec — a 2-3-3-4 month split). For an even-split approximation, most freelancers just divide by 4 and it's close enough — but for lumpy income the IRS expects the annualized-income-installment method (Form 2210 Schedule AI). Flagging that in the note.

```tsx
const QUARTERLY_DEADLINES_2026 = [
  { quarter: 'Q1', dueDate: 'Apr 15, 2026', period: 'Jan 1 – Mar 31' },
  { quarter: 'Q2', dueDate: 'Jun 15, 2026', period: 'Apr 1 – May 31' },
  { quarter: 'Q3', dueDate: 'Sep 15, 2026', period: 'Jun 1 – Aug 31' },
  { quarter: 'Q4', dueDate: 'Jan 15, 2027', period: 'Sep 1 – Dec 31' },
]

// ... inside the component, after `total` is computed ...
const quarterly = total / 4

return (
  <div style={{ fontFamily: 'system-ui', maxWidth: 600, padding: 24 }}>
    {/* existing header + tax breakdown table */}

    <h2 style={{ marginTop: 32 }}>Quarterly estimated payments</h2>
    <p style={{ fontSize: 14, color: '#555' }}>
      Even-split estimate of ${'{'}quarterly.toFixed(2){'}'} per quarter. This doesn't
      account for prior-year safe-harbor rules or lumpy income — if your 1099
      income arrives unevenly, consider the annualized-income-installment method
      (Form 2210 Schedule AI).
    </p>
    <table style={{ width: '100%', marginTop: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #ccc' }}>
          <th align="left">Quarter</th><th align="left">Period</th>
          <th align="left">Due</th><th align="right">Payment</th>
        </tr>
      </thead>
      <tbody>
        {'{'}QUARTERLY_DEADLINES_2026.map(({'{'}quarter, dueDate, period{'}'}) => (
          <tr key={'{'}quarter{'}'}>
            <td>{'{'}quarter{'}'}</td>
            <td>{'{'}period{'}'}</td>
            <td>{'{'}dueDate{'}'}</td>
            <td align="right">${'{'}quarterly.toFixed(2){'}'}</td>
          </tr>
        )){'}'}
      </tbody>
    </table>
  </div>
)
```

For $92k in CA, single:
- Total estimated tax: $27,413
- Per quarter: $6,853

Three safe-harbor notes worth flagging for your README:

1. **Federal safe harbor:** if AGI > $150k, you pay 110% of last year's total tax; if ≤ $150k, 100%. So "lesser of 90% of this year or 100–110% of last year" means that if last year was lower, you can pay less now and true-up in April without penalty. Needs last-year's AGI + tax as inputs to compute.

2. **CA safe harbor:** mostly mirrors federal but uses 110% threshold at AGI > $150k — same structure, slightly different percentages.

3. **CA's quarterly split is NOT 25/25/25/25 — it's 30/40/0/30.** Q1 is 30%, Q2 is 40%, Q3 is 0, Q4 is 30%. Federal is even. If you lump 25/25/25/25 to CA, you'll underpay Q2 and get dinged. Worth adding a CA-specific split column in the table as a later pass.

The CA 30/40/0/30 split is the biggest gotcha here — most online calcs miss it entirely.$pf$,
 $pf$Adds quarterly breakdown with correct IRS deadline periods; flags three safe-harbor edge cases (federal rule, CA rule, CA's non-even 30/40/0/30 split) for future passes.$pf$);

-- =========================================================================
-- END OF FILE — append next project(s) below this line.
-- Iterations working the Content queue: add 2–3 projects per iteration,
-- appending below this comment. Do NOT rewrite existing projects.
-- =========================================================================

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_steps ENABLE ROW LEVEL SECURITY;
