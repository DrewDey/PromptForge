-- PromptForge V2 Migration: Projects, not templates
-- Run this in Supabase SQL Editor

-- Add new columns to prompts table
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS tools_used TEXT[] DEFAULT '{}';
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS result_content TEXT;

-- Add result_content to steps
ALTER TABLE prompt_steps ADD COLUMN IF NOT EXISTS result_content TEXT;

-- Create project_images table (architecture ready, images optional)
CREATE TABLE IF NOT EXISTS project_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  step_id UUID REFERENCES prompt_steps(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_images_project ON project_images(project_id);
ALTER TABLE project_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project images follow their project visibility" ON project_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = project_images.project_id
      AND (prompts.status = 'approved' OR prompts.author_id = auth.uid())
    )
  );

-- Clear old seed data (preserves real user accounts)
DELETE FROM prompt_steps;
DELETE FROM prompts;
-- Don't delete profiles — your real account is in there

-- Update seed profiles (skip real users, only touch seed data)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
DELETE FROM profiles WHERE id LIKE '22222222%';

INSERT INTO profiles (id, username, display_name, bio, role) VALUES
  ('22222222-2222-2222-2222-222222222201', 'marcusdev', 'Marcus Chen', 'Full-stack dev building with AI daily. Sharing everything I make.', 'user'),
  ('22222222-2222-2222-2222-222222222202', 'sarahgrows', 'Sarah Mitchell', 'Marketing consultant. I use AI to 10x my client work.', 'user'),
  ('22222222-2222-2222-2222-222222222203', 'jakefinance', 'Jake Torres', 'CFO at a startup. Automating everything finance with AI.', 'user'),
  ('22222222-2222-2222-2222-222222222204', 'priya_creates', 'Priya Sharma', 'UX designer and AI tinkerer. Making design faster.', 'user'),
  ('22222222-2222-2222-2222-222222222205', 'teacherben', 'Ben Okafor', 'High school teacher using AI to build better lessons.', 'user')
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, display_name = EXCLUDED.display_name, bio = EXCLUDED.bio;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update category counts
UPDATE categories SET prompt_count = 2 WHERE slug IN ('finance', 'marketing', 'writing', 'coding');
UPDATE categories SET prompt_count = 1 WHERE slug IN ('design', 'education', 'productivity', 'data', 'strategy', 'personal');

-- Insert new project-oriented seed data
ALTER TABLE prompts DISABLE ROW LEVEL SECURITY;

INSERT INTO prompts (id, title, description, content, result_content, category_id, difficulty, model_used, model_recommendation, tools_used, tags, status, author_id, vote_count, bookmark_count) VALUES

('33333333-3333-3333-3333-333333333301',
 'Complete Brand Identity Package for Sunrise Bakery',
 'Built a full brand identity from scratch — personality, voice, color palette, typography, logo concept, photography guidelines, and a shareable brand guide. Used for a real bakery launch in Austin.',
 'I needed to launch a specialty bakery and had zero branding. I used Claude to go from nothing to a complete brand identity in one afternoon. Three prompts, each building on the last, from brand discovery to visual system to a final guidelines document I could hand to my designer and social media manager.',
 'The final brand guidelines document covered: brand story and mission, 5 personality traits with examples, voice guidelines with do''s and don''ts, complete color palette (5 colors with hex codes), typography system (3 fonts), logo concept description, and social media photography rules. My designer said it was the most thorough creative brief she''d ever received from a client. The whole thing took about 2 hours start to finish.',
 '11111111-1111-1111-1111-111111111102', 'beginner', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude'], ARRAY['branding', 'identity', 'bakery', 'design system', 'small business'],
 'approved', '22222222-2222-2222-2222-222222222202', 83, 47),

('33333333-3333-3333-3333-333333333302',
 'YouTube Video Script Pipeline — From Idea to Upload',
 'Created a complete 12-minute YouTube video script about productivity systems, including hook, story beats, b-roll suggestions, and a thumbnail concept. One prompt, full output.',
 'I run a productivity YouTube channel (8K subs) and scripting was taking me 6+ hours per video. I built a single detailed prompt that generates a complete, ready-to-film script. The key was giving Claude my exact style, pacing preferences, and audience context upfront.',
 'Generated a 2,800-word script for "The 3-Folder System That Replaced My Entire Productivity Stack." Included: a 30-second cold open hook, 4 story beats with transitions, specific b-roll callouts, 2 audience interaction points, a sponsor integration slot, end screen CTA, and 3 thumbnail text options. I filmed it in one take using the script as my teleprompter notes. Video got 12K views — my best performing that month.',
 '11111111-1111-1111-1111-111111111103', 'beginner', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude'], ARRAY['youtube', 'video script', 'content creation', 'productivity'],
 'approved', '22222222-2222-2222-2222-222222222201', 95, 62),

('33333333-3333-3333-3333-333333333303',
 '12-Week Strength Training Program with Nutrition Guide',
 'Generated a complete progressive overload training program customized for my goals — 4 days/week, with warm-ups, exercises, sets/reps, deload weeks, and a meal framework.',
 'I wanted a structured gym program but didn''t want to pay $200 for a personal trainer''s template. I gave Claude my stats, equipment access, goals, and injury history, and got back a program that''s more detailed than anything I''ve bought online.',
 'The program included: a 4-day Upper/Lower split, 3 mesocycles (weeks 1-4 hypertrophy, weeks 5-8 strength, weeks 9-12 peak), deload every 4th week, specific exercises with alternatives, warm-up protocols, RPE targets, and progressive overload rules. The nutrition section covered: calorie targets (2,650 maintenance, 2,900 lean bulk), macro split (180g protein, 350g carbs, 85g fat), meal timing, and a sample day. I''ve been running it for 6 weeks and my squat is up 25lbs.',
 '11111111-1111-1111-1111-111111111110', 'beginner', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude'], ARRAY['fitness', 'training program', 'nutrition', 'health', 'personal'],
 'approved', '22222222-2222-2222-2222-222222222201', 112, 78),

('33333333-3333-3333-3333-333333333304',
 'Automated Customer Review Analyzer with Weekly Reports',
 'Built a Python tool that categorizes 500+ customer reviews by sentiment and topic, then generates a clean weekly report I paste into Slack every Monday.',
 'We were drowning in customer reviews across our e-commerce store and had no systematic way to track sentiment or spot trends. I used ChatGPT to build a Python script that reads our review CSV export, categorizes everything, and spits out a Markdown report. No ML frameworks — just keyword matching for the MVP. Total build time: about 3 hours across 2 prompts.',
 'The system processes ~500 reviews per run. Our first run showed: 68% positive, 14% neutral, 18% negative. Top complaints were assembly instructions (34% of negative reviews) and shipping damage on standing desks. Our product manager said it replaced a 4-hour-per-week manual process. The script is 120 lines of Python with zero dependencies beyond the standard library.',
 '11111111-1111-1111-1111-111111111108', 'intermediate', 'chatgpt-5-4', 'ChatGPT 5.4',
 ARRAY['ChatGPT', 'Python', 'Google Sheets'], ARRAY['python', 'sentiment analysis', 'automation', 'customer feedback', 'reporting'],
 'approved', '22222222-2222-2222-2222-222222222203', 67, 39),

('33333333-3333-3333-3333-333333333305',
 'SaaS Onboarding Email Sequence — 7 Emails That Convert',
 'Designed and wrote a complete 7-email onboarding drip campaign for a project management SaaS. Includes strategy, timing, subject lines, and full copy for every email.',
 'I''m the solo marketer at FlowDesk (a PM tool for agencies). We had a 14-day trial but no onboarding emails — just a welcome and a trial-ending email. I used ChatGPT Thinking to map out the strategy first, then write all the copy. Two-step process that produced a complete drip campaign.',
 'The sequence covers: Day 0 (welcome), Day 1 (team invite), Day 3 (feature highlight), Day 5 (customer story), Day 8 (objection handling), Day 11 (urgency), Day 14 (final push + 20% discount). Each email is under 150 words with a single CTA. After implementing in Mailchimp, our trial-to-paid conversion went from 8% to 14% in the first month.',
 '11111111-1111-1111-1111-111111111102', 'intermediate', 'chatgpt-5-4-thinking', 'ChatGPT 5.4 Thinking',
 ARRAY['ChatGPT', 'Mailchimp'], ARRAY['email marketing', 'SaaS', 'onboarding', 'conversion', 'drip campaign'],
 'approved', '22222222-2222-2222-2222-222222222202', 74, 51),

('33333333-3333-3333-3333-333333333306',
 'Full SaaS Admin Dashboard — From Wireframe to Working Code',
 'Built a complete admin dashboard with stats cards, revenue charts, activity feed, and a searchable customer table. Next.js + Tailwind + Recharts. Three prompts from architecture to finished product.',
 'I needed an internal analytics dashboard for our SaaS but didn''t want to spend 2 weeks building it. I used Claude Opus Extended to go from a rough wireframe description to working, responsive code in about 4 hours. Three prompts, each building on the last.',
 'The final dashboard includes: responsive sidebar navigation, 4 KPI cards with sparklines and trend indicators (MRR, Active Users, Churn Rate, NPS), a 12-month revenue line chart with tooltips, a recent activity feed, and a full customer table (search, sort, pagination, status badges). Built in Next.js 14, TypeScript, Tailwind, Recharts. Clean enough to ship to production with minor tweaks — mostly just swapping mock data for real API calls.',
 '11111111-1111-1111-1111-111111111104', 'advanced', 'claude-opus-4-6-ext', 'Claude 4.6 Opus Extended',
 ARRAY['Claude', 'Next.js', 'Tailwind CSS', 'Recharts', 'TypeScript'], ARRAY['dashboard', 'react', 'nextjs', 'admin panel', 'charts', 'full-stack'],
 'approved', '22222222-2222-2222-2222-222222222201', 134, 89),

('33333333-3333-3333-3333-333333333307',
 'Investment Portfolio Rebalancer with Tax-Loss Harvesting',
 'Built a Google Sheets tool that tracks my $200K portfolio, calculates drift from target allocation, suggests rebalancing trades, and identifies tax-loss harvesting opportunities.',
 'I manage my own portfolio (15 positions across index funds, stocks, bonds, and a REIT) and was doing rebalancing manually. I used ChatGPT Thinking to design a spreadsheet that does it all automatically — allocation tracking, drift calculation, trade suggestions, AND tax-loss harvesting with wash sale warnings. Two prompts: core rebalancer, then tax optimization.',
 'The finished spreadsheet has: automatic market value calculations, current vs target allocation %, drift detection with 2% threshold, specific trade recommendations ("BUY 12 shares of VTI"), unrealized gain/loss per position, tax-loss harvesting flags, estimated tax savings, and wash sale risk warnings. Saved me from a wash sale last month that would have cost $1,200 in lost deductions.',
 '11111111-1111-1111-1111-111111111101', 'advanced', 'chatgpt-5-4-thinking', 'ChatGPT 5.4 Thinking',
 ARRAY['ChatGPT', 'Google Sheets'], ARRAY['investing', 'portfolio', 'tax optimization', 'spreadsheet', 'personal finance'],
 'approved', '22222222-2222-2222-2222-222222222203', 91, 58),

('33333333-3333-3333-3333-333333333308',
 'Competitive Landscape Report for Fintech Startup',
 'Generated a 15-page competitive analysis covering 8 competitors in the embedded payments space — feature matrices, pricing breakdowns, positioning maps, and strategic recommendations.',
 'We were preparing for our Series A pitch and needed a competitive analysis fast. I used Gemini Pro to research and structure a comprehensive landscape report. I gave it our product positioning, listed 8 competitors, and asked for a systematic breakdown.',
 'The report covered: market overview ($4.2B embedded payments market, 34% CAGR), 8 competitor profiles (Stripe Connect, Adyen, PayPal Commerce, Square, Payrix, Finix, Rainforest, WePay), feature comparison matrix, pricing model comparison, positioning map, gap analysis, and 5 strategic recommendations. Our investor said it was "one of the better competitive analyses" they''d seen from a seed-stage company. We closed $1.8M.',
 '11111111-1111-1111-1111-111111111109', 'intermediate', 'gemini-2-5-pro', 'Gemini 2.5 Pro',
 ARRAY['Gemini', 'Google Docs'], ARRAY['competitive analysis', 'fintech', 'startup', 'Series A', 'market research'],
 'approved', '22222222-2222-2222-2222-222222222203', 56, 34),

('33333333-3333-3333-3333-333333333309',
 'Complete 8-Week Python Course for Beginners',
 'Designed a full Python fundamentals curriculum — lesson plans, exercises, quizzes, and projects for each week. Built for adult learners with zero coding experience.',
 'I teach an evening coding class at a community college and needed to build a Python fundamentals course from scratch. I used Claude to design the entire 8-week curriculum in one session. The key was specifying the audience (adult beginners, no CS background) and the end goal (build a real CLI app by week 8).',
 'The curriculum goes from "Hello, Python" (week 1) to a capstone finance CLI app (week 8). Each week has 2 lessons, a hands-on exercise, a mini-project, and a quiz. Mini-projects build in complexity: Mad Libs, Choose Your Own Adventure, Number Guessing Game, Contact Book, Unit Converter, Expense Logger, Weather App, Full Finance CLI. Students loved it — 85% completion rate, up from 60% with my old curriculum.',
 '11111111-1111-1111-1111-111111111106', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude', 'Jupyter Notebooks'], ARRAY['python', 'curriculum', 'teaching', 'beginner', 'course design'],
 'approved', '22222222-2222-2222-2222-222222222205', 88, 63),

('33333333-3333-3333-3333-333333333310',
 'Mobile App UI Component Specs for Fitness App',
 'Created a complete UI design system spec — colors, typography, spacing, component states, and interaction patterns for a fitness tracking mobile app.',
 'I''m a solo developer building a fitness app and I''m not a designer. I used Gemini to generate comprehensive UI specs that I could implement directly in React Native. Instead of vague design advice, I asked for specific values: hex codes, font sizes in pixels, border radii, spacing scales, and component state descriptions.',
 'The spec covered: a 10-color palette with hex + RGB, 6-step type scale with specific sizes and line heights, 8px spacing scale, component specs for 12 core components (buttons, cards, inputs, tabs, progress bars, workout cards, stat circles, nav bar, modals, toasts, avatars, badges), each with default/hover/pressed/disabled states, plus dark mode variants. Implementing the workout card component took 20 minutes instead of the usual 2 hours of guessing.',
 '11111111-1111-1111-1111-111111111105', 'intermediate', 'gemini-2-5-pro', 'Gemini 2.5 Pro',
 ARRAY['Gemini', 'Figma', 'React Native'], ARRAY['UI design', 'design system', 'mobile app', 'fitness', 'components'],
 'approved', '22222222-2222-2222-2222-222222222204', 45, 31),

('33333333-3333-3333-3333-333333333311',
 'Personal Knowledge Base with AI Auto-Tagging',
 'Built a Notion + Python system that automatically categorizes and tags my notes, articles, and bookmarks using the Claude API. Saves me 30 minutes of manual organizing daily.',
 'I save 10-15 articles, notes, and bookmarks per day into Notion but never organized them. After 6 months I had 2,000+ untagged pages. I used Claude to build a Python script that connects to the Notion API, reads each page, and auto-generates category tags and a 1-sentence summary. Runs as a daily cron job.',
 'The system processes new Notion pages nightly: reads content via Notion API, sends it to Claude API for classification, gets back 2-4 tags from a fixed taxonomy (60 tags across 8 categories) plus a summary, then updates the Notion page properties. Processing 2,000 backlog pages cost about $3 in API calls. Now it handles 10-15 new pages daily for pennies. Classification accuracy is about 90%.',
 '11111111-1111-1111-1111-111111111107', 'advanced', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude API', 'Python', 'Notion API'], ARRAY['automation', 'notion', 'knowledge management', 'API', 'productivity'],
 'approved', '22222222-2222-2222-2222-222222222201', 103, 71),

('33333333-3333-3333-3333-333333333312',
 'Startup Financial Model with 3-Year Projections',
 'Generated a complete SaaS financial model — revenue projections, expense breakdown, cash runway, and key metrics. Used it in our actual seed pitch deck.',
 'We needed a financial model for our seed round pitch but couldn''t afford a fractional CFO. I gave Claude our current numbers and plans and asked it to build a full 3-year model.',
 'The model covered: monthly revenue projections with cohort-based growth, COGS breakdown, operating expenses by department, headcount plan, cash flow statement, runway calculation, key SaaS metrics (LTV, CAC, payback period, gross margin, NRR), and sensitivity analysis with 3 scenarios. Our lead investor called out the model quality during diligence. We closed $1.8M.',
 '11111111-1111-1111-1111-111111111101', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude', 'Google Sheets'], ARRAY['financial model', 'startup', 'SaaS', 'fundraising', 'pitch deck'],
 'approved', '22222222-2222-2222-2222-222222222203', 79, 44),

('33333333-3333-3333-3333-333333333313',
 'E-commerce Product Description Engine — 50 Products in 2 Hours',
 'Built a reusable prompt system that generates consistent, high-quality product descriptions for an online furniture store. Tested on 50 products with editorial-level results.',
 'I run an online furniture store with 200+ products and most had terrible 2-line descriptions. I built a prompt template with Claude that takes product specs and generates descriptions in our brand voice. The key was a style calibration step first, then using that as context.',
 'Ran it on 50 products across 6 categories. Each description includes: a compelling headline, 3-4 sentence lifestyle description, bulleted features, materials and dimensions, care instructions, and search keywords. Our editor only needed to tweak 4 of 50. Average generation: 45 seconds per product. We saw a 23% increase in conversion rate on AI-written pages vs old manufacturer copy.',
 '11111111-1111-1111-1111-111111111103', 'intermediate', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude', 'Shopify'], ARRAY['e-commerce', 'product descriptions', 'copywriting', 'shopify', 'bulk content'],
 'approved', '22222222-2222-2222-2222-222222222202', 61, 38),

-- PENDING
('33333333-3333-3333-3333-333333333314',
 'AI-Powered Meal Prep Planner Based on Grocery Sales',
 'Created a system that takes this week''s grocery store sales flyer and generates a 7-day meal prep plan optimized for budget and nutrition.',
 'I wanted to eat healthy on a budget but meal planning was taking forever. I built a prompt that takes sale items as input and creates a full week of meals around what''s cheap this week.',
 'The output includes: 7 days of meals built around sale items, a consolidated grocery list with estimated costs, prep instructions for Sunday batch cooking, macros per meal, and total weekly cost. Last week it built a plan around chicken thighs ($1.99/lb), sweet potatoes ($0.79/lb), and frozen broccoli (2 for $5) for $47 total.',
 '11111111-1111-1111-1111-111111111110', 'beginner', 'chatgpt-5-4', 'ChatGPT 5.4',
 ARRAY['ChatGPT'], ARRAY['meal prep', 'budget', 'nutrition', 'cooking', 'grocery'],
 'pending', '22222222-2222-2222-2222-222222222204', 0, 0),

('33333333-3333-3333-3333-333333333315',
 'Automated Podcast Show Notes Generator',
 'Built a pipeline that takes a podcast transcript and generates: episode title options, show notes, timestamps, key quotes, and social media clips — all in one prompt.',
 'I produce a weekly business podcast and show notes were taking 2 hours per episode. I built a single prompt that takes the transcript and generates everything I need for publishing.',
 'From a 45-minute transcript, the system generates: 5 title options, 3-paragraph summary, timestamped chapters, 5 key quotes for social media, 3 audiogram clip suggestions, guest bio, related episodes, and SEO show notes. Cut post-production from 2 hours to 15 minutes.',
 '11111111-1111-1111-1111-111111111103', 'beginner', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude', 'Descript'], ARRAY['podcast', 'show notes', 'content repurposing', 'automation'],
 'pending', '22222222-2222-2222-2222-222222222205', 0, 0)

ON CONFLICT (id) DO NOTHING;

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Insert steps for multi-step projects
ALTER TABLE prompt_steps DISABLE ROW LEVEL SECURITY;
DELETE FROM prompt_steps;

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description) VALUES

-- Brand Identity steps
('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', 1,
 'Brand Discovery',
 'I''m starting a specialty bakery in Austin, TX called "Sunrise Bakery" focused on sourdough and pastries. Our target customers are health-conscious millennials who value artisan quality and local sourcing. Our differentiator is that we mill our own flour from Texas-grown wheat. Help me develop a brand foundation: brand personality (5 traits), brand voice description, tagline options (give me 8), and a one-paragraph brand story.',
 'Brand Personality: 1) Warm & Welcoming — like the smell of fresh bread in the morning. 2) Artisan & Authentic — we don''t cut corners, we hand-shape them. 3) Earthy & Grounded — rooted in Texas soil, literally. 4) Playful — we take our craft seriously, but not ourselves. 5) Community-First — your neighborhood living room that smells incredible.

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

Brand Story: Sunrise Bakery was born from a simple question: what if we could taste the difference between bread made from freshly-milled local wheat and everything else on the shelf? We source grain from Texas farms within 200 miles, mill it ourselves each morning, and bake it into sourdough and pastries that taste like bread is supposed to taste.',
 'Define brand personality, voice, and story foundation'),

('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301', 2,
 'Visual Identity System',
 'Based on the brand foundation we just created for Sunrise Bakery (artisan, earthy, warm, community-first), create a complete visual identity system. Include: 1) Primary and secondary color palette with hex codes and reasoning, 2) Typography recommendations (specific Google Fonts), 3) Logo concept description, 4) Photography style guide for social media.',
 'COLOR PALETTE:
Primary: Warm Wheat #D4A843, Deep Crust #3D2B1F
Secondary: Flour Dust #FAF6F0, Sage Field #7C8B6E, Sunrise Coral #E8845C

TYPOGRAPHY:
Headings: "DM Serif Display" — warm, editorial, has bakery character
Body: "Inter" — clean and readable
Accent: "Caveat" — handwritten feel for menu boards and quotes

LOGO CONCEPT: A minimalist rising sun integrated into a wheat stalk. The sun is half-visible on the horizon, with 3 wheat stalks growing upward. "SUNRISE BAKERY" in DM Serif Display below, "Austin, TX" in small caps Inter. Works in single-color and reversed.

PHOTOGRAPHY: Warm natural lighting, hands in frame showing craft, raw ingredients as props, muted earthy tones with Sunrise Coral as an occasional pop, close-up texture shots of bread crust and crumb structure.',
 'Create color palette, typography, logo concept, and photo style'),

('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333301', 3,
 'Brand Guidelines Document',
 'Compile everything into a structured brand guidelines document for Sunrise Bakery. Format it with sections: Brand Overview, Mission & Values, Brand Voice (with do''s and don''ts), Visual Identity, Social Media Guidelines, and how to talk about our milling process without being boring.',
 NULL,
 'Compile everything into a shareable brand guidelines doc'),

-- Review Analyzer steps
('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333304', 1,
 'Build the Analysis Script',
 'I have ~500 customer reviews for my e-commerce store (home office furniture) as a CSV with columns: review_id, date, rating (1-5), review_text, product_name. Write a Python script that reads the CSV, categorizes each review by sentiment and topics (quality, shipping, price, customer service, assembly, comfort), and outputs a summary JSON. Use only standard libraries — keyword matching for the MVP.',
 'Built a 120-line Python script with keyword dictionaries for 6 topic categories and sentiment detection using positive/negative word lists plus rating thresholds. The script reads CSV input, processes each review, and outputs a JSON with: total review count, sentiment breakdown percentages, monthly trend data, and product-level scores with topic frequency. No external dependencies required.',
 'Generate Python script for sentiment analysis and topic categorization'),

('44444444-4444-4444-4444-444444444405', '33333333-3333-3333-3333-333333333304', 2,
 'Weekly Report Generator',
 'Create a script that takes the review_analysis.json and generates a Markdown weekly report. Include: executive summary, sentiment table, product ranking, top issues, top praises, and recommended actions. Make it something I can paste into Slack every Monday.',
 'The report generator produces clean Markdown with: executive summary with emoji health indicator, sentiment breakdown table, product rankings sorted by average rating with star icons, top 3 complaints, top 3 praises, and auto-generated action items. Sample output showed 487 reviews analyzed, 68% positive, top issue was assembly instructions (34% of negative reviews).',
 'Create a Markdown report generator for weekly team updates'),

-- Email Sequence steps
('44444444-4444-4444-4444-444444444406', '33333333-3333-3333-3333-333333333305', 1,
 'Sequence Strategy & Structure',
 'I run a project management SaaS called "FlowDesk" for agencies. 14-day trial. I need a 7-email onboarding sequence. Goal: get users to invite their team and create their first project within 3 days, then convert to paid by day 14. Give me: send schedule, goal per email, subject line options (2 each), and content angle.',
 'Mapped out all 7 emails: Day 0 welcome + first project CTA, Day 1 team invite, Day 3 feature highlight (timeline view), Day 5 customer story (Redline Agency case study), Day 8 objection handling (migration fears), Day 11 urgency (trial ending in 3 days), Day 14 final push with 20% discount. Each email has 2 subject line options and a clear single-goal focus.',
 'Map out the full email sequence strategy and timing'),

('44444444-4444-4444-4444-444444444407', '33333333-3333-3333-3333-333333333305', 2,
 'Full Email Copy',
 'Write the complete email copy for all 7 emails. Use subject line option A from the strategy. Preview text under 60 chars. Body under 150 words each. Tone: friendly, direct, no fluff. Write like a smart friend who works at FlowDesk.',
 'All 7 emails written. Email 1: "Your FlowDesk workspace is ready" — warm welcome with direct link to create first project. Email 2: "FlowDesk works better with your team" — invite CTA with fun stat about team adoption. Emails 3-5 provide value (feature demo, customer proof, migration help). Email 6-7 create urgency with trial countdown and discount offer. Every email is under 150 words with a single CTA button.',
 'Write the full copy for all 7 onboarding emails'),

-- Dashboard steps
('44444444-4444-4444-4444-444444444408', '33333333-3333-3333-3333-333333333306', 1,
 'Architecture & Layout',
 'Build an admin dashboard for a SaaS analytics product. Needs: sidebar nav, top stats cards (MRR, active users, churn rate, NPS), revenue chart (line, 12 months), activity feed, customers table with search and pagination. Use Next.js 14, TypeScript, Tailwind CSS, Recharts. Give me project structure and the layout component with sidebar.',
 NULL,
 'Define architecture and create the layout shell'),

('44444444-4444-4444-4444-444444444409', '33333333-3333-3333-3333-333333333306', 2,
 'Stats Cards & Revenue Chart',
 'Build the main dashboard page with: 4 stats cards (MRR $48,200 +12.5%, Active Users 2,847 +5.3%, Churn 3.2% -0.8%, NPS 72 +4) with sparklines and trend colors. Plus a 12-month revenue line chart using Recharts with data: [32k, 35k, 33k, 38k, 36k, 40k, 42k, 39k, 44k, 45k, 46k, 48.2k]. Responsive.',
 NULL,
 'Build the stats overview and revenue chart components'),

('44444444-4444-4444-4444-444444444410', '33333333-3333-3333-3333-333333333306', 3,
 'Customer Table with Search & Pagination',
 'Add a customers table: search by name/email, sortable columns (Name, Email, Plan, MRR, Status, Joined), pagination (10/page), status badges (active=green, churned=red, trial=yellow). Generate 30 rows of realistic fake data. Full component with state management.',
 NULL,
 'Create searchable, sortable customer data table'),

-- Portfolio steps
('44444444-4444-4444-4444-444444444411', '33333333-3333-3333-3333-333333333307', 1,
 'Core Rebalancer Design',
 'I manage a $200k portfolio with 15 positions (index funds, stocks, bonds, REIT). Design a Google Sheets tool with columns A-J: Ticker, Asset Class, Shares, Cost Basis/Share, Current Price, Market Value, Current %, Target %, Drift, Action. Include all formulas. Action column should suggest specific trades when drift exceeds 2%.',
 'Designed a 10-column spreadsheet with formulas: F=C*E (market value), G=F/F$17 (allocation %), I=G-H (drift), J=IF(ABS(I)>0.02, trade suggestion with exact share counts, "OK"). Summary section calculates total portfolio value, total cost basis, total gain/loss, total return %, and count of positions needing rebalance.',
 'Design the spreadsheet structure with all formulas'),

('44444444-4444-4444-4444-444444444412', '33333333-3333-3333-3333-333333333307', 2,
 'Tax-Loss Harvesting Layer',
 'Add columns K-N: K=Unrealized Gain/Loss, L=Harvest flag (YES if loss >$500, held >30 days), M=Tax Savings Estimate (24% bracket), N=Wash Sale Warning (cross-reference a Transactions sheet for buys in last 30 days). Give me all the formulas.',
 'Added 4 columns with formulas for: unrealized gain/loss per position (K=F-(C*D)), harvest detection using VLOOKUP against transaction dates, tax savings at 24% bracket, and wash sale warnings using COUNTIFS against recent transactions. Summary additions show total harvestable losses, potential tax savings, and wash sale warning count.',
 'Add tax optimization formulas and wash sale detection'),

-- Python Course step
('44444444-4444-4444-4444-444444444413', '33333333-3333-3333-3333-333333333309', 1,
 'Full Curriculum Design',
 'Design an 8-week Python fundamentals course for complete beginners (adult learners, no coding experience). Each week: a theme, 2 lessons, 1 exercise, 1 mini-project, 5-question quiz. Course should end with a real CLI app. Week 1 = "I can do this", Week 8 = "I can''t believe I built that."',
 'Complete 8-week curriculum: Week 1 "Hello Python" (print, variables, input → Mad Libs), Week 2 "Making Decisions" (if/else → Choose Your Own Adventure), Week 3 "Doing Things Again" (loops → Number Guessing Game), Week 4 "Collections" (lists, dicts → Grade Tracker), Week 5 "Building Blocks" (functions → Unit Converter), Week 6 "Working with Files" (file I/O, CSV → Expense Logger), Week 7 "Leveling Up" (modules, APIs → Weather App), Week 8 "The Capstone" (project planning → Personal Finance CLI that combines everything).',
 'Design the complete 8-week course structure')

ON CONFLICT (id) DO NOTHING;

ALTER TABLE prompt_steps ENABLE ROW LEVEL SECURITY;
