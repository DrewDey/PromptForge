-- PathForge Seed Data (v4 — REAL projects, not template placeholders)
--
-- How to apply on a fresh Supabase instance:
--   1. Run supabase/schema.sql first (creates tables + RLS)
--   2. Run supabase/migration-v2.sql (adds result_content, model_used, tools_used)
--   3. Run THIS file (seeds categories, profiles, prompts, steps)
--
-- How to reapply on an existing instance with bad seed data:
--   Just run this file. It DELETEs the old seed rows (by fixed UUIDs) before re-inserting,
--   so it's safe to run repeatedly. Your real user accounts & their content are untouched
--   because they don't share these UUID prefixes.
--
-- Content source: mirrored from src/lib/mock-data.ts so Supabase and local-dev mock data
-- tell the same story. 20 real-feeling build paths across finance, marketing, code, data,
-- design, writing, productivity, strategy, education, and personal.
--
-- UUID convention:
--   Categories:  11111111-...-11111111110X   (X = 1..10)
--   Profiles:    22222222-...-2222222222XX   (XX = 01..11)
--   Prompts:     33333333-...-3333333333XX   (XX = 01..20)
--   Steps:       44444444-...-4444444444XSS  (X = prompt 1..9, SS = step 01+; see rows)

-- =========================================================================
-- 1. CATEGORIES
-- =========================================================================

INSERT INTO categories (id, name, slug, description, icon, prompt_count) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Finance & Accounting', 'finance', 'Budgeting, forecasting, analysis, and financial planning', '💰', 3),
  ('11111111-1111-1111-1111-111111111102', 'Marketing & Sales', 'marketing', 'Campaigns, content strategy, lead generation, and outreach', '📢', 3),
  ('11111111-1111-1111-1111-111111111103', 'Writing & Content', 'writing', 'Blog posts, emails, copy, and creative writing', '✍️', 3),
  ('11111111-1111-1111-1111-111111111104', 'Coding & Development', 'coding', 'Code generation, debugging, architecture, and documentation', '💻', 2),
  ('11111111-1111-1111-1111-111111111105', 'Design & Creative', 'design', 'UI/UX, branding, image generation, and visual design', '🎨', 1),
  ('11111111-1111-1111-1111-111111111106', 'Education & Learning', 'education', 'Study plans, explanations, tutoring, and course creation', '📚', 1),
  ('11111111-1111-1111-1111-111111111107', 'Productivity', 'productivity', 'Task management, meetings, workflows, and automation', '⚡', 4),
  ('11111111-1111-1111-1111-111111111108', 'Data & Analysis', 'data', 'Data visualization, surveys, reporting, and insights', '📊', 1),
  ('11111111-1111-1111-1111-111111111109', 'Business Strategy', 'strategy', 'SWOT analysis, business plans, market research, and OKRs', '🎯', 1),
  ('11111111-1111-1111-1111-111111111110', 'Personal & Fun', 'personal', 'Travel, recipes, hobbies, games, and lifestyle', '🎮', 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  icon = EXCLUDED.icon, prompt_count = EXCLUDED.prompt_count;

-- =========================================================================
-- 2. PROFILES — 11 seed makers
-- =========================================================================

-- FK-safe cleanup: delete prompt_steps + prompts BEFORE profiles,
-- because prompts.author_id references profiles.id. Without this order,
-- re-applying the seed fails with ERROR 23503 on prompts_author_id_fkey.
-- Also clears the seed-content-chains.sql projects (55... prefix) so that
-- file can be re-pasted afterwards without conflicts.
ALTER TABLE prompt_steps DISABLE ROW LEVEL SECURITY;
ALTER TABLE prompts DISABLE ROW LEVEL SECURITY;
DELETE FROM prompt_steps WHERE prompt_id::text LIKE '33333333-3333-3333-3333-333333333%'
                            OR prompt_id::text LIKE '55555555-5555-5555-5555-555555555%';
DELETE FROM prompts WHERE id::text LIKE '33333333-3333-3333-3333-333333333%'
                       OR id::text LIKE '55555555-5555-5555-5555-555555555%';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

DELETE FROM profiles WHERE id IN (
  '22222222-2222-2222-2222-222222222201','22222222-2222-2222-2222-222222222202','22222222-2222-2222-2222-222222222203',
  '22222222-2222-2222-2222-222222222204','22222222-2222-2222-2222-222222222205','22222222-2222-2222-2222-222222222206',
  '22222222-2222-2222-2222-222222222207','22222222-2222-2222-2222-222222222208','22222222-2222-2222-2222-222222222209',
  '22222222-2222-2222-2222-222222222210','22222222-2222-2222-2222-222222222211'
);

INSERT INTO profiles (id, username, display_name, bio, role) VALUES
  ('22222222-2222-2222-2222-222222222201', 'marcusdev',           'Marcus Chen',        'Full-stack dev building with AI daily. Sharing everything I make.',                         'user'),
  ('22222222-2222-2222-2222-222222222202', 'sarahgrows',          'Sarah Mitchell',     'Marketing consultant. I use AI to 10x my client work.',                                     'user'),
  ('22222222-2222-2222-2222-222222222203', 'jakefinance',         'Jake Torres',        'CFO at a startup. Automating everything finance with AI.',                                  'user'),
  ('22222222-2222-2222-2222-222222222204', 'priya_creates',       'Priya Sharma',       'UX designer and AI tinkerer. Making design faster.',                                        'user'),
  ('22222222-2222-2222-2222-222222222205', 'teacherben',          'Ben Okafor',         'High school teacher using AI to build better lessons.',                                     'user'),
  ('22222222-2222-2222-2222-222222222206', 'ops_nina',            'Nina Kowalski',      'Operations manager at a 50-person agency. Obsessed with removing busywork.',                'user'),
  ('22222222-2222-2222-2222-222222222207', 'dataraj',             'Raj Patel',          'Data analyst turned freelance consultant. I build dashboards and automate reports.',         'user'),
  ('22222222-2222-2222-2222-222222222208', 'emwriter',            'Emily Zhao',         'Freelance content strategist. Former journalist, now I help startups tell their story.',    'user'),
  ('22222222-2222-2222-2222-222222222209', 'cto_derek',           'Derek Lawson',       'CTO at a health-tech startup. 15 years in engineering, now building with AI daily.',        'user'),
  ('22222222-2222-2222-2222-222222222210', 'lena_solopreneur',    'Lena Morales',       'Solopreneur running an Etsy shop and two niche sites. AI is my only employee.',             'user'),
  ('22222222-2222-2222-2222-222222222211', 'pathforge_projects',  'PathForge Projects', 'Curated real-world AI projects you can follow along with. Built step by step.',             'user')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username, display_name = EXCLUDED.display_name, bio = EXCLUDED.bio;

ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. PROMPTS — 20 flagship build paths
-- =========================================================================
-- Using dollar-quoted strings ($pf$...$pf$) to avoid apostrophe-escape pain.

ALTER TABLE prompts DISABLE ROW LEVEL SECURITY;

DELETE FROM prompt_steps WHERE prompt_id IN (
  SELECT id FROM prompts WHERE id::text LIKE '33333333-3333-3333-3333-333333333%'
);
DELETE FROM prompts WHERE id::text LIKE '33333333-3333-3333-3333-333333333%';

INSERT INTO prompts (id, title, description, content, result_content, category_id, difficulty, model_used, model_recommendation, tools_used, tags, status, author_id, vote_count, bookmark_count) VALUES

-- 01 — Brand Identity (Marketing, beginner)
('33333333-3333-3333-3333-333333333301',
 $pf$Complete Brand Identity Package for Sunrise Bakery$pf$,
 $pf$Built a full brand identity from scratch — personality, voice, color palette, typography, logo concept, photography guidelines, and a shareable brand guide. Used for a real bakery launch in Austin.$pf$,
 $pf$I needed to launch a specialty bakery and had zero branding. I used Claude to go from nothing to a complete brand identity in one afternoon. Three prompts, each building on the last, from brand discovery to visual system to a final guidelines document I could hand to my designer and social media manager.$pf$,
 $pf$The final brand guidelines document covered: brand story and mission, 5 personality traits with examples, voice guidelines with do's and don'ts, complete color palette (5 colors with hex codes), typography system (3 fonts), logo concept description, and social media photography rules. My designer said it was the most thorough creative brief she'd ever received from a client. The whole thing took about 2 hours start to finish.$pf$,
 '11111111-1111-1111-1111-111111111102', 'beginner', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude'], ARRAY['branding','identity','bakery','design system','small business'],
 'approved', '22222222-2222-2222-2222-222222222202', 83, 47),

-- 02 — YouTube Script (Writing, beginner)
('33333333-3333-3333-3333-333333333302',
 $pf$YouTube Video Script Pipeline — From Idea to Upload$pf$,
 $pf$Created a complete 12-minute YouTube video script about productivity systems, including hook, story beats, b-roll suggestions, and a thumbnail concept. One prompt, full output.$pf$,
 $pf$I run a productivity YouTube channel (8K subs) and scripting was taking me 6+ hours per video. I built a single detailed prompt that generates a complete, ready-to-film script. The key was giving Claude my exact style, pacing preferences, and audience context upfront.$pf$,
 $pf$Generated a 2,800-word script for "The 3-Folder System That Replaced My Entire Productivity Stack." Included: a 30-second cold open hook, 4 story beats with transitions, specific b-roll callouts, 2 audience interaction points, a sponsor integration slot, end screen CTA, and 3 thumbnail text options. I filmed it in one take using the script as my teleprompter notes. Video got 12K views — my best performing that month.$pf$,
 '11111111-1111-1111-1111-111111111103', 'beginner', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude'], ARRAY['youtube','video script','content creation','productivity'],
 'approved', '22222222-2222-2222-2222-222222222201', 95, 62),

-- 03 — Strength Training (Personal, beginner)
('33333333-3333-3333-3333-333333333303',
 $pf$12-Week Strength Training Program with Nutrition Guide$pf$,
 $pf$Generated a complete progressive overload training program customized for my goals — 4 days/week, with warm-ups, exercises, sets/reps, deload weeks, and a meal framework.$pf$,
 $pf$I wanted a structured gym program but didn't want to pay $200 for a personal trainer's template. I gave Claude my stats, equipment access, goals, and injury history, and got back a program that's more detailed than anything I've bought online.$pf$,
 $pf$The program included: a 4-day Upper/Lower split, 3 mesocycles (weeks 1-4 hypertrophy, weeks 5-8 strength, weeks 9-12 peak), deload every 4th week, specific exercises with alternatives, warm-up protocols, RPE targets, and progressive overload rules. The nutrition section covered: calorie targets (2,650 maintenance, 2,900 lean bulk), macro split (180g protein, 350g carbs, 85g fat), meal timing, and a sample day. I've been running it for 6 weeks and my squat is up 25lbs.$pf$,
 '11111111-1111-1111-1111-111111111110', 'beginner', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude'], ARRAY['fitness','training program','nutrition','health','personal'],
 'approved', '22222222-2222-2222-2222-222222222201', 112, 78),

-- 04 — Review Analyzer (Data, intermediate)
('33333333-3333-3333-3333-333333333304',
 $pf$Automated Customer Review Analyzer with Weekly Reports$pf$,
 $pf$Built a Python tool that categorizes 500+ customer reviews by sentiment and topic, then generates a clean weekly report I paste into Slack every Monday.$pf$,
 $pf$We were drowning in customer reviews across our e-commerce store and had no systematic way to track sentiment or spot trends. I used ChatGPT to build a Python script that reads our review CSV export, categorizes everything, and spits out a Markdown report. No ML frameworks — just keyword matching for the MVP. Total build time: about 3 hours across 2 prompts.$pf$,
 $pf$The system processes ~500 reviews per run. Our first run showed: 68% positive, 14% neutral, 18% negative. Top complaints were assembly instructions (34% of negative reviews) and shipping damage on standing desks. Our product manager said it replaced a 4-hour-per-week manual process. The script is 120 lines of Python with zero dependencies beyond the standard library.$pf$,
 '11111111-1111-1111-1111-111111111108', 'intermediate', 'chatgpt-5-4', 'ChatGPT 5.4',
 ARRAY['ChatGPT','Python','Google Sheets'], ARRAY['python','sentiment analysis','automation','customer feedback','reporting'],
 'approved', '22222222-2222-2222-2222-222222222203', 67, 39),

-- 05 — SaaS Onboarding Emails (Marketing, intermediate)
('33333333-3333-3333-3333-333333333305',
 $pf$SaaS Onboarding Email Sequence — 7 Emails That Convert$pf$,
 $pf$Designed and wrote a complete 7-email onboarding drip campaign for a project management SaaS. Includes strategy, timing, subject lines, and full copy for every email.$pf$,
 $pf$I'm the solo marketer at FlowDesk (a PM tool for agencies). We had a 14-day trial but no onboarding emails — just a welcome and a trial-ending email. I used ChatGPT Thinking to map out the strategy first, then write all the copy. Two-step process that produced a complete drip campaign.$pf$,
 $pf$The sequence covers: Day 0 (welcome), Day 1 (team invite), Day 3 (feature highlight), Day 5 (customer story), Day 8 (objection handling), Day 11 (urgency), Day 14 (final push + 20% discount). Each email is under 150 words with a single CTA. After implementing in Mailchimp, our trial-to-paid conversion went from 8% to 14% in the first month.$pf$,
 '11111111-1111-1111-1111-111111111102', 'intermediate', 'chatgpt-5-4-thinking', 'ChatGPT 5.4 Thinking',
 ARRAY['ChatGPT','Mailchimp'], ARRAY['email marketing','SaaS','onboarding','conversion','drip campaign'],
 'approved', '22222222-2222-2222-2222-222222222202', 74, 51),

-- 06 — SaaS Dashboard (Coding, advanced)
('33333333-3333-3333-3333-333333333306',
 $pf$Full SaaS Admin Dashboard — From Wireframe to Working Code$pf$,
 $pf$Built a complete admin dashboard with stats cards, revenue charts, activity feed, and a searchable customer table. Next.js + Tailwind + Recharts. Three prompts from architecture to finished product.$pf$,
 $pf$I needed an internal analytics dashboard for our SaaS but didn't want to spend 2 weeks building it. I used Claude Opus Extended to go from a rough wireframe description to working, responsive code in about 4 hours. Three prompts, each building on the last.$pf$,
 $pf$The final dashboard includes: responsive sidebar navigation, 4 KPI cards with sparklines and trend indicators (MRR, Active Users, Churn Rate, NPS), a 12-month revenue line chart with tooltips, a recent activity feed, and a full customer table (search, sort, pagination, status badges). Built in Next.js 14, TypeScript, Tailwind, Recharts. Clean enough to ship to production with minor tweaks — mostly just swapping mock data for real API calls.$pf$,
 '11111111-1111-1111-1111-111111111104', 'advanced', 'claude-opus-4-6-ext', 'Claude 4.6 Opus Extended',
 ARRAY['Claude','Next.js','Tailwind CSS','Recharts','TypeScript'], ARRAY['dashboard','react','nextjs','admin panel','charts','full-stack'],
 'approved', '22222222-2222-2222-2222-222222222201', 134, 89),

-- 07 — Portfolio Rebalancer (Finance, advanced)
('33333333-3333-3333-3333-333333333307',
 $pf$Investment Portfolio Rebalancer with Tax-Loss Harvesting$pf$,
 $pf$Built a Google Sheets tool that tracks my $200K portfolio, calculates drift from target allocation, suggests rebalancing trades, and identifies tax-loss harvesting opportunities.$pf$,
 $pf$I manage my own portfolio (15 positions across index funds, stocks, bonds, and a REIT) and was doing rebalancing manually. I used ChatGPT Thinking to design a spreadsheet that does it all automatically — allocation tracking, drift calculation, trade suggestions, AND tax-loss harvesting with wash sale warnings. Two prompts: core rebalancer, then tax optimization.$pf$,
 $pf$The finished spreadsheet has: automatic market value calculations, current vs target allocation %, drift detection with 2% threshold, specific trade recommendations ("BUY 12 shares of VTI"), unrealized gain/loss per position, tax-loss harvesting flags, estimated tax savings, and wash sale risk warnings. Saved me from a wash sale last month that would have cost $1,200 in lost deductions.$pf$,
 '11111111-1111-1111-1111-111111111101', 'advanced', 'chatgpt-5-4-thinking', 'ChatGPT 5.4 Thinking',
 ARRAY['ChatGPT','Google Sheets'], ARRAY['investing','portfolio','tax optimization','spreadsheet','personal finance'],
 'approved', '22222222-2222-2222-2222-222222222203', 91, 58),

-- 08 — Competitive Landscape (Strategy, intermediate)
('33333333-3333-3333-3333-333333333308',
 $pf$Competitive Landscape Report for Fintech Startup$pf$,
 $pf$Generated a 15-page competitive analysis covering 8 competitors in the embedded payments space — feature matrices, pricing breakdowns, positioning maps, and strategic recommendations.$pf$,
 $pf$We were preparing for our Series A pitch and needed a competitive analysis fast. I used Gemini Pro to research and structure a comprehensive landscape report. I gave it our product positioning, listed 8 competitors, and asked for a systematic breakdown.$pf$,
 $pf$The report covered: market overview ($4.2B embedded payments market, 34% CAGR), 8 competitor profiles (Stripe Connect, Adyen, PayPal Commerce, Square, Payrix, Finix, Rainforest, WePay), feature comparison matrix, pricing model comparison, positioning map, gap analysis, and 5 strategic recommendations. Our investor said it was "one of the better competitive analyses" they'd seen from a seed-stage company. We closed $1.8M.$pf$,
 '11111111-1111-1111-1111-111111111109', 'intermediate', 'gemini-2-5-pro', 'Gemini 2.5 Pro',
 ARRAY['Gemini','Google Docs'], ARRAY['competitive analysis','fintech','startup','Series A','market research'],
 'approved', '22222222-2222-2222-2222-222222222203', 56, 34),

-- 09 — Python Course (Education, intermediate)
('33333333-3333-3333-3333-333333333309',
 $pf$Complete 8-Week Python Course for Beginners$pf$,
 $pf$Designed a full Python fundamentals curriculum — lesson plans, exercises, quizzes, and projects for each week. Built for adult learners with zero coding experience.$pf$,
 $pf$I teach an evening coding class at a community college and needed to build a Python fundamentals course from scratch. I used Claude to design the entire 8-week curriculum in one session. The key was specifying the audience (adult beginners, no CS background) and the end goal (build a real CLI app by week 8).$pf$,
 $pf$The curriculum goes from "Hello, Python" (week 1) to a capstone finance CLI app (week 8). Each week has 2 lessons, a hands-on exercise, a mini-project, and a quiz. Mini-projects build in complexity: Mad Libs, Choose Your Own Adventure, Number Guessing Game, Contact Book, Unit Converter, Expense Logger, Weather App, Full Finance CLI. Students loved it — 85% completion rate, up from 60% with my old curriculum.$pf$,
 '11111111-1111-1111-1111-111111111106', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude','Jupyter Notebooks'], ARRAY['python','curriculum','teaching','beginner','course design'],
 'approved', '22222222-2222-2222-2222-222222222205', 88, 63),

-- 10 — Fitness App UI (Design, intermediate)
('33333333-3333-3333-3333-333333333310',
 $pf$Mobile App UI Component Specs for Fitness App$pf$,
 $pf$Created a complete UI design system spec — colors, typography, spacing, component states, and interaction patterns for a fitness tracking mobile app.$pf$,
 $pf$I'm a solo developer building a fitness app and I'm not a designer. I used Gemini to generate comprehensive UI specs that I could implement directly in React Native. Instead of vague design advice, I asked for specific values: hex codes, font sizes in pixels, border radii, spacing scales, and component state descriptions.$pf$,
 $pf$The spec covered: a 10-color palette with hex + RGB, 6-step type scale with specific sizes and line heights, 8px spacing scale, component specs for 12 core components (buttons, cards, inputs, tabs, progress bars, workout cards, stat circles, nav bar, modals, toasts, avatars, badges), each with default/hover/pressed/disabled states, plus dark mode variants. Implementing the workout card component took 20 minutes instead of the usual 2 hours of guessing.$pf$,
 '11111111-1111-1111-1111-111111111105', 'intermediate', 'gemini-2-5-pro', 'Gemini 2.5 Pro',
 ARRAY['Gemini','Figma','React Native'], ARRAY['UI design','design system','mobile app','fitness','components'],
 'approved', '22222222-2222-2222-2222-222222222204', 45, 31),

-- 11 — Notion Auto-Tagging (Productivity, advanced)
('33333333-3333-3333-3333-333333333311',
 $pf$Personal Knowledge Base with AI Auto-Tagging$pf$,
 $pf$Built a Notion + Python system that automatically categorizes and tags my notes, articles, and bookmarks using the Claude API. Saves me 30 minutes of manual organizing daily.$pf$,
 $pf$I save 10-15 articles, notes, and bookmarks per day into Notion but never organized them. After 6 months I had 2,000+ untagged pages. I used Claude to build a Python script that connects to the Notion API, reads each page, and auto-generates category tags and a 1-sentence summary. Runs as a daily cron job.$pf$,
 $pf$The system processes new Notion pages nightly: reads content via Notion API, sends it to Claude API for classification, gets back 2-4 tags from a fixed taxonomy (60 tags across 8 categories) plus a summary, then updates the Notion page properties. Processing 2,000 backlog pages cost about $3 in API calls. Now it handles 10-15 new pages daily for pennies. Classification accuracy is about 90%.$pf$,
 '11111111-1111-1111-1111-111111111107', 'advanced', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude API','Python','Notion API'], ARRAY['automation','notion','knowledge management','API','productivity'],
 'approved', '22222222-2222-2222-2222-222222222201', 103, 71),

-- 12 — Startup Financial Model (Finance, intermediate)
('33333333-3333-3333-3333-333333333312',
 $pf$Startup Financial Model with 3-Year Projections$pf$,
 $pf$Generated a complete SaaS financial model — revenue projections, expense breakdown, cash runway, and key metrics. Used it in our actual seed pitch deck.$pf$,
 $pf$We needed a financial model for our seed round pitch but couldn't afford a fractional CFO. I gave Claude our current numbers and plans and asked it to build a full 3-year model.$pf$,
 $pf$The model covered: monthly revenue projections with cohort-based growth, COGS breakdown, operating expenses by department, headcount plan, cash flow statement, runway calculation, key SaaS metrics (LTV, CAC, payback period, gross margin, NRR), and sensitivity analysis with 3 scenarios. Our lead investor called out the model quality during diligence. We closed $1.8M.$pf$,
 '11111111-1111-1111-1111-111111111101', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude','Google Sheets'], ARRAY['financial model','startup','SaaS','fundraising','pitch deck'],
 'approved', '22222222-2222-2222-2222-222222222203', 79, 44),

-- 13 — Product Descriptions (Writing, intermediate)
('33333333-3333-3333-3333-333333333313',
 $pf$E-commerce Product Description Engine — 50 Products in 2 Hours$pf$,
 $pf$Built a reusable prompt system that generates consistent, high-quality product descriptions for an online furniture store. Tested on 50 products with editorial-level results.$pf$,
 $pf$I run an online furniture store with 200+ products and most had terrible 2-line descriptions. I built a prompt template with Claude that takes product specs and generates descriptions in our brand voice. The key was a style calibration step first, then using that as context.$pf$,
 $pf$Ran it on 50 products across 6 categories. Each description includes: a compelling headline, 3-4 sentence lifestyle description, bulleted features, materials and dimensions, care instructions, and search keywords. Our editor only needed to tweak 4 of 50. Average generation: 45 seconds per product. We saw a 23% increase in conversion rate on AI-written pages vs old manufacturer copy.$pf$,
 '11111111-1111-1111-1111-111111111103', 'intermediate', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude','Shopify'], ARRAY['e-commerce','product descriptions','copywriting','shopify','bulk content'],
 'approved', '22222222-2222-2222-2222-222222222202', 61, 38),

-- 14 — Weekly Status Report Automator (Productivity, intermediate)
('33333333-3333-3333-3333-333333333314',
 $pf$Weekly Status Report Automator — From Raw Data to CEO-Ready in 5 Minutes$pf$,
 $pf$Built a 3-step prompt system that takes raw data from Harvest, Monday.com, and Slack and compiles a formatted weekly status report. Replaced a 3-hour Friday ritual.$pf$,
 $pf$Every Friday I spent 3 hours pulling data from three different tools (Harvest for time tracking, Monday.com for project status, Slack for team updates) and compiling it into a report for our CEO. I built a prompt system where I paste the raw exports and Slack highlights, and it generates the full report in the right format. Three iterations: first I mapped inputs to outputs, then built the master prompt with paste zones, then tested with real data and fixed edge cases where it was including archived projects and writing generic summaries.$pf$,
 $pf$The final prompt has three clearly marked paste zones (Harvest CSV, Monday.com CSV, Slack text). It parses everything and outputs: an executive summary that references specific numbers and project names (not generic), a team utilization table with 75% target comparison, project status sorted by risk level (filtered to active only), wins and blockers extracted from Slack, and a "number of the week" highlight. The report comes out under 500 words every time. My Friday reporting went from 3 hours to about 12 minutes (5 min gathering data, 2 min pasting, 5 min reviewing). CEO said the reports actually got better because the AI catches patterns I was missing.$pf$,
 '11111111-1111-1111-1111-111111111107', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude','Harvest','Monday.com','Slack'], ARRAY['reporting','automation','operations','weekly report','data parsing'],
 'approved', '22222222-2222-2222-2222-222222222206', 118, 82),

-- 15 — Meeting Notes → Action Items (Productivity, beginner)
('33333333-3333-3333-3333-333333333315',
 $pf$Meeting Notes to Action Items — Never Lose a Follow-Up Again$pf$,
 $pf$Built a prompt that takes messy Otter.ai meeting transcripts and extracts decisions, action items with owners, open questions, and a Slack-ready summary. Handles 60-minute transcripts.$pf$,
 $pf$I was spending 20 minutes after every meeting pulling out action items from Otter.ai transcripts. The transcripts are messy — people talk over each other, go on tangents, reference previous meetings. I built a two-step system: first it segments the transcript by topic, then extracts structured information from each segment. Also added a "carried over items" feature where I paste last meeting's action items and it flags what was completed vs still open.$pf$,
 $pf$The system outputs: a 3-sentence summary formatted for Slack, a "Decisions Made" section with who decided what, an action items table (owner, deadline, context), and open questions that weren't resolved. For a 45-minute product team meeting, it correctly extracted 4 decisions, 6 action items, and 3 open questions. The two-pass approach for long meetings (segment by topic first, then extract) catches about 95% of action items vs maybe 70% when I was doing it manually. Team started calling it "the accountability bot" because nothing falls through the cracks anymore.$pf$,
 '11111111-1111-1111-1111-111111111107', 'beginner', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude','Otter.ai','Slack'], ARRAY['meetings','action items','transcription','productivity','team management'],
 'approved', '22222222-2222-2222-2222-222222222209', 142, 98),

-- 16 — Inbox Zero Triage (Productivity, beginner)
('33333333-3333-3333-3333-333333333316',
 $pf$Inbox Zero System — AI Email Triage That Actually Works$pf$,
 $pf$Built a daily email processing workflow using Claude. Paste 10-15 email previews each morning, get them categorized by urgency with specific next actions. Cut my email time from 60 minutes to 15.$pf$,
 $pf$I get 120+ emails a day as a freelance consultant. I was spending a full hour every morning just reading and deciding what needed attention. I built a triage system with two prompts: first I defined five categories with specific criteria (Respond Today, Respond This Week, Delegate to VA, Read Later, Ignore), including an approved newsletter list. Then I built a batch processing prompt where I paste email previews and get a sorted, actionable table with priority scores, suggested actions, and estimated response times.$pf$,
 $pf$The system processes batches of 10-15 emails and outputs a daily summary ("14 emails: 2 respond today, 4 this week, 3 delegate, 3 read later, 2 ignore") followed by a table with category, priority (1-5), sender, subject, suggested action, and time estimate. The total estimated response time helps me see at a glance if my day is manageable. Best part: the delegate entries include specific instructions for my VA (e.g., "Jamie: slides are in Google Drive / Q1 Workshops / Bloom, send the final PDF"). My morning email routine went from 60 minutes of anxiety to 15 minutes of execution. I've been using it daily for 3 weeks straight.$pf$,
 '11111111-1111-1111-1111-111111111107', 'beginner', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude','Gmail'], ARRAY['email','inbox zero','triage','daily routine','productivity'],
 'approved', '22222222-2222-2222-2222-222222222208', 167, 112),

-- 17 — Morning Planning Prompt (Productivity, beginner)
('33333333-3333-3333-3333-333333333317',
 $pf$Morning Planning Prompt — Energy-Based Time Blocking with AI$pf$,
 $pf$Created a daily planning prompt that takes my calendar and to-do list, assigns tasks to time slots based on my energy patterns, and warns me when I'm overcommitted. Use it every morning at 8am.$pf$,
 $pf$I was starting every day staring at my to-do list feeling overwhelmed. I built a planning prompt that does the thinking for me. I paste my calendar events and Todoist tasks, and it creates a time-blocked schedule based on my energy patterns (I'm a morning person — peak focus 8-11am). It assigns deep work to mornings, meetings to midday, and admin to afternoons. If I have more than 6 hours of meetings or 8+ tasks, it tells me I'm overcommitted and suggests what to defer.$pf$,
 $pf$The output is a clean daily plan with time blocks, tasks assigned to energy-appropriate slots, and overload warnings. Example output: "Today's Focus: Ship the Q2 roadmap and prep for the TrueNorth check-in." Then a schedule from 8am to 5pm with specific tasks in each block. The best feature is the warning system — last Tuesday it flagged that I had 7 hours of meetings and less than 45 minutes of focus time, and suggested rescheduling my 1:1 with a direct report. It was right. I've been using it daily for a month. I feel noticeably less stressed and I'm getting through my to-do list more consistently.$pf$,
 '11111111-1111-1111-1111-111111111107', 'beginner', 'chatgpt-5-4', 'ChatGPT 5.4',
 ARRAY['ChatGPT','Google Calendar','Todoist'], ARRAY['daily planning','time blocking','routine','focus','energy management'],
 'approved', '22222222-2222-2222-2222-222222222209', 203, 145),

-- 18 — Notion Workspace Architecture (Productivity, intermediate)
('33333333-3333-3333-3333-333333333318',
 $pf$Notion Workspace Architecture — From 400-Page Chaos to 5-Database Clarity$pf$,
 $pf$Redesigned my entire Notion workspace from scratch. Went from 15 overlapping databases and 400 unorganized pages to a clean 5-database system with a dashboard, templates, and a migration plan.$pf$,
 $pf$My Notion had become a graveyard of abandoned databases and unsearchable pages. I used it for project management, CRM, content planning, knowledge management, and meeting notes — but nothing was connected and I couldn't find anything. I used Claude to design a completely new architecture (not patching the old one) and then create a step-by-step migration plan so I wouldn't lose any data during the transition.$pf$,
 $pf$The new architecture has 5 core databases (down from 15): Projects, CRM, Meeting Notes, Newsletter, and Notes. Each has carefully designed properties and multiple views for different contexts. The dashboard page shows today's meetings, active projects, pipeline status, newsletter progress, and a quick-capture button. The migration plan covered what to build first (the CRM, because everything relates to it), how to merge overlapping databases, and a checklist for each step with time estimates. Total migration took about 6 hours over a weekend. My weekly review on Fridays now takes 15 minutes instead of 45.$pf$,
 '11111111-1111-1111-1111-111111111107', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude','Notion'], ARRAY['notion','workspace design','organization','databases','knowledge management'],
 'approved', '22222222-2222-2222-2222-222222222208', 156, 109),

-- 19 — Loom → SOP (Productivity, beginner) — approved but uses cat-7 productivity
('33333333-3333-3333-3333-333333333319',
 $pf$Loom Video to SOP — Turn Screen Recordings into Training Docs$pf$,
 $pf$Converted a messy 15-minute Loom transcript into a clean, numbered SOP with screenshot placeholders, warnings, edge cases, and a troubleshooting FAQ. Now used for all our internal processes.$pf$,
 $pf$I was recording Loom videos to train new hires at our agency, but nobody watches 15-minute videos when they need a quick reference. I started taking the Loom transcripts (full of "um", "so basically", and mouse-movement narration) and running them through Claude to generate proper SOP documents. Two prompts: first converts the transcript to a clean numbered procedure, then adds a troubleshooting section based on common questions I've gotten from past new hires.$pf$,
 $pf$From a 15-minute Loom about processing invoices (QuickBooks + Airtable), the system generated a professional SOP with: prerequisites, 13 numbered steps, 3 warning callouts, 2 edge case notes, estimated completion time (8 minutes per invoice), and a troubleshooting FAQ covering the 5 most common questions. The transcript was 2,400 words of meandering narration; the SOP is 800 words of crisp instructions. I've now converted 8 of our core processes this way. New hire onboarding time dropped from 3 days to 1.5 days because they can actually reference these docs instead of re-watching videos.$pf$,
 '11111111-1111-1111-1111-111111111107', 'beginner', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude','Loom','Notion'], ARRAY['SOP','documentation','training','onboarding','operations'],
 'approved', '22222222-2222-2222-2222-222222222206', 89, 64),

-- 20 — Client Proposal Generator (Strategy, intermediate)
('33333333-3333-3333-3333-333333333320',
 $pf$Client Proposal Generator — From Discovery Call to Polished PDF in 30 Minutes$pf$,
 $pf$Built a prompt that takes my discovery call notes and generates a complete consulting proposal — scope, timeline, pricing, terms. Generates proposals 5x faster than my old process.$pf$,
 $pf$Writing consulting proposals used to take me half a day. I'd procrastinate because it was tedious, which meant slow turnaround, which meant losing deals. I built a single prompt that takes my discovery call notes (I just brain-dump everything the client said) and generates a structured proposal. I gave it my pricing model, my standard terms, and a few examples of past proposals so it matches my voice.$pf$,
 $pf$The prompt generates: a 1-paragraph executive summary restating the client's problem in their own words, a detailed scope section with 3-5 workstreams (each with deliverables and milestones), a suggested timeline (usually 4-8 weeks), three pricing options (good/better/best — I always give options), payment terms, and a "Why Me" section with relevant experience. The output is about 1,500 words and reads like I wrote it, not a bot. My proposal turnaround went from 3-4 days to same-day. Close rate went from 35% to 50% — I think because clients get impressed by the fast turnaround and the quality of the scope breakdown.$pf$,
 '11111111-1111-1111-1111-111111111109', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude','Google Docs','Notion'], ARRAY['proposals','consulting','sales','client management','freelance'],
 'approved', '22222222-2222-2222-2222-222222222208', 96, 71);

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 4. PROMPT STEPS — detailed breakdowns for the flagship multi-step projects
-- =========================================================================
-- Conventions: Step UUIDs use 44444444-...-4XXSS format (XX=prompt, SS=step).

ALTER TABLE prompt_steps DISABLE ROW LEVEL SECURITY;

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- === Prompt 01: Brand Identity (3 steps) ===
('44444444-4444-4444-4444-444444440101', '33333333-3333-3333-3333-333333333301', 1,
 $pf$Brand Discovery$pf$,
 $pf$I'm starting a specialty bakery in Austin, TX called "Sunrise Bakery" focused on sourdough and pastries. Our target customers are health-conscious millennials who value artisan quality and local sourcing. Our differentiator is that we mill our own flour from Texas-grown wheat. Help me develop a brand foundation: brand personality (5 traits), brand voice description, tagline options (give me 8), and a one-paragraph brand story.$pf$,
 $pf$Brand Personality: 1) Warm & Welcoming — like the smell of fresh bread in the morning. 2) Artisan & Authentic — we don't cut corners, we hand-shape them. 3) Earthy & Grounded — rooted in Texas soil, literally. 4) Playful — we take our craft seriously, but not ourselves. 5) Community-First — your neighborhood living room that smells incredible.

Brand Voice: Conversational and knowledgeable. We talk like your friend who happens to be obsessed with fermentation science.

Tagline Options:
1. "From Texas Wheat to Your Morning Treat"
2. "Milled Here. Baked Here. Loved Here."
3. "Rise With Us"
4. "Real Flour. Real Craft. Real Good."
5. "Where Every Loaf Has a Story"
6. "Baked at Dawn, Gone by Noon"
7. "Grain to Loaf, Start to Finish"
8. "The Bakery That Starts From Scratch — Literally"

Brand Story: Sunrise Bakery was born from a simple question: what if we could taste the difference between bread made from freshly-milled local wheat and everything else on the shelf? We source grain from Texas farms within 200 miles, mill it ourselves each morning, and bake it into sourdough and pastries that taste like bread is supposed to taste.$pf$,
 $pf$Define brand personality, voice, and story foundation$pf$),

('44444444-4444-4444-4444-444444440102', '33333333-3333-3333-3333-333333333301', 2,
 $pf$Visual Identity System$pf$,
 $pf$Based on the brand foundation we just created for Sunrise Bakery (artisan, earthy, warm, community-first), create a complete visual identity system. Include: 1) Primary and secondary color palette with hex codes and reasoning, 2) Typography recommendations (specific Google Fonts), 3) Logo concept description, 4) Photography style guide for social media.$pf$,
 $pf$COLOR PALETTE:
Primary: Warm Wheat #D4A843, Deep Crust #3D2B1F
Secondary: Flour Dust #FAF6F0, Sage Field #7C8B6E, Sunrise Coral #E8845C

TYPOGRAPHY:
Headings: "DM Serif Display" — warm, editorial, has bakery character
Body: "Inter" — clean and readable
Accent: "Caveat" — handwritten feel for menu boards and quotes

LOGO CONCEPT: A minimalist rising sun integrated into a wheat stalk. The sun is half-visible on the horizon, with 3 wheat stalks growing upward. "SUNRISE BAKERY" in DM Serif Display below, "Austin, TX" in small caps Inter. Works in single-color and reversed.

PHOTOGRAPHY: Warm natural lighting, hands in frame showing craft, raw ingredients as props, muted earthy tones with Sunrise Coral as an occasional pop, close-up texture shots of bread crust and crumb structure.$pf$,
 $pf$Create color palette, typography, logo concept, and photo style$pf$),

('44444444-4444-4444-4444-444444440103', '33333333-3333-3333-3333-333333333301', 3,
 $pf$Brand Guidelines Document$pf$,
 $pf$Now compile everything into a structured brand guidelines document for Sunrise Bakery. This will be shared with our designer, social media manager, and any future hires. Format it as a clean, section-by-section document with: Brand Overview, Mission & Values, Brand Voice (with do's and don'ts examples), Visual Identity (colors, type, logo usage rules), Social Media Guidelines, and a section on how to talk about our milling process without being boring.$pf$,
 $pf$# SUNRISE BAKERY — BRAND GUIDELINES

## 1. Brand Overview
Sunrise Bakery is an artisan bakery in Austin, TX specializing in sourdough and pastries made from locally-sourced, freshly-milled Texas wheat.

## 2. Mission & Values
**Mission:** Make the best bread in Austin by controlling every step from grain to loaf.
**Values:** Transparency, Quality, Community, Sustainability.

## 3. Brand Voice
**DO:** "We mill our flour fresh every morning — you can literally taste the difference"
**DON'T:** "Our artisanal process leverages farm-to-table synergies" (too corporate)

## 4. Visual Identity
| Name | Hex | Usage |
|------|-----|-------|
| Warm Wheat | #D4A843 | Primary brand color, headers, CTAs |
| Deep Crust | #3D2B1F | Text, logo, dark backgrounds |
| Flour Dust | #FAF6F0 | Page backgrounds, cards |
| Sage Field | #7C8B6E | Secondary accents, icons |
| Sunrise Coral | #E8845C | Highlights, sale tags |

## 5. Social Media Guidelines
- Instagram grid: alternate product close-ups, process shots, community moments
- Stories: behind-the-scenes of the morning bake
- Respond to every comment within 4 hours

## 6. Talking About Our Milling Process
- Lead with taste, not process
- Make it visual
- Connect to the farmer ("Grown by the Rodriguez family 180 miles from here")
- Keep it short — one sentence, then move on$pf$,
 $pf$Compile everything into a shareable brand guidelines doc$pf$),

-- === Prompt 04: Review Analyzer (2 steps) ===
('44444444-4444-4444-4444-444444440401', '33333333-3333-3333-3333-333333333304', 1,
 $pf$Build the Analysis Script$pf$,
 $pf$I have ~500 customer reviews for my e-commerce store (home office furniture) as a CSV with columns: review_id, date, rating (1-5), review_text, product_name. Write a Python script that reads the CSV, categorizes each review by sentiment and topics (quality, shipping, price, customer service, assembly, comfort), and outputs a summary JSON. Use only standard libraries — keyword matching for the MVP.$pf$,
 $pf$Built a 120-line Python script with keyword dictionaries for 6 topic categories and sentiment detection using positive/negative word lists plus rating thresholds. The script reads CSV input, processes each review, and outputs a JSON with: total review count, sentiment breakdown percentages, monthly trend data, and product-level scores with topic frequency. No external dependencies required.

Core logic excerpt:
```python
TOPICS = {
    "quality": ["quality", "well-made", "durable", "flimsy", "broke"],
    "shipping": ["shipping", "delivery", "arrived", "damaged", "late"],
    "price": ["price", "expensive", "affordable", "worth", "overpriced"],
    "customer_service": ["support", "helpful", "rude", "return"],
    "assembly": ["assembly", "instructions", "build", "setup"],
    "comfort": ["comfortable", "ergonomic", "lumbar", "cushion"]
}
```$pf$,
 $pf$Generate Python script for sentiment analysis and topic categorization$pf$),

('44444444-4444-4444-4444-444444440402', '33333333-3333-3333-3333-333333333304', 2,
 $pf$Weekly Report Generator$pf$,
 $pf$Create a script that takes the review_analysis.json and generates a Markdown weekly report. Include: executive summary, sentiment table, product ranking, top issues, top praises, and recommended actions. Make it something I can paste into Slack every Monday.$pf$,
 $pf$The report generator produces clean Markdown with: executive summary with emoji health indicator, sentiment breakdown table, product rankings sorted by average rating with star icons, top 3 complaints, top 3 praises, and auto-generated action items. Sample output showed 487 reviews analyzed, 68% positive, top issue was assembly instructions (34% of negative reviews).$pf$,
 $pf$Create a Markdown report generator for weekly team updates$pf$),

-- === Prompt 05: Email Sequence (2 steps) ===
('44444444-4444-4444-4444-444444440501', '33333333-3333-3333-3333-333333333305', 1,
 $pf$Sequence Strategy & Structure$pf$,
 $pf$I run a project management SaaS called "FlowDesk" for agencies. 14-day trial. I need a 7-email onboarding sequence. Goal: get users to invite their team and create their first project within 3 days, then convert to paid by day 14. Give me: send schedule, goal per email, subject line options (2 each), and content angle.$pf$,
 $pf$Mapped out all 7 emails:
- Day 0: Welcome + first-project CTA
- Day 1: Team invite CTA
- Day 3: Feature highlight (timeline view)
- Day 5: Customer story (Redline Agency case study)
- Day 8: Objection handling (migration fears)
- Day 11: Urgency (trial ending in 3 days)
- Day 14: Final push with 20% discount

Each email has 2 subject line options and a clear single-goal focus.$pf$,
 $pf$Map out the full email sequence strategy and timing$pf$),

('44444444-4444-4444-4444-444444440502', '33333333-3333-3333-3333-333333333305', 2,
 $pf$Full Email Copy$pf$,
 $pf$Write the complete email copy for all 7 emails. Use subject line option A from the strategy. Preview text under 60 chars. Body under 150 words each. Tone: friendly, direct, no fluff. Write like a smart friend who works at FlowDesk.$pf$,
 $pf$All 7 emails written. Email 1: "Your FlowDesk workspace is ready" — warm welcome with direct link to create first project. Email 2: "FlowDesk works better with your team" — invite CTA with fun stat about team adoption. Emails 3-5 provide value (feature demo, customer proof, migration help). Emails 6-7 create urgency with trial countdown and discount offer. Every email is under 150 words with a single CTA button.$pf$,
 $pf$Write the full copy for all 7 onboarding emails$pf$),

-- === Prompt 06: Dashboard (3 steps) ===
('44444444-4444-4444-4444-444444440601', '33333333-3333-3333-3333-333333333306', 1,
 $pf$Architecture & Layout$pf$,
 $pf$Build an admin dashboard for a SaaS analytics product. Needs: sidebar nav, top stats cards (MRR, active users, churn rate, NPS), revenue chart (line, 12 months), activity feed, customers table with search and pagination. Use Next.js 14, TypeScript, Tailwind CSS, Recharts. Give me project structure and the layout component with sidebar.$pf$,
 $pf$Project structure scaffolded in src/app (layout.tsx with sidebar + main), src/components (Sidebar, StatsCard, RevenueChart, ActivityFeed, CustomerTable), and src/lib (data, utils). Sidebar uses lucide-react icons and next/navigation usePathname for active highlighting. Dark zinc-900 background with border-r, nav items have hover + active states using Tailwind.$pf$,
 $pf$Define architecture and create the layout shell$pf$),

('44444444-4444-4444-4444-444444440602', '33333333-3333-3333-3333-333333333306', 2,
 $pf$Stats Cards & Revenue Chart$pf$,
 $pf$Build the main dashboard page with: 4 stats cards (MRR $48,200 +12.5%, Active Users 2,847 +5.3%, Churn 3.2% -0.8%, NPS 72 +4) with sparklines and trend colors. Plus a 12-month revenue line chart using Recharts with data: [32k, 35k, 33k, 38k, 36k, 40k, 42k, 39k, 44k, 45k, 46k, 48.2k]. Responsive.$pf$,
 $pf$StatsCard component takes title, value, change %, and sparkline data. TrendingUp/TrendingDown icon + emerald/red color based on direction. Small inline Recharts LineChart for the sparkline. Revenue chart uses gradient fill under the line, custom tooltip with dollar formatting, and responsive breakpoints. Cards stack on mobile, 4-across on xl screens.$pf$,
 $pf$Build the stats overview and revenue chart components$pf$),

('44444444-4444-4444-4444-444444440603', '33333333-3333-3333-3333-333333333306', 3,
 $pf$Customer Table with Search & Pagination$pf$,
 $pf$Add a customers table: search by name/email, sortable columns (Name, Email, Plan, MRR, Status, Joined), pagination (10/page), status badges (active=green, churned=red, trial=yellow). Generate 30 rows of realistic fake data. Full component with state management.$pf$,
 $pf$Client component with useMemo for filtered+sorted data. Search input filters by name or email (case-insensitive). Column headers toggle sort direction on click with ChevronUp/ChevronDown indicator. Paginated slice of perPage=10. Status badges use bg-emerald-400/10 text-emerald-400 border styling for active, similar reds and yellows for churned/trial. 30 realistic rows like "Acme Corp" (Enterprise, $2,400 MRR) and "NovaBright Studio" (Pro, $89 MRR, trial).$pf$,
 $pf$Create searchable, sortable customer data table$pf$),

-- === Prompt 07: Portfolio Rebalancer (2 steps) ===
('44444444-4444-4444-4444-444444440701', '33333333-3333-3333-3333-333333333307', 1,
 $pf$Core Rebalancer Design$pf$,
 $pf$I manage a $200k portfolio with 15 positions (index funds, stocks, bonds, REIT). Design a Google Sheets tool with columns A-J: Ticker, Asset Class, Shares, Cost Basis/Share, Current Price, Market Value, Current %, Target %, Drift, Action. Include all formulas. Action column should suggest specific trades when drift exceeds 2%.$pf$,
 $pf$Designed a 10-column spreadsheet with formulas:
- F = C*E (market value)
- G = F / F$17 (allocation %)
- I = G-H (drift)
- J = IF(ABS(I)>0.02, trade suggestion with exact share counts, "OK")

Summary section: total portfolio value, total cost basis, total gain/loss, total return %, count of positions needing rebalance.$pf$,
 $pf$Design the spreadsheet structure with all formulas$pf$),

('44444444-4444-4444-4444-444444440702', '33333333-3333-3333-3333-333333333307', 2,
 $pf$Tax-Loss Harvesting Layer$pf$,
 $pf$Add columns K-N: K=Unrealized Gain/Loss, L=Harvest flag (YES if loss >$500, held >30 days), M=Tax Savings Estimate (24% bracket), N=Wash Sale Warning (cross-reference a Transactions sheet for buys in last 30 days). Give me all the formulas.$pf$,
 $pf$Added 4 columns:
- K = F - (C*D)  (unrealized gain/loss)
- L = IF(AND(K<-500, days-held>30), "YES", "NO")
- M = IF(L="YES", ABS(K)*0.24, 0)
- N = COUNTIFS wash-sale check against Transactions!

Summary additions: total harvestable losses, potential tax savings, wash sale warning count.$pf$,
 $pf$Add tax optimization formulas and wash sale detection$pf$),

-- === Prompt 09: Python Course (1 step) ===
('44444444-4444-4444-4444-444444440901', '33333333-3333-3333-3333-333333333309', 1,
 $pf$Full Curriculum Design$pf$,
 $pf$Design an 8-week Python fundamentals course for complete beginners (adult learners, no coding experience). Each week: a theme, 2 lessons, 1 exercise, 1 mini-project, 5-question quiz. Course should end with a real CLI app. Week 1 = "I can do this", Week 8 = "I can't believe I built that."$pf$,
 $pf$Complete 8-week curriculum:
- Week 1 "Hello Python": print, variables, input → Mad Libs
- Week 2 "Making Decisions": if/else → Choose Your Own Adventure
- Week 3 "Doing Things Again": loops → Number Guessing Game
- Week 4 "Collections": lists, dicts → Grade Tracker
- Week 5 "Building Blocks": functions → Unit Converter
- Week 6 "Working with Files": file I/O, CSV → Expense Logger
- Week 7 "Leveling Up": modules, APIs → Weather App
- Week 8 "The Capstone": project planning → Personal Finance CLI

Mini-projects build in complexity across the 8 weeks, ending with a real tool that combines everything.$pf$,
 $pf$Design the complete 8-week course structure$pf$),

-- === Prompt 14: Weekly Status Report (3 steps) ===
('44444444-4444-4444-4444-444444441401', '33333333-3333-3333-3333-333333333314', 1,
 $pf$Identify Report Inputs and Structure$pf$,
 $pf$I'm an operations manager at a digital agency with 50 people. Every Friday I spend 3 hours compiling a weekly status report from: Slack channel updates, Harvest time tracking exports (CSV), and a Monday.com board export (CSV). The final report goes to our CEO and has sections for: Team Utilization, Active Project Status, Wins of the Week, and Blockers. Design a system where I paste raw data and get back the formatted report. Start by mapping inputs to outputs.$pf$,
 $pf$INPUT → OUTPUT MAPPING:

Harvest CSV → Team Utilization table (per-person billable %, team avg vs 75% target) + Project hours breakdown

Monday.com CSV → Active Projects table (name, status, owner, days until due, risk flag) + At-Risk callout (status=stuck or due<5 days)

Slack highlights → Wins section (3-5 bullets) + Blockers section

Format: Executive summary (2-3 sentences, confident but honest tone) → Utilization table → Projects table (sorted by risk) → Wins → Blockers + actions → Number of the week.$pf$,
 $pf$Map data sources to report sections$pf$),

('44444444-4444-4444-4444-444444441402', '33333333-3333-3333-3333-333333333314', 2,
 $pf$Build the Master Prompt$pf$,
 $pf$Now write me the actual prompt I'll use every Friday. It should have three clearly marked paste zones where I drop in the raw data. The prompt should parse the Harvest CSV, parse the Monday.com CSV, extract wins and blockers from the Slack text, then compile everything into the report format. Include tone instructions (professional but not boring) and a 500-word cap.$pf$,
 $pf$Delivered a reusable prompt with three explicitly labeled paste zones (---BEGIN PROMPT---...---END PROMPT---). Each zone has an inline instruction: Harvest zone calculates billable percentages and flags sub-60% utilization; Monday.com zone lists active projects sorted by risk; Slack zone extracts wins and blockers. Output section enforces the exact 6-part format and under-500-words cap.$pf$,
 $pf$Create the reusable master prompt with paste zones$pf$),

('44444444-4444-4444-4444-444444441403', '33333333-3333-3333-3333-333333333314', 3,
 $pf$Test with Real Data and Iterate$pf$,
 $pf$I just ran the prompt with last Friday's real data. The utilization section is great but the project status section is listing archived projects from the CSV. Also the executive summary is too generic — it reads like a template, not like it actually analyzed the data. Fix the prompt to: 1) filter out projects with status "done" or "archived", 2) make the executive summary reference specific numbers and project names, 3) add a week-over-week comparison for utilization.$pf$,
 $pf$Three fixes applied:
1. Filter: "Ignore rows where status=done, archived, or completed. Only include: working on it, stuck, waiting for review, not started."
2. Specific summary instructions with BAD/GOOD examples ("Team billed at 71% this week, dragged down by the Meridian redesign…" instead of "The team had a productive week").
3. New optional paste zone for last week's utilization → adds WoW Change column with ↑/↓/⚠️ flags for drops >5 pp.

After fixing, the executive summary now reads: "Team utilization hit 73.4% this week, up from 70.1% last week but still below our 75% target. The TrueNorth migration is the main drag — 3 engineers spent 22 combined hours on non-billable environment setup." Night and day difference.$pf$,
 $pf$Iterate on the prompt based on real-world test results$pf$);

ALTER TABLE prompt_steps ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- Done. Recap:
--   10 categories • 11 profiles • 20 prompts • 21 detailed steps
--   All content mirrors src/lib/mock-data.ts so local + live show the same stories.
-- =========================================================================
