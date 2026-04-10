-- PromptForge Seed V3: New projects (prompt-16 through prompt-37)
-- Run this in Supabase SQL Editor AFTER migration-v2.sql

-- ============================================================
-- 1. NEW PROFILES (user-6 through user-10)
-- ============================================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

INSERT INTO profiles (id, username, display_name, bio, role) VALUES
  ('22222222-2222-2222-2222-222222222206', 'ops_nina', 'Nina Kowalski', 'Operations manager at a 50-person agency. Obsessed with removing busywork.', 'user'),
  ('22222222-2222-2222-2222-222222222207', 'dataraj', 'Raj Patel', 'Data analyst turned freelance consultant. I build dashboards and automate reports.', 'user'),
  ('22222222-2222-2222-2222-222222222208', 'emwriter', 'Emily Zhao', 'Freelance content strategist. Former journalist, now I help startups tell their story.', 'user'),
  ('22222222-2222-2222-2222-222222222209', 'cto_derek', 'Derek Lawson', 'CTO at a health-tech startup. 15 years in engineering, now building with AI daily.', 'user'),
  ('22222222-2222-2222-2222-222222222210', 'lena_solopreneur', 'Lena Morales', 'Solopreneur running an Etsy shop and two niche sites. AI is my only employee.', 'user')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. NEW PROMPTS (prompt-16 through prompt-37)
-- ============================================================
ALTER TABLE prompts DISABLE ROW LEVEL SECURITY;

INSERT INTO prompts (id, title, description, content, result_content, category_id, difficulty, model_used, model_recommendation, tools_used, tags, status, author_id, vote_count, bookmark_count, created_at, updated_at) VALUES

-- prompt-16: Weekly Status Report Automator
('33333333-3333-3333-3333-333333333316',
 'Weekly Status Report Automator — From Raw Data to CEO-Ready in 5 Minutes',
 'Built a 3-step prompt system that takes raw data from Harvest, Monday.com, and Slack and compiles a formatted weekly status report. Replaced a 3-hour Friday ritual.',
 'Every Friday I spent 3 hours pulling data from three different tools (Harvest for time tracking, Monday.com for project status, Slack for team updates) and compiling it into a report for our CEO. I built a prompt system where I paste the raw exports and Slack highlights, and it generates the full report in the right format. Three iterations: first I mapped inputs to outputs, then built the master prompt with paste zones, then tested with real data and fixed edge cases where it was including archived projects and writing generic summaries.',
 'The final prompt has three clearly marked paste zones (Harvest CSV, Monday.com CSV, Slack text). It parses everything and outputs: an executive summary that references specific numbers and project names (not generic), a team utilization table with 75% target comparison, project status sorted by risk level (filtered to active only), wins and blockers extracted from Slack, and a "number of the week" highlight. The report comes out under 500 words every time. My Friday reporting went from 3 hours to about 12 minutes (5 min gathering data, 2 min pasting, 5 min reviewing). CEO said the reports actually got better because the AI catches patterns I was missing.',
 '11111111-1111-1111-1111-111111111107', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude', 'Harvest', 'Monday.com', 'Slack'], ARRAY['reporting', 'automation', 'operations', 'weekly report', 'data parsing'],
 'approved', '22222222-2222-2222-2222-222222222206', 118, 82, '2026-04-06T00:00:00Z', '2026-04-06T00:00:00Z'),

-- prompt-17: Meeting Notes to Action Items
('33333333-3333-3333-3333-333333333317',
 'Meeting Notes to Action Items — Never Lose a Follow-Up Again',
 'Built a prompt that takes messy Otter.ai meeting transcripts and extracts decisions, action items with owners, open questions, and a Slack-ready summary. Handles 60-minute transcripts.',
 'I was spending 20 minutes after every meeting pulling out action items from Otter.ai transcripts. The transcripts are messy — people talk over each other, go on tangents, reference previous meetings. I built a two-step system: first it segments the transcript by topic, then extracts structured information from each segment. Also added a "carried over items" feature where I paste last meeting''s action items and it flags what was completed vs still open.',
 'The system outputs: a 3-sentence summary formatted for Slack, a "Decisions Made" section with who decided what, an action items table (owner, deadline, context), and open questions that weren''t resolved. For a 45-minute product team meeting, it correctly extracted 4 decisions, 6 action items, and 3 open questions. The two-pass approach for long meetings (segment by topic first, then extract) catches about 95% of action items vs maybe 70% when I was doing it manually. I run it for every meeting now — takes about 90 seconds per transcript. Team started calling it "the accountability bot" because nothing falls through the cracks anymore.',
 '11111111-1111-1111-1111-111111111107', 'beginner', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude', 'Otter.ai', 'Slack'], ARRAY['meetings', 'action items', 'transcription', 'productivity', 'team management'],
 'approved', '22222222-2222-2222-2222-222222222209', 142, 98, '2026-04-07T00:00:00Z', '2026-04-07T00:00:00Z'),

-- prompt-18: Inbox Zero System
('33333333-3333-3333-3333-333333333318',
 'Inbox Zero System — AI Email Triage That Actually Works',
 'Built a daily email processing workflow using Claude. Paste 10-15 email previews each morning, get them categorized by urgency with specific next actions. Cut my email time from 60 minutes to 15.',
 'I get 120+ emails a day as a freelance consultant. I was spending a full hour every morning just reading and deciding what needed attention. I built a triage system with two prompts: first I defined five categories with specific criteria (Respond Today, Respond This Week, Delegate to VA, Read Later, Ignore), including an approved newsletter list. Then I built a batch processing prompt where I paste email previews and get a sorted, actionable table with priority scores, suggested actions, and estimated response times.',
 'The system processes batches of 10-15 emails and outputs a daily summary ("14 emails: 2 respond today, 4 this week, 3 delegate, 3 read later, 2 ignore") followed by a table with category, priority (1-5), sender, subject, suggested action, and time estimate. The total estimated response time helps me see at a glance if my day is manageable. Best part: the delegate entries include specific instructions for my VA (e.g., "Jamie: slides are in Google Drive / Q1 Workshops / Bloom, send the final PDF"). My morning email routine went from 60 minutes of anxiety to 15 minutes of execution. I''ve been using it daily for 3 weeks straight.',
 '11111111-1111-1111-1111-111111111107', 'beginner', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude', 'Gmail'], ARRAY['email', 'inbox zero', 'triage', 'daily routine', 'productivity'],
 'approved', '22222222-2222-2222-2222-222222222208', 167, 112, '2026-04-07T00:00:00Z', '2026-04-07T00:00:00Z'),

-- prompt-19: Loom Video to SOP
('33333333-3333-3333-3333-333333333319',
 'Loom Video to SOP — Turn Screen Recordings into Training Docs',
 'Converted a messy 15-minute Loom transcript into a clean, numbered SOP with screenshots placeholders, warnings, edge cases, and a troubleshooting FAQ. Now used for all our internal processes.',
 'I was recording Loom videos to train new hires at our agency, but nobody watches 15-minute videos when they need a quick reference. I started taking the Loom transcripts (full of "um", "so basically", and mouse-movement narration) and running them through Claude to generate proper SOP documents. Two prompts: first converts the transcript to a clean numbered procedure, then adds a troubleshooting section based on common questions I''ve gotten from past new hires.',
 'From a 15-minute Loom about processing invoices (QuickBooks + Airtable), the system generated a professional SOP with: prerequisites, 13 numbered steps, 3 warning callouts, 2 edge case notes, estimated completion time (8 minutes per invoice), and a troubleshooting FAQ covering the 5 most common questions. The transcript was 2,400 words of meandering narration; the SOP is 800 words of crisp instructions. I''ve now converted 8 of our core processes this way. New hire onboarding time dropped from 3 days to 1.5 days because they can actually reference these docs instead of re-watching videos.',
 '11111111-1111-1111-1111-111111111107', 'beginner', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude', 'Loom', 'Notion'], ARRAY['SOP', 'documentation', 'training', 'onboarding', 'operations'],
 'approved', '22222222-2222-2222-2222-222222222206', 89, 64, '2026-04-04T00:00:00Z', '2026-04-04T00:00:00Z'),

-- prompt-20: Daily Email Triage System
('33333333-3333-3333-3333-333333333320',
 'Daily Email Triage System with Priority Scoring',
 'Designed a complete email triage framework with 5 categories, VA delegation instructions, and a batch processing prompt. Processes 15 emails in under 2 minutes.',
 'Similar problem to the Inbox Zero project but my approach was different — I focused on building a reusable framework with specific rules for my consulting business. I defined 5 triage categories with exact criteria (what makes something "respond today" vs "this week"), created an approved newsletter list (Lenny''s Newsletter = read later, Morning Brew = ignore), and built the processing prompt with a table output that includes estimated response time per email. The key insight was including VA delegation instructions directly in the output.',
 'The framework document is about 400 words covering exact rules for each category. The batch processing prompt takes emails in a simple format (From / Subject / Preview) and outputs a summary line plus a sortable table. In testing with real emails over 2 weeks: correctly categorized about 92% of emails on the first try. The 8% that were wrong were mostly edge cases like a newsletter from a potential client (should be "respond" not "read later") — I''ve since added rules for those. Average batch of 15 emails processed in about 90 seconds. Total daily email time: down from 50 minutes to about 12 minutes.',
 '11111111-1111-1111-1111-111111111107', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude', 'Gmail', 'Notion'], ARRAY['email management', 'triage system', 'VA delegation', 'daily workflow'],
 'approved', '22222222-2222-2222-2222-222222222210', 73, 48, '2026-04-07T00:00:00Z', '2026-04-07T00:00:00Z'),

-- prompt-21: Client Proposal Generator
('33333333-3333-3333-3333-333333333321',
 'Client Proposal Generator — From Discovery Call to Polished PDF in 30 Minutes',
 'Built a prompt that takes my discovery call notes and generates a complete consulting proposal — scope, timeline, pricing, terms. Generates proposals 5x faster than my old process.',
 'Writing consulting proposals used to take me half a day. I''d procrastinate because it was tedious, which meant slow turnaround, which meant losing deals. I built a single prompt that takes my discovery call notes (I just brain-dump everything the client said) and generates a structured proposal. I gave it my pricing model, my standard terms, and a few examples of past proposals so it matches my voice.',
 'The prompt generates: a 1-paragraph executive summary restating the client''s problem in their own words, a detailed scope section with 3-5 workstreams (each with deliverables and milestones), a suggested timeline (usually 4-8 weeks), three pricing options (good/better/best — I always give options), payment terms, and a "Why Me" section with relevant experience. The output is about 1,500 words and reads like I wrote it, not a bot. My proposal turnaround went from 3-4 days to same-day. Close rate went from 35% to 50% — I think because clients get impressed by the fast turnaround and the quality of the scope breakdown.',
 '11111111-1111-1111-1111-111111111109', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude', 'Google Docs', 'Notion'], ARRAY['proposals', 'consulting', 'sales', 'client management', 'freelance'],
 'approved', '22222222-2222-2222-2222-222222222208', 96, 71, '2026-04-05T00:00:00Z', '2026-04-05T00:00:00Z'),

-- prompt-22: Zapier Lead Processing Workflow
('33333333-3333-3333-3333-333333333322',
 'Zapier Lead Processing Workflow — Designed Entirely with AI',
 'Used Claude to design a 6-step Zapier automation that processes new leads: logs them, sizes the company, sends a personalized email template, creates a HubSpot deal, and schedules follow-up. Saves 75+ minutes daily.',
 'When a lead fills out our Typeform, I was manually copying their info to a Google Sheet, looking up their company, sending a personalized email based on company size, creating a HubSpot deal, and setting a Slack reminder. 15 minutes per lead, 5-8 leads a day. I used Claude to map my manual process step by step, design the Zapier automation, and write the three email templates (small business, mid-market, enterprise). Two prompts total.',
 'The final Zapier automation has 6 steps: Typeform trigger, Google Sheets logging, filter/branching by company size, personalized Gmail send (with a 12-minute delay so it doesn''t feel automated), HubSpot deal creation, and Slack notification with a 3-day follow-up reminder. The three email templates are each under 120 words, warm but professional, with the right CTA for each company size (small = book a call, mid-market = let''s talk, enterprise = let me send a case study). Setup took 45 minutes. I was saving about 90 minutes per day from day one. After 3 weeks, my response time to new leads went from 4-6 hours to under 15 minutes, and my meeting booking rate from inbound leads jumped from 20% to 38%.',
 '11111111-1111-1111-1111-111111111107', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude', 'Zapier', 'Typeform', 'Gmail', 'HubSpot', 'Slack'], ARRAY['automation', 'zapier', 'lead processing', 'CRM', 'workflow'],
 'approved', '22222222-2222-2222-2222-222222222210', 85, 59, '2026-04-05T00:00:00Z', '2026-04-05T00:00:00Z'),

-- prompt-23: Morning Planning Prompt
('33333333-3333-3333-3333-333333333323',
 'Morning Planning Prompt — Energy-Based Time Blocking with AI',
 'Created a daily planning prompt that takes my calendar and to-do list, assigns tasks to time slots based on my energy patterns, and warns me when I''m overcommitted. Use it every morning at 8am.',
 'I was starting every day staring at my to-do list feeling overwhelmed. I built a planning prompt that does the thinking for me. I paste my calendar events and Todoist tasks, and it creates a time-blocked schedule based on my energy patterns (I''m a morning person — peak focus 8-11am). It assigns deep work to mornings, meetings to midday, and admin to afternoons. If I have more than 6 hours of meetings or 8+ tasks, it tells me I''m overcommitted and suggests what to defer.',
 'The output is a clean daily plan with time blocks, tasks assigned to energy-appropriate slots, and overload warnings. Example output: "Today''s Focus: Ship the Q2 roadmap and prep for the TrueNorth check-in." Then a schedule from 8am to 5pm with specific tasks in each block. The best feature is the warning system — last Tuesday it flagged that I had 7 hours of meetings and less than 45 minutes of focus time, and suggested rescheduling my 1:1 with a direct report. It was right. I''ve been using it daily for a month. I feel noticeably less stressed and I''m getting through my to-do list more consistently. The 5 minutes it takes to run the prompt saves me 30+ minutes of decision paralysis.',
 '11111111-1111-1111-1111-111111111107', 'beginner', 'chatgpt-5-4', 'ChatGPT 5.4',
 ARRAY['ChatGPT', 'Google Calendar', 'Todoist'], ARRAY['daily planning', 'time blocking', 'routine', 'focus', 'energy management'],
 'approved', '22222222-2222-2222-2222-222222222209', 203, 145, '2026-04-08T00:00:00Z', '2026-04-08T00:00:00Z'),

-- prompt-24: Job Description Writer
('33333333-3333-3333-3333-333333333324',
 'Job Description Writer — From Hiring Manager Brain Dump to Posted in 20 Minutes',
 'Built a prompt that takes rough hiring notes and produces a complete, bias-conscious job description with role summary, requirements, interview process, and compensation transparency.',
 'As a CTO, I write 3-4 job descriptions a quarter and they always take way too long because I overthink them. I built a prompt where I brain-dump everything — what the role does, who they''d work with, what matters, what doesn''t — and it produces a structured JD. I also added specific instructions to avoid bias-loaded language (no "rockstar", "ninja", or unnecessarily gendered phrases) and to distinguish true requirements from nice-to-haves.',
 'The output includes: a 2-sentence role hook (not the boring "we''re looking for a..." opening), a "What You''ll Actually Do" section with 5-6 bullet points of real day-to-day work (not vague responsibilities), "What You Bring" split into Requirements (3-4 hard requirements) and "Bonus Points" (nice-to-haves clearly labeled), "What We Offer" (comp range, benefits, growth), the interview process (4 steps with timeline), and a team description. Tested it on a Senior Backend Engineer JD — went from brain dump to polished posting in 18 minutes. Our recruiter said the applications were higher quality because the JD was more specific about what the job actually looks like day-to-day. Used it for 5 roles since, all filled within 4 weeks.',
 '11111111-1111-1111-1111-111111111107', 'beginner', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude', 'Greenhouse'], ARRAY['hiring', 'job description', 'HR', 'recruiting', 'team building'],
 'approved', '22222222-2222-2222-2222-222222222209', 77, 52, '2026-04-06T00:00:00Z', '2026-04-06T00:00:00Z'),

-- prompt-25: Notion Workspace Architecture
('33333333-3333-3333-3333-333333333325',
 'Notion Workspace Architecture — From 400-Page Chaos to 5-Database Clarity',
 'Redesigned my entire Notion workspace from scratch. Went from 15 overlapping databases and 400 unorganized pages to a clean 5-database system with a dashboard, templates, and a migration plan.',
 'My Notion had become a graveyard of abandoned databases and unsearchable pages. I used it for project management, CRM, content planning, knowledge management, and meeting notes — but nothing was connected and I couldn''t find anything. I used Claude to design a completely new architecture (not patching the old one) and then create a step-by-step migration plan so I wouldn''t lose any data during the transition.',
 'The new architecture has 5 core databases (down from 15): Projects, CRM, Meeting Notes, Newsletter, and Notes. Each has carefully designed properties and multiple views for different contexts. The dashboard page shows today''s meetings, active projects, pipeline status, newsletter progress, and a quick-capture button. The migration plan covered what to build first (the CRM, because everything relates to it), how to merge overlapping databases, and a checklist for each step with time estimates. Also got templates for: new client project kickoff, meeting notes, newsletter draft, and a weekly review. Total migration took about 6 hours over a weekend. I''ve been running on the new system for 5 weeks and I can actually find things now. My weekly review on Fridays takes 15 minutes instead of 45.',
 '11111111-1111-1111-1111-111111111107', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude', 'Notion'], ARRAY['notion', 'workspace design', 'organization', 'databases', 'knowledge management'],
 'approved', '22222222-2222-2222-2222-222222222208', 156, 109, '2026-04-03T00:00:00Z', '2026-04-03T00:00:00Z'),

-- prompt-26: Weekly Review Template
('33333333-3333-3333-3333-333333333326',
 'Weekly Review Template — The 30-Minute Friday Ritual That Changed My Output',
 'Designed a structured weekly review prompt that looks at what I accomplished, what slipped, what I learned, and what next week should focus on. Runs every Friday at 4pm.',
 'I was ending every week without any sense of what I actually accomplished or what needed to carry forward. I''d start Monday with a vague sense of dread instead of a clear plan. I built a weekly review prompt that I run every Friday afternoon. I paste in my completed tasks from Todoist, my calendar summary, and any notes from the week, and it gives me a structured reflection plus next week''s top 3 priorities.',
 'The review output has 5 sections: Wins (what I shipped or completed, pulled from the task list), Misses (what was planned but didn''t happen, with a brief "why" for each), Insights (patterns or lessons from the week — the AI is surprisingly good at spotting these), Energy Check (which activities gave me energy vs drained me, based on my calendar), and Next Week''s Focus (3 concrete priorities based on what''s in progress and what slipped). The energy check section was an unexpected gem — after 6 weeks of data, I noticed all my "draining" activities were 1:1s scheduled before 10am. Moved them all to afternoons and my mornings got dramatically more productive. The whole review takes about 30 minutes including the reflection time.',
 '11111111-1111-1111-1111-111111111107', 'beginner', 'chatgpt-5-4', 'ChatGPT 5.4',
 ARRAY['ChatGPT', 'Todoist', 'Google Calendar'], ARRAY['weekly review', 'reflection', 'planning', 'habits', 'personal productivity'],
 'approved', '22222222-2222-2222-2222-222222222210', 131, 88, '2026-04-08T00:00:00Z', '2026-04-08T00:00:00Z'),

-- prompt-27: Slack Channel Summarizer
('33333333-3333-3333-3333-333333333327',
 'Slack Channel Summarizer — Never Miss What Happened While You Were Focused',
 'Built a prompt that takes a day''s worth of Slack messages from a busy channel and produces a 2-minute summary with key decisions, requests, and things that need your attention.',
 'I''m in 14 Slack channels and my team''s main channel gets 200+ messages per day. When I''m in focus mode or back from PTO, I was spending 30-40 minutes scrolling through catching up. I built a prompt that I paste a channel''s daily messages into and get back a structured summary. The trick was teaching it to distinguish signal from noise — reactions to memes are not important, but a thread where someone made a decision that affects the project is.',
 'The summary output has 4 sections: Decisions Made (things that were agreed upon and affect the team), Action Items That Mention You (tagged requests or assignments), Key Updates (project status changes, launches, incidents), and Skip Zone (things that happened but you don''t need to act on, listed as one-liners so you know you didn''t miss them). For a 200-message day in our #engineering channel, the summary is usually 15-20 lines. The "Skip Zone" is the underrated feature — it gives you confidence that you didn''t miss something important without having to read everything. I use it every day after lunch and after my morning focus block. Team adopted it too — 4 other people now run the same prompt for their own catch-up.',
 '11111111-1111-1111-1111-111111111107', 'beginner', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude', 'Slack'], ARRAY['slack', 'summarization', 'team communication', 'catch-up', 'async work'],
 'approved', '22222222-2222-2222-2222-222222222209', 178, 121, '2026-04-09T00:00:00Z', '2026-04-09T00:00:00Z'),

-- prompt-28: Personal CRM
('33333333-3333-3333-3333-333333333328',
 'Personal CRM — Track Relationships Without a Sales Tool',
 'Designed a lightweight personal CRM in Google Sheets with AI-assisted relationship summaries. Tracks 150+ professional contacts with last-touch dates, context notes, and follow-up nudges.',
 'I''m a freelance consultant and relationships are my business. But I kept dropping the ball — forgetting to follow up with people I''d met at conferences, losing track of who introduced me to whom, not remembering what we talked about last time. I didn''t want a heavy CRM tool, so I used Claude to design a Google Sheets-based personal CRM with smart follow-up rules. Then I built a prompt that takes my meeting notes and generates the contact entry automatically.',
 'The CRM sheet has columns for: Name, Company, Role, How We Met, Last Contact Date, Relationship Strength (1-5), Tags (client/prospect/mentor/peer/friend), Context Notes, and Next Action. A separate "Interactions" sheet logs every touchpoint. The smart follow-up formulas flag contacts where: Relationship Strength >= 3 and Last Contact > 30 days ago (shows "RECONNECT"), someone referred you business and you haven''t thanked them (shows "SEND THANKS"), or you promised a follow-up and it''s been > 7 days (shows "OVERDUE"). The AI prompt for adding contacts takes my brain-dump notes ("Met Lisa at SaaStr, she runs product at Stripe, talked about platform pricing, she might need a consultant for their SMB tier launch in Q3") and outputs a formatted row ready to paste. Currently tracking 153 contacts. I''ve reconnected with 12 people I would have lost touch with entirely.',
 '11111111-1111-1111-1111-111111111107', 'intermediate', 'chatgpt-5-4', 'ChatGPT 5.4',
 ARRAY['ChatGPT', 'Google Sheets'], ARRAY['CRM', 'networking', 'relationships', 'freelance', 'follow-up'],
 'approved', '22222222-2222-2222-2222-222222222208', 94, 67, '2026-04-04T00:00:00Z', '2026-04-04T00:00:00Z'),

-- prompt-29: Freelance Contract Clause Library
('33333333-3333-3333-3333-333333333329',
 'Freelance Contract Clause Library — 3 Versions of Every Key Clause',
 'Built a reusable library of contract clauses in plain English: payment terms, IP, termination, liability, and more. Each clause has client-friendly, balanced, and consultant-friendly versions.',
 'After 23 consulting contracts over 3 years, I was still negotiating each one from scratch because I could never find my old clauses. I dumped all 23 contracts into a spreadsheet, identified the 8 key clause areas I always negotiate, and used Claude to write standardized versions at three protection levels: client-friendly (when I want the deal and they have leverage), balanced (my default), and consultant-friendly (when I have leverage or it''s a risky engagement).',
 'The library covers 8 clause areas with 3 versions each (24 total clauses): Payment Terms (Net 45/Net 30 with deposit/Net 15 with 50% upfront), Late Payment (no penalty/1.5% monthly + pause/2% monthly + work stoppage + lien), Termination (7-day notice/14-day with deposit retention/30-day with kill fee), IP Assignment (full transfer/transfer with portfolio rights/license-only), Confidentiality, Limitation of Liability, Non-Solicitation, and Scope Change Process. All written in plain English — no "whereas" or "hereinafter." I keep it as a Notion database and pull the appropriate version when drafting a new contract. Building a new contract went from 2 hours to 20 minutes. My lawyer reviewed the whole library and said it was "surprisingly solid for something AI-generated" — she suggested a few tweaks to the liability clauses which I incorporated.',
 '11111111-1111-1111-1111-111111111109', 'advanced', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude', 'Notion'], ARRAY['contracts', 'legal', 'freelance', 'consulting', 'negotiation'],
 'approved', '22222222-2222-2222-2222-222222222208', 64, 43, '2026-04-02T00:00:00Z', '2026-04-02T00:00:00Z'),

-- prompt-30: Quarterly Business Review Deck
('33333333-3333-3333-3333-333333333330',
 'Quarterly Business Review Deck — Data to Slides in One Prompt',
 'Built a prompt that takes raw quarterly metrics and generates a complete QBR presentation outline with executive summary, charts to create, talking points, and risk callouts.',
 'I prepare QBR decks for my 4 clients every quarter. Each one used to take a full day — pulling data, figuring out the story, writing slide copy. I built a prompt where I paste the quarter''s key metrics (revenue, usage, support tickets, NPS, churn) along with the previous quarter''s numbers, and it generates a complete deck outline with the narrative already threaded through.',
 'The output includes: a 3-slide executive summary (quarter headline, key wins, areas of concern), a recommended slide order (10-12 slides), specific chart suggestions for each data point ("use a waterfall chart for the MRR bridge showing new, expansion, contraction, and churn"), talking points per slide (what to say, not just what to show), a "Risks & Mitigation" slide with red/yellow/green status, and a "Next Quarter Priorities" slide with 3 recommended focus areas based on the data. For my SaaS client: their QBR showed 12% MRR growth but the prompt flagged that logo retention was declining even though net retention was healthy — something I probably would have glossed over. The client''s VP of Customer Success said it was the most insightful QBR they''d seen from a consultant.',
 '11111111-1111-1111-1111-111111111108', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude', 'Google Slides', 'Google Sheets'], ARRAY['QBR', 'presentations', 'data analysis', 'consulting', 'quarterly review'],
 'approved', '22222222-2222-2222-2222-222222222207', 72, 49, '2026-04-06T00:00:00Z', '2026-04-06T00:00:00Z'),

-- prompt-31: API Documentation Generator
('33333333-3333-3333-3333-333333333331',
 'API Documentation Generator — From Codebase to Developer Docs',
 'Built a system where I paste my Express.js route files and it generates complete API documentation: endpoints, parameters, request/response examples, error codes, and rate limits.',
 'Our API had grown to 40+ endpoints but the documentation was 6 months out of date. Writing docs manually is soul-crushing, so I built a prompt where I paste a route file and get back structured documentation. The key was having it generate realistic request/response examples, not just schema definitions. I also had it infer error scenarios from the validation middleware.',
 'For a 200-line routes file with 8 endpoints, the prompt generated: endpoint description, HTTP method and URL, authentication requirements (inferred from middleware), request parameters (path, query, body) with types and validation rules, 2-3 request examples with realistic data, success response with example, 3-4 error responses (400 validation, 401 auth, 404 not found, 429 rate limit) with example payloads, and rate limiting notes. The output is in Markdown that I paste directly into our docs site (Docusaurus). Documented all 40 endpoints in about 5 hours instead of the 3 weeks it would have taken manually. Our developer NPS on API docs went from -20 (yes, negative) to +45 after the update.',
 '11111111-1111-1111-1111-111111111104', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude', 'VS Code', 'Docusaurus'], ARRAY['API', 'documentation', 'Express.js', 'developer experience', 'backend'],
 'approved', '22222222-2222-2222-2222-222222222201', 87, 55, '2026-04-07T00:00:00Z', '2026-04-07T00:00:00Z'),

-- prompt-32: Newsletter Pipeline
('33333333-3333-3333-3333-333333333332',
 'Newsletter Pipeline — From Idea to Published in 90 Minutes',
 'Created a 3-prompt pipeline for writing my weekly newsletter: brainstorm angles from a topic, write the full draft in my voice, then generate the email subject and social promotion.',
 'I write a weekly newsletter about product strategy (2,100 subscribers). The writing itself takes me 3-4 hours and I dread it every week. I built a pipeline where I feed in a raw topic and my rough thoughts, and get back a nearly-finished draft. The key was spending time upfront calibrating my voice — I pasted 5 of my best past newsletters and had Claude analyze my style patterns.',
 'The pipeline has 3 prompts: (1) Angle Generator — I give a topic and get 5 angles with a hook and thesis for each, then pick one. (2) Draft Writer — Takes the angle and my rough notes and writes the full newsletter (800-1,200 words) in my voice. The voice calibration prompt identified my style as "conversational authority with strategic metaphors and one contrarian take per piece." (3) Promotion Generator — Takes the draft and produces: 3 email subject lines, a 280-char tweet thread hook, and a LinkedIn post. My writing time went from 3.5 hours to about 90 minutes (30 min prep + rough notes, 5 min prompt pipeline, 55 min editing and adding personal touches). Open rate stayed steady at 42%, meaning readers can''t tell the difference. The editing phase is where I add my personality — the AI gets the structure and logic right, I add the flavor.',
 '11111111-1111-1111-1111-111111111103', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude', 'ConvertKit', 'Notion'], ARRAY['newsletter', 'writing', 'content creation', 'personal brand', 'email'],
 'approved', '22222222-2222-2222-2222-222222222208', 108, 76, '2026-04-08T00:00:00Z', '2026-04-08T00:00:00Z'),

-- prompt-33: Spreadsheet Audit Bot
('33333333-3333-3333-3333-333333333333',
 'Spreadsheet Audit Bot — Find Broken Formulas Before the Board Does',
 'Built a system to audit Google Sheets for broken formulas, hardcoded values, inconsistent patterns, and cross-sheet reference issues. Includes an Apps Script exporter and an AI audit prompt.',
 'We have 12 Google Sheets that drive all our company reporting — headcount, revenue, expenses, forecasts. Every quarter someone breaks a formula or changes a cell format and we don''t catch it until the board report looks wrong. I used Grok to build a two-part system: an Apps Script that exports all formulas from a sheet as JSON, and a prompt that audits the JSON for 18 different types of issues across 7 categories.',
 'The audit system checks for: error values (#REF!, #N/A, #VALUE!, #DIV/0!), hardcoded numbers where formulas should be, inconsistent formula patterns in columns, circular references, broken cross-sheet references, mixed data types, empty rows in data ranges, merged cells, and stale date references. Each finding gets a severity rating (Critical / Warning / Info) with specific cell references and fix suggestions. First run on our revenue sheet caught 3 critical issues: a #REF! error in a cell that fed into the board deck total, a hardcoded $48K where a SUM formula should have been (someone pasted over it 2 months ago), and 2 cells referencing a "Q4 Forecast" sheet that had been renamed to "Q4 Forecast v2." The Apps Script exporter is 42 lines and runs on any Google Sheet in about 10 seconds.',
 '11111111-1111-1111-1111-111111111107', 'advanced', 'grok-3', 'Grok 3',
 ARRAY['Grok', 'Google Sheets', 'Google Apps Script'], ARRAY['spreadsheet', 'audit', 'data quality', 'formulas', 'reporting'],
 'approved', '22222222-2222-2222-2222-222222222207', 68, 41, '2026-04-01T00:00:00Z', '2026-04-01T00:00:00Z'),

-- prompt-34: Standup Bot
('33333333-3333-3333-3333-333333333334',
 'Standup Bot — Async Standup Summaries From Slack Threads',
 'Built a prompt that reads our async Slack standup thread and creates a team summary with blockers, capacity warnings, and cross-team dependencies. Product manager calls it "indispensable."',
 'Our remote team does async standups in a Slack thread every morning. The problem: nobody reads everyone else''s updates, blockers get buried, and cross-dependencies go unnoticed. I built a prompt that I paste the full standup thread into at 10am, and it generates a structured team summary that goes into #team-updates. Now everyone reads the 30-second summary instead of scrolling through 12 individual updates.',
 'The summary output has 5 sections: Shipping Today (things that are getting deployed or delivered), In Progress (what''s actively being worked on), Blocked (with what''s blocking and a suggested unblock action), Capacity Check (flags if anyone mentioned being overloaded or has too many things in progress), and Dependencies (when someone''s work depends on another team member''s output — these are the ones that always slip). For a 12-person eng team, the standup thread is usually 2,500-3,000 words of individual updates. The summary is about 300 words. Our PM said she catches 2-3 dependency conflicts per week that she would have missed before. The blocked items section alone has probably saved us from at least 4 missed deadlines in the last month.',
 '11111111-1111-1111-1111-111111111107', 'beginner', 'claude-sonnet-4-6', 'Claude 4.6 Sonnet',
 ARRAY['Claude', 'Slack'], ARRAY['standup', 'team management', 'async', 'slack', 'remote work'],
 'approved', '22222222-2222-2222-2222-222222222209', 149, 97, '2026-04-09T00:00:00Z', '2026-04-09T00:00:00Z'),

-- prompt-35: Expense Report Automation
('33333333-3333-3333-3333-333333333335',
 'Expense Report Automation — Receipt Photo to Categorized Spreadsheet',
 'Built a workflow where I describe my receipts and expenses, and the AI categorizes them, flags policy violations, and generates a formatted expense report ready for accounting.',
 'I travel 2-3 times a month for client work and expense reports were my most-hated task. I''d procrastinate for weeks, then spend 2 hours sorting receipts and categorizing everything. I built a prompt where I just list out my expenses in plain English ("$47 uber to client office Monday, $23 lunch with Sarah from Meridian, $189 hotel Tuesday night") and it generates a formatted expense report with categories, policy compliance checks, and totals.',
 'The prompt takes my brain-dump list of expenses and outputs: a formatted table with Date, Description, Category (Travel, Meals, Lodging, Office, Client Entertainment), Amount, and Policy Status. It knows our expense policy rules: meals capped at $75/person, flights must be economy for trips under 6 hours, hotel per-diem is $200/night, Uber/Lyft preferred over rental cars for trips under 3 days. Any expense that exceeds a policy limit gets flagged with a note ("$95 dinner — exceeds $75 meal cap, needs manager approval"). The totals section breaks down by category and by client (for client-billable expenses). My expense reports now take about 10 minutes instead of 2 hours. Accounting said the reports are actually more accurate because the AI catches category mistakes I used to make (like putting client lunches under "Meals" instead of "Client Entertainment").',
 '11111111-1111-1111-1111-111111111101', 'beginner', 'chatgpt-5-4', 'ChatGPT 5.4',
 ARRAY['ChatGPT', 'Google Sheets'], ARRAY['expenses', 'finance', 'travel', 'automation', 'accounting'],
 'approved', '22222222-2222-2222-2222-222222222206', 83, 56, '2026-04-03T00:00:00Z', '2026-04-03T00:00:00Z'),

-- prompt-36: AI Interview Prep (PENDING)
('33333333-3333-3333-3333-333333333336',
 'AI-Powered Interview Prep System — Custom Questions Based on Job Description',
 'Built a prompt that takes a job description and my resume, generates 15 tailored interview questions with STAR-format answer frameworks, and runs a mock interview with feedback.',
 'I was interviewing for a Staff Engineer role and wanted to practice with realistic questions, not generic "tell me about yourself" stuff. I built a prompt that analyzes the job description, identifies the key competencies they''re testing for, cross-references with my resume to find relevant experience, and generates targeted questions with coaching on how to structure my answers.',
 'From a Staff Engineer JD at a fintech company, the prompt generated 15 questions across 4 categories: Technical Architecture (5), Leadership & Influence (4), System Design (3), and Behavioral (3). Each question came with: why the interviewer is asking it, which competency it tests, a STAR framework outline using a specific experience from my resume, and 2 things to avoid saying. The mock interview mode asks questions one at a time and gives feedback on my answers (too long, not enough specifics, missed the leadership angle, etc.). I ran through the full prep in about 3 hours over 2 evenings. Got an offer with "strongest behavioral interview we''ve seen this cycle" feedback from the hiring manager.',
 '11111111-1111-1111-1111-111111111107', 'intermediate', 'claude-opus-4-6', 'Claude 4.6 Opus',
 ARRAY['Claude'], ARRAY['interview prep', 'career', 'job search', 'practice', 'STAR method'],
 'pending', '22222222-2222-2222-2222-222222222201', 0, 0, '2026-04-10T00:00:00Z', '2026-04-10T00:00:00Z'),

-- prompt-37: Etsy Listing Optimizer (PENDING)
('33333333-3333-3333-3333-333333333337',
 'Etsy Listing Optimizer — SEO-Driven Titles, Tags, and Descriptions',
 'Built a prompt system that takes my handmade product details and generates Etsy-optimized listings with keyword-rich titles, all 13 tags, and conversion-focused descriptions. Sales up 34%.',
 'I sell handmade ceramics on Etsy and my listings were terrible — short descriptions, generic titles, maybe 5 tags out of the allowed 13. I built a prompt that takes my product details (what it is, materials, dimensions, who it''s for) and generates a complete optimized listing. I also had it research Etsy SEO best practices and build those rules into the prompt.',
 'For each product, the prompt generates: an SEO-optimized title using the full 140-character limit (front-loaded with primary keyword, includes material, style, and use case), all 13 tags (mix of broad and long-tail, no repeated words across tags per Etsy guidelines), a 4-paragraph description (hook, details, story/care instructions, shipping info), and 3 occasion suggestions for the "perfect gift for" angle. Tested on 20 listings over 6 weeks: views up 52%, favorites up 28%, and actual sales up 34% compared to the same products with my old listings. The biggest win was the tags — I didn''t know you shouldn''t repeat words across tags, and the AI generated tag combinations that covered way more search terms than I was capturing before.',
 '11111111-1111-1111-1111-111111111102', 'beginner', 'chatgpt-5-4', 'ChatGPT 5.4',
 ARRAY['ChatGPT', 'Etsy'], ARRAY['etsy', 'SEO', 'e-commerce', 'handmade', 'product listing'],
 'pending', '22222222-2222-2222-2222-222222222210', 0, 0, '2026-04-10T00:00:00Z', '2026-04-10T00:00:00Z')

ON CONFLICT (id) DO NOTHING;

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. NEW PROMPT STEPS (for prompt-16 through prompt-37)
-- ============================================================
ALTER TABLE prompt_steps DISABLE ROW LEVEL SECURITY;

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, result_content, description, created_at) VALUES

-- === Weekly Report Automator (prompt-16) — 3 steps ===
('44444444-4444-4444-4444-444444444414', '33333333-3333-3333-3333-333333333316', 1,
 'Identify Report Inputs and Structure',
 'I''m an operations manager at a digital agency with 50 people. Every Friday I spend 3 hours compiling a weekly status report from: Slack channel updates, Harvest time tracking exports (CSV), and a Monday.com board export (CSV). The final report goes to our CEO and has sections for: Team Utilization (billable vs non-billable hours), Active Project Status (on track / at risk / behind), Wins of the Week, and Blockers. Design a system where I paste raw data into a prompt and get back the formatted report. Start by mapping the inputs to outputs.',
 'INPUT / OUTPUT MAPPING:

Source 1: Harvest CSV (columns: person, project, client, hours, billable?)
-> Output: Team Utilization table (per-person billable %, team avg, comparison to 75% target)
-> Output: Project hours breakdown (which projects consumed the most time)

Source 2: Monday.com CSV (columns: project, status, owner, due_date, notes)
-> Output: Active Projects table (project name, status badge, owner, days until due, risk flag)
-> Output: At-Risk callout section (any project with status "stuck" or due in <5 days)

Source 3: Slack highlights (pasted text, unstructured)
-> Output: "Wins" section (3-5 bullet points, extracted and cleaned up)
-> Output: "Blockers" section (anything flagged as blocked or waiting)

FORMAT:
1. One-paragraph executive summary (2-3 sentences, tone: confident but honest)
2. Team Utilization table with color indicators
3. Active Projects table sorted by risk level
4. Wins (bulleted)
5. Blockers + Suggested Actions
6. Key number of the week (one standout metric)',
 'Map data sources to report sections', '2026-04-06T00:00:00Z'),

('44444444-4444-4444-4444-444444444415', '33333333-3333-3333-3333-333333333316', 2,
 'Build the Master Prompt',
 'Now write me the actual prompt I''ll use every Friday. It should have three clearly marked paste zones where I drop in the raw data. The prompt should: parse the Harvest CSV into utilization stats, parse the Monday.com CSV into project status, extract wins and blockers from the Slack text, then compile everything into the report format we designed. Include instructions for tone (professional but not boring) and length (under 500 words total).',
 'WEEKLY STATUS REPORT GENERATOR

---BEGIN PROMPT---

You are an operations reporting assistant. I''m going to give you three data sources. Parse them and compile a weekly status report for our CEO.

## DATA SOURCE 1 -- TIME TRACKING (Harvest CSV)
```
[PASTE HARVEST CSV HERE]
```

From this data:
- Calculate each person''s billable percentage (billable hours / total hours)
- Calculate team average billable %
- Flag anyone below 60% utilization
- Note the top 3 projects by hours consumed

## DATA SOURCE 2 -- PROJECT BOARD (Monday.com CSV)
```
[PASTE MONDAY.COM CSV HERE]
```

From this data:
- List all active projects with their status and owner
- Flag at-risk projects: status is "stuck" OR due date is within 5 business days
- Sort by risk level (at-risk first, then on-track)

## DATA SOURCE 3 -- TEAM UPDATES (Slack)
```
[PASTE SLACK HIGHLIGHTS HERE]
```

From this text:
- Extract 3-5 wins (completed milestones, positive client feedback, shipped work)
- Extract any blockers or dependencies waiting on external parties
- Suggest a concrete next step for each blocker

## OUTPUT FORMAT

Write the report in this exact structure. Keep total length under 500 words. Tone: professional, direct, like a sharp operator who respects the reader''s time.

1. **Executive Summary** (2-3 sentences)
2. **Team Utilization** (table: Name | Billable % | Status)
3. **Project Status** (table: Project | Status | Owner | Due | Risk)
4. **Wins This Week** (3-5 bullets)
5. **Blockers & Actions** (each blocker with a suggested action)
6. **Number of the Week** (one standout metric with brief context)

---END PROMPT---',
 'Create the reusable master prompt with paste zones', '2026-04-06T00:00:00Z'),

('44444444-4444-4444-4444-444444444416', '33333333-3333-3333-3333-333333333316', 3,
 'Test with Real Data and Iterate',
 'I just ran the prompt with last Friday''s real data. The utilization section is great but the project status section is listing archived projects from the CSV. Also the executive summary is too generic — it reads like a template, not like it actually analyzed the data. Fix the prompt to: 1) filter out projects with status "done" or "archived", 2) make the executive summary reference specific numbers and project names, 3) add a week-over-week comparison note for utilization (I''ll paste last week''s numbers too).',
 NULL,
 'Iterate on the prompt based on real-world test results', '2026-04-06T00:00:00Z'),

-- === Meeting Notes to Action Items (prompt-17) — 2 steps ===
('44444444-4444-4444-4444-444444444417', '33333333-3333-3333-3333-333333333317', 1,
 'Define the Extraction Framework',
 'I record all my meetings with Otter.ai and get a transcript. But I still spend 20 minutes after each meeting manually pulling out action items, decisions made, and follow-ups. Build me a prompt that takes a raw meeting transcript and extracts: 1) Decisions made (with who made them), 2) Action items (with owner and deadline if mentioned), 3) Open questions that weren''t resolved, 4) A 3-sentence summary I can paste into Slack. The transcript is usually messy — people talk over each other, go on tangents, circle back to topics.',
 'MEETING INTELLIGENCE EXTRACTOR

Output:

## Summary (for Slack)
The product team met to discuss Q2 roadmap priorities. Three features were greenlit for the April sprint: SSO integration, bulk CSV import, and the redesigned onboarding flow. The team agreed to push the mobile app to Q3 pending the new hire starting.

## Decisions Made
1. **SSO integration moves to April sprint** — decided by Sarah, approved by Derek
2. **Mobile app pushed to Q3** — decided by full team, contingent on hiring timeline
3. **Design review cadence changing to bi-weekly** — proposed by Priya, no objections

## Action Items
| # | Action | Owner | Deadline | Context |
|---|--------|-------|----------|---------|
| 1 | Write SSO technical spec | Derek | April 14 | Needs to cover SAML and OIDC |
| 2 | Share updated Q2 roadmap | Sarah | April 11 | Include the reprioritized backlog |
| 3 | Schedule design review for onboarding mocks | Priya | April 12 | Book 90 min, include eng leads |
| 4 | Send mobile app job posting to recruiting | Marcus | EOW | Derek to review JD first |

## Open Questions
- Who owns the SSO vendor evaluation? Derek said "probably me" but didn''t commit
- Budget for the Q3 mobile app contractor — needs finance input
- Whether to keep the old onboarding flow as a fallback during rollout',
 'Design the extraction framework and output format', '2026-04-07T00:00:00Z'),

('44444444-4444-4444-4444-444444444418', '33333333-3333-3333-3333-333333333317', 2,
 'Handle Edge Cases and Multi-Meeting Context',
 'Two problems: 1) When a transcript is really long (60+ minutes), the action items get buried and some get missed. Break it into a two-pass approach: first pass identifies segments by topic, second pass extracts items from each segment. 2) Some action items reference previous meetings ("remember we said we''d do X last week"). Add a section for "Carried Over Items" where I can optionally paste last meeting''s action items so it can flag what was completed and what''s still open.',
 NULL,
 'Handle long transcripts and cross-meeting tracking', '2026-04-07T00:00:00Z'),

-- === Loom Video to SOP (prompt-19) — 2 steps ===
('44444444-4444-4444-4444-444444444419', '33333333-3333-3333-3333-333333333319', 1,
 'Transcript to Raw SOP',
 'I recorded a 15-minute Loom video showing our new hire how to process a client invoice in our system (QuickBooks + a custom Airtable tracker). The transcript from Loom is messy — lots of "um", "so basically", "let me go back", and narration of mouse movements ("I''ll click here, then scroll down to..."). Take this transcript and turn it into a clean, numbered SOP document. Remove all filler. Convert mouse-movement narration into clear action steps. Add notes where I mentioned warnings or edge cases.',
 '# SOP: Processing Client Invoices
**Last Updated:** April 2026 | **Owner:** Nina K. | **Est. Time:** 8 minutes per invoice

## Prerequisites
- Access to QuickBooks Online (Accountant role or higher)
- Access to the "Invoice Tracker" Airtable base
- Client''s signed SOW with approved rate card

## Steps

### 1. Create the Invoice in QuickBooks
1. Navigate to **Sales -> Invoices -> Create Invoice**
2. Select the client from the dropdown (search by company name, not contact name)
3. Set the invoice date to the last day of the billing period
4. Set payment terms to **Net 30** (unless the SOW specifies otherwise)

> **Warning:** Do NOT use "Net 15" for enterprise clients even if they request it. All enterprise contracts are Net 30 per our finance policy.

### 2. Add Line Items
5. For each deliverable, add a line item with:
   - Description: [Project Name] -- [Deliverable Name] -- [Date Range]
   - Rate: Pull from the rate card in the SOW
   - Quantity: Hours from the approved timesheet
6. If there are reimbursable expenses, add them as a separate line item with "Reimbursable:" prefix

> **Edge Case:** If the project has a fixed-fee component AND hourly work, create two sections separated by a subtotal.

### 3. Review and Send
7. Double-check the total against the Airtable estimate (should be within 5%)
8. Add the client''s AP email in the "Send to" field (found in Airtable -> Clients -> AP Contact)
9. Click **Save and Send**
10. Download a PDF copy

### 4. Update the Tracker
11. Open the Invoice Tracker in Airtable
12. Find the project row and update: Invoice Number, Invoice Amount, Date Sent, Status -> "Sent"
13. Attach the PDF to the row

## Common Mistakes
- Using the contact name instead of company name in QuickBooks (causes duplicate records)
- Forgetting to attach the PDF in Airtable (finance needs it for reconciliation)
- Sending to the project manager instead of the AP email',
 'Convert messy Loom transcript into clean numbered SOP', '2026-04-04T00:00:00Z'),

('44444444-4444-4444-4444-444444444420', '33333333-3333-3333-3333-333333333319', 2,
 'Add Troubleshooting and FAQ',
 'The SOP is great but our new hires always have the same 5 questions. Add a troubleshooting section based on these real situations: 1) "The client isn''t showing up in QuickBooks" — they need to be created first, here''s how. 2) "The hours on the timesheet don''t match what the PM approved" — always go with the PM-approved number and flag the discrepancy. 3) "The client wants us to use their invoice template" — we don''t do that, here''s the polite response. 4) "I sent the invoice to the wrong email" — how to void and resend. 5) "The project has multiple billing contacts" — how to handle split invoices.',
 NULL,
 'Add FAQ and troubleshooting based on real questions', '2026-04-04T00:00:00Z'),

-- === Daily Email Triage System (prompt-20) — 2 steps ===
('44444444-4444-4444-4444-444444444421', '33333333-3333-3333-3333-333333333320', 1,
 'Design the Triage Categories',
 'I get 120+ emails a day as a freelance consultant. I waste an hour every morning just deciding what needs a response. Design an email triage system I can use with Claude. I''ll paste batches of 10-15 email subject lines and senders, and I need them categorized into: Respond Today (client work, time-sensitive), Respond This Week (important but not urgent), Delegate (forward to my VA with instructions), Read Later (newsletters, industry updates I actually want to read), and Ignore (marketing, spam that got through, notifications I don''t need). Also assign a priority score 1-5.',
 'EMAIL TRIAGE SYSTEM -- CATEGORY DEFINITIONS

RESPOND TODAY (Priority 1-2)
Criteria: Direct client emails about active projects, invoicing questions, meeting requests for this week, anything with "urgent" or deadline language from known contacts
Examples: "Re: Q2 Strategy Deck -- feedback by EOD", "Invoice #4521 -- quick question"

RESPOND THIS WEEK (Priority 3)
Criteria: New business inquiries, non-urgent client requests, collaboration proposals, follow-ups you owe someone
Examples: "Loved your talk -- would you consider a workshop for our team?", "Following up on our coffee chat"

DELEGATE TO VA (Priority 3-4)
Criteria: Scheduling requests, document requests, subscription management, anything that needs action but not your brain
Example output: "Forward to VA: Schedule a 30-min call with this person next Tue-Thu afternoon"

READ LATER (Priority 4)
Criteria: Newsletters you actually read (approved list), industry reports, tool updates, community digests

IGNORE (Priority 5)
Criteria: Marketing emails from tools you don''t use, LinkedIn notifications, automated alerts you never act on, cold outreach

APPROVED NEWSLETTER LIST (for Read Later vs Ignore):
- Lenny''s Newsletter -> Read Later
- Stratechery -> Read Later
- Morning Brew -> Ignore (you never read it)
- ProductHunt Daily -> Ignore
- Hacker News Digest -> Read Later',
 'Define triage categories and decision criteria', '2026-04-07T00:00:00Z'),

('44444444-4444-4444-4444-444444444422', '33333333-3333-3333-3333-333333333320', 2,
 'Build the Batch Processing Prompt',
 'Now create the actual prompt I''ll use each morning. I want to paste a batch of emails (subject line + sender + first 2 lines of body) and get back a sorted, actionable list. Include the triage category, priority score, a suggested action (1 sentence), and estimated response time. Format it as a table I can quickly scan. Also add a "Daily Summary" line at the top that says something like "12 emails: 3 respond today, 4 this week, 2 delegate, 2 read later, 1 ignore."',
 'DAILY EMAIL TRIAGE PROMPT:

---

You are my email triage assistant. Process each email below and categorize it.

My context: I''m a freelance product strategy consultant. Active clients: Meridian Health, TrueNorth Fintech, Bloom Education. My VA is Jamie.

## Today''s Emails
[PASTE EMAILS HERE -- format: From: / Subject: / Preview:]

## Output Format

First line: **Daily Summary:** [count] emails -- [X] respond today, [X] this week, [X] delegate, [X] read later, [X] ignore

Then a table:

| # | Category | Priority | From | Subject | Action | Est. Time |
|---|----------|----------|------|---------|--------|-----------|
| 1 | Today | 1 | Sarah @ Meridian | Re: Q2 deck | Send the updated version she asked for on Thursday | 10 min |
| 2 | Delegate | 3 | Mike Chen | Can we find 30 min next week? | -> Jamie: schedule Tue-Thu PM, send my Calendly | 0 min |

Total response time today: ~25 minutes',
 'Create the batch processing prompt with table output', '2026-04-07T00:00:00Z'),

-- === Zapier Workflow Designer (prompt-22) — 2 steps ===
('44444444-4444-4444-4444-444444444423', '33333333-3333-3333-3333-333333333322', 1,
 'Map Current Manual Process',
 'I run a small consulting firm. When a new lead fills out our website contact form (Typeform), here''s what I currently do manually: 1) Copy their info into a Google Sheet, 2) Look up their company on LinkedIn to gauge size, 3) Send them a personalized email based on their company size (small = one template, mid-market = another, enterprise = another), 4) Create a deal in HubSpot with their info, 5) Send myself a Slack reminder to follow up in 3 days. This takes 15 minutes per lead and I get 5-8 per day. Design a Zapier automation that handles all of this.',
 'ZAPIER AUTOMATION: New Lead Processing Pipeline

TRIGGER: New Typeform Response

STEP 1: Google Sheets -> Create Row
- Sheet: "Lead Tracker 2026"
- Map fields: Name, Email, Company, Company Size (from Typeform dropdown), Message, Timestamp

STEP 2: Filter by Company Size
- Path A: 1-20 employees -> "Small"
- Path B: 21-200 employees -> "Mid-Market"
- Path C: 200+ employees -> "Enterprise"

STEP 3A/B/C: Gmail -> Send Email (3 variants)
- From: your email (not a noreply)
- To: Lead''s email
- Subject variants for each size
- Delay: Add a 12-minute delay so it doesn''t feel automated

STEP 4: HubSpot -> Create Deal
- Deal Name: "{{company}} -- Inbound {{date}}"
- Pipeline: "New Business"
- Stage: "Qualified Lead"

STEP 5: Slack -> Send Message
- Channel: #leads
- Message: "New lead: {{name}} from {{company}} ({{company_size}}). Email sent. Follow up by {{date+3 days}}."

STEP 6: Slack -> Schedule Reminder
- Remind you in 3 days: "Follow up with {{name}} at {{company}}"

ESTIMATED SETUP TIME: 45 minutes
ESTIMATED TIME SAVED: 75-120 minutes per day',
 'Map manual steps and design the Zapier automation flow', '2026-04-05T00:00:00Z'),

('44444444-4444-4444-4444-444444444424', '33333333-3333-3333-3333-333333333322', 2,
 'Write the Email Templates',
 'Write the three email templates for the Zapier flow. Context: I''m a product strategy consultant. Small companies usually want a one-time strategy sprint (2-4 weeks, $5-15K). Mid-market wants ongoing advisory (monthly retainer, $8-20K/month). Enterprise wants a dedicated embedded consultant (quarterly engagements, $50-150K). Each email should: acknowledge their specific message from the form, position the right service, include one social proof point, and have a clear CTA (book a 20-min call via Calendly). Keep them under 120 words each. Warm, not salesy.',
 NULL,
 'Write personalized email templates for each company size', '2026-04-05T00:00:00Z'),

-- === Daily Planning Prompt (prompt-23) — 1 step ===
('44444444-4444-4444-4444-444444444425', '33333333-3333-3333-3333-333333333323', 1,
 'Design the Planning Framework',
 'I want a daily planning prompt I run every morning at 8am. I''ll paste my calendar events and my to-do list from Todoist (copy-pasted). The prompt should: 1) Look at my calendar and identify focus blocks vs meeting-heavy periods, 2) Take my to-do list and assign tasks to specific time slots based on energy levels (deep work in the morning, admin in the afternoon), 3) Flag if I''m overcommitted (>6 hours of meetings or >8 tasks), 4) Suggest what to defer if overloaded. I''m a morning person — my peak focus is 8-11am.',
 'DAILY PLANNING FRAMEWORK:

ENERGY-BASED TIME BLOCKING:
- 8:00-11:00am -> PEAK FOCUS: Deep work only. No meetings if possible. Assign: writing, strategy, complex problem-solving, coding.
- 11:00am-12:30pm -> HIGH ENERGY: Meetings that require your active brain (strategy calls, client work, 1:1s)
- 12:30-1:30pm -> Break/lunch
- 1:30-3:30pm -> MODERATE ENERGY: Collaborative work, feedback sessions, lighter meetings
- 3:30-5:00pm -> LOW ENERGY: Admin, email, routine tasks, planning tomorrow

OVERLOAD RULES:
- > 6 hours meetings = RED FLAG. Suggest rescheduling the lowest-priority meeting.
- > 8 tasks = OVERCOMMITTED. Suggest deferring the 2 lowest-priority tasks to tomorrow.
- < 90 min of uninterrupted focus time = WARNING. You won''t get deep work done.

OUTPUT FORMAT:
Today''s Focus: [One sentence -- what makes today successful?]

8:00-11:00 | DEEP WORK
  -> [Task 1] (est. 45 min)
  -> [Task 2] (est. 60 min)

11:00-11:30 | Meeting: [Name] -- [Prep needed?]
11:30-12:30 | Meeting: [Name] -- [Prep needed?]

12:30-1:30 | Lunch

1:30-3:30 | COLLABORATIVE
  -> [Task or meeting]

3:30-5:00 | ADMIN
  -> Email batch
  -> [Task 3]
  -> Plan tomorrow

Watch out: [Any overload warnings]
Deferred to tomorrow: [Tasks that didn''t fit]',
 'Design the energy-based planning framework', '2026-04-08T00:00:00Z'),

-- === Notion Workspace Architecture (prompt-25) — 2 steps ===
('44444444-4444-4444-4444-444444444426', '33333333-3333-3333-3333-333333333325', 1,
 'Audit Current Chaos',
 'I have a Notion workspace that''s become a dumping ground. 400+ pages, no consistent structure, 15 databases that overlap, and I can never find anything. Here''s what I use Notion for: project management (freelance consulting, 3-5 active clients), CRM (tracking prospects and past clients), content planning (I write a weekly newsletter), personal knowledge base (articles, ideas, book notes), and meeting notes. Design a clean workspace architecture from scratch. I want to migrate to a new structure, not patch the old one.',
 'NOTION WORKSPACE ARCHITECTURE -- "The Clean Slate"

## TOP-LEVEL STRUCTURE (Sidebar)
Dashboard (home page)
Client Work
   -> Projects DB
   -> Meeting Notes DB
   -> Deliverables DB
Pipeline
   -> CRM DB (prospects + past clients)
   -> Proposals DB
Content
   -> Newsletter DB
   -> Content Ideas DB
Knowledge
   -> Notes DB (articles, books, ideas)
   -> Templates
Admin
   -> Invoicing tracker
   -> Expenses
   -> SOPs

## DATABASE DESIGN (5 core databases, down from 15)

### 1. Projects DB
Properties: Client (relation -> CRM), Status (Active/Complete/On Hold), Start Date, End Date, Type (Strategy Sprint / Advisory / Embedded), Revenue, Health
Views: Active Projects (board by status), By Client (table grouped), Timeline (calendar), Completed Archive

### 2. CRM DB
Properties: Company, Contact Name, Email, Stage (Lead/Prospect/Active Client/Past Client), Source, Last Contact Date, Lifetime Value, Notes
Views: Active Pipeline (board by stage), All Contacts (table), Need Follow-up (filtered: last contact >30 days ago)

### 3. Meeting Notes DB
Properties: Date, Client (relation -> CRM), Project (relation -> Projects), Type (Discovery/Check-in/Internal/Workshop), Action Items (checkbox), Follow-up Date
Views: This Week, By Client, Needs Follow-up

### 4. Newsletter DB
Properties: Issue #, Title, Status (Idea/Drafting/Ready/Published), Publish Date, Topic Tags, Word Count, Open Rate
Views: Editorial Calendar (calendar by publish date), Pipeline (board by status)

### 5. Notes DB
Properties: Title, Type (Article/Book/Idea/Reference), Tags (multi-select), Source URL, Date Added, Status (Inbox/Processed/Archived)
Views: Inbox (unprocessed), By Tag, Recent

## DASHBOARD
The home page shows:
- Today''s meetings (filtered Meeting Notes DB)
- Active projects (filtered Projects DB, board view)
- Pipeline snapshot (CRM DB, board view)
- This week''s newsletter status
- Quick capture button (creates a new Notes DB entry)',
 'Design the full workspace architecture and database structure', '2026-04-03T00:00:00Z'),

('44444444-4444-4444-4444-444444444427', '33333333-3333-3333-3333-333333333325', 2,
 'Migration Plan and Templates',
 'The architecture looks great. Now give me: 1) A step-by-step migration plan — what order to build things so I don''t lose any data, how to map my existing 15 databases into the new 5, and how long each step should take. 2) Templates for the most common entries: new client project kickoff, meeting notes, newsletter draft, and a weekly review template I fill out every Friday.',
 NULL,
 'Create migration plan and entry templates', '2026-04-03T00:00:00Z'),

-- === Contract Clause Library (prompt-29) — 1 step ===
('44444444-4444-4444-4444-444444444428', '33333333-3333-3333-3333-333333333329', 1,
 'Analyze Existing Contracts',
 'I''m a freelance consultant and I''ve signed 23 contracts over the past 3 years, but I negotiate each one from scratch because I can never remember which clauses I''ve used before. I just went through all 23 and copied out the key clauses. Here are the areas I need standardized: scope of work definition, payment terms, late payment penalties, intellectual property assignment, confidentiality, limitation of liability, termination clause, and non-solicitation. For each area, write me 3 versions: client-friendly (maximum flexibility for them), balanced (fair to both), and consultant-friendly (maximum protection for me). Use plain English, not legalese.',
 '## FREELANCE CONSULTANT CLAUSE LIBRARY

### 1. Payment Terms

**Client-Friendly:**
Payment is due within 45 days of invoice receipt. Invoices are sent monthly in arrears based on actual hours worked.

**Balanced:**
Payment is due within 30 days of invoice receipt. A deposit of 25% of the estimated project fee is due before work begins. Remaining balance is invoiced monthly based on work completed.

**Consultant-Friendly:**
Payment is due within 15 days of invoice receipt. A non-refundable deposit of 50% is due before work begins. Remaining 50% is invoiced at project midpoint. All invoices are due upon receipt; the 15-day window is a courtesy.

### 2. Late Payment

**Client-Friendly:**
If payment is more than 30 days overdue, a reminder will be sent. No penalties apply for the first late payment.

**Balanced:**
Invoices unpaid after 30 days incur a 1.5% monthly late fee. Work may be paused on invoices overdue by more than 45 days until payment is received.

**Consultant-Friendly:**
Invoices unpaid after 15 days incur a 2% monthly late fee. All work stops on invoices overdue by more than 30 days. Consultant reserves the right to retain all work product until outstanding invoices are paid in full.

### 3. Termination

**Client-Friendly:**
Either party may terminate with 7 days written notice. Client pays only for work completed through the termination date.

**Balanced:**
Either party may terminate with 14 days written notice. Client pays for all work completed through the termination date plus any pre-approved expenses. If client terminates within the first 30 days, the deposit is non-refundable.

**Consultant-Friendly:**
Either party may terminate with 30 days written notice. If client terminates for reasons other than consultant''s material breach, a termination fee of 25% of remaining contract value applies. All completed and in-progress work product must be paid for in full.

### 4. Intellectual Property

**Client-Friendly:**
All work product becomes client''s property upon creation. Consultant retains no rights to any deliverables.

**Balanced:**
Final deliverables become client''s property upon full payment. Consultant retains the right to use anonymized versions of the work in their portfolio and case studies. Pre-existing tools and frameworks used in the engagement remain consultant''s property.

**Consultant-Friendly:**
Client receives a perpetual license to use all deliverables upon full payment. Consultant retains ownership of all work product and may reuse methodologies, frameworks, and anonymized outputs in future engagements.',
 'Create three tiers of standard clauses for key contract areas', '2026-04-02T00:00:00Z'),

-- === Spreadsheet Audit Bot (prompt-33) — 2 steps ===
('44444444-4444-4444-4444-444444444429', '33333333-3333-3333-3333-333333333333', 1,
 'Define the Audit Checklist',
 'I maintain 12 Google Sheets that drive our company''s reporting (headcount, revenue, expenses, forecasts). Every quarter someone breaks a formula, changes a cell format, or deletes a column and we don''t catch it until the board report looks wrong. Build me a prompt where I paste a spreadsheet''s formula summary (I can export a list of all formulas from Google Sheets using an Apps Script) and it audits for: broken references (#REF, #N/A, #VALUE errors), circular references, hardcoded numbers where formulas should be, inconsistent formula patterns in a column (e.g., row 15 uses SUM but row 16 uses a hardcoded value), and cells that reference other sheets that might have been renamed.',
 'SPREADSHEET AUDIT SYSTEM

## Audit Checklist (7 categories, 18 specific checks)

### Category 1: Error Detection
- Scan for #REF! errors (broken cell references)
- Scan for #N/A errors (failed lookups)
- Scan for #VALUE! errors (type mismatches)
- Scan for #DIV/0! errors (division by zero)

### Category 2: Formula Integrity
- Identify hardcoded values in columns that should be formula-driven
  - Detection: If 90% of cells in a column use formulas and 10% are hardcoded, flag the hardcoded ones
- Check for inconsistent formula patterns
  - Detection: Compare the formula structure (ignoring row numbers) across a column; flag outliers
- Detect circular references

### Category 3: Cross-Sheet References
- List all formulas referencing other sheets
- Flag references to sheets not present in the workbook
- Flag references using IMPORTRANGE (fragile)

### Category 4: Data Validation
- Columns with mixed data types (numbers and text)
- Date columns with inconsistent formats
- Negative values in columns that should only be positive (e.g., headcount)

### Category 5: Structural Issues
- Empty rows in the middle of data ranges (breaks SUM/VLOOKUP)
- Merged cells (break sorting and formulas)

### Category 6: Staleness
- Cells referencing dates more than 90 days old in "current" sections
- TODAY() or NOW() functions that may cause recalculation issues

### Category 7: Risk Assessment
- Each finding gets a severity: Critical (wrong numbers showing), Warning (will break eventually), Info (best practice suggestion)

## Output Format
```
AUDIT REPORT: [Sheet Name]
Date: [Today]
Total formulas scanned: [N]
Issues found: [N] (X critical, Y warnings, Z info)

CRITICAL
1. Cell F15: #REF! error -- formula references a deleted column
2. Cell B22: Hardcoded value "$48,000" in a column where every other cell uses =SUM()

WARNING
3. Cells D2:D50 -- inconsistent pattern: 47 cells use =B*C, but D15 and D33 use different formulas

INFO
5. Column A has 3 merged cell ranges -- consider unmerging for formula reliability
```',
 'Design the comprehensive audit checklist and output format', '2026-04-01T00:00:00Z'),

('44444444-4444-4444-4444-444444444430', '33333333-3333-3333-3333-333333333333', 2,
 'Build the Apps Script Exporter',
 'Write a Google Apps Script that I can run on any spreadsheet. It should: 1) Loop through all sheets in the workbook, 2) For each cell with a formula, capture: sheet name, cell reference, formula text, current value, and whether it''s an error. 3) Export the whole thing as a JSON blob I can paste into the audit prompt. Also include a count summary at the top (total cells, total formulas, total errors). Keep the script under 50 lines if possible.',
 NULL,
 'Create the Apps Script to export formula data for auditing', '2026-04-01T00:00:00Z')

ON CONFLICT (id) DO NOTHING;

ALTER TABLE prompt_steps ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. UPDATE CATEGORY PROMPT COUNTS
-- ============================================================
UPDATE categories SET prompt_count = (
  SELECT COUNT(*) FROM prompts WHERE prompts.category_id = categories.id AND prompts.status = 'approved'
);
