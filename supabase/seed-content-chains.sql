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
-- Project 55-0002 | B2B SaaS cold email launch sequence | Sarah Mitchell | Marketing | 4 steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550002';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550002';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550002',
  $pf$B2B SaaS cold email launch — 4-email sequence to 240 HR decision-makers$pf$,
  $pf$Wrote a 4-email cold outbound sequence with Claude for a client's AI-onboarding product launch. Claude sharpened the positioning angle before I wrote a word, then drafted the sequence from problem-hook through break-up email.$pf$,
  $pf$One of my clients is a B2B SaaS for HR teams launching a new AI-powered onboarding module. They asked for a 4-email cold outbound sequence to seed pipeline — sending to 240 HR directors and VPs People at mid-market companies (200–1500 headcount).

Rather than spin on a blank doc, I gave Claude the full product context (positioning, differentiators, pricing, who we lose to) and walked through the sequence in four rounds. First pass was positioning + research — I wanted Claude's take on the angle BEFORE writing. Second pass wrote email 1 in two persona flavors. Third pass wrote the middle two (follow-up with proof + pivot to the other angle). Fourth pass wrote the break-up email and four subject-line variants for a small A/B test.

I'm a copywriter — I could've done this myself in half a day. Claude did it in ~25 minutes of back-and-forth, and the sequence is sharper than my usual first draft because Claude pushed back on my generic angle ("save time on onboarding") and found a more specific hook (compliance content going stale every time employment law shifts).$pf$,
  $pf$Sequence went out Monday. Day 5 numbers: 240 sent, 38 opens on email 1 (15.8%), 22 replies across the 4-email sequence = 9.2% reply rate. 6 qualified demos booked. Client is happy.

The Claude-suggested angle ("your compliance team is rewriting onboarding content every time employment law shifts — here's how to stop") beat my original angle ("cut onboarding time in half") in the subject-line A/B. Compliance-focused subject lines got 18.3% open rate vs 11.9% for the time-focused version. That one pivot was worth hiring Claude for the whole project.

Lesson: for cold outbound, the positioning round is the highest-value part of the work — not the email copy itself. When I was writing these alone I'd spend 10 min on the angle and 3 hours on the copy. Claude flipped that ratio and the sequence is tighter because the angle was already load-bearing before I wrote a word.$pf$,
  '11111111-1111-1111-1111-111111111102',
  'intermediate',
  'claude-opus-4-6',
  'Claude 4.6 Opus',
  ARRAY['Claude','Instantly','Apollo','Google Sheets'],
  ARRAY['cold email','b2b','saas','outbound','copywriting','hr-tech'],
  'approved',
  '22222222-2222-2222-2222-222222222202',
  78, 34
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('66666666-6666-6666-6666-666666620101',
 '55555555-5555-5555-5555-555555550002',
 1,
 $pf$Positioning + research brief — find the sharpest angle$pf$,
 $pf$I'm writing a 4-email cold outbound sequence for a B2B SaaS client. Target: HR directors and VPs People at mid-market US companies (200–1500 employees). Product: AI-powered onboarding module — workflow builder + auto-generated role-specific compliance content, sits on top of HRIS (Workday / UKG / BambooHR).

Key context:
- Pricing: $14 per-employee/year, $30k/yr minimum
- We win against: DIY onboarding docs in Confluence, manual HRIS workflows, competitors like Lessonly and WorkRamp
- Differentiator: compliance content auto-updates when employment law changes (NY sexual harassment content, CA CCPA, etc.) — manual stacks force HR to rewrite this themselves every 6–12 mo
- Buyers: HR Director / VP People. Champions: HR Ops or L&D lead

Before I start writing, I want your take on positioning. Don't write copy yet. Walk me through:
1. The sharpest angle for a cold email — what's the specific pain this solves that a decision-maker recognizes in the subject line?
2. Two personas inside this target (HR Director vs VP People — different motivations?)
3. One hook idea per email in a 4-email sequence — I want to see the arc before I write.

Push back if my framing is weak. I'd rather hear "that angle is generic" now than ship 240 dud emails.$pf$,
 $pf$Quick pushback before angles: you gave me the product but not the pain. "AI-powered onboarding module" is seller language. Buyers don't wake up thinking "I need an onboarding module." They wake up thinking about something that's visibly failing this quarter. Let me work backwards from that.

**The sharpest angle (reordered from your framing):**

The differentiator is "compliance content auto-updates when employment law changes." That's a much more specific pain than "onboarding takes too long." Every time NY shifts harassment training requirements, every time CA updates wage-theft notices, every time a federal PWFA rule drops — someone at this company has to manually rewrite onboarding docs and re-train new hires. Quarterly fire drill for most HR ops teams.

Angle: **"Your compliance team is rewriting onboarding content every time employment law shifts. Stop doing that by hand."** Sharper than "cut onboarding time in half" because it's specific, recent (PWFA 2023, CA CCPA 2023, state harassment mandates ongoing), and forces the buyer to remember the last time they ate this cost.

**Two personas:**

1. **HR Director (300–800 employees, no dedicated HR ops):** owns the pain directly. Writes the docs herself. Warm pain. Responds to specificity ("last time NY updated harassment content, how long did it take to roll out?"). Lead with labor-hours-saved framing.

2. **VP People (800–1500 employees, has HR Ops under them):** delegates the pain but owns the compliance risk. Colder emotional connection to the rework; hotter connection to "what if we miss an update and a regulator audits?" Lead with risk-of-outdated-content framing.

Ship the sequence to both, but split subject lines. Director angle: "stop rewriting" (ops pain). VP angle: "stay current" (risk pain). Use Apollo job title to route.

**4-email arc:**

- **Email 1 (problem hook):** Lead with the most recent employment-law change in their state. "NY updated harassment content in Q3. Did your onboarding catch up?" Pattern-interrupt opener. Short.
- **Email 2 (proof):** Case study or a specific customer number. Something like "[company] cut 40 hours/quarter of compliance rework after switching." One stat.
- **Email 3 (new angle — shift from cost to risk):** "What's your exposure if an employee signed an outdated harassment policy in May?" Lands harder on the VP. Pivots from time-saved to audit-risk.
- **Email 4 (break-up):** Classic "closing your file" — "No response, so I'll stop. If compliance content updates come up in 2026, reach out." Short, no CTA, leaves door open.

One push-back on your framing: you called it a "cold outbound sequence" like it's four cold emails. It's one cold email and three follow-ups from the same thread. Threading matters — Gmail groups them, the prospect sees a stack of your name, that builds pressure. Make sure your tool sends all four on the same message thread, not four separate.

Ready to write Email 1 when you are.$pf$,
 $pf$Pushes back on the generic framing; lands on a specific compliance-rework angle; splits personas (Director vs VP) with different emotional hooks; sketches a 4-email arc before a word of copy is written.$pf$),

-- Step 2 --
('66666666-6666-6666-6666-666666620102',
 '55555555-5555-5555-5555-555555550002',
 2,
 $pf$Email 1 — two persona variants, under 90 words$pf$,
 $pf$Great — "stop rewriting compliance content every time the law changes" is sharper than what I had. Let's write Email 1.

Constraints:
- Subject line: under 50 chars, pattern-interrupt style, NOT click-bait
- Body: under 90 words. I've watched reply rates tank past 100 words on cold outbound.
- Voice: human. First-person. Don't open with "I hope this finds you well" or any throat-clearing. Open with a specific observation.
- CTA: low-commitment. Not "book a demo." Think "15-min call this week?" or "Worth a quick look?"
- Personalization tokens: {{first_name}} in greeting, {{company}} somewhere in body to show this isn't blast mail

Write two versions: one for HR Director (ops-pain angle), one for VP People (risk angle).$pf$,
 $pf$Here are both. Subject lines hit the pattern-interrupt brief without leading with "Quick question" (dead giveaway).

---

**Version A — HR Director**

Subject: NY updated harassment content in Q3. Did yours?

Hi {{first_name}},

Every time an employment law shifts — NY harassment content last quarter, CA wage notices the quarter before — someone on your team rewrites onboarding docs by hand. At {{company}}'s size, that's usually 8–15 hours per update, quarterly.

We built the content layer so it updates automatically when statutes change. Your team still owns the process — they just stop doing the rewrites.

Worth a 15-min call this week to see if the math works for you?

— Sarah

---

**Version B — VP People**

Subject: When an employee signs an outdated policy

Hi {{first_name}},

The risk in most mid-market HR stacks isn't the HRIS — it's that onboarding compliance content goes stale between legal updates. An employee signs the May version of a policy that was quietly deprecated in July, and if audited, that signature is worth less than the paper.

We auto-update that content layer as the statutes shift, so the signature always reflects the current rule.

Happy to share how two companies {{company}}'s size handled this — 15 min next week?

— Sarah

---

Notes on the choices:

- Version A opens with a concrete recent event ("NY updated harassment content in Q3"). Not clickbait because it's literally true — if the prospect is in NY or has NY employees, they know exactly what I mean. Personalize by state if you segment the list.
- Version A's "quarterly, 8–15 hours per update" is the specific number the Director will recognize. Don't round to "10 hours" — specific odd numbers read as researched, round numbers read as made up.
- Version B opens on the risk frame (outdated signature = weak audit evidence). This is the sentence HR lawyers actually worry about — it lands because it's a real legal concern, not sales framing.
- Both are under 85 words body. Version A: 62 words. Version B: 68 words.
- CTAs are specific (15-min call) and time-bounded (this week / next week). "Worth a quick look?" save for Email 2.

A/B testing note: send 50/50 to Directors vs VPs, NOT 50/50 within each title. The ops-pain angle won't move VPs; the risk angle is wasted on Directors who already live the pain. Title-based routing beats a literal A/B here.$pf$,
 $pf$Two tight Email 1 drafts (62 and 68 words) — one hits ops pain with a specific recent state-law event, the other hits audit risk with an outdated-signature concern.$pf$),

-- Step 3 --
('66666666-6666-6666-6666-666666620103',
 '55555555-5555-5555-5555-555555550002',
 3,
 $pf$Emails 2 and 3 — proof then pivot$pf$,
 $pf$Emails 2 and 3 now. Same tone constraints. Email 2 = proof + one stat. Email 3 = pivot to the OTHER angle (if Director got cost in Email 1, Email 3 pivots to risk; if VP got risk, Email 3 pivots to cost).

For the stat: our best reference customer is a 720-person healthcare company that cut compliance rework from 12 hours/quarter to 90 minutes after switching. CEO quoted in a case study saying "the team stopped dreading state law updates." Use that.

Both emails thread on top of Email 1 — the prospect sees "Re: NY updated harassment content in Q3" in their inbox, which is part of the pressure. Write the body only (subject handled by the thread).$pf$,
 $pf$Here are Email 2 and Email 3 for both personas. Threading assumed — no subject lines.

---

**Email 2 — HR Director (proof)**

{{first_name}}, following up.

A healthcare co around {{company}}'s size — 720 employees, 3 states — went from 12 hours of quarterly compliance rework to 90 minutes after switching. Their HR Director said her team "stopped dreading state law updates."

I don't know if the math is as lopsided for {{company}}, but the before-after is on our site if you want it. Otherwise — open to a 15-min next week?

— Sarah

---

**Email 2 — VP People (proof)**

{{first_name}}, following up.

One data point: a 720-person healthcare company cut quarterly compliance rework from 12 hours to 90 minutes — and more importantly, the CEO told me the team "stopped dreading state law updates." The labor savings were real; the risk reduction was what got him to sign.

Case study on the site. Worth 15 min to walk through how it applies to {{company}}?

— Sarah

---

**Email 3 — HR Director (pivot to risk)**

{{first_name}},

One more angle, then I'll stop. The labor-savings math is the obvious case — but the sharper one is what happens if an employee signs an outdated policy.

If {{company}} updates harassment training in Q1 but a Q3 hire signed the Q4-last-year version, the signature doesn't cover you. Most HRIS stacks don't surface that gap. We do.

Same 15-min offer if it's helpful.

— Sarah

---

**Email 3 — VP People (pivot to cost)**

{{first_name}},

One more — switching angles. The audit risk is the big one, but the day-to-day cost shows up on your HR ops team's calendar.

A 720-person customer tracked 48 hours of quarterly compliance rework before switching. Mid-market HR ops teams at that size tend to hate this work specifically — interrupt-driven, reactive, a state law change can land mid-cycle. Worth solving on the labor side too.

15 min next week if the full pitch is useful.

— Sarah

---

Design choices:

- Email 2 is deliberately short. Email 1 did the hook; Email 2's job is one stat + one social-proof quote, nothing else. If Email 1 landed, Email 2 closes the loop.
- Email 3 does the angle-switch on purpose — catches the reader who didn't care about the first frame. HR Director who thought "we don't spend much on rework" might move on "signatures are legally weak." VP People who shrugged at audit risk might move on "my ops team is getting crushed by this."
- Both Email 3s open "One more angle, then I'll stop" / "One more — switching angles." Graceful admission that they're getting multiple emails, reduces the ick factor of follow-up #2.
- "If {{company}} updates..." in Email 3 (Director) uses the prospect's company name in a hypothetical. That specificity makes the risk concrete. Don't write "if a company" — name them.
- Neither Email 2 nor Email 3 re-introduces you or the product. Dead weight in a threaded reply. They know who you are from Email 1.

Ready for the break-up and subject line variants.$pf$,
 $pf$Four follow-up bodies (two Email 2s, two Email 3s) — Email 2 delivers one proof stat per persona, Email 3 deliberately switches to the other angle to catch readers the first frame didn't move.$pf$),

-- Step 4 --
('66666666-6666-6666-6666-666666620104',
 '55555555-5555-5555-5555-555555550002',
 4,
 $pf$Break-up email + 4 subject-line A/B variants$pf$,
 $pf$Last email — the break-up. Goal: politely close the file. Under 60 words. Low-commitment CTA (reach out later, no pressure now).

Also give me 4 subject-line variants for Email 1 beyond "NY updated harassment content in Q3. Did yours?" — I want to A/B test subjects specifically since that's the biggest lever on open rate. Mix of direct, pattern-interrupt, question, and specific-personalization formats. Tell me which you think wins and why.$pf$,
 $pf$Break-up email (both personas, same body):

---

{{first_name}}, I'll close the file on this.

If compliance content updates ever come up for {{company}} in 2026 — whether you solve it with us or somewhere else — happy to share the playbook that 30+ mid-market HR teams have used. No pitch.

Good luck with the year.

— Sarah

---

49 words. Does three things: acknowledges you're stopping, offers a non-transactional resource (the playbook — make this a real Notion doc, costs you nothing), ends human. The "no pitch" is important — it's the explicit promise that makes the offer actually low-commitment.

---

**4 subject-line variants for Email 1 (Director flavor):**

1. **"NY updated harassment content in Q3. Did yours?"** (baseline — direct question, specific event)
2. **"12 hours of rework per state law change"** (specific number, stat-led)
3. **"A question on {{company}}'s harassment onboarding"** (personalized, question format)
4. **"{{first_name}} — the compliance rewrite problem"** (first-name + noun-phrase, pattern-interrupt)

**Prediction:** #1 wins overall open rate (18–22%). #4 wins reply rate conditional on open. Reasoning:

- **#1 is the strongest opener** because it pairs a specific recent event (NY Q3 update) with a direct question. Specificity reads as human-written; direct questions demand a mental answer. Risk: state-dependency — if you're sending to prospects with no NY employees, the hook falls flat. Segment by state if you can.

- **#2 leads with a number.** Stat-led subjects split the audience: over-perform on reply rate with readers who've experienced the exact pain (they'll think "yes, that's the number"), under-perform with readers who don't have that context (they'll think "what rework? I don't have this problem"). Best for the warmest segment.

- **#3 is personalization-heavy.** Reads as bespoke — {{company}} in a subject line is rare enough on cold outbound that it catches attention. Risk: feels like a trick once opened if the body doesn't follow through. Only use if body copy is clearly tailored.

- **#4 is pattern-interrupt with first-name + dash.** Reads like an email from a colleague at work. Highest chance of being opened on a mobile preview (name + dash + noun phrase looks conversational). Highest risk of "spam feel" if the first body sentence doesn't immediately deliver.

A/B matrix to run this properly: 60 addresses × 4 variants = 15 each. Run a 48-hour test, pick the two highest openers, run the remaining 180 on the winning split (90/90). Enough signal to not overfit.

Meta-note: subject lines are the highest-lever part of cold outbound, but the single biggest factor on reply rate is *relevance*. Open-rate differences are noise compared to whether the body copy lands for the specific reader. Don't over-optimize the subject at the cost of letting body drift from the angle.$pf$,
 $pf$Break-up email (49 words) plus 4 Email 1 subject-line variants with a predicted winner, explanation per variant, and an A/B test plan that won't overfit on a small sample.$pf$);

-- =========================================================================
-- Project 55-0003 | Extract a gnarly useEffect into useDebouncedSearch | Marcus Chen | Coding | 2 steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550003';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550003';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550003',
  $pf$Extract a 40-line useEffect into useDebouncedSearch — with AbortController + race-condition fix$pf$,
  $pf$Refactored a debounced-search useEffect that was duplicated across 3 components into one reusable hook. Two-pass with Claude: first pass analyzed the current code and planned the API, second pass implemented it and caught a stale-response bug I'd been living with.$pf$,
  $pf$We have a SearchBar at work with the classic in-flight-fetch + debounce + abort-on-new-keystroke pattern. It works, but it lives inline in a 40-line useEffect that nobody wants to touch. I've copy-pasted variants of it into three other components this quarter (customer picker, admin user filter, and now a tag typeahead).

Finally got fed up and asked Claude Sonnet to help me extract it into a custom hook. Two passes: first pass I handed Claude the current useEffect and asked for (a) everything wrong or at risk with it and (b) a proposed hook API before any implementation. Second pass Claude wrote the hook + a refactored SearchBar that consumes it.

The payoff from the first pass was finding a subtle race condition I hadn't noticed. If you typed fast, the OLD fetch could resolve AFTER the controller for the NEW keystroke had already fired — and the old response would quietly overwrite the new results. The AbortController only covers aborts, not already-resolved responses from a previous query. Claude caught it on the review pass.$pf$,
  $pf$Hook lives in src/hooks/useDebouncedSearch.ts — 48 lines. Three components that had variants of the pattern now use it: SearchBar, CustomerPicker, admin-panel UserFilter. Diff: -127 lines across those three files, +48 for the hook. No more stale-result bug.

The race fix: on each effect run we stash the current query on a latestQueryRef, and when a fetch resolves we check that ref still matches before committing the results. A response for "cl" that arrives after the user has moved on to "clear" gets silently discarded instead of overwriting the newer results.

Total time: ~15 min back-and-forth with Claude Sonnet 4.6. Hook is clean enough that I'm pulling it out of our internal repo and open-sourcing it next week.$pf$,
  '11111111-1111-1111-1111-111111111104',
  'intermediate',
  'claude-sonnet-4-6',
  'Claude 4.6 Sonnet',
  ARRAY['Claude','React','TypeScript','Vite'],
  ARRAY['react','typescript','hooks','refactor','debounce','abortcontroller'],
  'approved',
  '22222222-2222-2222-2222-222222222201',
  54, 27
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('66666666-6666-6666-6666-666666630101',
 '55555555-5555-5555-5555-555555550003',
 1,
 $pf$Review the existing code and propose a hook API (no code yet)$pf$,
 $pf$I have this component with a classic debounced-search useEffect pattern. It works, but it's duplicated across 3 other components in our codebase, and I want to extract it into a reusable custom hook.

Before you write anything, do two things:

1. Review this code and call out anything wrong, subtle-buggy, or at risk. I've been staring at it too long to see problems.
2. Propose a hook API (signature, what it returns, what it accepts) — describe it in prose or a TypeScript interface. Don't implement yet.

Here's the current component:

```tsx
function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        })
        const data = await res.json()
        setResults(data.results)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error(err)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query])

  return <input value={query} onChange={e => setQuery(e.target.value)} />
}
```

Review + API proposal, in that order.$pf$,
 $pf$Review first, API proposal second.

**Review — what's wrong / at risk:**

1. **Stale results when the previous fetch has already resolved.** The AbortController only cancels fetches that are still in flight. If the user types "cl", the fetch completes in 250ms and commits results, then at 300ms they type "clear" — the new effect runs, but the OLD results are already sitting in state. The new fetch lands correctly, but there's a window between old-commit and new-commit where the UI shows results for the wrong query. The fix needs response-level deduplication, not just abort. Track "which query is this response for" and discard stale responses.

2. **setLoading(true) happens inside the debounce timer.** If the user types fast, loading flickers: false → (300ms later) true → (next keystroke cancels) never set to false cleanly. For slow connections this isn't visible; for fast ones you get spinner flashes. Loading should be true only when there's a real in-flight fetch, not a timer-that-might-become-a-fetch.

3. **query.length < 2 is hardcoded.** Fine for this component, but if you're reusing this pattern across 3 others, one of them might want length 1 (single-char category lookup) or length 3 (full-text search where 2-char queries are noise).

4. **Errors are console.error-only.** In production you'd want errors surfaced to state so the UI can show "Search failed — try again." Right now a 500 from the API gives the user silent empty results and no indication anything broke. The user will sit there wondering why their valid query returned nothing.

5. **No manual refetch handle.** If the user clicks a "retry" button, or you invalidate the cache and need to re-run the current query, there's no escape hatch. You'd have to blank the query and retype it.

6. **encodeURIComponent is good** — flagging it was handled correctly so you don't second-guess it. No XSS/injection concern here.

7. **Linter gotcha (not a bug):** useEffect with an async IIFE inside is fine, but some lint configs complain ("effect callbacks should not return a promise"). The actual callback here is synchronous and the async work runs inside setTimeout, so it's fine — just noting in case your linter gets cranky.

**Hook API proposal:**

```ts
interface UseDebouncedSearchOptions<T> {
  /** The search function. Receives query + AbortSignal. */
  fetcher: (query: string, signal: AbortSignal) => Promise<T[]>
  /** Debounce delay in ms. Default 300. */
  delay?: number
  /** Minimum query length to trigger a search. Default 2. */
  minLength?: number
}

interface UseDebouncedSearchResult<T> {
  query: string
  setQuery: (q: string) => void
  results: T[]
  loading: boolean
  error: Error | null
  /** Force a re-fetch of the current query. */
  refetch: () => void
}

function useDebouncedSearch<T>(
  opts: UseDebouncedSearchOptions<T>
): UseDebouncedSearchResult<T>
```

Key choices:

- **fetcher injected by the caller, not a URL.** Decouples the hook from a specific API shape — one hook works for /api/search, for a Supabase query, for anything the caller wires up.
- **Returns query + setQuery** so the caller wires input value/onChange directly to the hook.
- **error as state**, surface-able to UI. Abort errors filtered internally.
- **refetch** is the manual-trigger escape hatch (issue #5).
- **Generic <T>** so result types are preserved at the call site.
- **Separate loading (real in-flight) from debounce-pending** — no flicker (issue #2).

Internally the hook will need a latestQueryRef to solve issue #1: compare the fetched-response's query to the latest query before committing.

Ready for the implementation pass when you are.$pf$,
 $pf$Catches a silent race condition in the original useEffect (resolved-before-abort responses overwriting newer ones) and proposes a generic hook signature with injected fetcher, surfaced error state, manual refetch, and configurable delay/minLength.$pf$),

-- Step 2 --
('66666666-6666-6666-6666-666666630102',
 '55555555-5555-5555-5555-555555550003',
 2,
 $pf$Implement the hook and refactor the component$pf$,
 $pf$Good catch on the stale-results bug — that's been quietly annoying me. Implement the hook per your proposed API. One file, no deps. Add JSDoc on the exported function. Then show me SearchBar refactored to use it.$pf$,
 $pf$Here's the hook and the refactored component.

```ts
// src/hooks/useDebouncedSearch.ts
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseDebouncedSearchOptions<T> {
  fetcher: (query: string, signal: AbortSignal) => Promise<T[]>
  delay?: number
  minLength?: number
}

interface UseDebouncedSearchResult<T> {
  query: string
  setQuery: (q: string) => void
  results: T[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Debounced async search hook with race-condition-safe responses.
 *
 * - Aborts in-flight requests when the query changes or the component unmounts.
 * - Discards stale responses whose query no longer matches the latest query
 *   (handles the case where a previous fetch resolved AFTER the user moved on).
 * - Clears results immediately when query falls below minLength — does not wait
 *   for a pending fetch to resolve.
 */
export function useDebouncedSearch<T>({
  fetcher,
  delay = 300,
  minLength = 2,
}: UseDebouncedSearchOptions<T>): UseDebouncedSearchResult<T> {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Tracks the most recent query the hook has seen. Used to discard
  // stale fetch responses whose query no longer matches.
  const latestQueryRef = useRef('')

  // Bump counter to force a manual refetch of the current query.
  const [refetchToken, setRefetchToken] = useState(0)
  const refetch = useCallback(() => setRefetchToken(t => t + 1), [])

  useEffect(() => {
    latestQueryRef.current = query

    // Below minLength: clear immediately, don't wait for a fetch.
    if (query.length < minLength) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetcher(query, controller.signal)
        // Discard if a newer query has landed in the meantime.
        if (latestQueryRef.current !== query) return
        setResults(data)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        if (latestQueryRef.current !== query) return
        setError(err as Error)
        setResults([])
      } finally {
        // Only the active fetch may flip loading back to false.
        if (latestQueryRef.current === query) setLoading(false)
      }
    }, delay)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, delay, minLength, fetcher, refetchToken])

  return { query, setQuery, results, loading, error, refetch }
}
```

Refactored SearchBar:

```tsx
// src/components/SearchBar.tsx
import { useCallback } from 'react'
import { useDebouncedSearch } from '../hooks/useDebouncedSearch'

interface Result { id: string; title: string }

async function searchApi(q: string, signal: AbortSignal): Promise<Result[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal })
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  const data = await res.json()
  return data.results
}

export function SearchBar() {
  // useCallback so the fetcher reference is stable — otherwise the hook's
  // effect re-runs on every parent render.
  const fetcher = useCallback(searchApi, [])

  const { query, setQuery, results, loading, error } =
    useDebouncedSearch<Result>({ fetcher })

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {loading && <div>Searching...</div>}
      {error && <div role="alert">Search failed — try again.</div>}
      <ul>
        {results.map(r => <li key={r.id}>{r.title}</li>)}
      </ul>
    </div>
  )
}
```

Notes on the implementation choices:

- **latestQueryRef** is the key to fixing the stale-response bug. Compared to tracking a "current fetch ID" I find comparing by the actual query value cleaner — you're gating on the input the UI cares about, not a synthetic counter. If a response for "cl" arrives after the user has moved on to "clear", latestQueryRef.current !== query throws it away.

- **Early-return on minLength** clears synchronously instead of letting a pending fetch populate results. The old code had a subtle case where typing "cl" then deleting back to "c" didn't actually blank results until the previous fetch resolved — this version sets [] in the same tick as the keystroke.

- **refetch uses a bump counter**, not a ref. Counter bumps trigger the effect (it's in the deps array); a ref wouldn't. Standard pattern.

- **fetcher in the effect deps** requires the caller to useCallback it — otherwise every parent re-render creates a new function reference, which triggers the effect, which re-fetches. I considered hiding this via a fetcherRef inside the hook, but that would paper over a real concern (if the fetcher closes over stale state, you actually want the hook to reflect that). Better to surface it to the caller.

- **No useReducer** — considered it for the 4 state fields but a plain multi-useState reads fine here. Reducer would add ceremony without a correctness win.

- **No race on setLoading(false)** in the finally — the latestQueryRef gate ensures only the active fetch flips loading back. Otherwise a resolved-stale fetch could prematurely hide the spinner while a newer fetch is still pending.

Drop-in replacement for the inline useEffect in your 3 other components. Each callsite just passes its own fetcher.$pf$,
 $pf$Implements the hook with a latestQueryRef to gate stale responses, immediate-clear on below-minLength, surfaced error state, and a manual refetch handle — then shows SearchBar rebuilt as an 18-line consumer of the hook.$pf$);

-- =========================================================================
-- Project 55-0004 | Cohort retention from a messy events table | Raj Patel | Data | 5 steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550004';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550004';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550004',
  $pf$Cohort retention from a 14M-row events table — a 5-pass build with Claude 4.7 Opus$pf$,
  $pf$A SaaS client handed me a 14M-row user_events table with no docs and asked "how is retention?". I used Claude across five passes to interpret the schema, define what an active user actually means, write the cohort SQL, QA my own query, and ship a Metabase-friendly version with parameters.$pf$,
  $pf$I freelance as a data analyst — three weeks ago a B2B SaaS client (a small recruiting platform, ~8k accounts, ~40k seats) asked me a deceptively simple question: "how is retention?" They handed me a Postgres dump with one big table called `user_events` and roughly zero documentation. 14M rows, four years of history, two product rewrites in the middle.

I'd normally spend a day just exploring before touching SQL. Instead I ran the whole thing through Claude 4.7 Opus across five passes — schema reconnaissance, defining what "active" means for this product, the actual cohort SQL, a self-review pass to catch the gotchas I usually miss the first time (timezones, double-counting, deleted users), and finally a Metabase-friendly version with parameters my client can re-run themselves.

Total turnaround: about 90 minutes. The query I shipped runs in 2.4s on their warehouse and gives them weekly cohort retention curves they can break down by signup source, plan tier, and seat type. Posting the chain because the QA pass (step 4) is where Claude saved my client from a wrong number — I had a quiet timezone bug that would have inflated week-1 retention by ~6 points.$pf$,
  $pf$Shipped: a single 78-line SQL query plus a Metabase-parameterized variant. Weekly cohort retention runs in 2.4s on their warehouse, broken down by signup_source, plan_tier, and seat_type. Findings I delivered to the client: week-1 retention is 71.3% (healthy), week-4 drops to 38.2% (concerning), and the 2024 product rewrite cohort actually retains 9pts BETTER than the 2023 cohort at week-12 — the rewrite worked, but nobody had ever measured it.

What I got out of running this with Claude: the schema reconnaissance pass surfaced two dead event types (`legacy_login_v1`, `temp_session_ping`) that would have polluted my "active user" definition — I would have caught those eventually but maybe after one bad delivery. The QA pass (step 4) caught a real bug — I was joining on `created_at::date` without specifying timezone, and the events table was UTC while signups were stored in client local time (America/Chicago). Fixing it dropped week-1 retention from 77.4% to 71.3%. That's the difference between "we're killing it" and "we have an onboarding problem" — exactly the kind of error that gets a freelancer fired.$pf$,
  '11111111-1111-1111-1111-111111111108',
  'advanced',
  'claude-opus-4-7',
  'Claude 4.7 Opus',
  ARRAY['Claude','PostgreSQL','Metabase','dbt'],
  ARRAY['sql','retention','cohort-analysis','postgres','data-analytics','b2b-saas'],
  'approved',
  '22222222-2222-2222-2222-222222222207',
  103, 47
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('66666666-6666-6666-6666-666666640101',
 '55555555-5555-5555-5555-555555550004',
 1,
 $pf$Schema reconnaissance — what is this table actually telling me$pf$,
 $pf$I'm a freelance data analyst and a B2B SaaS client just handed me a Postgres dump with one big table, `user_events`, and asked "how is retention?". They have ~8,000 accounts and ~40,000 seats across those accounts. Zero documentation. Two product rewrites in the table's history (mid-2023, late-2024 — they told me that much).

Here's the DDL and 20 sample rows. Before I write any SQL, I want you to read this like a forensic analyst: tell me what you think this table is recording, what each event_type means based on context, which fields are unreliable or ambiguous, and where the gotchas are likely to bite me when I try to define an "active user."

```sql
CREATE TABLE user_events (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL,
  account_id    UUID,
  event_type    TEXT NOT NULL,
  event_payload JSONB,
  client_ts     TIMESTAMP,            -- client-reported, no TZ
  server_ts     TIMESTAMPTZ NOT NULL, -- UTC
  source        TEXT,                 -- 'web' | 'api' | 'mobile' | NULL
  app_version   TEXT
);
CREATE INDEX idx_ue_user_ts ON user_events (user_id, server_ts DESC);
CREATE INDEX idx_ue_acct_ts ON user_events (account_id, server_ts DESC);
```

Sample event_types I see in the data: `login`, `logout`, `legacy_login_v1`, `session_start`, `session_end`, `page_view`, `temp_session_ping`, `feature_used`, `search_performed`, `candidate_added`, `candidate_messaged`, `pipeline_advanced`, `report_exported`, `seat_invited`, `seat_accepted`, `billing_view`, `password_reset`. (Counts vary wildly — `page_view` is 8M+ rows, `legacy_login_v1` is 240k.)

Don't write SQL yet. Tell me what I should be careful about.$pf$,
 $pf$Good — let's do the forensics before the SQL, otherwise you'll bake a mistake into a metric and the client will quote it back to you for a quarter.

**What this table is.** A unified product-telemetry table, append-only, recording everything a user does in the recruiting platform. The dual timestamp (`client_ts` no-TZ, `server_ts` UTC) is the giveaway — somebody set this up expecting client clocks to drift but wanted server truth as the canonical source. Trust `server_ts`. Don't ever join on `client_ts` unless you have to reconstruct user-perceived ordering for a UX investigation.

**Event-type taxonomy I'd build before defining "active":**

- **Authentication noise:** `login`, `logout`, `legacy_login_v1`, `password_reset`, `temp_session_ping`. These are necessary plumbing but they are NOT engagement. A user who logs in and bounces is not retained — they're a tab.
- **Session boundaries:** `session_start`, `session_end`. Useful for session-length but redundant for "did the user show up." Skip for cohort retention.
- **Soft engagement:** `page_view`, `search_performed`, `billing_view`. They opened the app but didn't do work. Counts as "active" by a permissive definition; doesn't count by a strict one. Decision point — flag it.
- **Real work (the gold):** `candidate_added`, `candidate_messaged`, `pipeline_advanced`, `report_exported`. These move the customer's actual job forward. THIS is what you want as the activity signal for a recruiting platform — a customer who logs in and does no candidate work is at risk regardless of login frequency.
- **Account lifecycle:** `seat_invited`, `seat_accepted`. User-level events but they describe account growth, not user activity. Don't include in retention denominators.

**The two events I'd quarantine immediately:**

1. **`legacy_login_v1`** (240k rows). The name and the count tell the story — left over from the pre-2023-rewrite product. Confirm with the client, but I'd bet these were auto-emitted during a migration backfill, not real user logins. Including them in your "active user" definition will inflate retention for any cohort overlapping the migration window.
2. **`temp_session_ping`** — sounds like a heartbeat the app emits while a tab is open. If it fires every N seconds, it'll absolutely dominate your activity counts and tell you nothing about engagement. Quarantine until proven otherwise.

**Other gotchas before you write SQL:**

- **`account_id` is nullable.** Some events have a user but no account — probably pre-account-creation flow (signup, email verify). Don't `INNER JOIN` to accounts blindly; you'll lose the signup funnel.
- **Two product rewrites in the history.** Event types may have been renamed across rewrites. Before computing 4-year retention, ask the client if (e.g.) `candidate_added` was called something else in 2022. If yes, you'll need an event-type alias map.
- **Client TS is no-TZ but server TS is UTC.** When you bucket by day for cohorts, decide which timezone the bucket lives in. The client is in Chicago — if you say "weekly cohort starting Monday" in UTC vs America/Chicago, you'll shift roughly 5% of week-boundary events into different buckets. Pick one explicitly.
- **No soft-delete column.** You'll want to know whether dropped users still exist in this table or were hard-deleted. If hard-deleted, retention will look artificially good (the denominator is missing the people who left hardest).

**My recommended next step:** confirm with the client that (a) `legacy_login_v1` and `temp_session_ping` should be excluded, (b) the canonical activity definition for "this user did real work this week" is "any of `candidate_added`, `candidate_messaged`, `pipeline_advanced`, `report_exported`", and (c) which timezone they want cohort weeks bucketed in. Then we can write SQL that means something.$pf$,
 $pf$Reads the DDL + 20 sample rows like a forensic analyst, names the table's purpose, classifies the 17 event types into 5 functional buckets, flags two specific events (`legacy_login_v1`, `temp_session_ping`) to quarantine, and surfaces 4 other gotchas (nullable account_id, rewrite-era event renames, dual-timezone trap, missing soft-delete).$pf$),

-- Step 2 --
('66666666-6666-6666-6666-666666640102',
 '55555555-5555-5555-5555-555555550004',
 2,
 $pf$Decide what "active user" means + pick the cohort grain$pf$,
 $pf$Confirmed with the client. They want to quarantine `legacy_login_v1` and `temp_session_ping`. They confirmed event-type names were stable across the rewrites (only the UI changed). Their business is in America/Chicago and they want weekly cohort buckets aligned to local Mondays.

Now help me make two definitional calls I keep going back and forth on:

1. **Active user definition.** Strict (any of: `candidate_added`, `candidate_messaged`, `pipeline_advanced`, `report_exported`) vs broad (any non-quarantined event). Strict measures real value delivered; broad measures opening the app. I lean strict but recruiting has a workflow where some weeks a user is screening candidates (lots of `page_view` + `search_performed`) and some weeks they're moving people through the pipeline. A strict-only definition might mark "screening weeks" as inactive even though the user is engaged.

2. **Cohort grain.** User-level cohorts (each user's signup week) vs account-level cohorts (each account's signup week, retention measured at "did ANY seat on this account do work"). User-level is standard; account-level is what the client probably actually cares about because they sell account contracts.

For each, give me the tradeoff in one paragraph and your recommendation. I want to ship a defensible answer to a non-technical client, not the most elegant model.$pf$,
 $pf$Both calls are real and both have a defensible answer. Here's how I'd break it down for a client:

**Active-user definition: go with a 2-tier definition, not strict OR broad.**

The screening week problem you raised is correct — a strict definition will undercount engagement during research-heavy weeks, and your client will (rightly) push back when they see retention numbers that don't match their gut. But broad is worse: it lets a user who opened the billing page once count as active, which is the classic "MAU-inflated-to-show-the-board" pattern that destroys analyst credibility.

The clean answer: **report two retention numbers side by side**.
- **Engaged retention:** any of `candidate_added`, `candidate_messaged`, `pipeline_advanced`, `report_exported` in the bucket. This is "did real work."
- **Active retention:** above OR (`search_performed` ≥ 2 in the bucket OR `page_view` ≥ 5 in the bucket). The thresholds keep accidental-tab visits out while letting real screening behavior count.

Two columns next to each other, both labeled, no editorializing. The client can compare the gap — if Engaged is way below Active, they have a "users come but don't do work" problem. If they track together, the funnel is healthy. This also forecloses the "you cherry-picked the metric" objection because you reported both.

**Cohort grain: account-level, full stop.**

User-level cohorts are the academic-textbook answer; they're useful for studying individual user journeys (e.g., "do users who ship a candidate in week 1 retain better?"). But your client sells account contracts. The thing that determines whether they keep revenue is whether the ACCOUNT is alive — meaning ANY seat on the account did real work in the period. A user-level cohort will tell you "60% of users retained at week 4," which is fine for a product newsletter but doesn't answer the CFO's question.

Account-level cohort: the cohort is the set of accounts whose first-ever event landed in week W. Retention at week N = fraction of those accounts where ANY seat did Engaged-tier activity in week W+N.

One caveat to flag for your client: account-level retention will look HIGHER than user-level (the bar — "any seat" — is permissive). That's correct, but it can read as "the data analyst gave us flattering numbers." Pre-empt that — show user-level retention as a secondary chart so they see the gap and trust that you weren't trying to hide the harder number.

**My final recommendation for what you ship:** account-level cohorts as the headline retention curve, with two columns (Engaged + Active) side by side. User-level retention as a secondary diagnostic chart. That's the version that survives a client meeting where the CRO and the CFO ask different questions.$pf$,
 $pf$Recommends a 2-tier active definition (Engaged: candidate-action events; Active: above OR thresholded page_view/search_performed) reported side-by-side, plus account-level cohort grain as the headline metric with user-level as a secondary diagnostic — explicitly framed as the answer that survives a meeting with both the CRO and CFO.$pf$),

-- Step 3 --
('66666666-6666-6666-6666-666666640103',
 '55555555-5555-5555-5555-555555550004',
 3,
 $pf$Write the cohort retention SQL — production-ready Postgres$pf$,
 $pf$Great — going with account-level cohorts and the 2-tier (Engaged + Active) reporting. Now write the actual SQL.

Requirements:
- Postgres 15 (CTEs, generate_series, FILTER clause are all fair game).
- Output: one row per (cohort_week, weeks_since_signup, metric) with cohort_size and retained_accounts.
- Quarantine `legacy_login_v1` and `temp_session_ping`.
- Bucket weeks by America/Chicago Monday-start.
- Compute both Engaged retention and Active retention in one query (don't make me run it twice).
- Cap the analysis at 26 weeks since signup (no need for years-out tail).
- Comment the load-bearing logic so I can explain it to the client.

Aim for production-quality. I'll be running this against ~14M event rows so don't write something that does a full table scan per cohort.$pf$,
 $pf$Here's the query. Should run in 2–4s on a warehouse-sized Postgres against 14M rows because the activity-buckets CTE is the only full scan and everything downstream joins on small intermediate sets.

```sql
-- =====================================================================
-- Account-level weekly cohort retention, 2-tier (Engaged + Active)
-- Bucket: America/Chicago, Monday-start
-- Window: 26 weeks since signup
-- =====================================================================
WITH
-- 1) Filter the noise once. Everything downstream reads from this.
clean_events AS (
  SELECT
    account_id,
    user_id,
    event_type,
    -- Anchor every event to the local Monday it falls on.
    date_trunc('week', server_ts AT TIME ZONE 'America/Chicago')::date AS local_week
  FROM user_events
  WHERE account_id IS NOT NULL
    AND event_type NOT IN ('legacy_login_v1', 'temp_session_ping')
),

-- 2) Per (account, week): did the account do any Engaged work?
--    Did it cross the Active threshold? Compute both flags in one pass.
account_week_activity AS (
  SELECT
    account_id,
    local_week,
    -- Engaged: any candidate-action or report event hit
    BOOL_OR(event_type IN (
      'candidate_added','candidate_messaged','pipeline_advanced','report_exported'
    )) AS engaged,
    -- Active: Engaged OR thresholded soft-engagement
    (
      BOOL_OR(event_type IN (
        'candidate_added','candidate_messaged','pipeline_advanced','report_exported'
      ))
      OR COUNT(*) FILTER (WHERE event_type = 'search_performed') >= 2
      OR COUNT(*) FILTER (WHERE event_type = 'page_view')        >= 5
    ) AS active
  FROM clean_events
  GROUP BY account_id, local_week
),

-- 3) Each account's cohort = the local week of its first non-noise event.
account_cohort AS (
  SELECT
    account_id,
    MIN(local_week) AS cohort_week
  FROM clean_events
  GROUP BY account_id
),

-- 4) Cohort sizes: how many accounts started in each week.
cohort_sizes AS (
  SELECT cohort_week, COUNT(*) AS cohort_size
  FROM account_cohort
  GROUP BY cohort_week
),

-- 5) Join activity to cohort, compute weeks_since_signup, cap at 26.
retention_long AS (
  SELECT
    ac.cohort_week,
    -- Whole-week offset since the cohort started.
    ((awa.local_week - ac.cohort_week) / 7)::int AS weeks_since_signup,
    awa.engaged,
    awa.active,
    awa.account_id
  FROM account_cohort ac
  JOIN account_week_activity awa USING (account_id)
  WHERE awa.local_week >= ac.cohort_week
    AND awa.local_week <  ac.cohort_week + INTERVAL '27 weeks'
)

-- 6) Roll up: distinct accounts retained per cohort × week × metric.
SELECT
  rl.cohort_week,
  rl.weeks_since_signup,
  cs.cohort_size,
  COUNT(DISTINCT rl.account_id) FILTER (WHERE rl.engaged) AS engaged_retained,
  COUNT(DISTINCT rl.account_id) FILTER (WHERE rl.active)  AS active_retained,
  ROUND(
    100.0 * COUNT(DISTINCT rl.account_id) FILTER (WHERE rl.engaged) / cs.cohort_size,
    2
  ) AS engaged_retention_pct,
  ROUND(
    100.0 * COUNT(DISTINCT rl.account_id) FILTER (WHERE rl.active) / cs.cohort_size,
    2
  ) AS active_retention_pct
FROM retention_long rl
JOIN cohort_sizes cs USING (cohort_week)
GROUP BY rl.cohort_week, rl.weeks_since_signup, cs.cohort_size
ORDER BY rl.cohort_week, rl.weeks_since_signup;
```

**A few load-bearing notes:**

- The `clean_events` CTE is the only full scan of `user_events`. Everything below it operates on (account, week) pairs, which collapses 14M rows into something on the order of (8k accounts × 200 weeks) ≈ 1.6M rows max — cheap.
- `BOOL_OR(...)` and `COUNT(*) FILTER (...)` are both single-pass aggregates, so step 2 stays one scan over `clean_events` even though it computes two metrics.
- The `account_cohort` CTE uses MIN on `local_week` — meaning the cohort is anchored to FIRST non-noise activity, not signup row. If your client's `accounts` table has a true `created_at`, you could swap to that — but anchoring to first-event keeps the query self-contained and avoids the "account exists but never logged in" cohort polluting week-0.
- The 27-week interval upper bound is intentional: `weeks_since_signup` from 0 through 26 inclusive is 27 buckets.
- `ROUND(..., 2)` on the percentage is for client readability. If you're feeding this into a chart, drop the round and let the viz handle precision.

Run it and check three sanity values: (a) every cohort's week-0 engaged_retention_pct should be ≤ 100 (if it's > 100 you have an account with first-event NOT being its earliest event — bug); (b) the SUM of cohort_size across all cohort_weeks should equal the count of distinct account_ids in the table; (c) week-26 retention should be lower than week-0. If any of those fail, stop and re-read the CTEs.$pf$,
 $pf$Production Postgres query: 6 CTEs that quarantine noise once, compute Engaged + Active flags per (account, week) in one pass, anchor each account to its first-event week as the cohort, cap at 26 weeks since signup, and return cohort_size + retained counts + percentages. Includes architecture notes (single full-scan, pair-collapse rationale, 27-week upper bound, ROUND for client readability) and three sanity checks to validate the output.$pf$),

-- Step 4 --
('66666666-6666-6666-6666-666666640104',
 '55555555-5555-5555-5555-555555550004',
 4,
 $pf$Self-review the query — find what I missed before I ship to the client$pf$,
 $pf$I ran the query. Numbers came back. Week-0 engaged retention is 77.4% which feels high for a B2B SaaS recruiting platform — that would put them above Loom's published numbers. Before I ship this to the client, I want you to review your OWN query critically and tell me what's wrong with it. Be specific. I'd rather catch a bug now than have the CRO point one out in the meeting.$pf$,
 $pf$You're right to be suspicious. 77.4% week-0 Engaged retention is suspiciously high — B2B SaaS week-0 is usually 60–72% even for healthy products. Reviewing my own query, I found one real bug and two conceptual choices worth re-examining.

**Bug — timezone bucketing leak (this is the one that's inflating week-0):**

The query buckets event timestamps using `date_trunc('week', server_ts AT TIME ZONE 'America/Chicago')`. That's correct — it shifts the UTC server_ts into local time before truncating. BUT `date_trunc('week', ...)` in Postgres returns a TIMESTAMP, and I'm casting to `::date` — which silently drops the timezone information and uses the SERVER's timezone for the date portion of the conversion. If your warehouse is set to UTC (which it almost certainly is), the round-trip is `UTC server_ts → Chicago local timestamp → TIMESTAMP without TZ → ::date interpreted in UTC again`.

Net effect: events that happen Sunday evening Chicago time (which is Monday morning UTC) get bucketed to the WRONG week. A user who signs up Sunday 8pm Chicago and does work Sunday 8pm Chicago looks like a week-0-and-week-1 retained user instead of just week-0. That's pure double-counting on week-0 → week-1.

**Fix:**
```sql
-- Before:
date_trunc('week', server_ts AT TIME ZONE 'America/Chicago')::date

-- After:
(date_trunc('week', server_ts AT TIME ZONE 'America/Chicago'))::date
-- equivalently and clearer:
(server_ts AT TIME ZONE 'America/Chicago')::date
  - EXTRACT(DOW FROM (server_ts AT TIME ZONE 'America/Chicago'))::int * INTERVAL '1 day'
  + INTERVAL '1 day'  -- adjust DOW=0 (Sun) to Mon-anchored
```

Actually the cleanest fix is to do the cast AT TIMEZONE-aware:
```sql
date_trunc('week', server_ts AT TIME ZONE 'America/Chicago')::date
-- becomes:
(date_trunc('week', server_ts AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago')::date
```

Apply that change in `clean_events` and re-run. Expect week-0 Engaged retention to drop ~5–7 percentage points. If it lands around 70–72%, the bug is fixed and the new number is the truth.

**Conceptual issue #1 — week-0 is not really "retention."**

By construction, every account in the cohort has activity in their cohort week (that's how I defined the cohort). So week-0 retention is mathematically guaranteed to be 100% for the Engaged subset that defined it... EXCEPT my Engaged definition is narrower than the "any event" definition that anchored the cohort. So an account whose first-ever activity was a `page_view` (Active but not Engaged) anchors at that week with engaged=false, then maybe never does Engaged work — so week-0 Engaged is meaningfully < 100%. That's correct but it's confusing to explain.

**Recommendation:** in the chart, label week-0 as "the signup week" not "week-0 retention." It's a baseline, not retention. Real retention starts at week 1.

**Conceptual issue #2 — accounts with very recent signup will skew the recent cohorts.**

An account that signed up 3 weeks ago can only contribute weeks 0, 1, 2. It cannot be "retained" at week 12 because the data physically doesn't exist yet. The query treats missing weeks as "not retained," which means recent cohorts will look like they have a cliff at the data boundary.

**Recommendation:** add a filter so any (cohort_week, weeks_since_signup) bucket where `cohort_week + weeks_since_signup * 7 > MAX(local_week_in_data) - 6` is excluded from the chart. Or compute it in the SQL with a CTE that knows the data's max date and NULLs out incomplete buckets. I can write it if you want, but it's a charting-layer concern more than a SQL concern — Metabase has a "ignore nulls" toggle that handles it cleanly.

**What I'd ship:** apply the timezone fix, re-run, expect ~71% week-0 Engaged, send the chart with the "signup week is baseline" label, and put the recent-cohort caveat in the chart footnote.$pf$,
 $pf$Self-review catches one real bug (timezone double-bucketing in date_trunc::date round-trip — inflates week-0 retention by ~5-7pts) plus two conceptual issues (week-0 is mathematically baseline not retention; recent cohorts have data-boundary cliffs that read as retention drops). Provides the SQL fix and recommends labeling, charting, and footnote treatments.$pf$),

-- Step 5 --
('66666666-6666-6666-6666-666666640105',
 '55555555-5555-5555-5555-555555550004',
 5,
 $pf$Adapt the query for Metabase with parameters my client can change$pf$,
 $pf$Bug fixed, week-0 dropped to 71.3% — much more believable. Now I want to ship this to the client as a Metabase question they can re-run themselves. Three things they need to be able to change without touching SQL:
1. The cohort window (e.g., only show cohorts that started in the last 12 months)
2. A filter on signup_source (web vs API vs mobile vs all)
3. A filter on plan_tier (their accounts table has free / pro / enterprise tiers)

The accounts table is `accounts (id UUID, plan_tier TEXT, signup_source TEXT, created_at TIMESTAMPTZ)`. Rewrite the query to use Metabase's `{{parameter}}` syntax (with the `[[...optional...]]` brackets so params can be left blank).$pf$,
 $pf$Here's the Metabase-parameterized version. The three parameters use Metabase's optional-clause syntax `[[ ... ]]` so each filter only injects when the user sets a value.

```sql
WITH
clean_events AS (
  SELECT
    ue.account_id,
    ue.user_id,
    ue.event_type,
    (date_trunc('week', ue.server_ts AT TIME ZONE 'America/Chicago')
       AT TIME ZONE 'America/Chicago')::date AS local_week
  FROM user_events ue
  JOIN accounts a ON a.id = ue.account_id
  WHERE ue.account_id IS NOT NULL
    AND ue.event_type NOT IN ('legacy_login_v1', 'temp_session_ping')
    [[ AND a.signup_source = {{signup_source}} ]]
    [[ AND a.plan_tier      = {{plan_tier}} ]]
),

account_week_activity AS (
  SELECT
    account_id,
    local_week,
    BOOL_OR(event_type IN (
      'candidate_added','candidate_messaged','pipeline_advanced','report_exported'
    )) AS engaged,
    (
      BOOL_OR(event_type IN (
        'candidate_added','candidate_messaged','pipeline_advanced','report_exported'
      ))
      OR COUNT(*) FILTER (WHERE event_type = 'search_performed') >= 2
      OR COUNT(*) FILTER (WHERE event_type = 'page_view')        >= 5
    ) AS active
  FROM clean_events
  GROUP BY account_id, local_week
),

account_cohort AS (
  SELECT account_id, MIN(local_week) AS cohort_week
  FROM clean_events
  GROUP BY account_id
  HAVING TRUE
    [[ AND MIN(local_week) >= {{cohort_start_date}} ]]
),

cohort_sizes AS (
  SELECT cohort_week, COUNT(*) AS cohort_size
  FROM account_cohort
  GROUP BY cohort_week
),

retention_long AS (
  SELECT
    ac.cohort_week,
    ((awa.local_week - ac.cohort_week) / 7)::int AS weeks_since_signup,
    awa.engaged,
    awa.active,
    awa.account_id
  FROM account_cohort ac
  JOIN account_week_activity awa USING (account_id)
  WHERE awa.local_week >= ac.cohort_week
    AND awa.local_week <  ac.cohort_week + INTERVAL '27 weeks'
)

SELECT
  rl.cohort_week,
  rl.weeks_since_signup,
  cs.cohort_size,
  COUNT(DISTINCT rl.account_id) FILTER (WHERE rl.engaged) AS engaged_retained,
  COUNT(DISTINCT rl.account_id) FILTER (WHERE rl.active)  AS active_retained,
  ROUND(100.0 * COUNT(DISTINCT rl.account_id) FILTER (WHERE rl.engaged) / cs.cohort_size, 2) AS engaged_retention_pct,
  ROUND(100.0 * COUNT(DISTINCT rl.account_id) FILTER (WHERE rl.active)  / cs.cohort_size, 2) AS active_retention_pct
FROM retention_long rl
JOIN cohort_sizes cs USING (cohort_week)
GROUP BY rl.cohort_week, rl.weeks_since_signup, cs.cohort_size
ORDER BY rl.cohort_week, rl.weeks_since_signup;
```

**Metabase parameter setup (configure in the question UI after pasting the SQL):**

| Parameter            | Type           | Default        | Notes |
|----------------------|----------------|----------------|-------|
| `signup_source`      | Field Filter   | (none)         | Map to `accounts.signup_source` so Metabase auto-populates the dropdown with web / api / mobile / null. Optional. |
| `plan_tier`          | Field Filter   | (none)         | Map to `accounts.plan_tier`. Optional. |
| `cohort_start_date`  | Date           | 12 months ago  | Single date input. The HAVING clause means leaving it blank shows ALL cohorts; setting it shows only cohorts that started on/after that date. |

**Why the `HAVING TRUE [[ AND ... ]]` pattern in `account_cohort`:**

You can't put an optional Metabase clause directly after `GROUP BY` — the parser will choke if the optional doesn't expand. Anchoring with `HAVING TRUE` gives the optional something to tack onto, and `TRUE` evaluates trivially when the param is unset.

**Two things to set on the Metabase question itself, not in SQL:**

1. **Visualization → Line chart**, X = `weeks_since_signup`, Y = both `engaged_retention_pct` and `active_retention_pct` as separate series, breakout/series = `cohort_week`. This gives the standard cohort triangle as overlapping curves.
2. **"Hide rows where retention is from incomplete cohort"** — add a chart-level filter `weeks_since_signup * 7 + cohort_week <= NOW()::date - 7`. Cleanest done in the viz layer, not SQL.

**One ops note:** the JOIN to `accounts` in `clean_events` will full-scan `accounts` once per query run. Confirm `accounts.id` has a primary-key index (it should, but check on a client warehouse — I've seen worse).$pf$,
 $pf$Adapts the production query to Metabase with three optional `[[{{parameter}}]]` filters (signup_source, plan_tier, cohort_start_date), uses the `HAVING TRUE [[AND ...]]` pattern to make the cohort-window optional, and includes the parameter-table config + chart-side viz advice + an ops note about the accounts.id index.$pf$);

-- =========================================================================
-- Project 55-0005 | Differentiated 9th-grade biology lesson | Ben Okafor | Education | 3 steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550005';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550005';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550005',
  $pf$Differentiated 9th-grade biology lesson on cellular respiration — tiered plan + lab rubric + exit ticket$pf$,
  $pf$I teach 9th-grade biology to a class with three reading levels and four students on IEPs. Built one 50-minute lesson on cellular respiration that genuinely works for all three tiers, plus a 4-point lab rubric and a 5-question NGSS-aligned exit ticket. Three Claude passes, ~40 minutes total.$pf$,
  $pf$I teach 9th-grade biology at a Title-I high school in Chicago. My 4th-period class has 28 students — 4 on IEPs (two with reading-level accommodations, one with extended time, one ELL who's at WIDA level 3), about 8 students reading at grade level, and the rest a mix above and below. The unit on cellular respiration always trips me up because the textbook treats it like a one-size lecture and half my class checks out by minute 12.

I used Claude Sonnet 4.6 across three passes. First pass: build me ONE 50-minute lesson plan with three differentiation tiers (modified, on-grade, extension) so I'm not running three separate classes simultaneously — same content, three entry points. Second pass: build a 4-point lab rubric for the molasses-and-yeast fermentation activity that's IEP-friendly (clear behavior anchors, not vague "shows understanding"). Third pass: write a 5-question exit ticket aligned to NGSS HS-LS1-7, with a mix of recall and application items.

Posting because the differentiation tier in step 1 — "same phenomenon, three entry-point ramps" — is a structure I've adapted for three other units now. It's not magic but it's a pattern that actually composes.$pf$,
  $pf$Used the lesson Tuesday with my 4th-period class. Engagement was the highest I've seen on this topic — the molasses-and-yeast hook lasted past minute 12 (my usual checkout point) and kids were still asking "wait so why does the balloon inflate" at minute 35. Two of my IEP students used the modified tier handout independently for the first time this semester (usually they wait for me to come over). Exit ticket results: 24/28 hit 4/5 or 5/5, including 3 of the 4 IEP students.

What I'm taking forward: the "same phenomenon, three entry-point ramps" structure from step 1 is the load-bearing piece. I've now built two more lessons (osmosis and DNA replication) on the same template — modified tier gets the visual + a fill-in-the-blank scaffold; on-grade gets the prompt cold; extension gets a "now connect this to..." hook. It composes. Also the 4-point rubric format from step 2 with explicit behavior anchors (not "shows understanding" — actually "writes a labeled equation including reactants and products") cut my grading time roughly in half because I'm not rewriting the same feedback 28 times.$pf$,
  '11111111-1111-1111-1111-111111111106',
  'beginner',
  'claude-sonnet-4-6',
  'Claude 4.6 Sonnet',
  ARRAY['Claude'],
  ARRAY['lesson-planning','biology','differentiation','ngss','high-school','iep'],
  'approved',
  '22222222-2222-2222-2222-222222222205',
  87, 52
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('66666666-6666-6666-6666-666666650101',
 '55555555-5555-5555-5555-555555550005',
 1,
 $pf$One 50-minute lesson, three differentiation tiers$pf$,
 $pf$I teach 9th-grade biology, 28 students, mixed levels. 4 IEPs (2 reading-level mods, 1 extended time, 1 ELL at WIDA 3), maybe 8 on-grade, rest scattered above and below. Topic is cellular respiration — specifically, that glucose + oxygen produce ATP + CO2 + water, and that yeast does it without oxygen (fermentation) producing CO2 + ethanol. NGSS standard is HS-LS1-7.

I want ONE 50-minute lesson plan with a single shared phenomenon (the hook) and ONE shared closing activity (an exit ticket I'll prompt separately), but THREE differentiated middle sections — Modified, On-Grade, Extension — that I can hand to small groups working in parallel. I have a TA who can float between groups for the middle 25 minutes.

Constraints:
- No expensive lab supplies. Molasses + yeast + balloons + warm water is what I have.
- Modified tier needs visual scaffolds and lower reading load (max grade-5 reading level on handouts).
- On-grade tier should match a textbook section.
- Extension tier should push toward "explain WHY anaerobic happens when oxygen runs out" without going into the electron transport chain.
- The whole thing has to fit in 50 minutes including transitions.

Output as a structured plan I can print as a teacher-facing one-pager.$pf$,
 $pf$Here's the lesson. Single phenomenon, three middle ramps, shared close. Times include transitions.

---

**LESSON: Why does the balloon inflate?**
9th-Grade Biology · Cellular Respiration & Fermentation · NGSS HS-LS1-7
50 minutes · 28 students · 1 teacher + 1 TA

---

**MINUTES 0–8 · Hook (whole class, shared)**

Set up before students arrive: 4 stations, each with a 16-oz bottle containing warm water + 1 tbsp molasses + 1 packet active dry yeast. A balloon stretched over each bottle's neck. Started ~10 min before bell so the reaction is visibly underway as students walk in.

Whole-class anchor question on the board: *"The balloon is inflating. Nothing is being added. Where is the gas coming from?"* Give 90 seconds of silent think-time, then 2 minutes turn-and-talk, then take 3 hands. Don't correct yet. Write the three most-different answers on the board. (You'll come back to them at minute 45.)

**MINUTES 8–10 · Tier assignment + transition**

Color-coded handouts on each table (you've pre-assigned which student gets which tier — don't make it visible whose tier is whose; print on identical paper and just hand them out). Explain: "Each handout walks you through the same question from a different angle. Work with your table. I'll be checking in. Mr./Ms. [TA] will too."

---

**MINUTES 10–35 · Differentiated middle (parallel groups)**

**🟦 MODIFIED TIER (reading level ~grade 5, heavy visual)**

Page 1 (visual): A labeled cartoon of a yeast cell. Arrow IN labeled "sugar". Arrow OUT labeled "gas (CO₂) + alcohol". Speech bubble from the yeast: "I eat sugar. I make gas. I do this when there's no oxygen."

Page 2 (fill-in-the-blank): Three sentences with word bank.
- "Yeast eats _____ to get energy." (sugar)
- "When yeast does this without oxygen, it makes _____ gas." (CO₂ / carbon dioxide)
- "The gas inflates the _____." (balloon)

Page 3 (draw): Print box. "Draw what's happening inside the bottle. Use arrows for what goes IN and what comes OUT."

TA cue: prompt students to say their answers out loud before writing. Accept verbal-only from the WIDA-3 student.

**🟩 ON-GRADE TIER (matches Miller/Levine textbook section 9.3)**

Page 1: 1-paragraph reading on cellular respiration (aerobic) — glucose + oxygen → ATP + CO₂ + H₂O. Diagram of the equation.

Page 2: 1-paragraph reading on fermentation (anaerobic) — glucose → CO₂ + ethanol + a small amount of ATP. Diagram of the equation.

Page 3: 4 questions.
1. Write the balanced equation for cellular respiration.
2. Write the equation for alcoholic fermentation.
3. The bottle has yeast + sugar + water + a balloon. There's no air pump. Explain in 2 sentences where the gas comes from.
4. Why do you think yeast in a sealed bottle does fermentation instead of cellular respiration?

**🟥 EXTENSION TIER (push toward mechanism)**

Page 1: Same two equations as on-grade tier. Plus a third sentence: "Cellular respiration produces ~36 ATP per glucose. Fermentation produces 2."

Page 2: 3 questions.
1. If fermentation makes 18× less ATP, why would any organism ever do it?
2. The bottle is sealed and contains yeast + sugar + water. After 5 minutes of cellular respiration, what runs out first — the sugar or the oxygen? Explain how you know.
3. Predict: if I left the bottle for 24 hours, would the balloon inflate forever? Why or why not? (You can use what you know about yeast cells dying in alcohol.)

Floor / TA cue: extension students often jump to "ATP synthase" — redirect toward the conceptual answer. Reward "oxygen runs out first because the bottle is sealed" without requiring electron-transport-chain language.

---

**MINUTES 35–45 · Reconvene + share-out (whole class)**

Each tier sends 1 spokesperson to the board. Modified spokesperson: shares their drawing. On-grade spokesperson: writes the fermentation equation. Extension spokesperson: explains why fermentation happens in a sealed bottle.

Critical move: ALL three answers are correct and complementary. Frame it explicitly: "The drawing shows WHAT is happening. The equation shows the chemistry. The 'sealed bottle' explanation shows WHY. Together that's the whole answer." This makes the differentiation feel like collaboration, not stratification.

Return to the original three hypotheses on the board. Cross out any wrong ones with student input. Confirm the right one.

**MINUTES 45–50 · Exit ticket (whole class, prompt below in step 3)**

---

**Materials checklist:**
- 4 bottles (16 oz each) · molasses (1 tbsp/bottle) · yeast (1 packet/bottle) · 4 balloons · warm water
- Handouts: 12 Modified (color: blue), 12 On-Grade (color: green), 4 Extension (color: red) — adjust counts to your roster
- Exit ticket (5 questions — see step 3)

**TA brief (pre-class, 2 min):** "Float between Modified and Extension tiers — On-Grade kids work independently. For Modified students who freeze on writing, accept verbal answers and mark for me. For Extension kids who jump to electron-transport-chain language, redirect to the conceptual question."

**Notes I would tell another teacher running this:**
- Pre-set the bottles BEFORE students walk in. The balloon needs 10–12 min of warm-water + yeast time to be visibly inflated. If students walk in to flat balloons, the hook fails.
- The "all three tiers got the same answer from different angles" framing in minute 35–45 is the pedagogically critical move. Without it, differentiation feels like tracking. With it, it feels like teamwork.$pf$,
 $pf$Single 50-min lesson plan with shared phenomenon (yeast + molasses + balloon hook), three parallel-track differentiated middle sections (Modified with visuals + fill-in, On-Grade matching textbook section 9.3, Extension pushing toward conceptual mechanism without ETC vocabulary), and a shared share-out frame that intentionally positions the three tiers as complementary perspectives rather than stratification.$pf$),

-- Step 2 --
('66666666-6666-6666-6666-666666650102',
 '55555555-5555-5555-5555-555555550005',
 2,
 $pf$Build the 4-point rubric for the lab activity — IEP-friendly behavior anchors$pf$,
 $pf$Lesson plan looks great. Now I need a rubric for the molasses-and-yeast lab activity (the middle-section work where students complete their differentiated handout and produce something — a drawing, an equation, or an explanation depending on tier).

I want a 4-point scale with explicit BEHAVIOR anchors at each level, not vague "shows understanding" language. My IEPs include two students whose accommodations specifically flag rubric ambiguity as a barrier — they get anxious when the rubric language is generic. The rubric also has to work for all three tiers (a Modified student should be able to score a 4 without being held to Extension-tier work).

Three criteria max. I want this on one page so I can hand it to students before they start.$pf$,
 $pf$Here's the rubric. Three criteria, four levels, explicit observable behaviors at every cell. Designed so a Modified-tier student producing tier-appropriate work can score a 4, and an Extension-tier student producing surface-level work scores a 1 — what counts is depth WITHIN your tier, not which tier you're on.

---

**LAB RUBRIC — Why does the balloon inflate?**
Cellular Respiration & Fermentation · 9th-Grade Biology
*Score yourself before turning in. I'll mark your score next to yours.*

---

| Criterion | 4 — Mastered | 3 — On Track | 2 — Getting There | 1 — Not Yet |
|-----------|--------------|--------------|-------------------|-------------|
| **(A) Identifies what goes IN and what comes OUT** | Names BOTH a reactant (sugar/glucose/molasses) AND a product (CO₂/gas/balloon-inflating gas) correctly, in any format (drawing, words, or equation). | Names ONE of: a reactant OR a product, correctly. | Names something that goes in or out but it's wrong (e.g., "oxygen comes out"). | Did not name any reactant or product. |
| **(B) Explains WHY the balloon inflates** | Connects the gas being produced to the balloon inflating. Any of these counts: "the yeast makes gas and the gas pushes the balloon up," a labeled drawing showing gas → balloon, or "CO₂ from fermentation inflates the balloon." | Says gas is in the balloon but doesn't say where the gas came from. | Says the balloon inflates but the cause is wrong (e.g., "the water heats up"). | Did not address why the balloon inflates. |
| **(C) Uses tier-appropriate evidence** | Uses the form of evidence your handout asked for AT FULL DEPTH. Modified: complete drawing with arrows for IN and OUT. On-Grade: correct balanced equation OR correct 2-sentence written explanation. Extension: identifies why fermentation (not respiration) happens in the sealed bottle, in your own words. | Uses the right form of evidence but missing one piece (drawing has IN arrow but no OUT, equation is correct but unbalanced, etc.). | Uses the wrong form of evidence (e.g., wrote a sentence when handout asked for an equation) or evidence is mostly incorrect. | Did not produce the requested evidence. |

---

**Self-scoring guide (read aloud to students before they start):**

> "Before you give yourself a score, look at the cell you think you earned. Read the EXACT words. If you can point at your work and find the thing the cell describes, that's your score. If you can't point to it, drop a level."

**Teacher conferencing prompts (use these when checking in during minutes 10–35):**

- For a student stuck at 1 or 2 on (A): "Show me on your handout where it says what goes INTO the bottle. Now where does it say what comes OUT?"
- For a student at 2 on (B): "You said the balloon inflates. Where is the gas coming from? Don't tell me — show me on your handout."
- For a student at 3 trying to push to 4 on (C): "Look at your tier's handout. What's the LAST thing it asks you to do? Did you do that part?"

**Why these criteria and not others:**

- **(A) and (B) test the conceptual core** of HS-LS1-7 — identifying inputs/outputs and connecting cellular respiration/fermentation to a real-world phenomenon. Every NGSS-aligned cellular respiration assessment cares about these.
- **(C) is the differentiation-respecting criterion.** A Modified student doesn't have to write an equation to score a 4 — they have to produce a complete drawing with both arrows. An Extension student isn't earning extra credit for doing more — they're being held to the harder bar within their tier.
- **Three criteria not four** because four-criterion rubrics on a 4-point scale push grading toward 16-point precision that 9th-grade teachers don't need and IEP students get overwhelmed by. Three × four = twelve cells, scannable in under a minute per student.

**One IEP-specific note:**

For your two students with rubric-ambiguity accommodations: the cell language above uses concrete observable behaviors ("names a reactant," "labeled drawing showing gas → balloon," "correct balanced equation") rather than evaluative language ("demonstrates," "shows understanding," "effectively explains"). That swap is the load-bearing accessibility move — anxious students can SEE whether their work matches the cell. They don't have to guess what the teacher meant.$pf$,
 $pf$Three-criterion 4-point rubric with concrete observable behavior anchors at every cell (not "shows understanding"). Criterion C is the differentiation-respecting one — Modified students can score 4 without being held to Extension-tier work, and Extension students don't get credit for surface-level extension work. Includes self-scoring student script, three teacher conferencing prompts, and an IEP-specific note explaining why the language uses observable behaviors instead of evaluative ones.$pf$),

-- Step 3 --
('66666666-6666-6666-6666-666666650103',
 '55555555-5555-5555-5555-555555550005',
 3,
 $pf$5-question exit ticket aligned to NGSS HS-LS1-7$pf$,
 $pf$Last piece. Write a 5-question exit ticket students complete in the final 5 minutes of class. Mix of recall (so I can quickly check who got the basics) and application (so I can spot kids who are ready to go further). Aligned to NGSS HS-LS1-7. One page. Should be do-able in 4 minutes by a typical 9th-grader so the 5th minute is buffer.

Include an answer key for me with brief teacher notes on what each question is diagnosing, so when I grade these in 10 minutes after class I know which kids need re-teaching on which piece.$pf$,
 $pf$Here's the exit ticket — one page, ~4 minutes for a typical 9th-grader. Three recall (quick check), two application (separates "got it" from "owns it"). Answer key + diagnostic notes follow.

---

**EXIT TICKET — Cellular Respiration & Fermentation**
Name: ______________  Period: 4  Date: ___________
*4 minutes. Use complete sentences for #4 and #5.*

---

**1.** What two things does yeast use as inputs during fermentation? *(Circle two.)*

&nbsp;&nbsp;&nbsp;&nbsp;a) sugar &nbsp;&nbsp; b) oxygen &nbsp;&nbsp; c) water &nbsp;&nbsp; d) nitrogen &nbsp;&nbsp; e) heat

**2.** Cellular respiration produces ATP, water, and ________ . *(Fill in the blank.)*

**3.** True or False: Fermentation produces MORE ATP per glucose than cellular respiration. ( T / F )

**4.** In our balloon experiment, the bottle was sealed — no air could get in. Explain in 1–2 sentences why the yeast did fermentation instead of cellular respiration.

___________________________________________________________________

___________________________________________________________________

**5.** A baker mixes yeast, sugar, and water into bread dough. The dough rises. Using what you learned today, explain WHY the dough rises. *(2–3 sentences.)*

___________________________________________________________________

___________________________________________________________________

___________________________________________________________________

---

**ANSWER KEY (teacher copy)**

**1.** a) sugar AND c) water. (Some students will pick "oxygen" — that's a flag they're confusing fermentation with aerobic respiration. Mark both correct answers required for full credit; one of two = half credit.)

*Diagnoses:* Can the student distinguish fermentation inputs from aerobic-respiration inputs? Confusing yeast fermentation with photosynthesis or aerobic respiration is the #1 misconception on this unit.

**2.** Carbon dioxide (CO₂). Accept "CO2" or "carbon dioxide gas."

*Diagnoses:* Recall of the cellular respiration equation outputs. If students write "oxygen" or "glucose," they have the equation backwards (treating products as reactants). Re-teach with the equation written on the board: glucose + O₂ → CO₂ + H₂O + ATP.

**3.** False. (Cellular respiration produces ~36 ATP/glucose; fermentation produces 2.)

*Diagnoses:* Did the Extension-tier kids absorb the ATP-yield difference? On-grade and Modified students may guess — that's fine, but if more than half the class gets this wrong, the share-out at minute 35–45 didn't land and you should reinforce next class.

**4.** Looking for: "The bottle had no oxygen, so the yeast couldn't do cellular respiration. Yeast does fermentation when there's no oxygen." Accept any answer that correctly connects the SEALED bottle → no oxygen → fermentation pathway.

*Diagnoses:* Application — can students transfer the conceptual model from the experiment to a "why" explanation? This is the load-bearing question for HS-LS1-7. Common partial answer: "Because the bottle was sealed" (true but doesn't connect sealed → no oxygen → fermentation). Mark partial credit and note for re-teaching.

**5.** Looking for: "The yeast eats the sugar in the dough and produces CO₂ gas. The CO₂ gas creates bubbles in the dough and the bubbles make the dough rise." Accept any answer that connects yeast + sugar → CO₂ → gas bubbles → rising.

*Diagnoses:* Transfer to a NEW context (bread instead of a bottle) — this is the NGSS-aligned "use the model to explain a phenomenon" target. A student who can answer #4 but not #5 has the experimental knowledge but not the generalizable concept. Strong-tell question for "this kid is ready for the next unit" vs. "this kid memorized the bottle but didn't internalize the chemistry."

---

**Quick-grade flow (10 min after class for 28 tickets):**

- Stack tickets, fan through and tally questions 1, 2, 3 first (recall — should be ≥80% correct).
- For questions 4 and 5, sort into three piles: full credit, partial, blank/wrong.
- The partial + blank pile for question 4 is your re-teach list for the next class warm-up. The partial + blank pile for question 5 is your transfer-skill watch list — these students need a different kind of practice (a second phenomenon to reason about), not just a re-explanation of the bottle experiment.

**Common total-score patterns:**

- 5/5: solid mastery, ready for the next unit (Krebs cycle / glycolysis at intro level).
- 4/5 missing #5: knows the experiment, hasn't generalized — give one more transfer prompt next class.
- 3/5 missing #3 + #5: classic "learned the names but not the mechanism" pattern — re-anchor on the equations.
- 2/5 or below: full re-teach needed for that student. Pair with a strong peer for the next lab.$pf$,
 $pf$5-question exit ticket: 3 recall (multiple choice + fill-in + true/false targeting input/output identification, equation recall, and ATP yield) + 2 application (sealed-bottle explanation as load-bearing transfer, bread-rising as NGSS-aligned phenomenon-reasoning). Answer key includes per-question diagnostic notes flagging the misconception each question detects, plus a quick-grade flow and pattern-recognition guide for sorting tickets in 10 minutes.$pf$);

-- =========================================================================
-- Project 55-0006 | B2B fintech launch post ghostwriting | Emily Zhao | Writing | 4 steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550006';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550006';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550006',
  $pf$Founder's launch post from 3 pages of rough notes — angle, outline, draft, brutal edit$pf$,
  $pf$Turned a B2B fintech founder's 3-page notes dump into a 1,100-word launch post that actually performs. Claude helped me pick the real angle, commit to an outline, draft, and red-pen my own work.$pf$,
  $pf$I'm a freelance content strategist (ex-journalist, now 6 years indie) writing for B2B fintech and SaaS. One of my clients, Paygrade (an embedded payroll API for vertical SaaS), shipped their first real launch in 8 months. Their founder Tom handed me three pages of notes — technical details, their first enterprise customer, investor quotes, market-sizing paragraphs — and a 4-day deadline.

The problem I hit every single time with launch posts: they read like press releases. Founder pride leaks through. Key numbers get buried under "we're thrilled to announce." The first 200 words are "the future of X."

I used Claude 4.6 Opus over 4 rounds. The first round was positioning — which of the three stories in those notes is actually the lede, and which to kill. Second was an outline I could commit to at the paragraph level. Third was the draft. Fourth was a brutal self-edit where Claude red-penned its own work like it was reviewing a submission.

Total time: about 3 hours of actual work (vs my usual 5–6 on a post like this). Most of what saved time was refusing to draft until the angle was locked.$pf$,
  $pf$Final post ran 1,118 words, 6-minute read. Paygrade's founder approved with two word swaps. Performance vs their previous three launches: time-on-page 4:12 (prior avg 1:48), 47 waitlist signups week one, 3 podcast invites in week two, and a pickup from one of the vertical SaaS newsletters I was targeting.

What I'm keeping from this process: the "what's the real story here" pass BEFORE any drafting. I used to draft first then edit for structure — slower, and the final piece always smelled of the first draft's angle. Starting with "what's this actually ABOUT for the reader" and refusing to draft until I could answer in one sentence cut my editing time roughly in half.

Also keeping: the brutal self-edit pass framed as "Jessica Lessin reviewing a submission." Generic "edit for clarity" prompts produce cosmetic rewrites. Framing it as a specific editor with a specific bar produces actual cuts. The step 4 pass cut ~140 words and reordered the first 3 paragraphs — which the founder said was the single thing that made the post feel different from their last three.$pf$,
  '11111111-1111-1111-1111-111111111103',
  'intermediate',
  'claude-opus-4-6',
  'Claude 4.6 Opus',
  ARRAY['Claude','Notion','Ghost'],
  ARRAY['copywriting','content-strategy','b2b','blog-post','editing','launch'],
  'approved',
  '22222222-2222-2222-2222-222222222208',
  68, 29
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('66666666-6666-6666-6666-666666660601',
 '55555555-5555-5555-5555-555555550006',
 1,
 $pf$Angle selection — find the real story$pf$,
 $pf$I'm a freelance content strategist writing a launch post for a B2B fintech client. The client is Paygrade — an embedded payroll API for vertical SaaS companies (think: a healthcare staffing marketplace that needs to pay 8,000 contract nurses weekly and doesn't want to build payroll from scratch). They raised a $9M seed last year and just shipped their first enterprise customer — a healthcare staffing platform paying contract nurses across 14 states.

Here's the founder's notes dump: Paygrade's API handles the 1099/W-2 split at the record level, expresses multi-state compliance as a rule set the platform owns, and exposes payment hold periods as first-class API objects. The healthcare customer used to run payroll through spreadsheets + a third-party service that took 48 hours per cycle; Paygrade got them to 19 minutes (measured: platform-side API roundtrip — bank settlement still takes next business day). Tom (founder) ran payroll ops at a staffing agency for 7 years before starting Paygrade. Pipeline has "three more staffing verticals in integration." Seed investors quoted about "world-class team." McKinsey stat: embedded finance is a $4.5T market. Team is now 18 people.

Before I draft anything, I want to figure out which story is actually HERE. What's the strongest angle, and what should I kill? Pretend you're an editor at a serious business publication — which lede do you pick, and which competing angles do you refuse to lead with, and why?$pf$,
 $pf$I'll write this as an editorial pitch — sanity-check it against your notes.

**The story that's in here is NOT "Paygrade launches."** That's a press release. Three angles compete for the lede:

1. **The embedded-finance category thesis.** "$4.5T market, investor tailwinds." This is the angle the founder WANTS because it's the biggest number. Kill it. It's a category story masquerading as a product story. Every embedded-finance company's launch post opens with that McKinsey stat, and your target reader (a vertical SaaS CEO considering payroll) either already has the category context or they're not finishing this post.

2. **The healthcare-staffing customer win.** Specific. Concrete. "8,000 contract nurses paid weekly on a platform that used to take 48 hours per cycle." THIS is the story. It's the proof point that forces the reader to update their model of what embedded payroll actually DOES. The number "19 minutes" is a headline-worthy detail and it's sitting buried in the notes.

3. **The founder's origin story.** Tom ran payroll ops for 7 years before starting Paygrade. Good color, earned credibility — but it belongs in paragraph 4, not the lede. Founder origin stories as opens work for consumer brand posts, not B2B launch posts where the reader wants proof before biography.

**The angle I'd pick: customer-led.** Open on the healthcare platform's specific problem (48-hour cycles, 3 FTEs of ops overhead, Sunday-night pre-payroll scrambles). Then what Paygrade shipped. Then the broader category thesis EMERGES by paragraph 5 or 6 — not asserted, inferred from the proof.

**Why this beats the category angle in practice:** readers don't trust category stories from Series A companies. They trust proof. A reader who sees "$4.5T market" immediately assumes spin. A reader who sees "we cut a healthcare staffing platform's payroll cycle from 48 hours to 19 minutes" can't unsee that number. The category claim becomes the COROLLARY, not the thesis — and corollaries are what readers remember.

**What to kill from the notes:**
- Investor quotes. They're always "thrilled to back a world-class team." Zero information. Kill unless one investor said something with a number or a specific claim.
- The McKinsey paragraph. One sentence max, and only if it supports an argument the reader needs made. Don't bleed the word budget on generic category sizing.
- The team-growth paragraph ("we're now 18, here's the group photo"). Cut. Career page's job.
- Tom's 7-year backstory — KEEP but demote. It earned credibility; it doesn't need to carry the open.

**What to boost:**
- The 19-minutes number. Lead with it or get it in the first 100 words. Cite transparently: "platform-side API roundtrip — bank settlement still takes next business day." Transparency on what you measured is load-bearing for fintech credibility.
- The 1099/W-2 record-level split and multi-state compliance as a rule set. Most readers won't know why that's hard — one paragraph explaining it earns the technical respect.
- The "three more staffing verticals" line, but rewrite: pick one specific vertical you can name (home health? travel nursing? contract therapists?). "Three verticals in integration" without specifics is signal-free.

**Lede candidate to test-drive:**
> When a 14-state healthcare staffing platform cut its weekly payroll cycle from 48 hours to 19 minutes, its ops lead said the first week was eerie — no one on the clinical team emailed her.

Commit to a lede before drafting. If you can't write the one-sentence lede, you don't yet know what the story is.$pf$,
 $pf$Picks the customer-led angle (19-min number + healthcare staffing win) over the category-thesis angle and the founder-origin angle. Kills investor quotes, McKinsey paragraph, team-growth photo; boosts the 19-min number with transparency on what was measured, the 1099/W-2 record-level split, and one named vertical. Lede candidate included.$pf$),

-- Step 2 --
('66666666-6666-6666-6666-666666660602',
 '55555555-5555-5555-5555-555555550006',
 2,
 $pf$Commit-before-draft outline — paragraph by paragraph$pf$,
 $pf$Customer-led angle is the right call. I talked to Tom. The 19-minute number is confirmed — it's from the first full month of production use, averaged. He also okayed naming the customer on background: we can say "a 14-state healthcare staffing platform" but can't use the company name yet. He agreed to kill investor quotes and the team photo. Vertical we'll name: travel nursing (since that IS the customer, and referencing the vertical doesn't identify them).

Now: before I draft, I want to commit to an outline at the paragraph level. I'll write to the outline and resist any "let me just free-write and see where it goes" temptation. Target 1,000–1,200 words, 6-min read, audience is CEOs and COOs at vertical SaaS companies considering how to handle payroll for their workforce. Give me paragraph-by-paragraph beats — what each one covers, roughly how many words, and the one sentence each paragraph MUST contain to earn its place.$pf$,
 $pf$Here's the outline. 11 paragraphs, 1,100 words total. If the draft starts sprawling past 11 paragraphs, something in this outline is weak and needs re-committing before you write more.

**P1 — Lede (≈80 words).** The scene: ops lead's first week post-cutover, the 19-min number, the quiet. Three sentences max.
- Must contain: "48 hours to 19 minutes" — the number that hooks the reader.

**P2 — Why healthcare staffing payroll is brutal (≈110 words).**
- 1099 contractors + W-2 staff in the same pay run. Multi-state compliance across 14 states. Hold periods that horizontal tools can't express. Sunday-night ops scrambles.
- Must contain: "three FTEs on the ops team" — the cost number that makes the problem feel real.

**P3 — What that looked like in human terms (≈90 words).**
- The week before payroll: manual reconciliation, spreadsheet exception handling, nurses calling Monday morning about missed deposits.
- Must contain: one specific human detail — "Monday morning calls from nurses who didn't get paid." The reader has to feel it.

**P4 — What Paygrade's API actually does (≈140 words).** This is the technical paragraph. Non-jargon but specific.
- 1099/W-2 split at the record level (not run level — means a single pay run can have both without a branch). Multi-state compliance as a rule set the platform owns (the CUSTOMER's rules, not Paygrade's). Hold periods as first-class API objects.
- Must contain: "the platform owns the rules" — the control-inversion sentence that explains why horizontal tools don't fit.

**P5 — Integration + Tom's backstory in passing (≈100 words).**
- 9-day API integration window, 3 days from contract to production. Tom's 7 years in payroll ops at a staffing agency, framed as earned credibility ONE sentence.
- Must contain: "Tom built what he wished he'd had" — the founder-credibility sentence, demoted from a lede to a single-sentence beat.

**P6 — The 19-min number unpacked (≈120 words).**
- What got measured: platform-side API roundtrip. What didn't: bank settlement (still next business day). Why the transparency matters — fintech readers ARE this skeptical and deserve the disclosure.
- Must contain: "bank settlement still takes next business day" — the disclosure that earns the rest of the number's credibility.

**P7 — The category argument, finally (≈130 words).**
- By now the reader has the concrete proof. NOW the thesis lands: embedded payroll for vertical platforms is a category because vertical-specific compliance rules are why horizontal tools fall over. ONE McKinsey sentence max.
- Must contain: "vertical-specific compliance is why horizontal tools fall over" — the category argument in one sentence.

**P8 — Pipeline with specifics (≈70 words).**
- Name travel nursing. Mention two other verticals WITHOUT naming them ("similar platforms in home health and contract therapy are mid-integration"). Specifics-but-anonymous beats "huge pipeline."
- Must contain: "home health and contract therapy" — the two named verticals.

**P9 — Why this matters for the vertical SaaS CEO reading (≈100 words).**
- Direct-address paragraph. If you're running a vertical marketplace with a workforce component, this is the question: do you build payroll or buy API? One-paragraph answer.
- Must contain: "do you build payroll or buy API" — the question the reader is already asking.

**P10 — The ask (≈80 words).**
- Single CTA: waitlist for vertical SaaS teams evaluating embedded payroll. Specific, not "get in touch."
- Must contain: the waitlist URL and one sentence about who it's for.

**P11 — Close (≈60 words).**
- Short. Echo the lede — "the ops lead's week was quiet because the system worked. That's the whole product." One sentence sign-off with investor credit in passing (not as a quote, as a clause).

Check before drafting: can you write each paragraph in one sitting, knowing exactly what belongs in it? If any paragraph feels vague, fix THIS, not the draft.$pf$,
 $pf$11-paragraph outline at ~1,100 words with paragraph-level beats, word-count targets, and a "must contain" sentence per paragraph. Structure: lede → problem → human cost → product → integration + founder beat → unpacked number → category → pipeline → reader-direct-address → ask → close that echoes lede.$pf$),

-- Step 3 --
('66666666-6666-6666-6666-666666660603',
 '55555555-5555-5555-5555-555555550006',
 3,
 $pf$Full draft to the outline$pf$,
 $pf$Outline is solid and I can see each paragraph. Draft the full post now to the outline. Target 1,000–1,200 words. Voice: confident but not self-congratulatory, concrete numbers over rhetoric, no jargon a non-fintech founder wouldn't parse, no investor-update language. Assume the reader is a CEO or COO of a vertical SaaS company thinking about how to handle payroll for their workforce. Write straight through — I'll do the edit pass in the next round.$pf$,
 $pf$Here's the draft. 1,140 words. Slight overshoot — expect the edit pass to pull ~80 words out.

---

**From 48 hours to 19 minutes: what happens when payroll becomes an API**

The ops lead at a 14-state healthcare staffing platform told us her first week after cutover was eerie — no one on the clinical team emailed her. Friday was payroll day, 8,000 contract nurses got paid, and the usual Monday flood of "my deposit is wrong" messages never arrived. Weekly payroll used to take her team 48 hours of coordinated work. This week it took 19 minutes.

Healthcare staffing payroll is uniquely brutal. A single pay run blends 1099 contractors and W-2 staff whose tax and withholding rules don't match. Compliance spans 14 state jurisdictions, each with its own unemployment-insurance rate, minimum-wage rule, and tip-credit treatment — and the rules change quarterly. Payment hold periods — the grace window between shift-completion and deposit — have to be configurable per role, per credential type, per agency contract. Before Paygrade, this platform ran payroll through a spreadsheet-driven reconciliation and a third-party processor that took 48 hours per cycle. Three FTEs on the ops team lived inside it.

What that looked like in practice: a Sunday-night reconciliation shift to clean up the week's exceptions before the Tuesday cutoff. Manual override rows in spreadsheets for nurses who worked across state lines. And Monday morning calls — always Monday morning — from nurses who didn't get paid because a contractor code didn't flow through the processor's W-2 path.

What Paygrade ships is a payroll API that treats those edge cases as first-class. A single pay run can carry 1099 and W-2 records without branching to separate pipelines — the split is at the record level, not the run level. Multi-state compliance is expressed as a rule set the PLATFORM owns, not one Paygrade hands down: Paygrade provides a rules interface, and the customer's ops team (or their integration partner) defines the rules for their own verticals. Hold periods are first-class API objects, so the platform can say "this contractor class holds 48 hours after shift completion, that one holds 72, and new hires hold 96 for the first three weeks" without any of it being a spreadsheet override. The control inversion is the point — the platform owns the rules, not the payroll vendor.

Integration for the healthcare customer took 9 days of engineering work, after 3 days from contract to first successful sandbox pay run. Tom, our founder, spent seven years running payroll ops at a staffing agency before starting Paygrade. He built the API he wished he'd had — and because he designed it from the ops side, the rule primitives match the way ops teams actually think about exceptions.

On the 19-minute number specifically: that's the platform-side API roundtrip measured across the full pay run, averaged over the first month of production use. Bank settlement still takes one business day — Paygrade doesn't change the ACH clock, and nobody reputable in payroll will tell you otherwise. What 19 minutes means in practice is that the ops lead's pre-payroll reconciliation shift — the Sunday-night scramble — is GONE, because the exception handling is inside the API's rule layer instead of in the spreadsheet.

There's a larger thesis underneath this. Embedded payroll for vertical platforms is becoming a category distinct from horizontal payroll tools like Gusto or Rippling, and the reason is simple: vertical-specific compliance is why horizontal tools fall over at scale. A horizontal tool can't express a travel-nursing credentialing hold. A horizontal tool can't handle per-state hazard-pay rules that get updated by a union contract. These aren't corner cases for the verticals that have them — they ARE the work. McKinsey will tell you embedded finance is a multi-trillion-dollar market; the more useful framing is that every workforce-heavy vertical marketplace hits a wall at horizontal payroll and has to build or buy a vertical solution.

Our pipeline reflects this. After healthcare staffing, similar platforms in home health and contract therapy are mid-integration, and we're in early conversations with two more verticals that share the 1099/W-2 blend problem. We're not publishing names yet — we did this post as the first real public signal because the 19-minute number stopped being anecdotal.

If you're running a vertical marketplace or SaaS platform with a workforce component, the question you're already asking is: do you build payroll, or do you buy an API? The honest answer is that building is rarely worth it once you hit 500 weekly paychecks, and buying horizontal is rarely worth it once your compliance surface expands beyond two or three jurisdictions. What was missing until now was a vertical-flavored API — something that lets you OWN the rules without owning the rails. That's the space we're building in.

We're opening a waitlist for vertical SaaS teams evaluating embedded payroll over the next two quarters. Priority review if you're running weekly or more frequent pay cycles, operating across three or more states, or mixing contractor and staff payments in the same run. Link at paygrade.co/waitlist.

The ops lead's week was quiet because the system worked. That's the whole product. Thanks to our seed investors who backed this thesis a year ago — we'll have more to say about the next chapter when the next chapter earns the post.

---

Draft pulls 1,140 words against the 1,000–1,200 target. The edit pass should tighten P2 (list of pain points runs long), P7 (category argument can lose ~40 words without losing argument), and the close (the "thanks to seed investors" line is a smuggled founder reflex — worth cutting or compressing).$pf$,
 $pf$1,140-word draft to the outline. Customer-led lede opens on the 19-min number and the ops-lead's "eerie quiet" framing. Problem paragraph, human-cost paragraph, product paragraph with the control-inversion sentence, unpacked-number paragraph with bank-settlement disclosure, category paragraph, pipeline with named vertical (travel nursing implied via healthcare) plus two anonymous-but-specific next ones, direct-address build-vs-buy paragraph, waitlist CTA, close that echoes the lede. Draft flags its own weak spots in a closing note for the edit round.$pf$),

-- Step 4 --
('66666666-6666-6666-6666-666666660604',
 '55555555-5555-5555-5555-555555550006',
 4,
 $pf$Brutal self-edit — red-pen pass$pf$,
 $pf$Now edit your own draft as if you're Jessica Lessin at The Information reviewing a submission. Find every sentence that doesn't earn its place. Be specific: quote the sentence, cut or rewrite it, give the reasoning. Flag paragraph 1 specifically — if the lede doesn't work, we rewrite it cold. I want a red-pen pass with concrete cuts and rationales, not a "looks good, some minor notes" sanity-check. Hurt my feelings if needed. Then give me the revised post end-to-end.$pf$,
 $pf$OK, editor mode. I'll mark each cut with [CUT], each rewrite with [REWRITE], and each structural note with [STRUCTURE]. Then I'll give you the final post.

**P1 (lede) — verdict: works, trim one sentence.**

> [KEEP] "The ops lead at a 14-state healthcare staffing platform told us her first week after cutover was eerie — no one on the clinical team emailed her."

Strong open. "Eerie" is the right word. Keep.

> [KEEP] "Friday was payroll day, 8,000 contract nurses got paid, and the usual Monday flood of 'my deposit is wrong' messages never arrived."

Concrete. Earns its line.

> [KEEP] "Weekly payroll used to take her team 48 hours of coordinated work. This week it took 19 minutes."

Money sentence. This is why the post exists.

Lede stays intact. Good.

**P2 — verdict: two cuts.**

> [CUT] "and the rules change quarterly." — Filler. The reader knows compliance changes. Cutting saves 4 words and tightens the sentence.

> [REWRITE] "Payment hold periods — the grace window between shift-completion and deposit — have to be configurable per role, per credential type, per agency contract." → "Payment hold periods — the grace window between shift-completion and deposit — have to be configurable per role and per credential type." Dropping "per agency contract" is fine; the point is already made and the triple-list starts to feel like showing off.

Saves ~12 words. P2 reads tighter.

**P3 — verdict: keep, but tighten the close.**

> [REWRITE] "And Monday morning calls — always Monday morning — from nurses who didn't get paid because a contractor code didn't flow through the processor's W-2 path." → "And Monday morning calls from nurses who didn't get paid because a contractor code didn't flow through the processor's W-2 path."

The double "always Monday morning" is a stylistic tic. Cut. The first mention carried it.

**P4 — verdict: the strongest paragraph. One cut.**

> [CUT] "The control inversion is the point — the platform owns the rules, not the payroll vendor." — This sentence is redundant with "Paygrade provides a rules interface, and the customer's ops team (or their integration partner) defines the rules for their own verticals" three sentences earlier. You've already made the control-inversion point. Cut the second statement; let the first carry it.

Saves ~16 words. Paragraph lands harder.

**P5 — verdict: Tom's paragraph does too much. Demote.**

> [REWRITE] Current: "Integration for the healthcare customer took 9 days of engineering work, after 3 days from contract to first successful sandbox pay run. Tom, our founder, spent seven years running payroll ops at a staffing agency before starting Paygrade. He built the API he wished he'd had — and because he designed it from the ops side, the rule primitives match the way ops teams actually think about exceptions."
>
> Revised: "Integration for the healthcare customer took 9 days of engineering work after 3 days from contract to sandbox. The API's rule primitives are what they are because Tom, our founder, ran payroll ops at a staffing agency for seven years before starting Paygrade — he designed from the ops side, not the vendor side."

Saves ~25 words. Keeps the earned-credibility sentence but doesn't over-explain.

**P6 — verdict: keep entirely.**

The transparency paragraph is the best thing in the post. "Bank settlement still takes one business day — Paygrade doesn't change the ACH clock, and nobody reputable in payroll will tell you otherwise" is the line that wins this post for a fintech-literate reader. Don't touch it.

**P7 — verdict: cut ~40 words as predicted.**

> [CUT] "McKinsey will tell you embedded finance is a multi-trillion-dollar market; the more useful framing is that every workforce-heavy vertical marketplace hits a wall at horizontal payroll and has to build or buy a vertical solution."
>
> This sentence is smuggled market-sizing. The framing that follows is good, but leading with "McKinsey will tell you" invites exactly the category-story skepticism we built the post to avoid. Rewrite:
>
> [REWRITE] "Every workforce-heavy vertical marketplace hits a wall at horizontal payroll and either builds or buys a vertical solution. The build side is expensive and slow; the buy side, until now, was mostly missing."

Saves ~30 words, drops the McKinsey reference entirely (the reader doesn't need category credentials — the post has already proven the category exists via the healthcare customer), and adds a sharper either/or framing.

**P8 — verdict: one small cut.**

> [CUT] "We're not publishing names yet — we did this post as the first real public signal because the 19-minute number stopped being anecdotal." — The first half ("not publishing names yet") is fine. The second half is meta-commentary about why we're writing the post, which readers don't need. Cut: "We're not publishing names yet."

Saves ~22 words.

**P9 — verdict: keep.**

The build-vs-buy paragraph is the paragraph the reader came for. Don't touch.

**P10 — verdict: keep, tiny trim.**

> [REWRITE] "Priority review if you're running weekly or more frequent pay cycles, operating across three or more states, or mixing contractor and staff payments in the same run." → "Priority review if you run weekly pay cycles, operate across three or more states, or mix contractor and staff payments in the same run."

Drops "or more frequent" (weekly implies it) and tightens verbs from gerund to present tense. Reads cleaner.

**P11 (close) — verdict: cut the investor line.**

> [CUT] "Thanks to our seed investors who backed this thesis a year ago — we'll have more to say about the next chapter when the next chapter earns the post."
>
> This is the "smuggled founder reflex" I called out in my draft self-note. Cut it. The close is stronger without it:
>
> [KEEP ONLY] "The ops lead's week was quiet because the system worked. That's the whole product."

Saves ~26 words. The close now ends on the strongest sentence in the post — which is how a close should end.

---

**Total word count after cuts: ~1,118 words** (down from 1,140). Under the target band, which gives the reader breathing room. Time-on-page tends to be HIGHER on tight posts than sprawling ones — less friction, more commitment from the reader.

**[STRUCTURE note, whole-post]:** The post now reads as: scene → problem → product → transparency → category → ask. That's the natural shape for this kind of proof-led B2B launch piece, and the ordering matches the reader's skepticism arc (show, explain, prove, contextualize, invite). Don't reorder on the next pass — the ordering is load-bearing.

Send me the revised draft with these changes applied and we're done.$pf$,
 $pf$Red-pen edit pass with ~6 specific cuts and 4 rewrites totaling ~140 words removed. Biggest cuts: McKinsey sentence in P7, "control inversion is the point" redundancy in P4, investor line at the close. Final revised post at ~1,118 words, ready to ship. Structural note that the paragraph ordering (scene → problem → product → transparency → category → ask) is load-bearing and shouldn't be reshuffled.$pf$);

-- =========================================================================
-- Project 55-0007 | Niche site sunset decision | Lena Morales | Strategy | 4 steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550007';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550007';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550007',
  $pf$Sunset a $180/mo niche site — or double down? A 4-pass go/no-go with Claude$pf$,
  $pf$Worked through the decision to sunset one of my two niche affiliate sites. Four rounds with Claude to diagnose the decay, run three scenarios with real effort/return estimates, and land on a decision with a 30-day wind-down plan.$pf$,
  $pf$I'm a solopreneur — Etsy shop is the main thing, plus two niche affiliate sites I built in 2022 and 2023. The Etsy shop does fine. Of the two sites, one (a slow-cooker recipes site, bestslowcookerguides.com) is still paying its own way at about $1,800/mo. The other (stockkitchenessentials.com, a small-kitchen-equipment affiliate site) is down to $180/mo from a peak of $620/mo in early 2025, and I'm spending maybe 6 hours a month on it.

The question I'd been dodging for six months: sunset it, maintain it, or double down. I'd been "maintaining" it out of sunk-cost inertia. Every time I looked at the numbers I felt vaguely bad but didn't actually decide anything.

I used Claude 4.7 Opus because this was the kind of decision where I wanted the model to push back on my thinking, not just organize it. Four passes: dump the numbers + ask for honest read, diagnostic on what's actually decaying, three-scenario analysis with real effort + return estimates, and then the decision + wind-down plan.

The thing that moved me was step 2's finding that Amazon's cut to the kitchen category affiliate rate in February 2025 accounts for most of the decline — AND that even at the old rate the site would only be doing $310/mo now, because traffic is down 40% from peak. That reframed the whole decision: the site didn't die because of Amazon; it died because my content stopped matching SERP intent. The Amazon cut just made the decline more visible.$pf$,
  $pf$Decision: sunset. 30-day wind-down plan in step 4 — pull the high-performing product comparison posts into a merged page on bestslowcookerguides.com (where the overlap is real — slow cookers ARE small kitchen equipment), 301 the rest to the slow-cooker site's home page, let the domain expire next November, and redirect the email list (1,200 subs) to a new lead magnet on the slow-cooker site.

Expected residual value: about $110/mo from the migrated comparison posts (retains ~60% of the affiliate value of the top 3 posts) for the first 12 months, trending to zero by end of year 2. Time freed up: 6 hrs/month, which I'm reinvesting into a new Etsy product line I'd been putting off.

What I'm keeping from this: when a decision has been pending for six months, the real cost is the pendency, not the outcome. I had been avoiding step 1 (actually pulling the numbers) because I knew the numbers would force a decision. Claude's step 2 analysis — the Amazon-cut-masks-but-doesn't-explain finding — was the thing that let me stop framing this as "should I kill it" and start framing it as "what's the best version of winding this down." Different question, cleaner answer.

Also keeping: the explicit "what would change your mind in either direction" check in step 3. Most decision frameworks miss this. When I wrote out the conditions that would flip me to "double down" (traffic recovery above X, or an authority-backlink opportunity, or category-rate restoration), I could see clearly that none of them were plausible within 6 months — which meant the decision wasn't close.$pf$,
  '11111111-1111-1111-1111-111111111109',
  'intermediate',
  'claude-opus-4-7',
  'Claude 4.7 Opus',
  ARRAY['Claude','Google Analytics','Ahrefs'],
  ARRAY['strategy','solopreneur','affiliate-marketing','niche-sites','decision-making','sunset'],
  'approved',
  '22222222-2222-2222-2222-222222222210',
  94, 41
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('66666666-6666-6666-6666-666666660701',
 '55555555-5555-5555-5555-555555550007',
 1,
 $pf$Dump the numbers, ask for an honest read$pf$,
 $pf$I need an honest read on one of my niche sites. I've been avoiding this decision for six months and I want to stop avoiding it.

Context: I'm a solopreneur. Main income is my Etsy shop. On the side I have two affiliate sites. Site A (bestslowcookerguides.com) is healthy — $1,800/mo net, 45k sessions/mo, trending slightly up, about 4 hrs/month to maintain. Site B (stockkitchenessentials.com) is the one I'm asking about.

Site B numbers:
- Revenue peaked at $620/mo in Jan 2025. Currently $180/mo (March 2026). Steady decline, no obvious cliff.
- Traffic peaked at 18k sessions/mo (Dec 2024). Currently 10.8k sessions/mo. Down 40% from peak.
- RPM peaked at $34. Currently $16.
- Content: 48 published posts, mostly product comparisons ("best stand mixer under $200") and buying guides. Last new post published Sept 2025 (6 months ago).
- Traffic sources: 82% organic search, 9% Pinterest, 7% email list (1,200 subs), 2% direct.
- Backlinks: 87 referring domains per Ahrefs, DR 19. No big authority links.
- Time cost: 6 hrs/month (mostly answering email questions and checking for broken Amazon links). Used to be more when I was publishing.
- Costs: $18/mo hosting, $12/yr domain, $35/mo ConvertKit for the email list.
- Amazon Associates rate for kitchen category was cut from 4.5% to 3% in Feb 2025.

What I want from you: an honest read on what the numbers say. Not "here are some options to consider" — a real read. What's obviously broken? What am I possibly missing? And what's the shape of a decision that would actually close this out, rather than another six months of maintaining it while I feel vaguely bad about it?$pf$,
 $pf$OK. Honest read.

**What the numbers say, unambiguously:**

This site is in a structural decline, not a temporary dip. Three signals converge:

1. Traffic is down 40% from peak — that's not algorithm noise. Ten-thousand-session monthly drops over 14 months is a pattern. Most niche site traffic drops that look like this are SERP-intent drift, not penalty.
2. RPM halved (from $34 to $16). That IS partly the Amazon rate cut — but only partly. The rate went from 4.5% to 3%, which is a 33% cut. Your RPM dropped 53%. The remaining 20% is either lower-intent traffic (readers clicking but not buying) or conversion drift (Amazon's own product pages got better at capturing the click without your referral).
3. You haven't published in 6 months. For a content-dependent site in a competitive vertical, 6 months is enough to let newer competitors eat your SERP positions. You can see this in the 40% traffic decline.

**What you might be missing (or avoiding):**

- **The site is not failing because of Amazon. Amazon made the decline more visible.** If the category rate had stayed at 4.5%, you'd be doing about $270/mo now, not $620 — because the traffic is down 40%. The Amazon cut is a convenient villain, but even without it the site is a fraction of what it was.

- **The $180/mo you're still making is real money for 6 hrs of work, but it's declining money.** Straight-lining the trajectory: $180 this month, probably $130 in six months, probably $80 in a year, probably $30 in 18 months. "Maintaining" it means locking in 6 hrs/month of declining returns against alternative uses of those hours.

- **The email list (1,200 subs) is the only asset here with independent value.** Everything else (posts, backlinks, domain) has declining resale value. 1,200 engaged kitchen-equipment subs is a list you can redirect — either to a sister property (you have one) or to a new project.

- **The 48 posts are not all equal.** You didn't break them out, but I'd bet 80% of the declining revenue is coming from 4–6 top posts. Those posts have residual SEO value; the other 42 posts are essentially dead weight and their existence on the domain is what makes "sunset" feel scarier than "wind down the long tail and keep the winners."

**The shape of a decision that would close this out:**

The question isn't "kill, maintain, or double down." The question is: given a $1,800/mo healthy site that shares a category (bestslowcookerguides.com), what's the highest-leverage thing to do with Site B's residual assets? That reframes this from a loss-aversion exercise ("don't kill my site!") into an asset-allocation exercise.

What I'd want to see before the next round:
1. A breakdown of Site B's revenue by post (top 10 posts, monthly revenue each).
2. Topical overlap between Site B and Site A — specifically, which Site B top posts cover topics that ALSO fit Site A's editorial focus.
3. An honest answer on how much of Site B's 6 hrs/month is fixed (monitoring broken links) vs. content-maintenance work you could actually stop doing tomorrow.

If the top-post breakdown shows the familiar "3 posts = 60% of revenue" pattern, this is a straightforward wind-down. If instead revenue is more distributed, the calculation is different. Either way, "maintain it" is off the table — the trajectory is too clear. The question is whether you sunset cleanly or migrate + sunset. I'd bet migrate + sunset, but I'd want the top-post breakdown to confirm.

Pull those three numbers and we'll make this decision in the next round instead of the one after.$pf$,
 $pf$Calls the trajectory clearly: structural decline, not a dip. Reframes the decision from kill/maintain/double-down to asset-allocation (what to do with residual assets given a healthy sister site). Points out that the Amazon rate cut masks but does not explain the 40% traffic drop. Flags the email list as the only asset with independent value. Asks for top-post revenue breakdown, topical overlap with Site A, and fixed vs. variable time cost before the next pass.$pf$),

-- Step 2 --
('66666666-6666-6666-6666-666666660702',
 '55555555-5555-5555-5555-555555550007',
 2,
 $pf$Diagnostic — what's actually decaying and what's salvageable$pf$,
 $pf$Good push on reframing. Here's the data you asked for:

**Top 10 Site B posts by monthly revenue (March 2026):**
1. "Best stand mixer under $200" — $38/mo
2. "KitchenAid vs. Cuisinart food processor comparison" — $31/mo
3. "Small kitchen essentials checklist for apartments" — $24/mo
4. "Best slow cookers under $100" — $19/mo
5. "Immersion blender buying guide" — $14/mo
6. "Best air fryers for 2-person households" — $11/mo
7. "Countertop oven reviews" — $8/mo
8. "Best coffee grinders under $50" — $7/mo
9. "Instant Pot vs. Ninja Foodi" — $6/mo
10. "Best knife sets for small kitchens" — $5/mo

Top 10 = $163/mo (91% of revenue). Posts 11–48 = $17/mo combined.

**Topical overlap with Site A (bestslowcookerguides.com):**
Posts 4 and 9 are directly on-topic for Site A (slow cookers, Instant Pot). Post 3 (small-kitchen essentials) includes slow cookers as a section — partial overlap. Posts 1, 2, 5, 6, 7, 8, 10 are small-kitchen-equipment topics — NOT native to Site A's editorial focus but defensible as a "small kitchen essentials" expansion category if I wanted to.

**Fixed vs. variable time cost:**
- Fixed (would exist regardless): ~1 hr/mo. Broken Amazon link monitoring, domain/hosting admin, SSL cert renewal, occasional support emails from readers.
- Variable (content maintenance): ~5 hr/mo. This is checking whether my top posts are still ranking, light refreshes on product pricing mentions, occasional Pinterest re-pinning.

If I stopped the variable work tomorrow, my guess is the decline accelerates — but not by much, because that work hasn't been arresting the decline anyway.

Given this: what's your diagnostic on what's actually decaying, and what's salvageable? Be specific about what the top-10 concentration tells us.$pf$,
 $pf$This data changes the read meaningfully. Specifically:

**The 91% concentration at top 10 is the whole game.**

Forty-two of your 48 posts are generating a combined $17/mo — $0.40 per post per month. Those 42 posts are pure dead weight. They're not carrying the site; they're just existing on the domain, and their existence is what makes the site feel bigger than it is. The working asset here is 10 posts, not 48.

Within the top 10, the concentration is tighter still. Top 3 posts = $93/mo (52% of revenue). Top 5 = $126/mo (70%). The long-tail shape is classic for a matured niche site past its growth phase, and it's a useful shape because it means the salvage operation is small, not sprawling.

**What's actually decaying:**

Two overlapping decays, with different remedies:

1. **SERP-intent drift on the mid-tier posts (posts 6–10).** Air fryers, countertop ovens, coffee grinders, Instant Pot vs. Ninja, knife sets — these are all topics where search intent has shifted toward video-first results (YouTube reviews, TikTok comparisons) and toward retailer-direct results (Amazon, Wayfair, Target owning their own product-comparison SERPs). Your text-and-affiliate-link format is being structurally displaced. No amount of content maintenance reverses this; Google's SERP for "best air fryers" in 2026 is not the SERP that ranked your post in 2023. These posts are dying for a reason you can't fight.

2. **Content-freshness decay on the top-tier posts (posts 1–5).** These are still ranking — they're just ranking lower than they did, and you haven't refreshed them in 9+ months. "Best stand mixer under $200" is a refreshable post: if you updated the pricing, added 2026 models, re-did the comparison table, you'd likely recover a chunk of position. These top posts are NOT structurally dying; they're just under-maintained.

**What's salvageable — three buckets:**

- **Bucket A: Migratable to Site A.** Posts 4 (slow cookers), 9 (Instant Pot), and arguably post 3 (small-kitchen essentials rewritten as "essentials for a slow-cooker-centered kitchen"). Combined current revenue: $49/mo. If migrated and refreshed on Site A's domain (DR 24 vs. Site B's DR 19), expect a 20–30% lift from domain-strength alone, plus the refresh bump. Reasonable projection: $75–90/mo on Site A.
- **Bucket B: Migrate under a new "small kitchen essentials" category on Site A.** Posts 1, 2, 5 — stand mixer, food processor, immersion blender. These are small kitchen equipment, tangential to slow cookers. Current revenue: $83/mo. Migration is defensible if Site A can genuinely sustain a "small kitchen essentials" sub-category (a judgment call — do you want Site A to become a broader kitchen site, or stay focused on slow cookers?). If you don't want to broaden Site A's focus, skip Bucket B entirely.
- **Bucket C: Let die.** Posts 6–10 and the long tail of 42 posts. Combined revenue: $48/mo. Not worth migrating. Let the 301s lapse, let the rankings decay naturally, let the domain expire when it's up.

**The email list question:**

Your 1,200 subs are kitchen-equipment-interested readers, not slow-cooker-specific. If you migrate to Site A, you'll have list-fit decay — maybe 30–40% of the list never wanted slow-cooker content specifically. Plan for an unsubscribe round when you redirect. Acceptable loss, because the remaining 700–800 subs are more valuable than 1,200 disengaged ones.

**The punchline on Amazon:**

The Amazon rate cut from 4.5% → 3% was real money — without it, your current revenue would be ~$270/mo instead of $180. But it's not why the site is dying. The site is dying because of SERP displacement on mid-tier topics and content decay on top-tier ones. The Amazon cut just made the decline more visible and legible to you.

**What this tells us for the decision:**

- "Double down" is off the table. The variable 5 hrs/month of content maintenance isn't arresting decay and a real doubling-down effort would require 20+ hrs/month of new content against structural SERP headwinds. Bad risk/reward.
- "Maintain" is off the table for the reasons I gave in round 1 — trajectory is clear and the hours have better alternative uses.
- "Sunset" is the direction, but it should be a MIGRATE + SUNSET, not a kill-and-forget. Buckets A and (optionally) B justify the migration work.

Next round: let's size the three scenarios (clean sunset, migrate A only, migrate A+B) with specific effort and 12-month projected return estimates.$pf$,
 $pf$Diagnostic separates two overlapping decays (SERP-intent drift on mid-tier posts vs. content-freshness decay on top-tier posts) and sizes salvage buckets: Bucket A (2–3 posts migratable to Site A, ~$49/mo → $75–90/mo projected with refresh + domain-strength lift), Bucket B (3 posts under a new "small kitchen essentials" category if Lena wants to broaden Site A's scope), Bucket C (42 long-tail posts + 5 structurally displaced top-10 posts — let die). Amazon rate cut framed as "visible not causal." Explicit list-fit decay warning on the email list migration.$pf$),

-- Step 3 --
('66666666-6666-6666-6666-666666660703',
 '55555555-5555-5555-5555-555555550007',
 3,
 $pf$Three scenarios with effort + 12-month return + what would change my mind$pf$,
 $pf$Size the three scenarios — Clean Sunset, Migrate A only, Migrate A+B — with specific effort estimates (hours, in what order) and 12-month projected returns. I want to see the decision side-by-side. Also: for each scenario, tell me what would have to change for me to regret picking it. And tell me what would have to happen in the next 3–6 months to make "double down" come back onto the table, even though we've taken it off for now. I want to make this decision with the conditions for regret explicit.$pf$,
 $pf$Here are the three scenarios side-by-side. Numbers assume you start the work this month; 12-month returns start when migration finishes (roughly month 2 for any migration scenario).

---

**Scenario 1: Clean Sunset**

Effort: 6 hours total, over 2 weeks.
- 1 hr: export email list to ConvertKit segments (kitchen-equipment vs. kitchen-essentials-and-slow-cookers) so Site A migration doesn't see full list-fit decay.
- 2 hrs: 301 redirects from Site B's top 10 post URLs to Site A's home page; 404 the rest (don't bother redirecting dead-weight posts).
- 1 hr: send a farewell email to the list with a forwarding offer to Site A.
- 1 hr: cancel ConvertKit ($35/mo) and downgrade hosting to a parked-domain plan ($2/mo).
- 1 hr: calendar the domain expiration (November 2026) and let it lapse naturally.

12-month return: ~$30–60/mo residual for the first 3 months (from Amazon cookie tails and redirect-home-page bleed traffic), trending to zero by month 6. Total 12-month revenue: ~$150–250. Cost savings: $33/mo ongoing once ConvertKit + downgraded hosting lands. Time freed: 6 hrs/mo.

Regret conditions: you'd regret this if (a) the migratable posts (Bucket A) would've performed substantially better on Site A than the residual suggests, or (b) the list had meaningful value you didn't realize. Probability of regret: moderate. The list has real value; throwing it away is the clearest error in this scenario.

---

**Scenario 2: Migrate Bucket A only (slow cooker + Instant Pot + essentials-as-slow-cooker-centered)**

Effort: 14 hours total, over 4 weeks.
- 1 hr: list export and segmentation (same as Scenario 1).
- 4 hrs: rewrite and refresh posts 4, 9, and 3 for Site A's voice and 2026 product lineup. Update comparison tables, re-check all Amazon links, add 2026 models.
- 2 hrs: publish to Site A, internal-link from existing Site A posts, add to Site A's sitemap.
- 2 hrs: 301 Site B's posts 4, 9, 3 URLs to their new Site A URLs. 301 the other top-10 URLs to Site A home. 404 the long tail.
- 1 hr: migrate the ConvertKit slow-cooker-interested segment onto Site A's list; let the rest churn.
- 1 hr: farewell-and-redirect email to the full list.
- 1 hr: cancel old ConvertKit account, downgrade hosting.
- 2 hrs: buffer for unexpected (broken links, SEO monitoring, Google Search Console reclassification).

12-month return: Bucket A's current $49/mo migrates with a 20–30% lift (domain strength + refresh bump). Conservative projection: $58/mo month 1 on Site A, rising to $70–85/mo by month 4 as refreshes get indexed. Over 12 months: ~$850–1,050 in migrated revenue on Site A (on top of Site A's current $1,800/mo baseline, which stays intact or grows marginally). Site B residual (first 3 months): ~$30/mo, then zero. Total incremental 12-month revenue vs. Scenario 1: +$700–950. Cost savings: same as Scenario 1.

Regret conditions: you'd regret this if (a) the 3 migrated posts underperform on Site A (possible if Site A's audience doesn't overlap as much as we think), or (b) your Bucket B posts (stand mixer, food processor, immersion blender — combined $83/mo) would've performed on Site A too and you left money on the table. Probability of regret: low on (a), moderate on (b).

---

**Scenario 3: Migrate Bucket A + Bucket B (broaden Site A to "slow cookers + small kitchen essentials")**

Effort: 28 hours total, over 8 weeks.
- All Scenario 2 work (14 hrs).
- 8 hrs: rewrite and refresh posts 1, 2, 5 (stand mixer, food processor, immersion blender) for Site A. Bigger lift because these are further from Site A's existing voice and require repositioning.
- 3 hrs: design a new "Small Kitchen Essentials" category section on Site A (navigation, category page, internal link graph updates).
- 3 hrs: buffer for SEO/migration issues on the bigger scope.

12-month return: Bucket A + B's current $132/mo migrates with a similar 20–30% lift, but with higher variance because Bucket B posts are further from Site A's topical authority. Projection: $155/mo month 1, rising to $190–220/mo by month 6 if Site A's domain authority lifts them; OR stagnating at $145/mo if Google reads the broader scope as topical dilution. Over 12 months: $1,700–2,400 in migrated revenue on Site A. Incremental vs. Scenario 2: +$850–1,350.

Regret conditions: you'd regret this if (a) broadening Site A's topical focus causes Site A's existing slow-cooker authority to decline (possible — measurable downside) or (b) you don't have time to maintain a broader Site A and the whole thing drifts into the same decay pattern that killed Site B. Probability of regret: moderate-to-high, specifically on (a). Site A's current $1,800/mo is BASED ON topical authority. Broadening can cost you.

---

**Side-by-side:**

| | Effort | 12-mo incremental revenue | Regret risk |
|-|-|-|-|
| Clean sunset | 6 hrs | baseline | Moderate (list value loss) |
| Migrate A | 14 hrs | +$700–950 | Low |
| Migrate A+B | 28 hrs | +$850–1,350 | Moderate-to-high |

**Recommendation:** Scenario 2 (Migrate A only).

The Scenario 2 vs. 3 math looks favorable for 3 (more upside), but the risk that Scenario 3 dilutes Site A's core authority is a BUSINESS risk that can dent your healthy $1,800/mo asset, not just a Site B risk. The expected value of Scenario 3 is higher; the VARIANCE is materially worse and the downside hits your healthy site. Don't take variance that hits your main asset to salvage a declining one.

---

**What would put "double down" back on the table in the next 3–6 months:**

You asked for the conditions explicitly. Here are the three that would matter, in rough order:

1. **Category-rate restoration.** Amazon restores the kitchen category affiliate rate from 3% to 4.5% (or better). Unlikely — Amazon's been reducing rates across categories for 2+ years. If it happened, Site B's revenue floor would jump to ~$270/mo, which doesn't by itself change the trajectory but changes the arithmetic enough that a refresh-and-monitor pass is defensible for 6 months.

2. **Site B authority backlink opportunity.** A site with DR 50+ in the kitchen equipment space offers you a genuine partnership/resource link (not paid). The DR 19 → DR ~28 lift that a real authority link can provide would recover some lost SERP position. Unlikely, but a real signal if it happened.

3. **A shift in SERP intent back toward text-and-comparison results.** Specifically: if Google pulls back on video-first results in the "best X under Y" query class. Very unlikely — the trend has been in the opposite direction for 3 years.

None of these are plausible within 6 months. That's the answer to your question: the conditions that would flip the decision are ones you can't trigger and shouldn't wait for. Execute Scenario 2.$pf$,
 $pf$Three scenarios sized with hour-level effort estimates and 12-month projected returns: Clean Sunset (6 hrs, baseline), Migrate A only (14 hrs, +$700–950 incremental), Migrate A+B (28 hrs, +$850–1,350 but moderate-to-high risk of diluting Site A's core authority). Recommendation: Scenario 2 — higher variance on Scenario 3 hits the healthy main-site asset, not just Site B. "What would put double-down back on the table" section identifies three trigger conditions (category-rate restoration, authority backlink, SERP-intent reversal) and notes none are plausible within 6 months.$pf$),

-- Step 4 --
('66666666-6666-6666-6666-666666660704',
 '55555555-5555-5555-5555-555555550007',
 4,
 $pf$Decision + 30-day wind-down plan$pf$,
 $pf$Decision: Scenario 2 (Migrate A only). Agree with the reasoning on Scenario 3 — not worth the authority-dilution risk on my main site. Give me a 30-day wind-down plan I can actually execute. Week-by-week. Include the farewell email to the list (draft it — I'll edit to voice). And tell me what I should be watching in Google Search Console and the affiliate dashboard in the 60–90 days after the wind-down to know whether the migration is actually working vs. just "not failing."$pf$,
 $pf$Here's the 30-day plan, week-by-week, followed by the list email draft and the post-migration monitoring plan.

---

**Week 1 (days 1–7): Prep + segmentation.**

Day 1: Export Site B's full email list from ConvertKit as CSV. Tag each subscriber based on their most-engaged content type (slow cooker, small-kitchen general, newsletter-only-no-clicks). Rough expected split: 30% slow-cooker-interested, 40% small-kitchen-interested (will churn on migration), 30% low-engagement (churn acceptable).

Day 2: Log into Site A's ConvertKit or migrate under one account. Set up a dedicated "site-b-migrated" segment with an auto-tagged welcome sequence (3 emails, covering Site A's best slow-cooker content and your Etsy shop — soft plug).

Days 3–4: Read posts 4, 9, and 3 on Site B. Sketch what each one needs to become a Site A post: 2026 product updates, comparison-table refresh, internal links to existing Site A posts, Site A voice/tone adjustments. Budget 4 hours for actual rewriting in week 2.

Day 5: Check Amazon Associates dashboard. Pull Site B's last-90-days commission report. Confirm posts 4, 9, 3 are still the top revenue drivers (if the ranking shifted in the last month, adjust which posts you migrate).

Day 6: Back up Site B's full database and media library. Paranoia budget.

Day 7: Buffer / catch up.

**Week 2 (days 8–14): Migration execution.**

Days 8–10: Rewrite posts 4, 9, 3 for Site A. Expect each to take ~75 minutes. Publish as drafts first.

Day 11: Internal linking pass. Add links from your existing top Site A posts to the new migrated posts. Add the new posts to Site A's sitemap. Submit sitemap to Google Search Console.

Day 12: Publish the 3 posts live on Site A.

Day 13: Set up 301 redirects on Site B:
- Post 4 URL → new Site A URL
- Post 9 URL → new Site A URL
- Post 3 URL → new Site A URL
- All other top-10 URLs → Site A homepage
- All long-tail 42 URLs → 404 (don't pollute Site A's link graph with redirects from irrelevant topics)

Day 14: Verify redirects with a crawler tool (Screaming Frog free tier or similar). Fix any misfires.

**Week 3 (days 15–21): List migration + farewell.**

Day 15: Send the farewell email (draft below) to the full Site B list.

Day 16: Import the "slow-cooker-interested" segment into Site A's ConvertKit list. Let the rest churn — ConvertKit will auto-unsubscribe anyone who marks the forwarding email as spam.

Days 17–21: Monitor Google Search Console for the 301s. Look for "Page indexed, though crawled" messages on the new Site A URLs. Fix any crawl errors within 48 hours.

**Week 4 (days 22–30): Cleanup + cost reductions.**

Day 22: Cancel Site B's ConvertKit account (save $35/mo). Verify the last billing cycle ended.

Day 23: Downgrade Site B's hosting to a parked-domain plan ($2/mo) or whatever your host's lowest tier is. DON'T kill the domain yet — the 301s need to live somewhere through at least the first 6 months.

Day 24: Calendar two reminders: one for November 2026 (domain expiration — decide whether to let it lapse or renew one more year if the 301s are still feeding Site A meaningful link equity). One for 60 days from today (first monitoring checkpoint — see below).

Days 25–30: Buffer. Expect at least one "oh, I forgot about X" moment during the wind-down. This week absorbs it.

---

**Farewell email draft:**

Subject: The small-kitchen site is closing — where we're going next

Hi [first name],

A quick, honest note. I'm winding down stockkitchenessentials.com. The content that earned its place is moving to its more active home at bestslowcookerguides.com — specifically the slow-cooker and Instant Pot guides, which fit that site's focus better than they ever fit here. The rest of the archive will sunset over the next few months.

If you subscribed here for slow-cooker content, you don't need to do anything — I'm moving you to the bestslowcookerguides.com list and you'll see a hello email from me there in the next day or two.

If you subscribed for general small-kitchen-equipment content, this is goodbye from this list specifically, and I want to say thank you for reading. I'd rather be honest about the shift than pretend the site is still what it was. Wishing you well.

— Lena

P.S. If you're curious what the focus shift looks like, [link to bestslowcookerguides.com homepage]. And if you make anything cozy from my shop this year, I'd love to see it — [link to Etsy shop].

---

**What to watch 60–90 days after migration:**

The goal is to tell the difference between "migration is working" and "migration is quiet but actually failing." Four signals, in priority order:

1. **Indexation of migrated URLs in GSC (check at day 30 and day 60).** The 3 new Site A posts should be indexed within 2–3 weeks. If by day 30 they're still "Discovered — currently not indexed," something's wrong (probably duplicate-content flags from the 301 source or quality signals). Fix: look for "similar content" warnings in Search Console's URL inspection tool.

2. **Site A's impressions and clicks for the 3 migrated posts (GSC Performance report, filter by page).** Expect 2–4 weeks of low impressions after indexing while Google re-ranks, then a climb. Good signal: impressions cross Site B's old levels by day 60. Bad signal: impressions flat or declining by day 60 — means the posts didn't carry their SERP position, and the migration is a revenue walk-down, not a lift.

3. **Amazon commissions on the migrated posts (affiliate dashboard, filter by tracking ID).** Set up new tracking IDs for the migrated Site A posts so you can isolate their performance. Target: $55/mo combined by month 2, $70+/mo by month 4. Below $40/mo by month 3 means conversion is worse on Site A than it was on Site B — investigate (usually an on-page layout issue).

4. **Site A's core slow-cooker posts — DON'T let them decline.** This is the subtle risk: you add 3 new posts to Site A, and over 3 months the core posts drift because they're getting less of your attention. Track your top 5 pre-migration Site A posts' GSC impressions weekly for the first 90 days. If any drops >15% from its pre-migration baseline, stop and diagnose before adding more work to Site A.

**The "stop and rethink" signal across all four:** if by day 60 the combined Site A + migrated-post revenue is within ±$50 of Site A's pre-migration monthly revenue, the migration is net-neutral at best and you should stop investing time in Site B's carcass (including the scheduled Nov domain expiration decision — let it lapse without sentiment).

---

You have a clean plan. Execute week 1 this week; momentum is half the value of the decision.$pf$,
 $pf$30-day plan, week by week: week 1 prep + segmentation; week 2 rewrite/publish/redirect; week 3 list migration + farewell email; week 4 cost reduction + calendar reminders. Farewell email drafted at voice-level (not generic template). Post-migration monitoring plan identifies 4 signals in priority order (GSC indexation, impressions/clicks on migrated posts, isolated Amazon commissions on the migrated pages with new tracking IDs, and the hidden risk — Site A's pre-existing core posts drifting as attention shifts). Explicit "stop and rethink" threshold: ±$50/mo on combined revenue by day 60 means migration is net-neutral and not worth further investment.$pf$);

-- =========================================================================
-- Project 55-0008 | Monday leadership-sync prep workflow | Nina Kowalski | Productivity | 3 steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550008';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550008';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550008',
  $pf$Monday leadership-sync prep — turned 90 min of Sunday scrolling into a 20-min Claude workflow$pf$,
  $pf$Built a reusable prep workflow for my agency's Monday 9am leadership sync. Three inputs (Asana digest, #leadership Slack thread, my rough notes) → structured agenda + blockers + decisions-needed list. Took three Mondays of iteration before it actually landed.$pf$,
  $pf$I run ops at a 50-person creative agency. Every Sunday night I'd spend roughly 90 minutes assembling Monday's leadership-sync agenda — scrolling the #leadership Slack channel, skimming the Asana project-status digest, chasing down which client issues from last week actually needed a leadership call, and trying to arrive with a list that wouldn't get derailed in the first 10 minutes of the meeting. It's the kind of work that doesn't feel important but eats my Sunday evenings.

I wanted Claude to do the assembly, not the thinking. My inputs were already there — Asana's weekly digest lands in my inbox Friday afternoon, the #leadership Slack thread is just copyable text, and I already jot 10-15 lines of my own context during the week. The question was whether Claude could structure those three inputs into a coherent agenda + a blockers-escalation list + a decisions-needed list, consistently, without me having to babysit it.

Three passes over three Mondays. Pass 1 was workflow design — figure out what the output shape should be before writing a prompt. Pass 2 built the actual production prompt template. Pass 3 was a dry-run on real data where Claude critiqued its own output after I flagged two things it missed, then shipped a v2 of the template. Used Sonnet 4.6 throughout — this is structured summarization, not heavy reasoning, so Opus would've been overkill.$pf$,
  $pf$Workflow is now on its sixth Monday. Actual time: 18-22 minutes including pasting inputs and reviewing the output. That's down from ~90 minutes. More importantly, the meeting itself is tighter — first three weeks of running it, we cut the leadership sync from 75 minutes to 48 minutes because the agenda arrives pre-structured and the "wait what's the context on X" detours are mostly gone.

Two things I didn't expect: (1) the "decisions needed" list has gotten me to stop making calls in DMs that should've been leadership-sync calls — seeing "awaiting leadership decision: 4 items" on the Monday doc every week made the pattern visible. (2) the workflow has become documentation — if I'm out, my second-in-command can run the same three inputs through the same prompt and get a meeting-ready doc. That was unintentional and is now the biggest ROI.

What I'd tell another ops person: don't start by writing a prompt. Start by sketching the output shape you actually want your meeting to run from — the prompt falls out of that backwards.$pf$,
  '11111111-1111-1111-1111-111111111107',
  'beginner',
  'claude-sonnet-4-6',
  'Claude 4.6 Sonnet',
  ARRAY['Claude','Asana','Slack','Notion'],
  ARRAY['operations','meetings','workflow','agency','sop','leadership'],
  'approved',
  '22222222-2222-2222-2222-222222222206',
  56, 31
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('66666666-6666-6666-6666-666666680101',
 '55555555-5555-5555-5555-555555550008',
 1,
 $pf$Design the prep workflow — output shape first, prompt second$pf$,
 $pf$I run ops at a 50-person creative agency and I want to stop spending my Sunday evenings assembling Monday's 9am leadership-sync agenda. Before I write a prompt, I want your help designing the workflow.

My inputs (all available by Friday afternoon):
1. Asana weekly digest email — project status changes, overdue tasks, milestones hit, team-level load heatmap. Maybe 2 pages of text.
2. #leadership Slack thread — our private leadership channel, I can copy the last 7 days of posts. Usually 30-60 messages.
3. My own notes — 10-15 bullet lines I jot during the week when I notice something (a client escalation, a hiring concern, a finance flag).

Meeting attendees: 5 people — me (ops), our founder/CEO, head of accounts, head of creative, head of finance/admin. Meeting is 60 minutes, 9-10am Monday.

What I DON'T want: a generic "weekly summary." What I DO want: a doc that the CEO can open at 8:58am and run the meeting from, with zero pre-reading required. Before we write the prompt, help me nail down the output shape. What three or four sections does this doc actually need? What's the right level of summarization? And what should I deliberately NOT include, because it's noise?$pf$,
 $pf$Good move to design the output before the prompt — 80% of bad-AI-workflow complaints trace back to someone writing the prompt first. Let's work backwards from what makes your CEO open the doc and immediately run the meeting.

Five leadership heads in 60 minutes is ~12 minutes of shared attention per person. The doc has to respect that budget. I'd argue for four sections, in this specific order, because the order is load-bearing:

**1. "Running the agency this week" — 5 bullets max.**
Not a status report. A scannable snapshot of what state the business is in right now. Example bullets: "3 projects behind schedule (2 on client-side delays, 1 on our side)", "Creative team at 94% utilization — 2nd consecutive week", "Two new client conversations warm, one at proposal stage". This section calibrates everyone. If it's longer than 5 bullets you're padding.

**2. Decisions needed today — numbered, with owner and what a "yes" or "no" unlocks.**
This is the section that earns the meeting its existence. Every item is a decision that couldn't be made in a DM and is actively blocking something. Format each as: the decision (one line), the context you need to make it (2 sentences max), the recommendation if there's an obvious one. Cap at 4 decisions — if there are more, some of them aren't actually decisions, they're discussion topics.

**3. Escalations the CEO should know about — bulleted, grouped by client.**
Client issues that haven't broken yet but are trending. The distinction from "decisions needed": these might become decisions but aren't yet. The CEO reads them to stay calibrated, not to act.

**4. Parking lot — 1 line per item.**
Things raised in Slack or the digest that don't rise to leadership-sync attention. This section is where most of the Slack thread ends up. It proves to the team that nothing got lost. You don't discuss this section in the meeting unless someone pulls from it.

**What to deliberately exclude:**
- Project status detail that's in Asana anyway — pointers to Asana are fine ("see Asana > ProjectX"), copy-paste is noise.
- Individual contributor-level updates. Team-level only.
- Financial numbers unless they're flagging something. "Revenue hit target" doesn't need 4 leaders' Monday.
- Anything with "we discussed this last week." If it was discussed and didn't land, it's a decision (section 2), not a re-discussion.

**One design note:** keep the doc to one page rendered. If your prompt is producing 2 pages, the summarization is too loose. Your CEO can read 1 page at 8:58; anything longer and the doc stops being useful.

Once you ratify this output shape (or push back), the prompt template is a 20-minute job. The design is the hard part.$pf$,
 $pf$Defines the doc as 4 sections in a load-bearing order — running state, decisions, escalations, parking lot — with explicit exclusions (project-level detail, contributor updates, re-discussions). One-page rendered ceiling. Prompt construction deferred to step 2.$pf$),

-- Step 2 --
('66666666-6666-6666-6666-666666680102',
 '55555555-5555-5555-5555-555555550008',
 2,
 $pf$Build the production prompt template$pf$,
 $pf$Great — the four-section structure is right. "Decisions needed" being section 2 (not 3 or 4) is exactly the reframe I needed; in my old doc format that section was buried. Now let's write the actual prompt template I'll run every Monday.

Build it so I can copy-paste my three inputs into clearly labeled slots, run the prompt, and get the doc in one pass. I want the prompt to handle the realistic edge cases: sometimes my personal notes are blank (I forget to jot things). Sometimes the Slack thread has a heated back-and-forth that isn't actually business-critical, it's just venting. Sometimes Asana will surface a milestone that looks scary but is totally expected (a project "turning red" on the timeline view because we intentionally added scope last week).

Give me the prompt as production text I can paste into Claude every Monday, plus any framing instructions I should know about using it.$pf$,
 $pf$Here's the production template. Paste as-is every Monday — only the three input blocks change. I've put the role framing, the output rules, and the edge-case handling in the prompt itself so you don't have to remember them.

---

**Template:**

```
You are preparing a Monday leadership-sync agenda for a 50-person creative agency.
Attendees: CEO, head of ops (me), head of accounts, head of creative, head of finance.
Meeting is 60 minutes. The doc you produce is what the CEO runs the meeting from — no pre-reading.

Output exactly four sections, in this order, following these rules:

## 1. Running the agency this week
- Exactly 3–5 bullets. Never more.
- Each bullet is a current-state observation, not an event log.
- Team-level only. No individual contributors.
- If Asana flags a project as at-risk, verify against my notes: sometimes a project turns red because we intentionally added scope. If my notes say a red project is expected, reflect that ("Project X on the timeline is intentionally red — scope addition last week, not a delivery risk").

## 2. Decisions needed today
- Numbered list, max 4 items.
- Format each: (a) The decision in one line. (b) Context in ≤2 sentences. (c) If there's an obvious recommendation, include "Recommendation:" on a new line.
- A "decision" means something blocked awaiting a leadership call — not a discussion topic. If something from inputs looks like a decision but the context shows it's a discussion, put it in section 4.

## 3. Escalations the CEO should know about
- Grouped by client name.
- Each escalation: 1-2 sentences on state + what's trending.
- Include only items that haven't broken yet but might within 2 weeks. Broken-already items belong in section 2.

## 4. Parking lot
- 1 line per item.
- Everything from the Slack thread that was venting, side-discussion, or non-business-critical goes here.
- Things raised in the digest that don't rise to leadership attention also go here.
- If this section runs longer than 8 items, compress — group similar items under one line.

**Handling my inputs:**
- If my personal notes block is empty or says "none": proceed without them, but flag at the top of the doc "No personal notes this week — coverage is inputs-only."
- If the Slack thread contains heated exchanges or venting, route to section 4 unless the underlying subject is genuinely business-critical. Your signal for "genuinely business-critical" is: would this item block a project, cost money, or affect a client relationship if unaddressed? If no to all three, it's venting.
- If Asana flags a milestone that reads scary but my notes indicate it was expected, do NOT surface it in section 1 as at-risk.

**Output length ceiling:** the entire doc, rendered, must fit on one page. If you're about to exceed that, cut section 4 first, then tighten section 3 bullets.

---

**INPUT 1 — Asana weekly digest:**
[PASTE ASANA DIGEST HERE]

**INPUT 2 — #leadership Slack thread (last 7 days):**
[PASTE SLACK THREAD HERE]

**INPUT 3 — My personal notes:**
[PASTE NOTES HERE or write "none"]
```

---

**A few notes on using it:**

- The "running the agency this week" / "decisions needed" split is the one I'd watch most carefully. If Claude starts putting things in section 1 that should be decisions, your personal notes probably aren't doing enough work — specifically, when you have a decision needed, write it in your notes as "Decision needed: X." The explicit framing helps Claude route correctly.

- On first run, the Slack-thread-routing rule will probably misclassify once or twice. Common failure: something that looks like a vent is actually a subtle escalation (someone airing frustration because a client relationship is quietly eroding). If you catch this, adjust input 3 on the next run — add a note flagging the thread. Don't rewrite the prompt for edge cases; adjust your notes to resolve the ambiguity.

- Run it as a fresh Claude conversation every week. Don't try to maintain state across weeks. If the meeting produced outcomes that need to carry forward, you encode them in next week's personal notes.

Ship this Monday, watch where it misfires, and refine on a real failure — not on a hypothetical one.$pf$,
 $pf$Production-ready prompt template with explicit section specs (counts, formats, exclusions), three labeled input slots, and inline edge-case handling (empty notes, venting-vs-escalation, scary-but-expected Asana flags). One-page output ceiling is enforced in the prompt itself.$pf$),

-- Step 3 --
('66666666-6666-6666-6666-666666680103',
 '55555555-5555-5555-5555-555555550008',
 3,
 $pf$Dry-run on last Monday's data + critique + v2 refinement$pf$,
 $pf$Ran the template on last Monday's real inputs. Two things went wrong:

(1) Claude put "Malibu Coast rebrand — scope creep conversation" in Parking Lot when it should have been in Decisions Needed. The client wants us to add a packaging-design track for a fixed $18k and our creative director thinks it's under-priced. We need a leadership call on whether to counter or accept. Claude routed it to parking lot because the Slack thread was casual, but the underlying ask IS a decision.

(2) Escalations section listed "Nordic Fit — production timeline slipping" as a watch item. In reality it already broke — their launch date slipped by 2 weeks and the contract has a penalty clause we're now exposed to. Claude undercalled the severity because my personal notes said "Nordic Fit — timeline concerns" (I was being vague). This should have been section 2 (decision: do we invoke force majeure?) or at minimum a harder call-out in section 3.

What does this tell us about the prompt? And do you want to see the actual output — I can paste it if helpful.$pf$,
 $pf$Don't paste the output — I can diagnose both failures from what you've told me and they reveal two different issues.

**Failure 1 (Malibu Coast): a prompt bug.** This is my fault. The "venting-vs-escalation" routing rule was written with the assumption that a venting-toned Slack thread means venting-toned content. In practice, your agency's Slack culture is casual — real decisions get raised in casual tones. The rule filtered signal as noise. The fix is to tighten the routing criteria from "what's the tone" to "what's the underlying ask." Specifically: if any message in the thread contains a concrete financial or scope proposal from a client, it's NEVER parking lot, regardless of the surrounding chatter.

**Failure 2 (Nordic Fit): an input bug.** Claude undercalled this because your notes said "timeline concerns," which is ambiguous. Under the current prompt rules, ambiguous severity defaults to the softer section. This is actually the correct default — Claude shouldn't escalate on guesses. The fix isn't the prompt; it's your input discipline. When a vague phrase could be "watch" or "broken," resolve the ambiguity in the notes, not the prompt.

Here's the v2 prompt diff — only two changes, both in the handling-my-inputs block:

**CHANGE 1 (add at the top of the Slack-routing section):**
```
- OVERRIDE: If any message in the Slack thread contains a specific client-initiated
  financial or scope proposal (a dollar figure, a timeline change, a deliverable add/cut),
  that item is ALWAYS a decision (section 2), regardless of the surrounding thread tone.
  Casual tone does not downgrade it.
```

**CHANGE 2 (add at the bottom of the handling-my-inputs block):**
```
- When my personal notes flag a client issue with vague severity words ("concerns",
  "watch", "not great"), do NOT guess severity. Place in section 3 (escalations) and
  add "[sev-unclear — confirm at meeting]" to the end of the line. This signals that
  the input was under-specified and surfaces it for human judgment.
```

**And one note on YOUR side:** update your personal-notes habit. For any client issue, write one of four severity tags — "[watch]", "[active issue]", "[broken]", "[decision-needed]". 2 seconds to type, kills the ambiguity class at the source. The prompt alone can't fix input discipline; the prompt + your writing it is what makes the workflow durable.

With those two changes, rerun last week's inputs. If Malibu Coast moves to section 2 and Nordic Fit is either in section 2 (if your new notes say [broken]) or flagged in section 3 with the [sev-unclear] tag, the workflow's fixed for the failure modes you actually hit. Don't patch for hypothetical future misclassifications until you see them.

One last thing: the fact that you noticed both failures on dry-run, not in the actual meeting, is the workflow working. The prep ran. The dry-run caught the misfires. That's the whole value of the Sunday-night time drop — you now have time to review BEFORE the meeting instead of assembling in a scramble.$pf$,
 $pf$Diagnoses two distinct failure classes — prompt bug (tone-vs-content routing) vs. input bug (ambiguous severity). Ships v2 prompt with two targeted changes and a personal-notes severity-tag convention. Explicit note that prompt refinement is paired with input-discipline changes; prompt alone can't fix under-specified inputs.$pf$);

-- =========================================================================
-- Project 55-0009 | PHI data boundary RFC — Postgres monolith | Derek Lawson | Coding | 5 steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550009';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550009';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550009',
  $pf$PHI data boundary in our Postgres monolith — 5-round RFC before Friday's eng review$pf$,
  $pf$Wrote an architecture RFC with Claude for a health-tech PHI-separation decision. 5 passes: honest read of both options, audit-log boundary design, pushback on "physical separation," migration plan, final RFC doc ready for Notion.$pf$,
  $pf$I'm CTO at a 40-person health-tech startup. We run on Rails + Postgres, single instance, patient records in the same DB as everything else. We're at 40k patient records, projected 200k in 12 months. Our compliance consultant flagged that our BAA (Business Associate Agreement) might require "physical separation of PHI" and the eng team has been asking whether we should break patient-records into a separate service + DB with event-driven sync.

I didn't want to walk into Friday's eng review with a recommendation I hadn't stress-tested. Used Claude Opus 4.6 over 5 rounds to pressure-test the architecture before I committed to a direction. This is exactly the work where Opus earns its keep — weighing compliance constraints against operational complexity, pushing back when I was reaching for the wrong abstraction, and keeping me honest when my lean was "do the bigger thing because it feels safer."

The 5 rounds, in order: honest read of both options with me naming my lean. Audit-log boundary design. My pushback on whether this is enough given our BAA language. Migration plan with rollback. Final RFC doc.

I walked into Friday's review with a clear recommendation (stay monolithic, add schema-level PHI boundary with RLS) and a doc that answered every question the team raised. Decision landed in 35 minutes.$pf$,
  $pf$Team ratified the recommendation Friday. We're staying on a single Postgres instance with a new `phi` schema, RLS policies, isolated backup chain, and an immutable audit log. Migration is mid-flight — moved the first PHI table last Tuesday with the dual-read/dual-write pattern Claude specified; cutover target is 3 weeks out.

Biggest unexpected win: the RFC itself. The doc Claude produced in the 5th round is the first architecture doc at this company that every engineer actually read before the meeting. Usually I'd write 3 pages, 1 person would actually read it, and we'd re-litigate everything in the meeting. This time the doc was tight, the alternatives section was honest (not "here are 3 strawmen I demolished"), and the open-questions section was real open questions. The engineer who was most skeptical of staying-monolithic ended up sending me a Slack message: "this is the first RFC here where I trusted the alternatives section."

Takeaway I didn't expect: the highest-value Claude pass was round 3 (my pushback on "physical separation"). I was pattern-matching on industry orthodoxy — "PHI must be separate" — and Claude pushed back on what that ACTUALLY means under HIPAA vs. what the word "separation" means casually. If I'd done this alone, I would've over-architected.$pf$,
  '11111111-1111-1111-1111-111111111104',
  'advanced',
  'claude-opus-4-6',
  'Claude 4.6 Opus',
  ARRAY['Claude','Postgres','Rails','Notion'],
  ARRAY['architecture','hipaa','phi','postgres','rls','healthcare','rfc'],
  'approved',
  '22222222-2222-2222-2222-222222222209',
  112, 58
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('66666666-6666-6666-6666-666666690101',
 '55555555-5555-5555-5555-555555550009',
 1,
 $pf$Context dump + honest read — monolith or break out the PHI service?$pf$,
 $pf$I'm CTO at a health-tech startup, 40 people, 3-person core engineering team. Stack: Ruby on Rails monolith, single Postgres 15 instance on AWS RDS (db.r6g.xlarge), Redis for job queue, SES for email. We handle patient intake, appointment scheduling, and clinician messaging for mid-sized primary care clinics. All data — patient records, appointment history, clinical notes, billing info, user accounts, audit logs — lives in one `public` schema in one Postgres database.

Scale: 40,000 patient records today, projected 200,000 in 12 months. Peak traffic is ~180 req/s, mostly reads. Database is at ~14% CPU average, no concerning hotspots. HIPAA-covered entity, and we have signed BAAs with 22 clinic customers.

Our compliance consultant reviewed our architecture last month and raised two concerns: (a) "PHI should be physically separated from non-PHI data" and (b) "audit trail for PHI access should be immutable and independent of application code." The team has been debating two directions:

**Option A (stay monolithic):** Keep everything in one Postgres. Add row-level security, separate PHI-related tables under a schema, improve audit logging.

**Option B (break out patient service):** Extract patient-records and clinical-notes into a separate Rails service with its own Postgres database. Event-driven sync for the small number of cross-service reads. Estimated 6-8 weeks of engineering work with our 3-person team.

My personal lean is Option A. My anxiety is that I'm leaning A because it's less work, not because it's right. I want your honest read BEFORE I dig into implementation. What am I missing? What's the actual decision criterion here — not the obvious "compliance" answer, but the real one?$pf$,
 $pf$Both options are viable. Your lean toward A is defensible, but not for the reason you think — and you're right to suspect your own lean. Let me reframe the decision, because the scale framing is a red herring.

**Scale isn't the question.** 40k → 200k records is monolith-happy territory. Postgres on a db.r6g.xlarge with your traffic profile is nowhere near a limit that justifies the operational complexity of a second service. If scale were the only driver, this conversation wouldn't exist. You know this.

**The real question is blast-radius of a compliance breach.** If a vulnerability in your Rails app — SQL injection, broken authorization, leaked credentials — exposes your database, what does the attacker get? In your current architecture, one broken query gets them everything. In Option B, one broken query on the clinician-messaging service gets them messages but not the underlying patient records, because the records DB isn't reachable from that service's Rails process. That's the real value proposition of Option B, and it has nothing to do with scale.

**But Option B isn't the only way to reduce blast radius.** You can get most of the blast-radius reduction inside a single Postgres instance using a combination of:

1. **Separate schema (`phi.*`) for patient data**, with ownership restricted to a dedicated DB role that the app assumes only for PHI-touching requests.
2. **Row-level security policies** that tie every PHI-row read to an authenticated clinician-user session, enforced at the DB layer, not the app layer.
3. **An immutable audit log** — either a separate schema with INSERT-only grants and a revoke on UPDATE/DELETE, or logical replication to a write-once store like S3 via pglogical + a Lambda.
4. **Network-level isolation** — require all PHI-schema connections to come from a specific security group, disallowed from your public API process.

That gets you ~80% of the practical blast-radius reduction of Option B at ~15% of the engineering cost, AND it leaves you a clean future-extraction path: if in 18 months you DO decide to break out the service, the schema boundary is already drawn and the migration is "point Rails at a different connection string," not "redesign the data model."

**What I'd actually recommend:** Option A, but a stronger version than what your engineers are probably describing. Not just "add RLS," but: dedicated schema, dedicated DB role, RLS tied to authenticated sessions, immutable audit log, network-level isolation. Call this Option A+.

**Where I'd push back on my own recommendation:** if your compliance consultant's advice on "physical separation" is coming from a specific BAA clause that uses the words "physical separation" as a legal requirement (not best-practice advice), Option A+ might not satisfy it and you need Option B. You haven't told me whether "physical separation" is a compliance-consultant best-practice or a BAA clause. That distinction matters more than anything else we've discussed.

Before we go further: pull the BAA language and tell me what it literally says. That's the binary that collapses this decision.$pf$,
 $pf$Reframes the decision from scale to blast-radius of breach. Argues for "Option A+" — single Postgres with dedicated schema, RLS, immutable audit log, network isolation — as ~80% of Option B's value at ~15% of the cost. Flags the binary question: is "physical separation" a BAA clause or consultant best-practice? Defers committing until that's resolved.$pf$),

-- Step 2 --
('66666666-6666-6666-6666-666666690102',
 '55555555-5555-5555-5555-555555550009',
 2,
 $pf$Design the audit-log boundary — schemas, RLS, immutable append-only$pf$,
 $pf$The BAA language says "reasonable safeguards to ensure segregation of PHI from non-covered data" — NOT "physical separation." I think that supports Option A+. Let me park the compliance check for the next round and have you design the technical boundary.

Give me the actual schema-level design: the `phi` schema layout, the RLS policies, the audit log table, the DB roles, and the grants. Concrete SQL, not a sketch. Assume our current patient-records tables are `patients`, `appointments`, `clinical_notes`, and `patient_messages` — all currently in `public`. We'll migrate them.$pf$,
 $pf$Here's the boundary design. Four pieces: schemas, roles, RLS policies, audit log. SQL is production-shaped, not psuedocode.

**1. Schemas and roles:**

```sql
-- Create the PHI schema
CREATE SCHEMA phi;

-- App-level roles (no humans log in as these)
CREATE ROLE app_nophi NOLOGIN;   -- default role for most app operations
CREATE ROLE app_phi   NOLOGIN;   -- elevated role assumed only for PHI access
CREATE ROLE audit_writer NOLOGIN; -- only inserts into audit log

-- Connection role the Rails app uses; it can SET ROLE to the above
CREATE ROLE app_connection LOGIN PASSWORD '<secret>';
GRANT app_nophi, app_phi, audit_writer TO app_connection;

-- Default for app_connection is app_nophi — least privilege
ALTER ROLE app_connection SET role = 'app_nophi';
```

In Rails, wrap every request that touches PHI with `SET LOCAL role app_phi;` at the start of the DB transaction, reverting to `app_nophi` at end. This makes "does this request touch PHI" an explicit, auditable decision in code — not an accident.

**2. PHI schema grants:**

```sql
-- phi.* tables only accessible to app_phi role
REVOKE ALL ON SCHEMA phi FROM PUBLIC;
GRANT USAGE ON SCHEMA phi TO app_phi;
-- Tables granted selectively (see below per-table)
```

**3. Example table + RLS policy (patients):**

```sql
CREATE TABLE phi.patients (
  id           UUID PRIMARY KEY,
  clinic_id    UUID NOT NULL,
  mrn          TEXT NOT NULL,             -- medical record number
  full_name    TEXT NOT NULL,
  dob          DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE phi.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE phi.patients FORCE ROW LEVEL SECURITY;  -- apply to table owner too

-- Policy: a row is visible only if the current session's clinic_id matches
CREATE POLICY phi_patients_clinic_isolation ON phi.patients
  FOR ALL TO app_phi
  USING (clinic_id = current_setting('app.clinic_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON phi.patients TO app_phi;
```

Before any PHI query, your Rails app does:
```sql
SET LOCAL role app_phi;
SET LOCAL app.clinic_id = '<the-authenticated-clinic-uuid>';
```
Now every query is both role-scoped AND clinic-scoped. A bug that forgets the clinic_id setting returns zero rows, not the wrong clinic's data. That's the RLS guarantee you want.

**4. Immutable audit log:**

```sql
CREATE SCHEMA audit;
REVOKE ALL ON SCHEMA audit FROM PUBLIC;
GRANT USAGE ON SCHEMA audit TO audit_writer, app_phi;

CREATE TABLE audit.phi_access (
  id            BIGSERIAL PRIMARY KEY,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID NOT NULL,
  actor_role    TEXT NOT NULL,
  clinic_id     UUID,
  action        TEXT NOT NULL,   -- 'read'|'insert'|'update'|'delete'
  target_table  TEXT NOT NULL,
  target_id     UUID,
  request_id    TEXT,            -- Rails request id for correlation
  metadata      JSONB
);

-- Append-only grants
GRANT INSERT ON audit.phi_access TO audit_writer, app_phi;
GRANT SELECT ON audit.phi_access TO app_phi;  -- for in-app audit surfacing
-- Explicit REVOKE — no UPDATE, no DELETE, no TRUNCATE, ever
REVOKE UPDATE, DELETE, TRUNCATE ON audit.phi_access FROM PUBLIC, app_phi, audit_writer;

-- Prevent even the table owner from updating/deleting at the policy level
CREATE POLICY phi_audit_no_mutate ON audit.phi_access
  FOR UPDATE TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY phi_audit_no_delete ON audit.phi_access
  FOR DELETE TO PUBLIC USING (false);
ALTER TABLE audit.phi_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.phi_access FORCE ROW LEVEL SECURITY;
```

The `FORCE ROW LEVEL SECURITY` is the load-bearing line — without it, the table owner bypasses RLS. Combined with the policy that makes UPDATE/DELETE return "denied" unconditionally, the rows are effectively immutable at the DB layer.

**5. Triggers for auto-logging:**

Attach an AFTER trigger to every `phi.*` table that inserts into `audit.phi_access`. Pull actor_user_id from `current_setting('app.user_id')`. This means you don't rely on application-level logging — the DB logs whether the app remembered to or not.

**6. Backup isolation:**

Separate pg_dump jobs per schema — `phi` and `audit` back up on their own cadence (daily encrypted with KMS, separate S3 bucket with separate IAM). If you ever need to wipe non-PHI data for testing, you restore `public` without touching `phi` or `audit`.

That's the full boundary. If you want, I can draft the migration that moves your existing tables from `public` to `phi` with dual-read during the transition.$pf$,
 $pf$Concrete schema-level design for PHI boundary inside single Postgres: `phi` + `audit` schemas, three DB roles (app_nophi/app_phi/audit_writer), RLS policies scoped by clinic_id session variable, FORCE ROW LEVEL SECURITY + REVOKE on UPDATE/DELETE for immutable audit log, separate backup job per schema. Rails app uses SET LOCAL role to make PHI-touching requests explicit.$pf$),

-- Step 3 --
('66666666-6666-6666-6666-666666690103',
 '55555555-5555-5555-5555-555555550009',
 3,
 $pf$Pushback — doesn't a single instance defeat the "segregation" requirement?$pf$,
 $pf$Pushback. Our compliance consultant's response to Option A+ was "schema-level isolation inside a single Postgres isn't segregation; segregation means physical separation at the database instance level at minimum." She's citing industry norms, not a specific BAA clause. Before I push back on her, I want your honest read.

Her argument in plain language: if someone gets a shell on the DB instance — via the RDS IAM credential being leaked, or a Postgres superuser compromise — schema isolation doesn't help. They get everything. Physical separation means different RDS instances, different IAM roles, different network paths. Is she right? And if she's partly right, what's the HONEST assessment of what schema-level buys you vs. what it doesn't?$pf$,
 $pf$She's partly right. Let me separate what schema-level isolation actually protects against from what it doesn't, because the honest answer is "it depends on the attack vector."

**What schema-level isolation protects against:**
- SQL injection in your Rails app — an attacker running arbitrary SQL via an unsafe query. They hit role boundaries, RLS policies, GRANT limits. This is the MOST COMMON real-world breach vector, and schema-level handles it.
- Broken authorization bugs in your app code — a clinician seeing another clinic's patient. RLS blocks this at the DB layer, even if your app code is wrong.
- Operator error in application code — a junior engineer writing a query that accidentally joins across PHI and non-PHI tables. The role boundary forces explicit elevation.
- Compromised application credentials (Rails app DB password leaks). The `app_nophi` role can't read PHI. Attacker with those creds gets limited blast radius.

**What schema-level isolation does NOT protect against:**
- RDS instance credential compromise (the master user). A superuser bypasses all role-based restrictions unless you've also configured `FORCE ROW LEVEL SECURITY` and revoked superuser access to PHI, which most orgs can't fully do because they need superuser for maintenance.
- An attacker who gets a shell on the EC2/ECS instance running Rails. They read environment variables, find DB credentials, connect as `app_phi` legitimately. Schema isolation doesn't help because they're authenticating as a role that HAS PHI access.
- Physical-disk-level compromise of the RDS underlying storage. Moot for RDS since AWS handles that, but theoretical.
- Logical-replication-stream interception. If you have replicas, the replication protocol carries all schemas. An attacker on the replica network sees everything.

**Where your compliance consultant is correct:** separate RDS instance + separate IAM role + separate VPC security group DOES reduce the blast radius of the RDS-master-credential compromise scenario. If someone phishes an engineer with RDS IAM perms, in a single-instance world they get everything; in a separate-instance world they get the non-PHI DB only.

**Where I'd push back on her:** the RDS-master-credential compromise scenario is NOT the most likely breach vector for your company. For a 40-person startup with 3 engineers, your realistic threat model is:

1. SQL injection in the Rails app (schema isolation handles this)
2. Broken authorization bugs (RLS handles this)
3. A developer committing credentials to a public repo (mostly handled by rotating + app_nophi default role)
4. An engineer's laptop getting stolen with RDS IAM creds cached (partial — separate instance would help more)
5. A phishing attack against an engineer with production access (same as #4)

Threats 1-3 are by far the most common in the wild. Threats 4-5 are real but less common. Separate RDS instance makes threats 4-5 less bad AT THE COST of: (a) 2-3x the ops complexity (backups, migrations, failover), (b) cross-DB queries requiring dblink/FDW or application-level joins, (c) potential consistency issues across services, (d) ~$300-500/month additional infra cost for the second RDS instance.

**My honest recommendation:**

Stay with Option A+ AND add three things that specifically address the RDS-credential-compromise gap:

1. **Separate IAM roles for PHI-schema operations.** Use IAM database authentication on RDS, with one IAM role that can generate auth tokens for `app_phi` and another for `app_nophi`. Rotate. The Rails app gets short-lived tokens from whichever role it needs. This gives you most of the "separate IAM" property she's asking for, inside a single instance.

2. **Separate read replica for PHI with distinct network isolation.** If you need a read replica at all, put it in a subnet reachable only by specific services. This addresses the logical-replication-stream concern.

3. **Quarterly access audit** — not a technical control, a process one. Every quarter, who has RDS console / IAM access gets reviewed and trimmed. In your size org, this should be 2 people max (you + one other).

**When would I change my recommendation to Option B?** Three scenarios:
- Your BAA clause language DOES say "physical separation" (you've confirmed it doesn't).
- You're pursuing HITRUST certification or FedRAMP — some certifying bodies DO require separate instances for PHI regardless of BAA.
- Your threat model shifts — you land a large enterprise customer whose security team explicitly requires separate instance, and it's a deal-gating requirement.

If none of those three hold, separate RDS instance is over-architecture. Tell your compliance consultant: "Her industry-norm critique is valid for certification paths we're NOT pursuing. For our actual threat model and BAA language, Option A+ with IAM DB auth provides equivalent risk reduction at 15% of the ops cost. We'll revisit if we pursue HITRUST or land a customer that requires physical separation."

That's the honest read. If you bring it to Friday's review, you'll own the decision with clear-eyed trade-offs rather than pattern-matching on industry norms.$pf$,
 $pf$Separates what schema-level isolation protects against (SQL injection, authZ bugs, app-cred compromise — ~80% of real threats) from what it doesn't (RDS master compromise, engineer laptop theft). Recommends Option A+ with IAM DB auth for short-lived role-scoped tokens, addressing the RDS-credential gap without the ops cost of separate instance. Names the three scenarios that would flip the recommendation to Option B.$pf$),

-- Step 4 --
('66666666-6666-6666-6666-666666690104',
 '55555555-5555-5555-5555-555555550009',
 4,
 $pf$Migration plan — 4 phases with rollback + the 3 risks that would kill it$pf$,
 $pf$That analysis is what I needed. I'm going into Friday with Option A+ and the IAM-DB-auth addition. Last ask before I draft the RFC: give me the migration plan. We have `patients`, `appointments`, `clinical_notes`, `patient_messages` in public today. 4 tables, ~40k patient rows, ~300k appointment rows, ~180k clinical notes, ~1.2M messages. No downtime budget (we have 24/7 clinic users). Give me phases, a rollback plan per phase, and the 3 specific risks most likely to kill the migration.$pf$,
 $pf$Here's the 4-phase plan. Each phase is independently rollback-able — if any phase fails, you're in a safe state and can roll back without data loss or downtime.

**Phase 0 — Prep (week 0, no data movement):**
- Create `phi` schema, roles (`app_nophi`, `app_phi`, `audit_writer`), `audit.phi_access` table, RLS policies. All empty.
- Deploy Rails code that knows about `phi.*` tables but doesn't use them yet. Add a feature flag `PHI_SCHEMA_ENABLED=false`.
- IAM DB auth configured on RDS with role-scoped tokens. App still uses the master password; token path is plumbed but not active.
- **Exit criterion:** all infra exists, production traffic unchanged, feature flag off.
- **Rollback:** revert Rails deploy, drop schemas/roles. No data risk.

**Phase 1 — Dual-write + shadow-read (weeks 1-2):**
Pick the smallest table first: `patients` (40k rows). Not the largest — the smallest. You want to learn the migration mechanics on the table where mistakes are cheapest.

- Migration: `INSERT INTO phi.patients SELECT * FROM public.patients` — one-shot, completes in seconds at this row count. Run inside a transaction.
- Dual-write: Rails writes to BOTH `public.patients` and `phi.patients` on every insert/update/delete. Use a Rails model callback, NOT a DB trigger (triggers make rollback messier).
- Shadow-read: under the feature flag, every read from `public.patients` ALSO reads from `phi.patients`, compares, logs discrepancies. Does NOT return the `phi` result yet — that's phase 2.
- Run for a week, measure discrepancy rate. Target zero discrepancies for 72 consecutive hours before advancing.
- **Exit criterion:** zero discrepancies sustained, RLS policies verified against real traffic (enable RLS on `phi.patients`; shadow queries confirm no access is denied wrongly).
- **Rollback:** disable dual-write, drop `phi.patients`. `public.patients` is still authoritative.

**Phase 2 — Cutover reads + still dual-write (week 3):**
- Flip feature flag: Rails now reads from `phi.patients`, still writes to both.
- Keep dual-write for a week. If something goes wrong, you can flip reads back to `public` instantly.
- Watch error rates, query latency (RLS adds ~1-3ms), and — critically — any "row not found" errors that would indicate RLS is blocking legitimate reads.
- **Exit criterion:** 72 hours clean at full read traffic from phi.
- **Rollback:** flip feature flag. Reads return to `public`. Writes were going to both the whole time, so data's consistent.

**Phase 3 — Stop dual-write, drop public table (week 4):**
- Rails stops writing to `public.patients`. All reads and writes on `phi.patients` now.
- Leave `public.patients` in place for 7 days as a safety net. Don't drop it.
- **Exit criterion:** 7 days post-single-write with no production issues.
- **Drop:** `DROP TABLE public.patients;`
- **Rollback:** if something goes wrong in the 7-day window, restore dual-write from the last deploy (you have the code path still in the repo, just feature-flag it).

**Repeat phases 1-3 for the remaining tables, in order: `patient_messages` → `clinical_notes` → `appointments`.**

Messages next (largest table but simplest schema — good stress test). Clinical notes third (PHI-sensitivity highest; you want 2 successful migrations under your belt before this one). Appointments last because it has the most FK relationships to non-PHI tables — you'll have to convert some of those joins to application-level assembly.

**Total timeline: 4 weeks × 4 tables = 16 weeks worst case. More realistic: 10-12 weeks because phases 1-3 can overlap across tables once you've proved the pattern.**

**The 3 specific risks most likely to kill this:**

1. **RLS policy bug that silently returns empty results instead of erroring.** If your `current_setting('app.clinic_id')` isn't being set correctly in some Rails code path (a background job, a rake task, a console session), RLS returns "no rows" rather than throwing. You'll see mysterious "can't find patient" bugs. **Mitigation:** in phase 1, add a raise-on-unset guard — a DB function `require_clinic_id()` that raises if the setting is null, called at the start of every PHI-touching request. Runs in phase 1 shadow-read so you catch every missing-setting code path BEFORE cutover. This is the #1 thing that ships bugs past QA.

2. **Dual-write divergence from race conditions in concurrent updates.** Two requests update the same patient row simultaneously; one writes to `public` first, the other writes to `phi` first, and shadow-read logs it as a discrepancy. If you interpret every discrepancy as a real bug, you'll chase phantoms. **Mitigation:** wrap the dual-write in a single DB transaction with SELECT FOR UPDATE on `public.patients`. Serialize the writes at the row level. Eliminates race-condition false positives.

3. **FK relationships from non-PHI tables to PHI tables break in phase 3.** `billing_entries.patient_id` references `public.patients(id)`. When you drop `public.patients`, the FK becomes orphan. **Mitigation:** before phase 3 for each table, run a validation: `SELECT 1 FROM information_schema.constraint_column_usage WHERE table_schema = 'public' AND table_name = '<table>' LIMIT 1` — if anything references the table you're about to drop, stop. Either drop the FK first (rarely the right answer) or redesign the reference (use a patient_uuid string, validated at application level, in the non-PHI table). This is the risk that most commonly stalls migrations at phase 3.

**Dismiss-at-your-peril non-risk:** people will worry about query performance. At 40k patient rows with RLS, you'll add 1-3ms per query. Not a real concern. Worry about #1, #2, #3 instead.$pf$,
 $pf$4-phase migration (prep → dual-write + shadow-read → cutover reads → stop dual-write + drop), each phase independently rollback-able, smallest-table-first ordering. Per-table 4 weeks; 4 tables = 10-12 weeks realistic. Three load-bearing risks: RLS silent-empty-returns (mitigated with raise-on-unset guard), dual-write race conditions (mitigated with SELECT FOR UPDATE), FK orphans in phase 3 (mitigated with pre-drop constraint check).$pf$),

-- Step 5 --
('66666666-6666-6666-6666-666666690105',
 '55555555-5555-5555-5555-555555550009',
 5,
 $pf$Write the RFC doc — markdown, ready for Notion$pf$,
 $pf$Last pass. Turn everything we've worked through into a single RFC doc I can paste into Notion tomorrow morning. Sections: Context, Decision, Alternatives considered, Rollout plan, Open questions. Keep it tight — eng team will actually read this if it's under 2 pages rendered. Make the Alternatives section honest, not a strawman parade.$pf$,
 $pf$```markdown
# RFC-014: PHI Data Boundary — Schema-level isolation in Postgres

**Author:** Derek Lawson
**Status:** Proposed — for review at Friday eng sync
**Date:** [fill in]

## Context

We store PHI (patient records, clinical notes, appointments, messages) in a single Postgres 15 RDS instance alongside non-PHI data. Current state: 40k patient records, projected 200k in 12 months. Our compliance consultant flagged two concerns in the Feb review: segregation of PHI from non-PHI data, and immutable audit trail for PHI access.

Our BAA requires "reasonable safeguards to ensure segregation of PHI from non-covered data." It does NOT require physical instance separation. Scale is not a driver here — db.r6g.xlarge has headroom for 10x current load.

The real decision driver is **blast radius of a compliance breach**. In today's architecture, one SQL-injection bug or compromised app credential exposes all data. We need a design that materially reduces that blast radius while respecting our 3-engineer team's capacity.

## Decision

**Adopt "Option A+": schema-level PHI boundary inside our existing Postgres instance, with IAM DB authentication for role-scoped short-lived credentials.**

Specifically:
1. New `phi` schema housing `patients`, `appointments`, `clinical_notes`, `patient_messages`.
2. Three DB roles — `app_nophi` (default, no PHI access), `app_phi` (elevated, session-scoped), `audit_writer` (append-only audit access).
3. Row-level security on all `phi.*` tables, scoped by `app.clinic_id` session variable.
4. `audit.phi_access` table with `FORCE ROW LEVEL SECURITY` + revoked UPDATE/DELETE grants — immutable at the DB layer.
5. Application-layer: Rails `SET LOCAL role app_phi` around PHI-touching request paths, making PHI access explicit and auditable in code.
6. AWS IAM DB authentication for short-lived per-role tokens (replaces the master password for app connections).
7. Schema-scoped backup jobs — `phi` and `audit` backed up separately with distinct KMS keys and S3 destinations.

## Alternatives considered

**Option B: Extract patient service to separate Rails service + separate RDS instance.** Legitimately better for RDS-master-credential-compromise threat vectors. But: ~6-8 weeks of engineering time from a 3-person team vs ~10-12 weeks for Option A+ with far less operational complexity after shipping. Option B adds dual-DB consistency burden, cross-service query complexity, ~$300-500/mo infra cost, and a second system to maintain. The threat-vector reduction (RDS IAM compromise scenarios) is real but addressed within Option A+ via IAM DB authentication at much lower cost. **Would revisit if:** BAA language changes to require physical separation, we pursue HITRUST/FedRAMP certification, or a deal-gating enterprise customer requires separate instance.

**Option C: Stay as-is, add RLS and audit logging only.** Insufficient. Addresses authorization bugs but not the fundamental "everything in one schema" exposure — an SQL-injection bug or compromised credential still has unbounded blast radius. Rejected.

**Option D: Application-layer encryption of PHI fields.** Considered for defense-in-depth. Rejected as the primary mechanism because key management for 40k+ records with search requirements introduces more complexity than it resolves. May revisit as an additive layer for specific high-sensitivity fields (SSN, detailed clinical notes) after this migration completes.

## Rollout plan

**10-12 weeks, 4 phases per table, 4 tables. Migration order: patients → patient_messages → clinical_notes → appointments.**

- **Phase 0 (week 0):** Create schema, roles, audit table, RLS policies. Deploy dual-code-path under feature flag. Configure IAM DB auth.
- **Phase 1 (per table, ~2 weeks):** Copy data to `phi.*`. Rails dual-writes to both. Shadow-reads from `phi.*`, compares, logs discrepancies. Exit: 72 hours clean.
- **Phase 2 (per table, ~1 week):** Flip feature flag — reads from `phi.*`. Writes still dual. Exit: 72 hours clean at full read traffic.
- **Phase 3 (per table, ~1 week):** Stop dual-writes. Wait 7 days. Drop `public.<table>`.

Each phase is independently rollback-able. Rollback at any point = flip feature flag or revert Rails deploy. No data-loss scenarios.

**Mitigations for the 3 known risks:**
- RLS silent-empty bug: `require_clinic_id()` DB function raises if session var unset, called at start of every PHI request. Caught in phase 1 shadow-read.
- Dual-write race divergence: `SELECT FOR UPDATE` + single-transaction dual-write.
- FK orphans: pre-drop constraint check via `information_schema.constraint_column_usage`. Stop if anything references the table.

## Open questions

1. **Replica strategy.** Do we provision a read replica for `phi.*` queries (separate security group, isolated network)? Current load doesn't require it; question is whether the isolation is worth the added infra. **Proposed:** defer until after migration completes; evaluate at 100k records.

2. **Audit log retention + archival.** `audit.phi_access` will grow ~2-5M rows/year at current scale. At what point do we move rows older than N days to S3 via logical replication? **Proposed:** partition by month starting now; revisit archival policy at 50M rows.

3. **Rake tasks and background jobs that currently touch `public.patients`.** Need a full audit of non-web-request PHI access code paths before phase 1. **Owner:** [assign Friday.]

4. **Disaster-recovery testing.** Current DR playbook assumes single-schema restore. Needs update for schema-scoped backups. **Owner:** [assign Friday.]

---

**Ask of this group:** decide today on Option A+. If approved, I'll open the Phase 0 tickets Monday and we'll target Phase 0 complete by end of next week.
```

That's the doc. Under 2 pages rendered (I checked — 1.7 pages in Notion's default width). Alternatives section names real trade-offs and real revisit-conditions for Option B, not strawmen. Open questions are genuine open questions with proposed resolutions and owners-to-assign, not rhetorical filler.

One note on using this: when the eng team pushes back on anything Friday, route their concern to which section it falls into (context / decision / alternatives / rollout / open question). If it doesn't fit any of those, it's probably a question for a different RFC. That routing exercise keeps the review from dissolving into re-litigating Option B for 35 minutes.$pf$,
 $pf$Complete RFC in markdown — Context, Decision (Option A+ with 7 specific components), Alternatives (B / C / D with honest trade-offs and revisit conditions), Rollout (10-12 week phased plan with per-phase rollback), Open questions (4 real ones with proposed resolutions). Under 2 pages rendered. Ready to paste into Notion.$pf$);

-- =========================================================================
-- END OF FILE — append next project(s) below this line.
-- Iterations working the Content queue: add 2–3 projects per iteration,
-- appending below this comment. Do NOT rewrite existing projects.
-- =========================================================================

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_steps ENABLE ROW LEVEL SECURITY;
