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
-- END OF FILE — append next project(s) below this line.
-- Iterations working the Content queue: add 2–3 projects per iteration,
-- appending below this comment. Do NOT rewrite existing projects.
-- =========================================================================

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_steps ENABLE ROW LEVEL SECURITY;
