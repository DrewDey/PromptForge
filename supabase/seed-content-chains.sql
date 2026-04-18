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
-- Project 0010 — Design (UX research synthesis: 12 interviews → exec deck)
-- priya_creates · Claude 4.6 Opus · 4 steps · intermediate
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550010';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550010';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550010',
  $pf$12 user interviews → exec deck in an afternoon — a 4-prompt synthesis workflow that survived VP-Product pushback$pf$,
  $pf$Finished a 12-person research round on our onboarding drop-off. Took Claude through extraction → JTBD reframe → recommendations-with-objections → 9-slide exec deck. The reframe step is what saved it — Claude pushed back on my first read of the data and was right.$pf$,
  $pf$I'm the senior UX researcher on a B2B SaaS team (project management tool, ~8k seats). We'd been seeing a 34% drop-off between account creation and first real action, and leadership signed off on a qualitative round to figure out why. I ran 12 interviews over three weeks — PMs, team leads, one IT admin, one exec sponsor. Transcripts were in Dovetail.

Synthesis is the part I've historically underinvested in. I'd come out of rounds with a pile of affinity-mapped themes that all sounded like "users are confused" and a set of recommendations that couldn't survive a single meeting with our VP Product, who is sharp and skeptical. This time I wanted the synthesis to hold up.

Four prompts, sequential, each consuming the prior output. Used Claude 4.6 Opus — this is the kind of work where the model's ability to push back on my framing is the actual deliverable, not raw summarization throughput. Sonnet would've been faster and would've agreed with me more. That's exactly what I didn't want.$pf$,
  $pf$Deck landed. VP Product's first question in the meeting was the objection I'd already scripted an answer for in step 3 ("why not just fix the activation email copy instead of the whole first-run flow?"), which was disorienting in a good way — the meeting went straight to "okay what's the scope of option 2" instead of litigating whether there was a problem.

The turning point was step 2. My initial read of the 12 interviews was "users want more templates and better empty states" — which is what every designer always wants the answer to be, because it's the work we already know how to do. Claude surfaced that pattern and asked me to test it against a harder reframe: the drop-off wasn't about missing scaffolding, it was about users not knowing which of their existing tools this replaced. That reframe held up when I went back to the transcripts and counted — 9 of 12 interviewees had used some variation of "do I stop using [X] now?" language. I'd coded those statements under "tool migration" in Dovetail and not thought about them as central.

Two things I'd do differently next round: (1) start Claude on the raw transcripts, not my pre-made summaries — the summarization pass I did first probably washed out exactly the kind of language Claude later flagged. (2) Run step 3's objection-generation earlier, like during recommendation drafting rather than after, so the objections can shape the recommendations instead of just defending them.$pf$,
  '11111111-1111-1111-1111-111111111105',
  'intermediate',
  'claude-opus-4-6',
  'Claude 4.6 Opus',
  ARRAY['Claude','Dovetail','Figma','Notion'],
  ARRAY['ux-research','synthesis','jtbd','b2b-saas','exec-communication','onboarding'],
  'approved',
  '22222222-2222-2222-2222-222222222204',
  82, 44
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('66666666-6666-6666-6666-6666666A0101',
 '55555555-5555-5555-5555-555555550010',
 1,
 $pf$Theme extraction from 12 interview summaries$pf$,
 $pf$I just finished a round of 12 user interviews investigating onboarding drop-off on our B2B SaaS project-management tool. The question leadership asked was: "why do 34% of new workspace accounts never take a meaningful action after account creation?"

I'm going to paste 12 interview summaries below. Each is 300-500 words, my own notes from the interview, organized roughly as: who they are, what they were trying to do when they signed up, what happened in their first session, what they did or didn't come back to, and the most memorable thing they said. These are my summaries, not full transcripts — I've already done a pass of condensation.

What I want from you in this step: pull out the 5-8 most load-bearing themes. Not the 20 themes that technically appear. The ones that actually showed up in enough interviews and with enough signal that they'd earn space in a 9-slide exec deck. For each theme, tell me (a) how many of the 12 participants surfaced it, (b) one representative direct quote if I included one in the summary, (c) a one-line description of the theme in the interviewees' language, not design jargon.

Don't give me "users are confused." If a theme is that generic, collapse it or break it into something specific enough to act on. And flag any theme where I'm probably over-coding — where I've bucketed things together that are actually two different problems.

[12 interview summaries pasted here — Maria (product manager, 80-person marketing agency); Devon (team lead, construction firm); Priya (ops at a Y Combinator startup); Aaron (IT admin, 500-person school district); Rachel (VP Product, D2C brand); etc. — full text ~5,400 words]$pf$,
 $pf$Working through the 12 summaries. Here are the themes I'd stake an exec deck on, ranked by signal:

**Theme 1 — "Which of my existing tools does this replace?" (9 of 12)**
*Representative quote (Devon, team lead):* "I kept opening [our current tool] in the other tab because I didn't know if this was supposed to replace it or sit next to it. By Thursday I just closed yours."
This is the strongest pattern in the data and it shows up in nine different surface forms — "where do I put my existing projects," "do I stop using Asana now," "is this the source of truth now." I'd argue it's one theme, not nine, because the underlying user state is identical: they can't commit to the new tool until they understand the migration story, and nothing in your onboarding tells them.

**Theme 2 — Setup tasks that feel like other people's work (7 of 12)**
*Representative quote (Maria, PM at agency):* "It asked me to invite my team on screen three. I don't even know if I'm going to use this yet."
Premature asks: invite teammates, set up integrations, configure notifications. Users interpret these as the tool assuming commitment they haven't made. Seven participants explicitly mentioned stalling at one of these gates.

**Theme 3 — Templates that don't match the shape of their work (6 of 12)**
*Representative quote (Rachel, VP Product):* "The 'marketing campaign' template had 14 fields I didn't need and none of the ones my team actually tracks."
Template coverage is broad but shallow. Users see their category represented, pick the template, and then bounce off the mismatch. Worth flagging: two interviewees (Aaron, Devon) said the templates made them think the tool wasn't built for their industry.

**Theme 4 — First meaningful action unclear (5 of 12)**
*Representative quote (Priya, ops at startup):* "I kept waiting for something to tell me 'this is the thing you're supposed to do first.' It never came."
After account creation there's no clear path to a first valuable action. Five users described a "now what" moment. This one's real but it's downstream of theme 1 — once users resolve the migration question, the "now what" usually resolves too.

**Theme 5 — Admin/permission setup blocks single users (4 of 12)**
This is specifically about the IT-admin and larger-company participants (Aaron, and three others in regulated industries). The setup flow assumes a user who can freely create workspaces; admins in their context can't. Smaller n but a clean signal within that segment.

**Themes I'd deliberately NOT put in the deck:**
- "Wanted more empty-state illustrations" (2 of 12) — real but small.
- "Notifications too aggressive" (3 of 12) — real but downstream of theme 2 (they stalled before turning notifications on).
- "Pricing page confusing" (2 of 12) — off-scope for onboarding drop-off research.

**One flag on over-coding:** I think you may have bucketed theme 2 (premature asks) and theme 5 (admin permissions) closer than they deserve. They share a surface ("can't proceed past a gate") but the user states are different — theme 2 users could proceed, they chose not to. Theme 5 users actually couldn't. If the recommendations diverge (they will), these need to be separated early.$pf$,
 $pf$Five themes with participant counts and representative quotes, ranked by signal; three themes explicitly excluded with reasons; one over-coding flag on themes 2 and 5. Ready for JTBD reframe in step 2.$pf$),

-- Step 2 --
('66666666-6666-6666-6666-6666666A0102',
 '55555555-5555-5555-5555-555555550010',
 2,
 $pf$JTBD reframe — collapse themes to jobs, push back on design-team bias$pf$,
 $pf$Okay, I have my 5 themes from step 1. Before I draft recommendations I want to reframe this through a jobs-to-be-done lens, and I want you to push back on me.

My instinct right now is to recommend work my design team already knows how to do — more templates, better empty states, richer first-run tutorials. That's suspicious. Every round of UX research I've ever done has somehow concluded that the solution is more design. That pattern is almost certainly me, not the data.

Here's what I want you to do:
1. Restate the 5 themes as underlying jobs — what the user is actually trying to get done, in their language, not ours.
2. Tell me whether any of these jobs collapse into a single more fundamental job. I suspect themes 1 and 4 are the same job and I want your read.
3. Most importantly: tell me where my framing is biased toward "design can fix this" solutions. Be specific. If there's a job here where the right answer is a product decision, a marketing decision, a sales-assisted-onboarding decision, or a "don't solve this, accept the cost" decision — say so. I need you to argue against the design-centric read.

I'd rather be told I've been looking at this wrong than walk into the exec meeting with a pre-ordained answer.$pf$,
 $pf$Good instinct to audit yourself here. Let me work through this in the order you asked.

**Restated as jobs:**

- Theme 1 → "Help me decide whether to commit to this tool over the one I'm already using." (job of *migration commitment*)
- Theme 2 → "Let me evaluate this tool before I involve other people." (job of *solo evaluation*)
- Theme 3 → "Show me this tool was built for work shaped like mine." (job of *category fit*)
- Theme 4 → "Tell me what to do first so I can produce real value in one session." (job of *first value*)
- Theme 5 → "Let me use this without needing org-level permissions I don't have." (job of *unblocked access*)

**Collapses:**

You asked about 1 and 4 — I'd push back on that collapse. Theme 1's job is *commitment* (do I switch?). Theme 4's job is *activation* (what do I do right now?). They feel similar because both end in "user doesn't do anything," but the intervention surface is different. You can answer theme 4 with a single "start here" card and not touch theme 1 at all. You cannot answer theme 1 with any amount of first-run UX — it requires a positioning decision about what this tool replaces.

The collapse I *would* argue for: themes 2 and 3 both resolve into "let me assess fit privately." Solo evaluation and category fit are two surface forms of the same user question — "is this for me?" — which the tool can answer either by letting the user explore without asking things of them (theme 2) or by showing them their work represented (theme 3). One job, two levers.

So I'd call this three jobs, not five: *migration commitment*, *private fit assessment*, *first value*. Theme 5 is a segment-specific variant, not its own job at scale.

**Where your framing is biased toward design solutions — candidly:**

**Job 1 (migration commitment) is not a design problem.** It's a positioning and marketing problem. The tool doesn't tell users what it replaces because *your company* hasn't committed to what it replaces. Your own website's comparison page — I'd bet — hedges. Nine out of 12 users couldn't resolve this from the product because the product is downstream of an unresolved marketing-level question. If your recommendation here is "add a migration wizard," you're designing your way around a decision your CMO should be making. The right recommendation might be "we need leadership alignment on the positioning statement, *then* design responds."

**Job 2/3 (private fit assessment) is partially a design problem.** Better category templates, cleaner empty states — those help. But there's a deeper product decision underneath: should this tool allow *no-commitment exploration* at all (a read-only sandbox, or a pre-signup interactive demo), or is the current "create an account and start building" model the right one and you just need to make it lighter? That's a product-strategy question. Design can execute either answer but shouldn't pick which.

**Job 3 (first value) is genuinely a design problem.** A "here's your first meaningful action" card, post-activation, lands entirely in your team's scope.

**Segment-specific (theme 5) is a sales-assisted-onboarding question.** The admin/regulated-industry users can't be solved by self-serve onboarding improvements at all. If that segment is strategically important, you need a sales-led motion for them, not a redesigned signup flow. If it's not strategically important, accept the drop-off as a cost of being self-serve.

**Direct answer to your question:** of the three real jobs, one is a marketing/positioning call, one is a product-strategy call you can inform but shouldn't make alone, and one is design's to own. Your deck is strongest if you present them that way rather than framing everything as a design initiative. It also gives the VP Product an honest menu of interventions instead of a single "let design fix it" ask — which is the kind of framing that tends to get half-funded and under-resourced because it overclaims scope.$pf$,
 $pf$Collapses 5 themes to 3 jobs (migration commitment, private fit assessment, first value) plus one segment variant. Flags that the first job is a positioning/marketing decision and the second is a product-strategy decision — only the third is pure design scope. Reframes the exec deck as a menu of interventions with honest ownership, not a single design initiative.$pf$),

-- Step 3 --
('66666666-6666-6666-6666-6666666A0103',
 '55555555-5555-5555-5555-555555550010',
 3,
 $pf$Top-3 recommendations with quote evidence and pre-scripted VP-Product objections$pf$,
 $pf$Building on step 2's three-jobs reframe, I need to write my top-3 recommendations for the exec deck. Here's my ask:

For each of the three jobs (migration commitment / private fit assessment / first value), produce one recommendation I'd put in front of leadership. For each recommendation include:

1. The recommendation itself — one sentence, action-oriented, identifying who owns the work (marketing, product, design, or cross-functional).
2. Two or three pieces of evidence from the interviews — direct quotes where possible, participant IDs from step 1.
3. The single sharpest objection our VP Product (Marcus) will raise. Marcus's pattern: he hates work that can't be cheaply validated, and he'll always ask "why not just [smaller version]?" Pre-script his objection verbatim in the voice of someone who doesn't want to fund a multi-quarter initiative.
4. The honest 4-6 sentence answer to that objection. Not a defensive answer — a real one. If the honest answer is "you're right, we should do the smaller version first," say so.

Order the three recommendations by expected impact, not by what's easiest to ship.$pf$,
 $pf$**Recommendation 1 — Migration commitment (Marketing owns, Product supports)**

*Recommendation:* Resolve and publish a single-sentence positioning statement on what this tool replaces, then update the signup flow, homepage, and comparison pages to reflect it. Marketing-owned, product-informed, 4-6 weeks.

*Evidence:*
- Devon (team lead): "I kept opening [our current tool] in the other tab because I didn't know if this was supposed to replace it or sit next to it."
- Maria (PM, agency): "Your homepage made it sound like it does what Asana does and what Notion does. I need to know which one I'm supposed to stop using."
- Count: 9 of 12 participants surfaced some version of this.

*Marcus's objection (verbatim):* "We have a positioning statement. It's on the homepage. Are we really saying 34% of our drop-off is because users don't read the homepage? Why not just A/B test some clearer copy on the signup page first and see if that moves the number before we get marketing to rewrite the company narrative?"

*Honest answer:* Partially yes — a copy test on the signup page is a reasonable first move and I'd support running it in parallel. But the evidence isn't that users didn't read the homepage; it's that the homepage is internally inconsistent. Three interviewees specifically named the comparison page as making them *more* confused, not less. A 2-week signup-copy test will probably move drop-off by 3-5 points if we're lucky. What won't move unless we fix the source is the pattern where users spend their first session mentally A/B-testing your tool against their existing one instead of using it. That's the ceiling on any downstream onboarding work we do.

---

**Recommendation 2 — Private fit assessment (Product-strategy call, Design executes)**

*Recommendation:* Build a pre-signup interactive demo (no account required) that lets a user explore a pre-populated workspace shaped like their category. Product-strategy decision on scope; design executes once scoped. 8-12 weeks depending on scope.

*Evidence:*
- Rachel (VP Product at D2C brand): "The 'marketing campaign' template had 14 fields I didn't need and none of the ones my team actually tracks. I closed the tab."
- Priya (ops at startup): "I wanted to just poke around before signing up. But I had to create an account to see anything."
- Count: 6 of 12 for template mismatch; 7 of 12 for premature setup asks. These collapse to one job per step 2.

*Marcus's objection (verbatim):* "A pre-signup interactive demo is a quarter of engineering work. Why not just make the first-run templates better and see if that closes the gap? We already have a templates system."

*Honest answer:* Making templates better is a 4-6 week effort and it'll help, but it won't close the job. The job isn't "the template was wrong," it's "I needed to assess fit before committing — and creating an account is a commitment I wasn't ready to make." Better templates address the second half of that; they don't address the assessment-before-commitment pattern. If the choice is binary — better templates *or* a pre-signup demo — I'd actually recommend better templates first as the cheaper test, and only greenlight the demo if the template improvements move drop-off less than 8 points. That's a legitimate staged call.

---

**Recommendation 3 — First value (Design owns, ships fast)**

*Recommendation:* Add a single "here's your first meaningful action" card, dynamically populated based on signup context, that appears post-activation and persists until completed. Design-owned, 3-4 week effort.

*Evidence:*
- Priya (ops at startup): "I kept waiting for something to tell me 'this is the thing you're supposed to do first.' It never came."
- Aaron (IT admin): "There's no moment where the app says 'congrats, now do this.' I felt unparented."
- Count: 5 of 12, with high consistency in language.

*Marcus's objection (verbatim):* "Isn't this just a better onboarding checklist? We tried a checklist two years ago and shut it down because nobody completed it."

*Honest answer:* Yes, it is a checklist — specifically, a one-item checklist, which is the thing that failed two years ago when we tried an eight-item checklist. The shape of the past failure argues *for* this recommendation, not against it. Eight items asked users to complete setup tasks (job 2 work), so users correctly interpreted the checklist as work we were asking of them. A single "do this one meaningful thing" card isn't a setup task — it's a prompt to the first action that produces visible value. Those are different artifacts even if they visually look similar. We can scope the first version tight enough to validate or kill cheaply: 3 weeks, one surface, one metric (activation-to-first-action conversion).

---

**Suggested deck ordering:** lead with recommendation 1 because it sets up the argument that onboarding drop-off has three distinct causes with three different owners. Recommendations 2 and 3 then slot into that argument naturally. Leading with 3 (the design-owned one) invites Marcus to treat the whole deck as a design initiative, which is the framing you wanted to avoid.$pf$,
 $pf$Three ranked recommendations, each with owner, evidence quotes with participant IDs, a verbatim Marcus-voice objection, and an honest non-defensive answer including one case where the honest answer is "your smaller-version instinct is partly right — here's the staged call." Ordered by impact; deck-sequencing note explains why recommendation 1 leads.$pf$),

-- Step 4 --
('66666666-6666-6666-6666-6666666A0104',
 '55555555-5555-5555-5555-555555550010',
 4,
 $pf$9-slide exec deck with speaking notes — drafted for Monday$pf$,
 $pf$Final step: turn the three recommendations into a 9-slide executive deck, with speaking notes for each slide. Audience: VP Product (Marcus), CEO, VP Engineering, Head of Marketing. 20-minute slot, 10 minutes of presenting and 10 of discussion.

Constraints:
- 9 slides hard cap. If it doesn't fit, it's not deck-ready.
- Each slide should have a clear single-sentence takeaway in the speaker notes — what the audience should leave that slide believing.
- No filler slides (no "About this research" or "Methodology" unless it earns its place).
- Speaker notes should be 2-4 sentences max per slide — I read them live, they're not the deck.
- The deck should make the three-owners framing from step 2 visible on the slide structure itself, not buried in one slide.

Write the deck as markdown — slide number, title, 3-5 bullet body, then speaker notes below in italics. I'll translate to Figma.$pf$,
 $pf$**Slide 1 — The finding**
- 34% of new workspace accounts never take a meaningful action
- 12 interviews, 3 weeks, mix of PMs / team leads / admins across 6 industries
- The drop-off has three distinct causes — one is ours to design around, one is ours to decide, one is ours to position

*Speaker notes: The audience should leave this slide knowing there are three causes, not one. That reframing is the entire deck. If they leave thinking "this is a design problem," we've lost.*

---

**Slide 2 — What we heard, in their words**
- 9 of 12: "I didn't know which of my existing tools this was replacing."
- 7 of 12: "It asked me to invite my team on screen three. I don't even know if I'm going to use this yet."
- 5 of 12: "I kept waiting for something to tell me 'this is the thing you're supposed to do first.' It never came."
- These aren't three complaints. They're three jobs users came to do and couldn't.

*Speaker notes: Pure quotes. No interpretation yet. Let the room hear the users before we editorialize.*

---

**Slide 3 — Three jobs, three owners**
| Job | Owner |
| --- | --- |
| Migration commitment | Marketing (Product supports) |
| Private fit assessment | Product strategy (Design executes) |
| First value | Design |

*Speaker notes: This is the load-bearing slide. Every subsequent slide maps to one row. The goal is that by the end, nobody in the room thinks this is one initiative with one owner.*

---

**Slide 4 — Job 1: Migration commitment (Marketing)**
- Users can't commit to our tool until they know what it replaces
- Our positioning is internally inconsistent: homepage vs. comparison page vs. onboarding tell different stories
- Recommendation: Marketing-owned positioning resolution, 4-6 weeks
- Product supports with a signup-flow update once positioning lands

*Speaker notes: If this lands, everything else is sequenced behind it. If Marcus pushes to run a signup-copy A/B test in parallel first — agree. It's a reasonable parallel move.*

---

**Slide 5 — Job 2: Private fit assessment (Product strategy)**
- Users want to assess before committing — creating an account is the commitment
- Template mismatch is a symptom; the real job is "let me explore shaped like me"
- Two candidate interventions: better category templates (6 weeks) or pre-signup interactive demo (12 weeks)
- Recommend: ship template improvements first, greenlight demo if drop-off doesn't move 8+ points

*Speaker notes: This is the slide where we genuinely hand the decision to product. Come in ready to recommend but not ready to fight. The staged version is the honest ask.*

---

**Slide 6 — Job 3: First value (Design)**
- Post-activation, users get no signal about what the valuable first action is
- Single "your first meaningful action" card — dynamic, context-aware, persistent
- 3-4 weeks, design-owned, ships on its own timeline
- Pre-emptive answer to the "we tried checklists" objection: an 8-item setup checklist and a 1-item first-value card are different artifacts

*Speaker notes: This is the only recommendation we can start next week. Name that explicitly.*

---

**Slide 7 — What we deliberately didn't recommend**
- More empty-state illustrations (2 of 12 signal — real but small)
- Notification system rework (3 of 12 — downstream of job 2)
- Admin/IT sales-assisted onboarding (segment-specific — flagged for separate conversation)

*Speaker notes: Naming what we excluded is more persuasive than defending what we included. Leaves the room with no "what about…" loose ends.*

---

**Slide 8 — Risks to this read**
- 12 interviews is a small n. Quantitative validation should follow — activation-funnel event segmentation by signup source
- Migration-commitment finding is directional until we instrument "returned to competitor tab" signal
- None of the three interventions is reversible once positioning publishes — stage 1 is the point of no return

*Speaker notes: The deck is stronger with this slide than without it. Marcus respects researchers who name their own uncertainty.*

---

**Slide 9 — The ask**
- Approve Recommendation 3 (first value card) for start next sprint — 3-4 weeks, design-owned
- Greenlight Recommendation 2 (better templates) as parallel product-track work
- Schedule separate session on Recommendation 1 with Marketing leadership this quarter
- I'll instrument the funnel validation over the next 4 weeks regardless of decisions above

*Speaker notes: End with a concrete menu. The worst outcome is this meeting ending with "interesting research, let's discuss." The three bullets are three discrete decisions the room can make today.*

---

One note on the deck: I've written slide 9 as three separate asks on purpose. If Marcus approves recommendation 3 today and defers 1 and 2, that's still a win — you've moved the most shippable piece into motion and created a forcing function to keep talking about the other two.$pf$,
 $pf$9-slide deck in markdown: finding → direct quotes → three-jobs-three-owners table → one slide per recommendation (4-6) → deliberate exclusions → risks-to-this-read → three-part ask. Speaker notes 2-4 sentences per slide, each with a single-sentence takeaway. Structured so the exec meeting ends with discrete decisions, not "interesting, let's discuss."$pf$);

-- =========================================================================
-- Project 0011 — Personal (Trip-planning: 30th-birthday Sequoia camping)
-- lena_solopreneur · Claude 4.6 Sonnet · 3 steps · beginner
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550011';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550011';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550011',
  $pf$Planning a 6-person 30th-birthday Sequoia trip with Claude — the pushback on my backcountry instinct is what saved it$pf$,
  $pf$Planned a 4-day group camping trip for my 30th. Six friends, mixed experience, two dietary constraints. Claude talked me out of the backcountry plan I had my heart set on (correctly), built a communal meal plan that didn't make the celiac friend feel sidecar'd, and gave me a gear-delegation matrix by experience tier. Everyone came back still friends.$pf$,
  $pf$I turn 30 next month and instead of a party I wanted to do a long weekend camping trip with five close friends. Thursday to Sunday. I'm a decent backpacker — I've done a few overnighters on the PCT — but three of the six of us have never slept in a tent. One friend has celiac, one is vegetarian. Budget is flexible but not unlimited; nobody's spending $500 each on this.

I'd already half-decided on a Sequoia backcountry trip (Mineral King area) because that's what I personally wanted to do. I knew, somewhere in the back of my head, that dragging three first-time campers into the backcountry on a permit-required trip was probably the wrong call. I wanted Claude to tell me that clearly before I talked myself into it.

Three prompts, sequential. Claude 4.6 Sonnet all three — this isn't work that needed heavy reasoning, it needed a second opinion that wouldn't just validate me. The pushback on prompt 1 was the entire value of the exercise. If Claude had said "great idea, here's your permit process," I'd have led five friends into a trip that was going to end with someone miserable at 10,000 feet.$pf$,
  $pf$Trip was last weekend. We stayed at Lodgepole car campground on Claude's rec and did two day hikes from basecamp — Tokopah Falls (easy, first-timer friendly) and part of the Lakes Trail (harder, optional for whoever wanted it). Three first-timers did the easy hike, two of us did the harder one, one friend read a book at camp. Everyone got what they wanted.

The meal plan worked — communal dinners both nights that naturally met the celiac and vegetarian constraints without anyone eating a "special plate." The gear-delegation matrix meant nobody had to think about what to bring; they got a list of 4-6 items per person sized to their experience level. The "flags for things you'll forget" list at the end of prompt 3 caught two of them — I brought extra headlamps and a spare stove fuel canister that otherwise wouldn't have been on my list.

What I didn't expect: the pushback in prompt 1 wasn't just "don't do backcountry." It was a reframe of what the trip was actually for (a group birthday, not a Lena wilderness trip) that shaped every subsequent decision. I'd been designing the trip for myself and claiming it was a group event. Getting that named early fixed more than the campsite choice.$pf$,
  '11111111-1111-1111-1111-111111111110',
  'beginner',
  'claude-sonnet-4-6',
  'Claude 4.6 Sonnet',
  ARRAY['Claude','Recreation.gov','AllTrails'],
  ARRAY['travel','camping','group-planning','dietary-constraints','birthday','sequoia'],
  'approved',
  '22222222-2222-2222-2222-222222222210',
  56, 23
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('66666666-6666-6666-6666-6666666B0101',
 '55555555-5555-5555-5555-555555550011',
 1,
 $pf$Route + campsite — and push back on my backcountry instinct$pf$,
 $pf$I'm planning a 4-day camping trip for my 30th birthday. Thursday through Sunday, late May. Six people including me. I want to do something in Sequoia National Park because I love it there and haven't been in two years.

Group composition:
- Me: intermediate backpacker, a few PCT overnighters, comfortable with permits and backcountry
- Friend A: intermediate, has done car camping many times, one backpacking trip
- Friend B: never camped. Outdoorsy-adjacent (runs, hikes day hikes)
- Friend C: never camped. Self-describes as "indoorsy." Willing but nervous
- Friend D: never camped. Loves the idea but has a bad back
- Friend E: intermediate, backpacked in college, not recently

Dietary: one celiac (Friend C), one vegetarian (Friend D). Budget ~$300-400 per person all-in including gear rental if needed.

My instinct is to do Mineral King — I've wanted to do the Sawtooth Pass / Monarch Lakes area, it's stunning, and the backcountry feels like a real trip. I know I could probably make this work with a lot of planning.

I want you to tell me honestly whether that's the right call. Don't just validate me. If three first-timers plus a bad-back friend shouldn't be on a backcountry permit trip at 10,000 feet, say so clearly. Give me the real recommendation for this specific group, not the trip I want to go on.$pf$,
 $pf$It's not the right call, and I don't think you need me to walk you through why in detail because you already know — you've flagged it yourself in the framing. Three first-timers and a friend with a bad back on a Sawtooth Pass trip is a trip where at least one of them is going to be miserable by hour six, and the person responsible for that misery is the birthday planner. That's not the weekend you want.

The real question underneath: is this trip *your* 30th birthday trip or a *group* 30th birthday trip? Because those are different trips and they'd lead to different answers. Reading your group composition, I think this is the second one — you explicitly invited three people who've never camped — and the trip should be designed for them, not calibrated down from your Mineral King vision.

Here's what I'd actually do:

**Lodgepole Campground, car camping, 3 nights (Thu-Sun).** Reservable on recreation.gov, typically opens 6 months ahead so you're well within the window for late May. Sites are around $32/night. Car camping means:
- Friend C and Friend D aren't sleeping in a tent in the backcountry on night one of their first camping trip.
- Bad back gets a real sleeping pad, car-ferried cooler food, and the ability to bail to a hotel in Three Rivers if the night doesn't work.
- You can do ambitious day hikes *from* basecamp without the commitment of a backcountry permit, and the day hikers can match their own ability.

**Day hike menu, not a fixed itinerary:**
- *Friday (arrival day):* nothing ambitious. Tokopah Falls (3.8 mi round-trip, easy, waterfall payoff) or General Sherman + Congress Trail loop if people want to see the big trees.
- *Saturday (main day):* split the group. Ambitious option = Lakes Trail to Heather Lake (9 mi, ~2,200 ft gain, doable for you + Friend A + Friend E). Mellow option = Big Trees Trail + driving tour of Giant Forest. People self-select.
- *Sunday (day before leaving):* easy morning hike or hang at camp. Nobody should be pushing hard on a travel-prep day.

**Why specifically Lodgepole over Dorst or Potwisha:**
- Elevation (6,700 ft) is real but not brutal — Dorst is similar, Potwisha is lower but hotter in late May.
- Proximity to Giant Forest and Tokopah means the easiest hikes are right there, which matters for Friend C/D/B (the never-camped group).
- Amenities matter more than you think for first-timers: flush toilets, potable water, a ranger station. Friend C's celiac means they're going to need access to their own food prep zone and a bear box, which Lodgepole has.

**What you're giving up by not going backcountry:**
- The "real trip" feeling. But I'd argue you're not giving that up, you're deferring it — you can plan a 2-person Mineral King trip with Friend A in September, which is better weather and a better partner for it anyway.

**One thing to put in your calendar now:** book the site *tomorrow*. Late May Lodgepole fills early even 4 months out; if you wait a week the weekend you want will be gone.$pf$,
 $pf$Rejects the Mineral King backcountry plan clearly, reframes trip as "group 30th, not Lena's wilderness trip." Recommends Lodgepole car camping 3 nights with a menu-style day-hike structure so experience tiers self-select. Flags the booking urgency.$pf$),

-- Step 2 --
('66666666-6666-6666-6666-6666666B0102',
 '55555555-5555-5555-5555-555555550011',
 2,
 $pf$Communal meal plan — celiac + vegetarian without sidecar'ing anyone$pf$,
 $pf$Okay, booked Lodgepole for Thu-Sun. Now I need the meal plan.

Six people, 3 nights / 3 breakfasts / 3 lunches / 3 dinners (Thursday dinner through Sunday breakfast). Constraints:
- Friend C: celiac. Strict, medically serious, not a preference.
- Friend D: vegetarian. Not vegan, eats eggs and dairy.
- Everyone else: omnivore, no allergies.

What I want to avoid: the pattern where Friend C and Friend D each get a "special plate" while the other four of us eat the real meal. I've been on that trip. It sucks. It makes the constraint-having friends feel like they're being accommodated rather than included.

What I want instead: communal meals where the default is naturally celiac-safe and where the vegetarian can eat most of it with one simple add-on of protein for the rest of us. I'd rather eat naturally-GF meals for 3 days than try to maintain separate parallel meals.

Give me a meal plan: 3 dinners, 3 breakfasts, 3 lunches. For each, tell me:
- What it is
- How it handles celiac + vegetarian naturally
- Prep-ahead vs. prep-at-camp
- Approximate cost for 6 people
- Honest difficulty (we have two stoves and a single cast iron)

Keep dinners the social highlight. Lunches can be low-effort. Breakfasts moderate.$pf$,
 $pf$Designed around "default is celiac-safe, meat is the add-on." This flips the usual pattern and works for a group this size.

**DINNER 1 (Thursday) — Tacos al pastor bowls**
- Base: cilantro-lime rice + black beans + grilled peppers + onions. All GF by default, vegetarian complete.
- Protein add-on: marinated pork shoulder for the omnivores (marinate at home in a ziploc, grill at camp).
- Toppings: avocado, cilantro, lime, salsa, cotija, corn tortillas (GF!) on the side for whoever wants them.
- Prep-ahead: marinate pork, pre-cook rice at home and reheat, wash/chop peppers at home.
- Cost: ~$40. Camp difficulty: easy. One stove for rice reheat, grill or cast iron for pork + peppers.
- *Why it works:* vegetarian version is the bowl without pork — it's not a stripped-down version, it's a complete dish. Celiac works because corn tortillas are naturally GF and everything else already is.

**DINNER 2 (Friday) — Thai-ish coconut curry with rice**
- Base: red curry with coconut milk, sweet potato, bell pepper, chickpeas, spinach. GF, vegetarian, hearty.
- Protein add-on: pre-cooked shredded chicken stirred into individual servings for the omnivores.
- Prep-ahead: chop all vegetables at home, pre-cook chicken, measure curry paste + coconut milk into a ziploc.
- Cost: ~$35. Camp difficulty: moderate. Single pot on one stove, 35 min.
- *Why it works:* curry is inherently a "protein-optional" dish. The vegetarian version is the default version. Nobody's eating a stripped-down meal. Chicken goes into individual bowls, not the pot, so no cross-contamination.

**DINNER 3 (Saturday, birthday night) — Grilled steak + roasted veg + chimichurri, with grilled halloumi for the vegetarian**
- This is the showpiece dinner. Break the pattern deliberately — vegetarian gets their own thing (halloumi) and that's fine because it's a *better* thing, not a lesser thing.
- Sides (all GF): roasted potatoes, grilled zucchini + peppers, chimichurri, big salad.
- Cost: ~$75 (splurge for birthday). Camp difficulty: moderate-to-hard. Cast iron for steak, foil packs for potatoes, grill zucchini over open fire.
- *Why it works:* on the birthday night, honor the occasion. Halloumi grills beautifully and the vegetarian gets a meal they'll remember, not a consolation.

**BREAKFASTS**

*Thu AM (you're driving, eat on the road).* Skip camp breakfast, buy breakfast in Three Rivers en route.

*Fri AM — Shakshuka with GF toast.* Eggs poached in tomato-pepper sauce, pan-toasted GF bread on the side (bring a dedicated small pan for GF toast to avoid cross-contamination). Vegetarian-complete, celiac-safe by default. ~$18, easy, 25 min.

*Sat AM — Breakfast potatoes + eggs + bacon (separate pan for bacon).* Potatoes + peppers + onions in cast iron, eggs to order, bacon in its own pan. GF by default. Vegetarian skips bacon. ~$22, moderate, 40 min.

*Sun AM (pack-out morning) — Overnight oats prepped at home.* Individual mason jars, made at home with GF oats for everyone (it's fine — GF oats taste identical). Cold, no cleanup, 0 minutes at camp. ~$15.

**LUNCHES**

*Thu lunch (driving) — buy sandwiches/salads en route.*

*Fri lunch (hiking) — charcuterie + veg + fruit + GF crackers.* Assemble at camp before hike, pack in tupperware. No cook. Salami, cheese, olives, GF crackers (everyone just eats GF crackers, fine), carrots, hummus, apples. ~$30.

*Sat lunch (hiking, main day)* — Peanut butter + banana + honey on GF tortillas, trail mix, jerky for omnivores. Lightweight, packable, no cook. ~$15.

*Sun lunch (driving home) — you're already out of the park.*

**Totals:** roughly $250 for food across 6 people / 3 full days ≈ $42/person. Well under budget.

**The pattern across the plan:**
1. Default-GF dishes where vegetables and starch are the base, meat is add-on.
2. Celiac gets their own toast pan, bacon pan, and tortilla pack — not to separate them, to genuinely protect against cross-contamination, which celiac requires.
3. On the birthday night, break the "default is vegetarian" pattern so the meat-eaters get a real steak dinner — but give the vegetarian something *equal*, not consolation.
4. One serious cooking effort per day max. Breakfasts and lunches are assembly, not cooking.

**One pre-trip note:** confirm with Friend C specifically about their celiac severity. Some celiacs need dedicated cookware; some are okay with a thoroughly-cleaned shared cast iron. That affects whether you need to buy or rent a second small pan. Don't guess — ask them directly a week before.$pf$,
 $pf$Meal plan with default-GF communal base and meat-as-add-on pattern. Saturday (birthday) night breaks pattern intentionally — vegetarian gets grilled halloumi as an equal meal, not consolation. Breakfasts/lunches kept low-effort. Cost ~$42/person, well under budget. Includes cross-contamination protocol for celiac and a pre-trip ask about severity.$pf$),

-- Step 3 --
('66666666-6666-6666-6666-6666666B0103',
 '55555555-5555-5555-5555-555555550011',
 3,
 $pf$Gear delegation by experience tier + "Flags for Things You'll Forget"$pf$,
 $pf$Last piece. I don't want to be the person who packed for everyone. I want a gear-delegation matrix where each friend gets a clear list of 4-6 items to bring, sized to their experience level. First-timers should not be figuring out which sleeping pad to buy.

Group again:
- Me + Friend A + Friend E (intermediate): can be trusted with real gear decisions
- Friend B + C + D (first-timers): give them the minimum viable list, tell them exactly what to buy or rent

Shared gear (tents, stoves, cookware, cooler, water containers): I'll handle the assignments for those among the intermediate folks.

What I want from you:
1. A gear-delegation matrix — for each friend, a bullet list of what they personally bring.
2. A rental vs. buy call for the first-timers' big items (sleeping bag, pad, headlamp). They don't need to buy a $300 bag for their first trip.
3. A "flags for things you'll forget" list — the things that every camping trip leader forgets until day 2. Cast a wide net here. I'd rather bring one thing I didn't need than be short one thing someone needed.$pf$,
 $pf$**Gear delegation matrix**

*You (Lena, trip lead):*
- Your tent (you already own). Bring the 4-person for yourself + 1 other; the other intermediates bring a 2-person each.
- Both stoves + fuel (verify canister levels, bring 1 spare).
- Cast iron skillet + dedicated small GF-only pan.
- Large cooler (the big one), pre-chilled 24 hrs before.
- Headlamp + 2 spare batteries.
- First aid kit + any personal meds.

*Friend A (intermediate, car-camps often):*
- Their 2-person tent + their own sleeping setup.
- 5-gallon water jug (fill at Lodgepole potable spigot).
- Cutting board + chef's knife + paring knife (kitchen gear, good ones from home).
- Camp chairs x 3.
- Dish bin + biodegradable soap + dish towel.

*Friend E (intermediate, rusty):*
- Their 2-person tent + their own sleeping setup.
- Coffee setup (pour-over or moka pot + beans + filters + mugs x 6).
- Bear-safe food storage tubs for anything that won't fit in the Lodgepole bear box.
- Camp chairs x 3.
- Lighter + waterproof matches + firewood (buy at Three Rivers en route, $10-15).

*Friend B (first-timer, outdoorsy):*
- Rent a sleeping bag + pad from REI Fresno ($30-40 total for the weekend). 30°F-rated bag is right for late May Lodgepole.
- Headlamp — buy a Black Diamond Spot at REI, $40, will last them many trips.
- Personal clothes (bring the list I send separately).
- One 1L water bottle.
- Rain jacket (they probably have one — if not, borrow from me).

*Friend C (first-timer, indoorsy, celiac):*
- Rent sleeping bag + pad from REI Fresno (same as above).
- Headlamp — same buy.
- Their own snacks, GF certified, that they trust. This is important. Don't let them rely on my meal plan for snacks — give them full control over their own between-meal food. It reduces their anxiety and ensures they always have a safe option.
- Personal clothes + rain jacket.
- One 1L water bottle.

*Friend D (first-timer, bad back, vegetarian):*
- Rent sleeping bag from REI Fresno, but buy their own sleeping pad. Bad back + rental foam pad = a miserable weekend. Spend $80-100 on a Therm-a-Rest Trail Scout or similar self-inflating pad — worth it even for one trip, and they'll use it again.
- Headlamp — same buy.
- Personal clothes + rain jacket.
- One 1L water bottle.
- A real camp pillow ($20, worth it for the back).

**Rental vs. buy summary for first-timers:**
- Rent: sleeping bag (don't buy for first trip), foam pad (if back isn't an issue).
- Buy: headlamp ($40, universal utility), rain jacket (they likely own one), self-inflating pad for Friend D ($80-100 only).
- Per first-timer out-of-pocket: ~$70 (rental + headlamp) or ~$150 for Friend D. Well under the budget.

---

**Flags for things you'll forget — cast a wide net**

- **Dish soap + 2 sponges + a dedicated sponge for the celiac pan.** You'll remember soap, you'll forget the second sponge. Celiac cross-contamination often starts with a shared sponge.
- **A dedicated trash bag system.** Big contractor bags, not kitchen bags. Plus a separate bag for recycling — Lodgepole has separate bins and you don't want to sort at pack-out.
- **Hand sanitizer + paper towels.** The campground sinks are shared.
- **Duct tape.** For tent repairs, blister prevention, sealing food bags. A small roll in the first aid kit.
- **A real lighter + backup matches + a third backup.** Lighters fail wet.
- **Sunscreen + bug spray.** Late May Sequoia has surprise mosquitoes near water.
- **A small tarp + paracord.** For unexpected rain or shade over the picnic table. You will not regret bringing this and you will regret not.
- **Folding saw or hatchet** for firewood processing (the bundled wood needs breaking).
- **Extra headlamp batteries.** Everyone forgets. Bring a 4-pack.
- **A camp pillow for yourself.** You think you don't need one, you do.
- **Coffee filters if you're using pour-over.** The #1 most forgotten item in the history of group camping.
- **Cash for the firewood vendor + campground host tips** (some sites do iron-ranger payment, Lodgepole is reservation, but still).
- **A printed copy of the reservation confirmation + driving directions.** Cell service drops well before the park entrance.
- **A plastic bin labeled "DIRTY"** for muddy boots and wet clothes on the drive home. You will be grateful Sunday afternoon.
- **A birthday cake contingency.** It's your birthday. Decide in advance whether someone's smuggling in a small GF cake or whether you're all eating s'mores and calling it cake. Either is fine but don't let it be an uncertain thing on Saturday night.
- **Pre-sent packing lists to the first-timers by Wednesday evening** — not the morning of. They need time to pack and to realize what they're missing.

Last thing: two weeks out, send a single group text with: dates, meeting location, what to bring (the personalized lists), and Friend C's celiac protocol in writing so everyone understands cross-contamination rules. Then don't say more until the trip. Over-messaging a group trip creates anxiety; under-messaging after a clear briefing creates trust.$pf$,
 $pf$Per-person gear lists (4-6 items each) scaled to experience. Rental vs. buy guidance for first-timers keeps out-of-pocket under $150. "Flags for things you'll forget" covers dish sponge for celiac pan, tarp, duct tape, coffee filters, printed reservation, dirty-clothes bin, and a birthday-cake contingency decision. Ends with a pre-trip comms protocol.$pf$);

-- =========================================================================
-- Project 55-0012 | Reconstruction DBQ for mixed-skill APUSH | Ben Okafor | Education | 4 steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550012';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550012';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550012',
  $pf$Reconstruction DBQ for a split APUSH class — 4-pass unit design that didn't leave either half behind$pf$,
  $pf$Planned a 5-day AP US History unit on Reconstruction using Claude 4.7 Opus over four rounds. My class splits roughly in half: twelve kids tracking for a 4 or 5 on the May exam, ten still building the source-analysis reps the DBQ demands. I wanted a week that stretched the top tier without losing the rest — and a DBQ they could all actually write.$pf$,
  $pf$I teach two sections of AP US History at a Title I public high school in the Bay. Every year Reconstruction lands in late February — it's the unit where the DBQ skill gap shows most, because Reconstruction sources are rhetorically dense and the "continuity vs. change" prompt rewards kids who can read against the grain. My stronger students can do that. My struggling ones get stuck translating a Freedmen's Bureau letter and never reach analysis.

Last year I taught this unit the same way I teach everything and the DBQ scores came back with the exact split I expected — top tier averaging 5.4/7, struggling tier averaging 2.1/7. Not acceptable. This year I used Claude 4.7 Opus over four rounds to rebuild it from scratch.

Round one: map the 5-day arc so the DBQ skills build, not just the content. Round two: write the DBQ prompt and pick the seven sources, with built-in source-analysis scaffolding. Round three: differentiate — tier-1 packet with sentence-frame support, tier-2 packet with stretch annotations. Round four: build a day-3 formative check so I know by Wednesday whether to reteach before Friday's DBQ.

What came out is a full unit kit: daily plan, DBQ with seven sources, two differentiated source packets, a mid-unit check, and a rubric that's IEP-compatible (observable behaviors, not "shows understanding" hand-waving). Took me one weekend instead of three.$pf$,
  $pf$Ran the unit three weeks ago. DBQ scores: top tier averaged 5.8/7 (+0.4), struggling tier averaged 3.6/7 (+1.5). Nobody wrote a 0. Four kids in the struggling tier hit 4+, which has never happened in four years of teaching this unit.

Two things Claude got right that I wouldn't have caught alone: (1) putting the Frederick Douglass "What the Black Man Wants" speech on DAY 2 instead of day 4 — it models the rhetorical move the DBQ wants them to make, so they see it before they're asked to do it. (2) A scaffolded "source triage" warm-up on day 3 where kids sort sources into "supports," "complicates," "contradicts" BEFORE trying to synthesize. That one 10-minute routine was the single biggest unlock for the struggling tier.

Cost me one weekend of prep instead of three, and I'm reusing the DBQ scaffolding structure for Gilded Age next month.$pf$,
  '11111111-1111-1111-1111-111111111106',
  'intermediate',
  'claude-opus-4-7',
  'Claude 4.7 Opus',
  ARRAY['Claude','Google Docs','Canvas LMS'],
  ARRAY['education','high-school','apush','dbq','differentiation','lesson-planning'],
  'approved',
  '22222222-2222-2222-2222-222222222205',
  58, 27
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('66666666-6666-6666-6666-6666666C0101',
 '55555555-5555-5555-5555-555555550012',
 1,
 $pf$Map the 5-day arc — what's load-bearing for the DBQ vs. what can be skimmed$pf$,
 $pf$I'm planning a 5-day AP US History unit on Reconstruction for two sections of 22 students each. Class is split roughly in half: twelve kids are tracking for a 4 or 5 on the May exam, ten are still building the source-analysis muscles the DBQ demands. Periods are 50 minutes.

End-of-unit assessment is a full DBQ on the "continuity and change" prompt: "Evaluate the extent to which Reconstruction (1865–1877) fundamentally transformed the South." I want the whole week to build toward that, not just cram content.

Give me a day-by-day 5-day arc where each day explicitly builds ONE of the DBQ skills (thesis, contextualization, evidence use, source analysis, complexity) while covering the content. For each day tell me: (1) the content focus, (2) the DBQ skill that day targets, (3) the key primary source I should anchor on, (4) the warm-up/closer format. Think about pacing — what MUST land and what can be homework-skim.$pf$,
 $pf$Here's the arc. Core principle: don't save DBQ skills for a "DBQ day" at the end. Embed one skill per day, sequenced so each day's skill is the scaffolding for the next.

**Day 1 — Contextualization (the "why now" muscle)**
Content: the scope of the problem at war's end — 4 million formerly enslaved people, a physically destroyed South, an assassinated president, a Congress that hasn't decided what "the Union" even means yet.
Skill target: contextualization. Kids walk in with "Reconstruction = post-war cleanup" and leave understanding it's a fight over who counts as an American.
Anchor source: Lincoln's Second Inaugural (March 1865). Short. Rhetorically rich. Teaches contextualization by letting kids see Lincoln himself contextualizing.
Warm-up: "One-sentence stakes" — kids write the single sentence that explains why Reconstruction matters to a Freedman in Georgia, a Planter in Alabama, and a Radical Republican in Boston. Closer: exit ticket asking them to contextualize ONE of the three perspectives in 3 sentences.

**Day 2 — Thesis (arguing a position, not summarizing)**
Content: the Reconstruction Amendments (13th, 14th, 15th) — what they did on paper vs. what enforcement looked like.
Skill target: defensible thesis. This is where I front-load the Douglass "What the Black Man Wants" speech — it's a model of the rhetorical move I want them to make on the DBQ (taking a position and committing to it).
Anchor: Douglass, "What the Black Man Wants" (1865).
Warm-up: kids re-read their Day 1 exit ticket and convert it into a one-sentence ARGUMENT. Closer: thesis workshop on "To what extent did the 14th Amendment transform Southern society?" — they write one, trade with a partner, revise.

**Day 3 — Source triage (the analysis skill, before synthesis)**
Content: Black Codes, the Freedmen's Bureau, and the political reaction in Congress — 1866-ish snapshot.
Skill target: source analysis + HIPP (Historical situation / Intended audience / Point of view / Purpose). This is the make-or-break day for the struggling tier. They need a reusable routine.
Anchor: three sources compared side-by-side — a Mississippi Black Code excerpt, a Freedmen's Bureau labor contract, and a congressional Radical Republican speech.
Warm-up: "source triage" — 10 minutes to sort the three into "supports my thesis," "complicates," "contradicts." No synthesis yet. Closer: one HIPP per source, 2-sentence max per box.

**Day 4 — Complexity + counterargument (the 6th-point move)**
Content: Reconstruction's retreat — Hayes-Tilden, the end of military occupation, the rise of Redeemers and the Klan.
Skill target: complexity / counterargument. On the DBQ, this is the point most kids leave on the table. Teach it as "what would someone who disagreed with me say, and how does my argument hold up?"
Anchor: a Redeemer newspaper editorial celebrating 1877, paired with an Ida B. Wells piece on lynching from the 1890s (showing the long arc).
Warm-up: a rapid 5-minute "steelman" drill — kids argue the OPPOSITE of their Day 2 thesis. Closer: a 1-paragraph rebuttal embedded back into their original argument.

**Day 5 — The DBQ itself, timed**
Students get the DBQ prompt with the full source set (7 sources including everything they've seen during the week + 2 new ones to test transfer). 45 minutes, closed-resource but they can use their own annotated notes. Keep the "new sources" difficulty moderate — you're assessing synthesis, not introducing new content under timed pressure.

**What to SKIM (don't try to cover):** Johnson's impeachment (mention it, don't drill it — it's rarely on the DBQ and it eats 20 minutes). Sharecropping mechanics beyond the basic definition (comes back in Gilded Age unit). Specific carpetbagger/scalawag biographies.

**What MUST land:** the 13th/14th/15th distinction (Day 2), the HIPP routine (Day 3), and the "counterargument strengthens your argument" move (Day 4). Everything else is negotiable.

One more thing: the Day 2 Douglass → Day 4 counterargument sequence is load-bearing. Don't rearrange.$pf$,
 $pf$Day-by-day arc with each day targeting one DBQ skill (contextualization → thesis → source analysis → complexity → DBQ itself). Key move: Day 2 Douglass speech models the rhetorical position-taking before kids are asked to do it on Day 3. "What to skim" list prevents Johnson-impeachment content-creep.$pf$),

-- Step 2 --
('66666666-6666-6666-6666-6666666C0102',
 '55555555-5555-5555-5555-555555550012',
 2,
 $pf$Write the DBQ prompt + 7 scaffolded primary sources$pf$,
 $pf$Great. Now write me the Day 5 DBQ.

Prompt: "Evaluate the extent to which Reconstruction (1865–1877) fundamentally transformed the South."

Give me 7 primary sources that work together for a DBQ:
- Mix of document types (speech, amendment text, letter, editorial, image/map, statistic, testimony)
- Range across 1865–1877 and a bit beyond
- Cover both the "transformation" side AND the "continuity" side — the point of the prompt is that smart kids see both
- Real sources (or real-sounding if paraphrased for clarity — flag anything paraphrased). Cite each with date + author/origin
- For each source, give me (a) a 1-sentence context line, (b) the source text or paraphrase (100–200 words each), (c) a "Why this source is in the set" note for me (the teacher) — what DBQ skill it tests

End with a brief "how I'd expect a 7/7 essay to use these sources" paragraph so I know what the ceiling looks like.$pf$,
 $pf$**DBQ Prompt**
Evaluate the extent to which Reconstruction (1865–1877) fundamentally transformed the South.

(45 minutes. Use at least 6 of the 7 sources.)

---

**Source A — 14th Amendment, Section 1 (ratified 1868)**
Context: the constitutional backbone of Reconstruction's legal transformation.
Text (excerpt): "All persons born or naturalized in the United States, and subject to the jurisdiction thereof, are citizens of the United States and of the State wherein they reside. No State shall make or enforce any law which shall abridge the privileges or immunities of citizens of the United States; nor shall any State deprive any person of life, liberty, or property, without due process of law; nor deny to any person within its jurisdiction the equal protection of the laws."
Why in set (teacher note): tests whether kids can distinguish LEGAL transformation from SOCIAL transformation. The strongest essays treat this as necessary but not sufficient.

**Source B — Mississippi Black Code (1865)**
Context: passed within months of the 13th Amendment; meant to replicate slavery's labor regime under new legal cover.
Text (paraphrased excerpt, flagged): "Every freedman, free negro, and mulatto shall on the second Monday of January, 1866, and annually thereafter, have a lawful home or employment, and shall have a written evidence thereof... Any freedman... who shall quit the service of his employer before the expiration of his term of service, without good cause, shall forfeit his wages for that year."
Why in set: the "continuity" anchor. Kids who only argue "transformation" have no way to explain this.

**Source C — Letter from Jourdon Anderson to his former enslaver (August 1865)**
Context: a formerly enslaved man in Ohio responds to his former enslaver's request that he return to work in Tennessee.
Text (real — excerpt): "Sir: I got your letter, and was glad to find that you had not forgotten Jourdon... Although you shot at me twice before I left you, I did not want to hear of your being hurt... I want to know particularly what the good chance is you propose to give me. I am doing tolerably well here. I get twenty-five dollars a month, with victuals and clothing; have a comfortable home for Mandy... and the children — Milly, Jane, and Grundy — go to school and are learning well..."
Why in set: primary-source voice, short, rhetorically sharp. Tests whether kids can read irony and extract argument from tone. This source favors the struggling tier because the HUMAN voice is accessible even when the historical argument is hard.

**Source D — Sharecropping contract, Georgia (1870)**
Context: sample labor contract showing the economic arrangement that replaced slavery across the post-war South.
Text (paraphrased from actual contract, flagged): "The said freedman agrees to work faithfully and diligently under the direction of the said planter, providing his own labor. In return, the said freedman shall receive one-third of the crop harvested. The planter furnishes land, seed, tools, and mule. The freedman shall not leave the plantation during the term of the contract without written permission. Debts owed to the planter's store shall be deducted from the freedman's share at settlement."
Why in set: continuity anchor at the economic level. Pairs with the Black Code to show how legal AND economic structures both constrained freedom.

**Source E — Statistical table: Black voter registration and officeholders, selected Southern states (1867–1877)**
Context: a numerical snapshot of Black political participation at its Reconstruction peak.
Table (paraphrased — flagged as composite from Congressional records):
| State         | Black registered voters, 1867 | Black state legislators, 1870 | Black state legislators, 1877 |
|---------------|-------------------------------|-------------------------------|-------------------------------|
| South Carolina| 80,550                        | 75                            | 6                             |
| Mississippi   | 60,167                        | 40                            | 4                             |
| Louisiana     | 84,436                        | 49                            | 5                             |
Why in set: quantifies both the transformation (1867–70 numbers are historically unprecedented) AND the collapse (1877 numbers). Tests the "to what extent" part of the prompt.

**Source F — Thomas Nast cartoon, "This Is a White Man's Government" (Harper's Weekly, September 5, 1868)**
Context: political cartoon attacking the Democratic Party's alliance of ex-Confederates, Northern urban machines, and financial interests standing atop a fallen Black Union soldier.
Description (for paraphrase purposes — the original is visual): the cartoon depicts three white men — a Confederate with a belt buckle reading "Lost Cause," an Irish gang member labeled "5 Points," and a wealthy figure labeled "5th Avenue" — with their feet on a bleeding Black Union veteran clutching an American flag and a ballot.
Why in set: gives kids a VISUAL source (DBQ always has one) and a Northern perspective. Tests whether kids can read political cartoons as argument, not decoration.

**Source G — Congressional testimony from a Black Mississippian to the Joint Select Committee on the condition of affairs in the late insurrectionary states (1871)**
Context: congressional investigation into Klan violence in the post-war South.
Text (paraphrased from real testimony, flagged): "They came to my house at night, about fifteen of them, wearing robes and hoods. They called me out and asked whom I had voted for. I said I voted the Republican ticket. They beat me with a stick of wood and told me next time I voted I would be killed. I have not been to the polls since."
Why in set: the "retreat of Reconstruction" anchor. Pairs with Source E's 1877 numbers to explain HOW the political transformation was dismantled — not by law but by terror.

---

**What a 7/7 essay looks like (teacher ceiling note):**
A top essay uses Sources A, E, and F to argue that Reconstruction produced genuine constitutional and political transformation, then uses Sources B, D, and G to argue that the transformation was systematically reversed by economic arrangements and extra-legal violence — and uses Source C to bridge the two, showing the human-scale transformation (a man who writes back, with agency, to his former enslaver) that persisted even as the political gains collapsed. The "to what extent" answer is something like: "Reconstruction fundamentally transformed the legal and constitutional framework of the South, but the economic and social transformations were contested, limited, and largely reversed by 1877."

One more thing: if a kid cites only transformation OR only continuity, cap them at 4/7 no matter how well-written. The prompt's "to what extent" is LOAD-BEARING — it's explicitly asking for both sides.$pf$,
 $pf$Seven sources covering 1865–1877 with both "transformation" and "continuity" sides represented. Each source tagged with the DBQ skill it tests and flagged for paraphrase honesty. 7/7 essay ceiling note gives Ben a grading anchor.$pf$),

-- Step 3 --
('66666666-6666-6666-6666-6666666C0103',
 '55555555-5555-5555-5555-555555550012',
 3,
 $pf$Differentiate the sources for the two skill tiers$pf$,
 $pf$This is the whole reason I'm doing this. The top twelve can read a Freedmen's Bureau testimony cold; the struggling ten will bounce off it and miss the analysis question entirely.

Take the same 7 sources from Step 2 and give me TWO versions of the source packet:

**Tier 1 (scaffold-heavy — for the struggling ten):** same sources, but with (a) a 1–2 sentence gloss for any word that's not 9th-grade reading level, (b) a single guiding question after each source (1 question, not 4), (c) sentence-frame scaffolds for HIPP ("The historical situation of this source is ___. The intended audience is ___..."), (d) a "before you read" 1-sentence preview so they know what to listen for.

**Tier 2 (stretch — for the top twelve):** same sources, but with (a) NO gloss, (b) a 2-layer question where the second layer pushes them toward historiography ("How would a historian writing in 1965 vs. 2015 read this source differently?"), (c) one EXTRA source (Source H) that isn't in the tier-1 packet — a W.E.B. Du Bois excerpt from Black Reconstruction that reframes the "failure" narrative.

Critically: both tiers sit for the SAME DBQ on Day 5. I am NOT changing the assessment. I am changing the route they take to get there.$pf$,
 $pf$Right — different scaffolding, same destination. Here's both packets.

---

**TIER 1 — Scaffold-heavy source packet**

(For students still building HIPP fluency. Same 7 sources, with glosses + single guiding question + sentence frames.)

**Source A — 14th Amendment, Section 1**
*Before you read:* This is THE big legal change. Read for: what rights get promised, and to whom?
*Text:* [same as Tier 2, with glosses below]
Gloss: "privileges or immunities" = rights of citizenship. "due process" = fair legal procedure. "equal protection" = the law must treat you the same as everyone else.
*Guiding Q (one question):* What specifically changed for formerly enslaved people under this amendment? Answer in 2 sentences.
*HIPP frame:* "The historical situation of Source A is ___ [the end of the Civil War and the effort to define citizenship]. The intended audience is ___ [the state governments and the courts]. The point of view is ___. The purpose is ___."

**Source B — Mississippi Black Code**
*Before you read:* This is the South reacting to the 13th Amendment by writing NEW laws that keep the old system working.
Gloss: "freedman" = formerly enslaved person. "forfeit his wages" = lose the money he earned.
*Guiding Q:* How does the Black Code try to replicate slavery WITHOUT calling it slavery?

**Source C — Jourdon Anderson letter**
*Before you read:* This is a real letter from a formerly enslaved man who moved to Ohio. His old enslaver asked him to come back. He said no — with STYLE. Read for his tone. He's being polite on the surface and scathing underneath.
Gloss: "victuals" = food. "tolerably" = reasonably.
*Guiding Q:* What does Jourdon Anderson want his old enslaver to understand — without saying it directly?

**Source D — Sharecropping contract**
*Before you read:* This is how most formerly enslaved people actually worked after the war. Read for: who controls what?
Gloss: "furnishes" = provides. "at settlement" = when the crop is sold at the end of the season.
*Guiding Q:* Circle the three places in this contract where the planter controls the freedman's choices.

**Source E — Voter registration table**
*Before you read:* Numbers tell a story here. Compare 1870 and 1877.
*Guiding Q:* In one sentence, what happened between 1870 and 1877?

**Source F — Nast cartoon**
*Before you read:* Political cartoons always have an argument. The cartoonist, Thomas Nast, is from the North and sympathizes with freedmen. Look at who he draws as the "villains" and who he draws as the victim.
*Guiding Q:* What is Nast saying about who really holds power in the post-war South?

**Source G — 1871 congressional testimony**
*Before you read:* This is a real Black Mississippian testifying about Klan violence. Trigger-warning: the violence is graphic.
Gloss: "polls" = voting place.
*Guiding Q:* The 15th Amendment gave Black men the right to vote. Did Source G's witness actually have that right? Explain.

**Tier 1 closing prompt (takes 5 minutes):** In 3 sentences, answer this — "Reconstruction changed SOME things and left OTHERS the same. Which source is your best evidence for each?"

---

**TIER 2 — Stretch source packet**

(For students ready to engage historiography and synthesis across sources.)

Sources A–G: same texts, no glosses. Questions are 2-layer:

**Source A — 14th Amendment**
Layer 1: What does this amendment promise?
Layer 2: Legal historian Eric Foner argues the 14th Amendment's "privileges or immunities" clause was gutted by the Slaughter-House Cases (1873). What does that tell you about the distance between constitutional promise and constitutional enforcement?

**Source B — Black Code**
Layer 1: What does the Black Code regulate?
Layer 2: The Black Codes were passed by legislatures elected during Presidential Reconstruction (before Congressional Reconstruction began in 1867). How does that timing complicate the narrative that Reconstruction "failed"?

**Source C — Jourdon Anderson letter**
Layer 1: What is Anderson's rhetorical strategy?
Layer 2: A historian writing in 1905 (the Dunning School era) would read this letter as impertinent — evidence of why Reconstruction "went too far." A historian writing in 2015 would read it as dignified resistance. How does the SAME TEXT produce opposite interpretations?

**Source D — Sharecropping contract**
Layer 1: What does the planter control?
Layer 2: Sharecropping has been described as "slavery by another name" AND as "a labor system freedmen actively negotiated for." Both are true. Which framing does this specific contract support more?

**Source E — Voter registration table**
Layer 1: What do the numbers show?
Layer 2: If you're writing the "transformation" side of the DBQ, the 1870 numbers are your strongest evidence. If you're writing the "continuity" side, the 1877 numbers are your strongest. What does it mean that the SAME table supports both sides?

**Source F — Nast cartoon**
Layer 1: What is Nast's argument?
Layer 2: Nast was deeply anti-Irish (note the "5 Points" figure). How does his racism against one group affect the moral force of his cartoon defending another?

**Source G — 1871 testimony**
Layer 1: What happened to the witness?
Layer 2: Compare Source G's testimony style to Source C's letter. Both are Black voices from the Reconstruction era. Why does Source C sound confident and Source G sound traumatized? What changed in six years?

**BONUS — Source H (tier 2 only): W.E.B. Du Bois, Black Reconstruction in America (1935)**
"The slave went free; stood a brief moment in the sun; then moved back again toward slavery. The whole weight of America was thrown to color caste. The colored world went down before England, France, Germany, Russia, Italy, and America, and Reconstruction died."
Layer 1: What is Du Bois's argument about Reconstruction's legacy?
Layer 2: Du Bois wrote this in 1935, during Jim Crow. How does his 1935 context shape what he sees in 1865–1877? Is that a BIAS or a CLARITY?

**Tier 2 closing prompt:** In one paragraph, argue whether Reconstruction is better described as a "failed revolution" or an "incomplete revolution." Use at least 4 sources.

---

**Note on differentiation design:** Both tiers see the same 7 core sources and sit for the same DBQ. The scaffolding difference is in the READING APPROACH, not the content. The tier-1 sentence frames are training wheels they can shed; by the second half of the year the frames should feel unnecessary to most of them. That's the goal — not a permanent track, a temporary scaffold.$pf$,
 $pf$Two packets. Tier 1 adds glosses, single guiding questions, and HIPP sentence frames. Tier 2 strips glosses and adds historiography layer-2 questions plus a Du Bois bonus source. Both tiers sit for the same DBQ — scaffolding differs, destination doesn't.$pf$),

-- Step 4 --
('66666666-6666-6666-6666-6666666C0104',
 '55555555-5555-5555-5555-555555550012',
 4,
 $pf$Build the day-3 formative check + day-5 exit ticket + rubric$pf$,
 $pf$Last pass. I need three things:

1. A day-3 formative check (10 minutes, end of class) that tells me — by Wednesday — whether the HIPP routine has landed for the struggling tier. If it hasn't, I reteach Thursday morning BEFORE the counterargument lesson. If it has, I move on.

2. A day-5 exit ticket separate from the DBQ itself — something kids hand in after the timed DBQ that captures metacognition (what was hard, what strategy they used). I want to see what they think they did, not just what they produced.

3. A DBQ rubric that's IEP-compatible — observable behaviors, not "shows understanding of..." hand-waving. My IEP students and 504 kids need criteria their case managers can reasonably check. Use the College Board 7-point DBQ rubric as the scaffold but make each point OBSERVABLE in plain language.

Keep it tight. Real teachers grade 44 of these. Don't give me a rubric with 23 indicators.$pf$,
 $pf$All three, tight. You grade 44 of these.

---

**1. Day 3 Formative Check (10 min, end of class)**

Give each student ONE source they haven't seen before in class — a short Freedmen's Bureau teacher's report, ~120 words. Same page for every student, same source. (Don't differentiate this — you need to see what they can do without tier scaffolding to know if HIPP has transferred.)

Three prompts. Answer in full sentences on the back of the page:

1. **Historical situation:** In one sentence, when and where is this source happening?
2. **Purpose:** What was this source written FOR? (What outcome did the writer want?)
3. **What this source tells you:** In 2–3 sentences, what does this source add to your understanding of Reconstruction?

**How to grade (3 minutes/student max):**
- All three answered in complete sentences, with specific detail → **landed**
- Historical situation and Purpose attempted but vague, or "what it tells you" reverts to summary → **partial — reteach recommended for this kid**
- One or more boxes blank, or answers are "idk" / one-word → **didn't land — pull into small group Thursday morning**

**Decision rule you promised yourself:** if 6+ struggling-tier kids land in "didn't land," spend 15 min Thursday morning reteaching HIPP with a fresh source BEFORE the counterargument lesson. If fewer than 6, flag those specific kids for Friday DBQ support but move on with the planned lesson.

---

**2. Day 5 Exit Ticket (post-DBQ, 3 min)**

Single index card. Three questions:

1. Which source did you lean on most? Why?
2. Which source confused you? (It's OK to say "all of them" if that's honest.)
3. What strategy did you use when you ran into a source you didn't understand?

**Why these three:** Q1 tells me which sources are doing the work in the student's head (often different from which sources I think are load-bearing). Q2 surfaces confusion I can address before the Gilded Age unit uses similar source types. Q3 is metacognition — a kid who can name their own strategy is actually using one. A kid who says "I just picked the easiest ones" is telling me they bailed, and that's also useful info.

Budget 20 minutes the following Monday to read all 44. Sort into three piles: "strategy is working," "strategy is shaky," "no strategy." The "no strategy" pile is your small-group target for the next unit.

---

**3. DBQ Rubric (7 points, observable-behavior version, IEP-compatible)**

**Point 1 — THESIS (1 pt)**
✓ awarded if: the student writes a sentence that TAKES A POSITION on "to what extent" — not just restating the prompt. Look for a sentence that starts with a qualifier ("largely," "partially," "significantly") followed by a defensible claim.
✗ not awarded if: the student only restates the prompt, or writes "this essay will discuss..." without taking a side.
Observable behavior: can you underline the ONE sentence in the intro that commits to a position?

**Point 2 — CONTEXTUALIZATION (1 pt)**
✓ awarded if: there are at least TWO sentences somewhere in the essay (usually the intro) that describe relevant historical events OUTSIDE the time frame of Reconstruction itself (e.g., the Civil War's scale, the abolition movement, the Compromise of 1877 aftermath).
✗ not awarded if: contextualization is one sentence OR only describes Reconstruction itself.
Observable behavior: can you find 2+ sentences of outside context?

**Point 3 — EVIDENCE (up to 3 pts, scored in order)**
- 1 pt if student uses content from AT LEAST 3 sources accurately (not just cites — actually describes what the source says or shows).
- 1 pt more if student uses 6+ sources accurately.
- 1 pt more if student uses AT LEAST 1 piece of outside evidence (not from the source packet) that's relevant and accurate.
Observable behavior: count the sources quoted/described. Count the outside facts. Mark each in the margin with "S" (source) or "O" (outside).

**Point 4 — ANALYSIS of SOURCES (1 pt)**
✓ awarded if: for at least 3 sources, the student explains WHY the source's perspective matters — using HIPP language explicitly (historical situation, audience, point of view, or purpose).
✗ not awarded if: the student cites sources but never explains perspective ("Source A says... Source B says..." with no analytic move).
Observable behavior: count HIPP moves. Need 3 to earn the point.

**Point 5 — COMPLEXITY (1 pt) — hardest point**
✓ awarded if: the student does ONE of these:
- explicitly acknowledges a counterargument and responds to it
- uses sources on BOTH sides of the "to what extent" question
- qualifies their own thesis somewhere in the body ("however, in economic terms..." etc.)
Observable behavior: underline the sentence where the student SHIFTS or COMPLICATES their argument. If you can't find one, no point.

**Sanity cap (your own rule from Step 2): if a kid cites only transformation OR only continuity, they top out at 4/7 regardless.**

---

**One practical note:** I'd put the rubric on the BACK of the DBQ prompt handout. Kids should grade themselves before they turn it in. "Before you hand this in, underline your thesis sentence, count your sources, and count your HIPP moves. Total your own score. I'll check your math." Takes 2 min and it's the single highest-leverage move for raising the struggling-tier scores — they learn the rubric by USING it.$pf$,
 $pf$Day-3 10-min formative check on HIPP with a clean "reteach vs. move on" decision rule for Thursday morning. Day-5 post-DBQ metacognition exit ticket (3 questions, 3 min). IEP-compatible 7-point rubric with observable behaviors not "shows understanding" language — includes self-grading step that doubles as rubric instruction.$pf$);

-- =========================================================================
-- Project 55-0013 | 18-month runway after Q1 miss | Jake Torres | Finance | 5 steps
-- =========================================================================

DELETE FROM prompt_steps WHERE prompt_id = '55555555-5555-5555-5555-555555550013';
DELETE FROM prompts      WHERE id        = '55555555-5555-5555-5555-555555550013';

INSERT INTO prompts (
  id, title, description, content, result_content,
  category_id, difficulty, model_used, model_recommendation,
  tools_used, tags, status, author_id, vote_count, bookmark_count
) VALUES (
  '55555555-5555-5555-5555-555555550013',
  $pf$18-month runway after an 18% Q1 miss — 5-pass scenario model and the board memo that went out Monday$pf$,
  $pf$I'm CFO at a Series A SaaS company ($12M ARR pre-miss). Q1 came in 18% below plan. Ran five passes with Claude 4.6 Sonnet to model four cut scenarios to 18 months, figure out which one preserves the product roadmap, draft the board memo, and build the quarterly check-in framework. Board read it Monday. One ask was approved, one modified, one deferred — which is a decent outcome for a miss.$pf$,
  $pf$Series A, $12M ARR at end of last quarter, 28% YoY growth through Q4. Q1 came in 18% below plan — new-logo bookings missed by ~$600K, net revenue retention held at 112%. Burn at close of Q1 was $1.1M/month, runway as of today is 14 months. Plan was 16 months at end of Q1, so the miss ate 2 months of runway in 90 days.

I had three days before the scheduled board meeting to bring a point of view, not just numbers. I've done this exercise in Excel before and it always takes a full weekend and I end up biased toward whichever scenario I started from. This time I used Claude 4.6 Sonnet to force structure on the thinking.

Five rounds: (1) honest read of the glidepath under the miss, (2) four cut scenarios modeled to 18 months, (3) pressure-test which cut preserves the product roadmap (because the real question isn't "how cheap can we get," it's "how do we make the most of the miss"), (4) board memo draft with three specific asks, (5) a quarterly signal framework so we're not re-litigating this every two months.

Claude's most useful move was in round 3 — it reframed my "deep cut" scenario from "this saves the most money" to "this kills the roadmap item that drives NRR, which is the one metric that's still working." That reframe changed which scenario I recommended.$pf$,
  $pf$The memo went to the board Monday. Three asks: (1) approve the "Reshape" scenario (the one that cuts sales headcount to match new-logo reality, preserves product, adds two months of runway). (2) approve $500K of discretionary spend on the post-sales expansion team (because NRR is the one thing still working — starve it and we have no recovery path). (3) defer the Series B timeline from Q4 this year to Q1 next year, fundraising against Q3 numbers not Q1 numbers.

Board approved #1 as-is. Modified #2 to $350K with a gate at end of Q2. Deferred #3 without approval — the lead investor wants to see Q2 first. That's a fine outcome. The worst outcome would have been a blanket "cut 15%" that hit the one team making numbers, and the structured scenario work is what kept us out of that.

What I took away: the "which scenario preserves the thing that's working" framing is the single question I wish I'd anchored on in previous plan resets. Filing it for next time.$pf$,
  '11111111-1111-1111-1111-111111111101',
  'advanced',
  'claude-sonnet-4-6',
  'Claude 4.6 Sonnet',
  ARRAY['Claude','Google Sheets','Notion'],
  ARRAY['finance','cfo','saas','runway','board-memo','scenario-planning'],
  'approved',
  '22222222-2222-2222-2222-222222222203',
  94, 52
);

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Step 1 --
('66666666-6666-6666-6666-6666666D0101',
 '55555555-5555-5555-5555-555555550013',
 1,
 $pf$Honest read: current burn, current runway, what the 18% miss actually does to the glidepath$pf$,
 $pf$I'm CFO at a Series A B2B SaaS company. Here's where we actually are after Q1.

End of last quarter (Q4):
- ARR: $12.0M
- YoY growth: 28%
- Burn: $980K/month
- Cash: $18.4M
- Runway: ~19 months at Q4 burn rate

Q1 just closed:
- New bookings plan: $3.3M (25% QoQ target)
- New bookings actual: $2.7M (18% miss vs plan)
- Net revenue retention: 112% (held — no compression)
- ARR end of Q1: $12.45M (+3.75% QoQ, plan was +5.5%)
- Burn in Q1: $1.1M/month (plan was $1.0M/month — we hired two engineers in January on the old plan)
- Cash: $15.1M
- Runway at current burn: 13.7 months

Don't be diplomatic. Tell me what this actually means for runway planning. What are the non-obvious things I should see in these numbers that I might be missing because I'm close to them? I know the number and direction; I want the read.$pf$,
 $pf$Three things that matter more than the 18% headline, in order.

**1. You burned 2 months of runway in 90 days. That's the number the board will fixate on, not the 18% miss.**
Runway dropped from 19 months to 13.7 months — a 5.3-month drop — in one quarter. Roughly 3.3 months of that is normal quarterly consumption (3 months of cash burned). The other ~2 months of runway loss is the miss-plus-overspend combination: you spent on the old plan ($1.1M/mo vs. $1.0M/mo planned, so $300K overspend) AND under-collected ($600K bookings miss, meaning ~$150K less ARR conversion in-quarter depending on your billing timing). On top of a lowered revenue base going forward, compounding.

The board math they'll run in their heads: "two quarters like this and they're inside 12 months of runway, which is our Series B re-up danger zone." Your memo needs to pre-empt this with explicit scenarios showing the second miss quarter, not just this one.

**2. The 112% NRR is buried under the bookings miss but it's the most important number on the page.**
NRR holding at 112% while new-logo missed by 18% means: your product works, your ICP is right, and your expansion motion is healthy. The problem is top-of-funnel or sales execution, not product-market fit. That's a fundamentally better problem to have than "churn spiked" or "NRR compressed to 95%."

The implication for scenario work: any cut that touches customer success, post-sales, or expansion-focused roles is cutting the one organ that's still functioning. Don't do it. Sales-side cuts to match new-logo reality is the defensible move; CS cuts to spread the pain evenly is not.

This is the read I'd push hardest on with the board. Most CFOs in a miss situation instinctively go "cut 15% across the board" because it's politically clean. Don't do that. Cut where the plan was wrong (sales capacity vs. demand reality), not where the plan was right (expansion team sized to a 112% NRR motion).

**3. The January hiring decision is a real problem — but a past one, not a present one.**
You hired two engineers in January on the old plan. Q1 burn was $1.1M/mo vs. $1.0M planned — that's roughly consistent with two extra engineering heads at ~$50K/mo fully loaded. That hiring decision was made when the Q1 pipeline looked healthy; in hindsight it was wrong. But firing them now to claw back $1.2M of annual burn has costs: (a) severance and morale cost ~$100-200K, (b) eng velocity impact on whatever roadmap you're keeping, (c) a signal to the rest of the company that reads "we're in trouble."

The right move is usually: don't lay them off, freeze the pipeline (no more hires without specific approval), and let Q2 tell you whether the January bet was wrong or just early. If Q2 misses again, revisit. If Q2 lands, you keep the capacity.

**Non-obvious things in your numbers:**
- Q1 NRR of 112% with new-logo missing means your ARR growth is increasingly back-loaded into expansion — which is lumpier and more concentration-risk-y. One lost big customer in Q2 and NRR drops to 102%. That concentration risk is worth diligencing before you recommend any cuts.
- Your cash-to-ARR ratio went from $18.4M/$12.0M = 1.53x to $15.1M/$12.45M = 1.21x. That's the multiple Series B investors look at — "how much cash do they have per dollar of ARR to get to next milestone." 1.21x at a Series A is fine. 0.8x is a problem. You're not there yet but you're moving that direction.
- Your implied ARR growth rate for the year went from ~28% to something closer to 20-22% if Q2 repeats Q1. The Rule of 40 board conversation is going to be: ARR growth + FCF margin ≥ 40. If you were at 28 + (-30) = -2 before and you're now at 22 + (-40) = -18, that's not a Series B-ready number. The scenario work has to show the path back to >0.

Bottom line: your actual crisis isn't 13.7 months of runway. It's "if Q2 also misses, what does our Series B look like at Q3 numbers." Model that as the downside case, not an optimistic rebound.$pf$,
 $pf$Honest read: 2 months of runway lost in 90 days is the number the board will fixate on. The 112% NRR is the most important number on the page and rules out across-the-board cuts. The January hires aren't the real problem — a Q2 repeat is. Sets up the scenarios to model the downside, not a rebound.$pf$),

-- Step 2 --
('66666666-6666-6666-6666-6666666D0102',
 '55555555-5555-5555-5555-555555550013',
 2,
 $pf$Four cut scenarios modeled to 18 months$pf$,
 $pf$OK that's useful. Now model four scenarios out 18 months. I want to see runway, ARR trajectory, and burn by month for each.

Assumptions for all four:
- Start point: Q1 close, $12.45M ARR, $15.1M cash, $1.1M/mo burn
- Q2 bookings land at 90% of reset plan (reset plan is 15% below original plan — so back off the 25% QoQ target to ~18% effective)
- NRR holds at 112% (don't model compression in base case, but note the risk)
- Gross margin 78% (don't touch)

Four scenarios:
1. **Hold** — no cuts, run the plan as-is with Q2 reset
2. **Trim** — cut sales capacity to match new-logo reality; save ~$180K/mo by Q3
3. **Reshape** — Trim + freeze hiring + renegotiate a couple of key vendor contracts; save ~$280K/mo by Q3
4. **Deep** — Reshape + layoffs in engineering (the two January hires + 3 more) + CS cut of 1 role; save ~$480K/mo by Q3

For each scenario give me: (a) runway at month 18, (b) the month you cross 12-month-runway threshold (Series B danger zone), (c) ARR at 18 months assuming Q2 reset plan holds, (d) one sentence on what each scenario COSTS strategically. Keep the numbers; skip the spreadsheet formatting.$pf$,
 $pf$Here's the 18-month model for all four. Numbers rounded to the nearest $100K. Working assumptions documented at the bottom.

---

**SCENARIO 1 — HOLD (no cuts)**
- Burn trajectory: $1.1M/mo Q2, $1.1M/mo Q3 (no optimization), $1.15M/mo Q4 (annual comp increases), $1.2M/mo after
- ARR at month 18: ~$17.8M (reset-plan 18% growth compounding, NRR contribution)
- Cash at month 18: **exhausted at month 14** (cash runs out in month 14, assuming no fundraise)
- Month you cross <12 months runway: **TODAY** — you're already at 13.7 months. Hold means you cross 12-month threshold in ~6 weeks.
- Strategic cost: signals to the team and the board that leadership doesn't respect the miss. Read by investors as "they don't know what to do."

**SCENARIO 2 — TRIM (sales right-sizing only)**
Action: lay off 3 AEs + 1 SDR in May, don't backfill the open AE req. Saves ~$180K/mo by Q3.
- Burn: $1.1M Q2, $920K Q3, $940K Q4, $970K after
- ARR at 18 months: ~$17.2M (-$600K vs Hold — smaller sales team converts marginally less of the pipeline, but most of the lost capacity was slack because of the miss)
- Cash at month 18: ~$900K remaining — 1 month runway left
- Month you cross <12 months: month 11 (about Feb of next year) — you stay above the threshold longer but only just
- Strategic cost: you're right-sizing sales to actual demand. Defensible. No hit to product or expansion. But it doesn't give you enough room to raise on Q3 if Q3 misses.

**SCENARIO 3 — RESHAPE (Trim + hiring freeze + vendor renegotiation)**
Action: Trim actions + freeze all hiring for 2 quarters + renegotiate top-3 vendor contracts (we're overpaying on Datadog, Salesforce, and a legal retainer). Saves ~$280K/mo by Q3.
- Burn: $1.1M Q2, $820K Q3, $840K Q4, $870K after
- ARR at 18 months: ~$17.2M (same as Trim — no roadmap impact, so ARR trajectory holds)
- Cash at month 18: ~$2.7M remaining — effective runway from month 18 at reshaped burn: 3 more months. Total effective runway: 21 months.
- Month you cross <12 months: month 13 (about April next year) — buys you enough time to fundraise on Q3 numbers if Q3 is healthy
- Strategic cost: low. Freezing hiring costs velocity on the 2H roadmap but doesn't kill anything. Vendor renegotiation is zero-cost execution work. This is the "obvious" move.

**SCENARIO 4 — DEEP (Reshape + engineering RIF + 1 CS cut)**
Action: Reshape + lay off the 2 January engineering hires + 3 more engineers (6 total = 20% of eng org) + cut 1 CS role. Saves ~$480K/mo by Q3.
- Burn: $1.1M Q2, $620K Q3, $640K Q4, $670K after
- ARR at 18 months: ~$16.4M (down $800K vs Trim/Reshape — because the roadmap impact shifts ~$600K of Q4-Q5 expansion revenue OUT of the window as feature shipping slows, and the CS cut likely compresses NRR to ~108% which costs another $200K)
- Cash at month 18: ~$5.2M remaining — roughly 8 more months of runway at new burn. Total effective runway: 26 months.
- Month you cross <12 months: month 22 (way in the future)
- Strategic cost: high. You trade 5 months of runway for meaningful product velocity loss and CS compression. You're saving money by cutting the organs that are still working (expansion, product) because you can't stomach cutting only where the problem is (sales/plan). The 112% NRR likely compresses to ~108% because fewer CS touches per account and slower feature shipping. That's a -4 point NRR hit that costs you $500K-$800K of ARR over the window.

---

**SIDE-BY-SIDE AT MONTH 18:**

| Scenario | Runway remaining | ARR | Effective months | Strategic damage |
|----------|------------------|-----|------------------|------------------|
| Hold     | cash out month 14| $17.8M (projected) | -4 | signals no plan |
| Trim     | ~1 month          | $17.2M | +1 | low |
| Reshape  | ~3 months        | $17.2M | +3 | low-medium (velocity) |
| Deep     | ~8 months        | $16.4M | +8 | high (NRR + roadmap) |

---

**Assumptions I'm making that you should flag:**
- Severance for the Deep scenario: 2 months base for engineers, 2 months base for CS — ~$450K one-time cost absorbed into Q2 burn. (Reshape has ~$180K one-time for the Trim layoffs.)
- "Reset plan" growth of 18% QoQ assumes Q2 isn't another miss. If Q2 misses 15% vs. reset plan, every scenario loses 4-6 months of runway from these numbers.
- NRR held at 112% for scenarios 1-3. For Deep, I'm modeling 108% from Q4 onward.
- Series B timing not modeled — these are operating-only scenarios. Any scenario that crosses <9 months runway without a term sheet is a live crisis.

**Read this table honestly:** Reshape is the dominant strategy on the "strategic damage vs. runway gained" curve. Deep costs more in ARR than it saves in cash when you extend the window to 24 months. Trim is Reshape without the free wins. Hold is not a strategy.$pf$,
 $pf$Four scenarios out 18 months. Hold runs out of cash at month 14. Trim buys 1 month with low damage. Reshape buys 3 months with low damage — clearly dominant. Deep buys 8 months but costs $800K of ARR and compresses NRR by cutting the teams that are working. Table makes the tradeoffs legible.$pf$),

-- Step 3 --
('66666666-6666-6666-6666-6666666D0103',
 '55555555-5555-5555-5555-555555550013',
 3,
 $pf$Which cut actually preserves the product roadmap$pf$,
 $pf$Reshape looks obvious but I want to stress-test it. My instinct is telling me Deep because it gets us closest to a self-sustaining position. But you flagged the NRR compression and the roadmap impact.

Push on this: if we go Reshape, what's the Q3/Q4 roadmap actually look like, and what's the Series B story at 21 months of effective runway? Because if Reshape means we have a weaker product story in 9 months AND less runway than Deep, that's not clearly a win — that's just optimism dressed up as discipline.

Steelman Deep. Then tell me honestly which one you'd actually recommend.$pf$,
 $pf$Steelman for Deep, then the honest call.

**The Deep case (the strongest version of it):**

Deep's real argument isn't "save more money." It's "concentrate the pain into one quarter so you can tell a clean recovery story at Series B." The structure of the argument:

1. Investors hate ambiguity. A company that does Trim or Reshape and then does another RIF in Q4 looks like management doesn't have conviction. A company that does Deep once and then ships product on the new burn for 12 months looks decisive. Narratively, one hard RIF is better than two medium ones.

2. The roadmap cuts in Deep aren't random — if executed well, they're prioritization forcing functions. You lay off 5 engineers, you have 25 engineers, and those 25 work on the 3 features that matter most instead of the 7 features on the board-deck roadmap. The opportunity cost of bloat is underrated. Most Series A engineering orgs are 30% overstaffed relative to their ship rate.

3. CS compression isn't guaranteed. If you cut 1 CS role but restructure the remaining team around top-20-account coverage instead of broad coverage, NRR might actually hold or improve because focus beats volume at this ARR band.

4. 26 months of effective runway means you raise Series B from a position of optionality, not necessity. That's a 1.5-2x valuation uplift vs. raising at 13 months. The $800K of ARR Deep costs is outweighed by the valuation impact.

That's the real case. It's not crazy.

**Where the steelman breaks:**

1. #1 assumes you can execute a clean Deep cut. In practice: eng RIFs of 20% during a miss quarter are morale disasters. The remaining engineers spend 6 weeks updating their LinkedIn, your top performers leave voluntarily by September, and you end up with a 25-engineer team that ships slower than the pre-cut 30-engineer team would have. This is the most common failure mode of "concentrate the pain" RIFs — it's not the cut itself, it's the diaspora it triggers.

2. #2 about "forcing function prioritization" assumes you had a ranking of features that was simply being ignored. You almost certainly don't. You have a roadmap that reflects real customer commitments, and cutting eng doesn't reveal priorities — it reveals which customer promises you're now breaking. Some of those are expansion commitments. Cutting eng → breaking expansion commitment → NRR compresses. Circular.

3. #3 is theoretically true but operationally optimistic. CS restructuring while you're doing an RIF means your CS leader is processing their own team's layoffs while being asked to redesign the segmentation model. They will do one of those things well. It won't be the redesign.

4. #4 is the strongest argument but it assumes Series B happens cleanly. If Q3 misses, Deep still runs to month 22 before crisis and that's not a cleanup — that's a wind-down. Whereas Reshape misses Q3 → re-plan at 9 months → you're in the same spot Deep would have been with one more intermediate decision point.

**The honest recommendation:**

Go Reshape. Not because it's "safer" — that's lazy reasoning. Because:

- The real question is "which move maximizes optionality at the next decision point." Reshape preserves the 112% NRR engine (which is your ONLY proven machine right now) and keeps the eng org intact, so if Q3 goes well you accelerate. If Q3 misses, you have 9-10 months of runway and a team that's still producing — plenty of time to do Deep then, with MORE information than you have now.

- Deep locks you into a trajectory today based on one quarter of data. That's a bet with high conviction costs. Reshape is a bet with low conviction costs — it costs you 5 months of theoretical runway in the Deep case vs. keeping real option value.

- Your Series B story on Reshape at month 21 is: "we missed Q1 by 18%, right-sized sales to reality, shipped on plan for Q2-Q4, and came into the raise with 112% NRR and $17M ARR." That's a raise-able story at a reasonable valuation. Deep's Q1-next-year story is: "we missed Q1, did a 20% RIF, shipped a slower roadmap, and here we are at $16M ARR with stressed NRR." Both stories can fundraise. Reshape's fundraises at a better multiple because product and CS both still look healthy.

**The bolt-on recommendation that makes Reshape actually work:**

Add a gate. Specifically: Reshape plus a formal Q2 checkpoint where IF bookings land below 90% of reset plan AND NRR drops below 110%, we execute a defined Deep-equivalent RIF within 30 days. You make the contingency plan NOW, announce to the board NOW, and then either execute it in July or you don't. This turns "optimistic Reshape" into "Reshape with a pre-committed backstop," which is the position you actually want to take into a board meeting.

Do not do Deep right now. Do Reshape with a public gate.$pf$,
 $pf$Steelmanned Deep hard — concentration of pain, forcing-function prioritization, valuation uplift from longer runway. Broke the steelman on execution risk (eng RIFs trigger diaspora), CS restructuring-during-layoffs math, and the 20-24 month Series B story. Recommendation: Reshape + a pre-committed Q2 gate that flips to Deep if bookings <90% of reset plan AND NRR <110%. That's Reshape with a backstop, not optimistic Reshape.$pf$),

-- Step 4 --
('66666666-6666-6666-6666-6666666D0104',
 '55555555-5555-5555-5555-555555550013',
 4,
 $pf$The board memo — 2-page draft with 3 asks$pf$,
 $pf$Draft the board memo. 2 pages max. My board is 5 people — 2 investor-directors (Series A lead + seed lead), the CEO (also the founder), an independent director, me. The Series A lead is the most numerate; he'll zero in on the Q2 gate language and want it tight.

Structure:
- Situation (what happened in Q1)
- Plan (Reshape + gate)
- Three specific asks of the board
- Risks + what we're watching

Tone: direct, owns the miss, no blame. Assume they've read the financial package already — don't rehash numbers they have. Use numbers as evidence for claims, not as narrative. Board reads Sunday night for Monday meeting.$pf$,
 $pf$Draft below. Two pages printed in 11pt. Numbers as evidence only.

---

**MEMO TO THE BOARD — Q1 RESET PLAN**
From: [CFO]
Date: [Pre-read for Monday board meeting]

**1. Situation**

Q1 closed 18% below plan on new bookings. NRR held at 112%. Burn ran 10% hot versus plan because we executed the January hiring on the original bookings assumption before Q1 sales data landed. Runway is now 13.7 months; the miss and overspend together cost us ~2 months of runway in one quarter.

The miss is concentrated in new-logo acquisition. Every other part of the business is performing: NRR is holding, gross margin is on plan, churn ticked down 80bps, product usage metrics are flat-to-up. The diagnosis is not "the business is broken." It is "we built a sales-capacity plan for a Q1 pipeline that turned out softer than our pipeline coverage ratio implied." I own that. Our Q1 pipeline coverage was 3.2x, historically we need 3.8x for our conversion rate at this ARR band, and I signed off on the plan anyway.

**2. Plan — "Reshape with a gate"**

I'm recommending the Reshape scenario: right-size sales to actual demand (lay off 3 AEs and 1 SDR in the May cycle, do not backfill the open AE req), freeze all new hiring for two quarters pending plan review, and renegotiate our top-three vendor contracts (Salesforce, Datadog, our external counsel). Projected savings: $280K/month by Q3. Projected runway extension: ~3 months at steady burn, ~5 months including the vendor work flowing through.

I explicitly considered deeper cuts — a 20% engineering RIF plus a CS reduction — and rejected them. The case against: our 112% NRR is the one thing working, and engineering and CS are the teams producing it. Cutting either accelerates our cash runway at the cost of compressing the only growth engine we currently have, which trades short-term optionality for long-term deterioration. The 18-month model I've attached shows Deep buying 5 additional months of runway at a cost of ~$800K in ARR and a likely 4-point NRR compression. That is not a good trade today.

The word "today" is load-bearing. If Q2 repeats Q1, the trade changes. Which is why this plan has a gate.

**The Q2 gate.** At the end of Q2, if new bookings land below 90% of our reset plan AND NRR drops below 110%, we execute a pre-committed deeper RIF within 30 days of the Q2 close. I've attached the Deep scenario specification as Appendix B — same numbers I'd execute in July with no further deliberation, pre-approved today by this board. This converts "let's see how Q2 goes" into a specific, dated decision rule with predetermined action.

**3. Three asks**

**Ask 1 — Approve the Reshape actions above** (severance and one-time costs ~$180K). I'd like to execute the sales RIF in the May cycle, which means communications the week of May 5th.

**Ask 2 — Approve a $500K expansion team investment in Q2.** NRR is our one functioning engine; I want to double-check that we are not starving it for cash while we rebalance sales. $500K gets us one Enterprise CSM hire and a specialist engineer embedded with the expansion team for account-specific feature work. This is NOT growth spend — it's maintenance spend on the machine that's working.

**Ask 3 — Defer the Series B timeline from Q4 of this year to Q1 of next year.** Fundraising on Q3 numbers (which will reflect one quarter of the reset plan executing cleanly) tells a better story than fundraising on Q1 numbers with two weeks of Q2 data. This is a timing change, not a strategy change. Reshape extends runway enough to absorb the shift; a Q1 raise of next year is comfortable, a Q4 raise this year is stressed.

**4. Risks + what we're watching**

- **Customer concentration risk in NRR.** Our 112% NRR includes three accounts that together represent 19% of ARR. One churn in that group drops NRR to ~105%, which flips the Q2 gate. I'm watching monthly usage and executive relationships on those three; Head of CS has weekly touch.

- **Sales execution post-RIF.** A 3-AE reduction in a 12-AE org is 25%. Remaining team coverage model gets re-drawn; territories get reassigned. Historically this is where miss-chasing RIFs either stabilize or spiral. I've asked our VP of Sales for a 30-day ramp plan for the remaining reps, with Q2 pipeline generation targets built in.

- **Macro signal in pipeline.** Our Q1 pipeline softened 8 weeks before the quarter closed. If the macro story is "enterprise software budgets compressed in Q1 and bounce back in Q2," our Q2 lands normally. If it's "budgets are structurally smaller for the year," we miss Q2 regardless of capacity. We won't know until late May.

- **What would change my recommendation:** a single account churn above $400K ARR in Q2, OR a second 15%+ miss against reset plan, would cause me to recommend executing Appendix B's Deep plan before the scheduled gate date.

**5. Open question for board discussion**

Ask 2 is the least obvious of the three and I'd value board input. Counterargument to self: in a miss quarter, spending $500K on additional headcount looks tone-deaf externally (especially to the rank-and-file after we execute the sales RIF). The internal communications plan matters; I think we can frame "we're investing in our strongest team while right-sizing our weakest" honestly, but the team will be watching.

---

— [CFO]
Attachments: Q1 financials (sent separately), 18-month scenario model, Appendix B (Deep plan specification)$pf$,
 $pf$2-page board memo. Situation owns the miss (including the pipeline-coverage signoff). Plan recommends Reshape with a pre-committed Q2 gate converting "let's see" into a specific decision rule. Three asks: approve Reshape, approve $500K expansion spend, defer Series B timing. Risks section flags concentration risk + sales execution + macro + a specific "change my mind" trigger. Internal comms question teed up as open discussion.$pf$),

-- Step 5 --
('66666666-6666-6666-6666-6666666D0105',
 '55555555-5555-5555-5555-555555550013',
 5,
 $pf$Quarterly check-in framework — signals that trigger re-plan$pf$,
 $pf$Last piece. Build me the quarterly signal framework. I want to walk into every future board meeting with the same dashboard: leading indicators, lagging indicators, and pre-committed decision rules tied to each.

Keep it to 6-8 total signals. For each: what it measures, the leading vs lagging distinction, the level that's healthy, the level that triggers re-plan, and the SPECIFIC action that re-plan means for that signal. I don't want "we'll revisit" — I want "if signal X hits level Y, we take action Z."

Framework needs to be usable by the CEO and the board, not just finance. Plain language. No ratio-of-ratio metrics.$pf$,
 $pf$Six signals. Each with: definition, leading/lagging, healthy band, re-plan trigger, specific action. Designed to be legible to the CEO and the board without a finance translator.

---

**SIGNAL 1 — Pipeline coverage ratio (leading)**
*What it measures:* Pipeline value for the CURRENT quarter divided by the quarterly bookings target.
*Healthy:* ≥ 3.8x at start of quarter.
*Re-plan trigger:* Drops below 3.2x by end of month 1 of the quarter.
*Action:* Bookings capacity re-sizing within 30 days. Specifically: pause all sales hiring, move 20% of outbound-SDR capacity to pipeline-rescue on existing open opps, escalate to CRO for account-level attention on top-20 deals.

*Why this signal:* This was the signal I missed in Q1 — we entered the quarter at 3.2x and convinced ourselves the conversion rate would stretch. It didn't. Pre-commit now to treat 3.2x as a trigger, not a concern.

**SIGNAL 2 — NRR (lagging, but checked monthly)**
*What it measures:* Net revenue retention on the trailing 12-month cohort.
*Healthy:* ≥ 110%.
*Re-plan trigger:* Drops below 108% for two consecutive months.
*Action:* Emergency account review on any account showing expansion-to-flat signals (product usage, CSM health score, exec relationship change). CFO + Head of CS review top-20 accounts within 2 weeks. If the cause is macro (budget freezes across cohort), recommend Deep plan execution. If the cause is concentrated (1-3 accounts), targeted retention investment.

**SIGNAL 3 — Cash runway (lagging)**
*What it measures:* Months of cash at rolling 3-month trailing burn rate.
*Healthy:* ≥ 15 months.
*Re-plan trigger:* ≤ 10 months.
*Action:* At 10 months, mandatory fundraise kickoff regardless of market conditions — pick up the phone and start term-sheet conversations within 2 weeks. Do not "wait for a better quarter." 10 months is the last defensible moment to begin a Series B process with optionality.

*Why this signal:* "We'll raise when the numbers are better" is how companies end up raising at 6 months of runway with no leverage. Put a number on it, and respect it.

**SIGNAL 4 — Burn multiple (trailing 90-day net burn ÷ trailing 90-day ARR added) (lagging)**
*What it measures:* How many dollars you burn for each dollar of new ARR.
*Healthy:* ≤ 2.0x.
*Re-plan trigger:* > 2.5x.
*Action:* If the burn multiple climbs because ARR added drops (numerator stable, denominator shrinks), the issue is go-to-market efficiency — trigger sales cost review. If it climbs because burn grows (numerator grows, denominator stable), the issue is spend discipline — trigger vendor + hiring review.

*Why this signal:* Disaggregating burn multiple into "burn grew" vs. "ARR shrank" tells you WHERE to cut. It prevents the across-the-board RIF reflex.

**SIGNAL 5 — New-logo win rate (leading, measured monthly)**
*What it measures:* % of stage-4+ opportunities that convert to closed-won.
*Healthy:* ≥ 22% (our historical average).
*Re-plan trigger:* Drops below 18% for two consecutive months.
*Action:* Competitive-loss postmortem on every sub-18% month — specifically comparing our win rate vs. each competitor. If losses concentrate on a single competitor, product + marketing emergency alignment within 30 days. If losses spread (budget-not-approved, no-decision), macro signal — no tactical fix, bias toward cutting sales capacity rather than investing in it.

**SIGNAL 6 — Eng shipping cadence (leading)**
*What it measures:* Number of major features shipped per quarter, against committed quarterly plan.
*Healthy:* ≥ 80% of committed features shipping on time.
*Re-plan trigger:* Below 65% for one quarter, OR below 75% for two consecutive quarters.
*Action:* Eng leadership review with Head of Product — root-cause whether the issue is scope creep (trim scope), ambiguous priorities (formalize prioritization rubric), or true capacity shortage (revisit hiring freeze — because if eng is the bottleneck on expansion-driving features, it is paying for itself).

*Why this signal:* This is the signal that protects against the "cut engineering in a miss quarter and then your NRR drops in two quarters" failure mode. Eng shipping IS a financial signal, not just an operational one.

---

**How to use the framework:**

1. **Monthly ops review:** CFO reviews all 6 signals with CEO and functional leaders. Any signal at trigger level gets an action plan that week. No waiting for quarterly rhythm.
2. **Quarterly board meeting:** Present the dashboard with 4-quarter rolling history for each signal. Re-plan triggers should be HIGHLIGHTED, not buried.
3. **Decision audit:** Every board meeting, if any signal hit a trigger in the prior quarter, the memo explicitly states: "Signal X triggered on [date]. Action Y was taken. Outcome: [result]." This forces discipline on executing the pre-committed rules, not re-litigating them.

**One thing I'm explicitly NOT putting on this list:** CAC payback. It's a useful metric but it's a ratio of ratios and by the time it moves meaningfully, the underlying signals (pipeline coverage, win rate, new bookings) have already told you the story. Signals should be things that move early. CAC payback is a summary of things that have already moved.

**One thing I'd add in 12 months:** an "expansion pipeline coverage" ratio specifically for NRR-driving accounts. Right now expansion is lumpy and a 4-quarter trailing NRR captures it. At $25M+ ARR, expansion becomes enough of your growth that it deserves its own pipeline signal.$pf$,
 $pf$Six signals (pipeline coverage, NRR, cash runway, burn multiple, new-logo win rate, eng shipping cadence) each with healthy band, trigger level, and specific pre-committed action. Framework converts "we'll revisit" into "if X then Y within Z days." Engineering shipping cadence deliberately included as a financial signal. CAC payback deliberately excluded as trailing. Ready for monthly ops + quarterly board use.$pf$);

-- =========================================================================
-- END OF FILE — append next project(s) below this line.
-- Iterations working the Content queue: add 2–3 projects per iteration,
-- appending below this comment. Do NOT rewrite existing projects.
-- =========================================================================

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_steps ENABLE ROW LEVEL SECURITY;
