-- PromptForge Seed Data (Fixed)
-- Handles the foreign key constraint on profiles -> auth.users

-- Insert categories (skip if already exist from first attempt)
INSERT INTO categories (id, name, slug, description, icon, prompt_count) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Finance & Accounting', 'finance', 'Budgeting, forecasting, analysis, and financial planning', '💰', 3),
  ('11111111-1111-1111-1111-111111111102', 'Marketing & Sales', 'marketing', 'Campaigns, content strategy, lead generation, and outreach', '📢', 2),
  ('11111111-1111-1111-1111-111111111103', 'Writing & Content', 'writing', 'Blog posts, emails, copy, and creative writing', '✍️', 2),
  ('11111111-1111-1111-1111-111111111104', 'Coding & Development', 'coding', 'Code generation, debugging, architecture, and documentation', '💻', 2),
  ('11111111-1111-1111-1111-111111111105', 'Design & Creative', 'design', 'UI/UX, branding, image generation, and visual design', '🎨', 1),
  ('11111111-1111-1111-1111-111111111106', 'Education & Learning', 'education', 'Study plans, explanations, tutoring, and course creation', '📚', 1),
  ('11111111-1111-1111-1111-111111111107', 'Productivity', 'productivity', 'Task management, meetings, workflows, and automation', '⚡', 1),
  ('11111111-1111-1111-1111-111111111108', 'Data & Analysis', 'data', 'Data visualization, surveys, reporting, and insights', '📊', 1),
  ('11111111-1111-1111-1111-111111111109', 'Business Strategy', 'strategy', 'SWOT analysis, business plans, market research, and OKRs', '🎯', 1),
  ('11111111-1111-1111-1111-111111111110', 'Personal & Fun', 'personal', 'Travel, recipes, hobbies, games, and lifestyle', '🎮', 1)
ON CONFLICT (id) DO NOTHING;

-- Temporarily drop the FK constraint so we can insert seed profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

INSERT INTO profiles (id, username, display_name, bio, role) VALUES
  ('22222222-2222-2222-2222-222222222201', 'promptmaster', 'Alex Chen', 'AI enthusiast and prompt engineer', 'admin'),
  ('22222222-2222-2222-2222-222222222202', 'sarahbuilds', 'Sarah Kim', 'Small business owner exploring AI', 'user'),
  ('22222222-2222-2222-2222-222222222203', 'devmarcus', 'Marcus Johnson', 'Full-stack developer and AI tinkerer', 'user')
ON CONFLICT (id) DO NOTHING;

-- Re-add FK constraint but don't validate existing rows (NOT VALID)
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Prompts
ALTER TABLE prompts DISABLE ROW LEVEL SECURITY;

INSERT INTO prompts (id, title, description, content, category_id, difficulty, model_recommendation, tags, status, author_id, vote_count, bookmark_count) VALUES

('33333333-3333-3333-3333-333333333301', 'Monthly Budget Analyzer',
 'Paste your monthly transactions and get a complete spending analysis with actionable budgeting advice.',
 'I want you to act as a financial analyst. I''ll provide my monthly transactions below. Please:

1. Categorize each transaction (housing, food, transportation, entertainment, subscriptions, etc.)
2. Calculate total spending per category
3. Show what percentage of total spending each category represents
4. Compare to the recommended 50/30/20 budgeting rule (needs/wants/savings)
5. Identify the top 3 areas where I could reduce spending
6. Suggest a realistic budget for next month based on my income of [YOUR MONTHLY INCOME]

Here are my transactions:
[PASTE YOUR TRANSACTIONS HERE - format: date, description, amount]',
 '11111111-1111-1111-1111-111111111101', 'beginner', 'Any model (ChatGPT, Claude, Gemini)',
 ARRAY['budget', 'personal finance', 'spending', 'analysis'],
 'approved', '22222222-2222-2222-2222-222222222201', 47, 23),

('33333333-3333-3333-3333-333333333302', 'Cash Flow Forecast Generator',
 'Generate a 6-month cash flow projection for your small business based on historical data and assumptions.',
 'Act as a CFO for a small business. I need a 6-month cash flow forecast.

Business details:
- Business type: [YOUR BUSINESS TYPE]
- Monthly recurring revenue: [AMOUNT]
- Monthly fixed costs: [LIST WITH AMOUNTS]
- Variable costs as % of revenue: [PERCENTAGE]
- Expected revenue growth rate: [% PER MONTH]
- Upcoming one-time expenses: [LIST WITH AMOUNTS AND DATES]
- Current cash balance: [AMOUNT]

Please create:
1. A month-by-month cash flow table
2. Identify any months where cash balance might go negative
3. Recommend actions to improve cash position
4. Suggest what cash reserve I should maintain',
 '11111111-1111-1111-1111-111111111101', 'intermediate', 'Claude or ChatGPT-4',
 ARRAY['cash flow', 'small business', 'forecasting', 'financial planning'],
 'approved', '22222222-2222-2222-2222-222222222202', 35, 18),

('33333333-3333-3333-3333-333333333303', 'Invoice Email Template Generator',
 'Create professional invoice follow-up emails for different scenarios — from friendly reminders to final notices.',
 'Generate a set of invoice follow-up email templates for a [TYPE OF BUSINESS]. I need 4 versions:

1. **Friendly Reminder** (sent 3 days before due date)
2. **First Follow-up** (sent 3 days after due date)
3. **Second Follow-up** (sent 14 days after due date)
4. **Final Notice** (sent 30 days after due date)

For each email, include:
- Subject line
- Body text (professional but warm tone)
- Placeholders for: client name, invoice number, amount, due date, payment link

My business name: [YOUR BUSINESS NAME]
My typical payment terms: [NET 15 / NET 30 / etc.]',
 '11111111-1111-1111-1111-111111111101', 'beginner', 'Any model',
 ARRAY['invoicing', 'email', 'templates', 'freelance', 'small business'],
 'approved', '22222222-2222-2222-2222-222222222203', 28, 15),

('33333333-3333-3333-3333-333333333304', 'Social Media Post Generator',
 'Generate a week''s worth of engaging social media posts for any platform, tailored to your brand and audience.',
 'Create 7 social media posts for [PLATFORM: Instagram/Twitter/LinkedIn/TikTok] for my [BUSINESS/BRAND TYPE].

Target audience: [DESCRIBE YOUR AUDIENCE]
Brand voice: [CASUAL/PROFESSIONAL/PLAYFUL/AUTHORITATIVE]
Goal: [AWARENESS/ENGAGEMENT/SALES/EDUCATION]

For each post, provide:
- The post text (with appropriate length for the platform)
- 3-5 relevant hashtags
- Best time to post
- A suggestion for the visual/image to pair with it
- A call-to-action

Mix of post types: 2 educational, 2 engaging, 1 promotional, 1 behind-the-scenes, 1 user-generated content prompt.',
 '11111111-1111-1111-1111-111111111102', 'beginner', 'Any model',
 ARRAY['social media', 'content creation', 'marketing', 'branding'],
 'approved', '22222222-2222-2222-2222-222222222201', 62, 41),

('33333333-3333-3333-3333-333333333305', 'Content Calendar Builder',
 'A 3-step prompt chain that researches competitors, defines content pillars, and generates a full 30-day content calendar.',
 'This is a multi-step prompt chain. Follow each step in order, using the output of the previous step as context for the next.',
 '11111111-1111-1111-1111-111111111102', 'intermediate', 'Claude or ChatGPT-4',
 ARRAY['content calendar', 'content strategy', 'marketing', 'chain'],
 'approved', '22222222-2222-2222-2222-222222222203', 53, 34),

('33333333-3333-3333-3333-333333333306', 'Blog Post Outline Generator',
 'Create a detailed, SEO-friendly blog post outline on any topic with headers, key points, and word count targets.',
 'Create a detailed blog post outline for the topic: "[YOUR TOPIC]"

Target audience: [WHO IS THIS FOR?]
Target word count: [1000/1500/2000/2500]
Primary keyword: [MAIN SEO KEYWORD]
Secondary keywords: [2-3 RELATED KEYWORDS]

Include:
1. A compelling title (with the primary keyword)
2. Meta description (under 160 characters)
3. Introduction hook (2-3 approaches to choose from)
4. 4-6 main sections with H2 headers
5. 2-3 bullet points per section
6. Suggested places to add images, examples, or data
7. Conclusion with call-to-action options
8. 3 internal linking suggestions',
 '11111111-1111-1111-1111-111111111103', 'beginner', 'Any model',
 ARRAY['blog', 'SEO', 'content writing', 'outline'],
 'approved', '22222222-2222-2222-2222-222222222202', 44, 29),

('33333333-3333-3333-3333-333333333307', 'Cold Email Sequence Writer',
 'Generate a 3-email cold outreach sequence with personalization hooks, value props, and follow-up strategies.',
 'Write a 3-email cold outreach sequence for [YOUR PRODUCT/SERVICE].

Context:
- I''m reaching out to: [TARGET ROLE]
- My product/service: [BRIEF DESCRIPTION]
- Key value proposition: [MAIN BENEFIT]
- Social proof: [ANY METRICS, TESTIMONIALS, OR NOTABLE CLIENTS]

For each email:
- Subject line (A/B test: give 2 options)
- Email body (keep under 150 words)
- Clear CTA
- Personalization placeholder

Email 1: Initial outreach (focus on their pain point)
Email 2: Follow-up after 3 days (add value)
Email 3: Break-up email after 5 more days (gentle urgency)',
 '11111111-1111-1111-1111-111111111103', 'intermediate', 'Claude or ChatGPT-4',
 ARRAY['email', 'cold outreach', 'sales', 'B2B'],
 'approved', '22222222-2222-2222-2222-222222222201', 38, 22),

('33333333-3333-3333-3333-333333333308', 'Code Review Assistant',
 'Get a thorough code review with suggestions for bugs, security issues, performance, and best practices.',
 'Review the following code and provide feedback in these categories:

1. **Bugs & Logic Errors**
2. **Security**
3. **Performance**
4. **Readability**
5. **Best Practices**

For each issue found:
- Severity: Critical / Warning / Suggestion
- Line reference
- What''s wrong
- How to fix it (with code example)

Language: [PROGRAMMING LANGUAGE]
Context: [WHAT THIS CODE DOES]

```
[PASTE YOUR CODE HERE]
```',
 '11111111-1111-1111-1111-111111111104', 'beginner', 'Claude or ChatGPT-4',
 ARRAY['code review', 'debugging', 'best practices', 'security'],
 'approved', '22222222-2222-2222-2222-222222222203', 71, 45),

('33333333-3333-3333-3333-333333333309', 'API Endpoint Designer',
 'A 2-step chain that takes your app requirements and produces a complete RESTful API design with schemas.',
 'This is a multi-step prompt chain. Follow each step in order, using the output of the previous step as context for the next.',
 '11111111-1111-1111-1111-111111111104', 'intermediate', 'Claude',
 ARRAY['API', 'REST', 'backend', 'architecture', 'chain'],
 'approved', '22222222-2222-2222-2222-222222222201', 42, 27),

('33333333-3333-3333-3333-333333333310', 'UI/UX Audit Checklist',
 'Get a comprehensive audit of your website or app''s user experience with actionable improvement suggestions.',
 'Perform a UI/UX audit for my [WEBSITE/APP].

App/website description: [WHAT IT DOES]
Target users: [WHO USES IT]
Main user goal: [WHAT USERS COME TO DO]

Evaluate across these dimensions (score each 1-10):
1. **First Impression**
2. **Navigation**
3. **Content**
4. **Forms & Inputs**
5. **Mobile Experience**
6. **Accessibility**
7. **Conversion Flow**

For each: score, 2-3 specific issues, and concrete fix suggestions.
End with a prioritized action plan.',
 '11111111-1111-1111-1111-111111111105', 'intermediate', 'Claude or ChatGPT-4',
 ARRAY['UI', 'UX', 'audit', 'design', 'accessibility'],
 'approved', '22222222-2222-2222-2222-222222222202', 33, 19),

('33333333-3333-3333-3333-333333333311', 'Concept Explainer (Feynman Technique)',
 'Get any complex topic explained simply, as if teaching it to a beginner. Uses the Feynman technique.',
 'Explain [CONCEPT/TOPIC] using the Feynman Technique:

1. **Simple Explanation** - As if I''m a smart 12-year-old
2. **Core Mechanism** - What''s actually happening under the hood
3. **Real-World Example** - A concrete, relatable example
4. **Common Misconceptions** - What most people get wrong
5. **Connection Map** - How it connects to 3 related concepts
6. **Test My Understanding** - 3 questions to check comprehension

My current level: [NONE / SOME BASICS / INTERMEDIATE]
Why I''m learning this: [SCHOOL / WORK / CURIOSITY]',
 '11111111-1111-1111-1111-111111111106', 'beginner', 'Any model',
 ARRAY['learning', 'education', 'explanation', 'studying'],
 'approved', '22222222-2222-2222-2222-222222222201', 56, 38),

('33333333-3333-3333-3333-333333333312', 'Weekly Review & Planning Template',
 'Conduct a structured weekly review and plan your next week with clear priorities and time blocks.',
 'Help me conduct my weekly review and plan next week.

**REVIEW THIS WEEK:**
What I planned to do: [LIST YOUR PLANNED TASKS]
What I actually accomplished: [LIST WHAT GOT DONE]
What got blocked or postponed: [LIST INCOMPLETE ITEMS]
Biggest win: [YOUR WIN]
Biggest challenge: [YOUR CHALLENGE]

**PLAN NEXT WEEK:**
Top 3 priorities: [LIST THEM]
Meetings already scheduled: [LIST WITH DAYS/TIMES]
Deadlines coming up: [LIST WITH DATES]

Please:
1. Analyze my completion rate and identify patterns
2. Suggest what to carry forward vs. drop vs. delegate
3. Create a day-by-day plan with time blocks
4. Identify my "one thing" for each day
5. Add buffer time for unexpected tasks',
 '11111111-1111-1111-1111-111111111107', 'beginner', 'Any model',
 ARRAY['productivity', 'planning', 'weekly review', 'time management'],
 'approved', '22222222-2222-2222-2222-222222222202', 41, 30),

('33333333-3333-3333-3333-333333333313', 'Survey Question Generator',
 'Create effective, unbiased survey questions for customer research, employee feedback, or market research.',
 'Design a survey for [PURPOSE].

Context:
- Target respondents: [WHO WILL TAKE THIS]
- Goal: [WHAT DO I WANT TO LEARN?]
- How results will be used: [DECISIONS THIS WILL INFORM]
- Desired length: [5-10 / 10-15 / 15-20 questions]

Create:
1. Engaging intro paragraph
2. Screening questions (if needed)
3. Core questions (mix of types)
4. Demographic questions (at the end)
5. Closing thank-you message

For each question note: why it matters, required or optional, skip logic.
Avoid: leading questions, double-barreled questions, jargon, bias.',
 '11111111-1111-1111-1111-111111111108', 'beginner', 'Any model',
 ARRAY['survey', 'research', 'data collection', 'feedback'],
 'approved', '22222222-2222-2222-2222-222222222203', 25, 14),

('33333333-3333-3333-3333-333333333314', 'SWOT Analysis Generator',
 'Generate a comprehensive SWOT analysis for any business, product, or project with strategic recommendations.',
 'Perform a SWOT analysis for [BUSINESS/PRODUCT/PROJECT NAME].

Context:
- Industry: [YOUR INDUSTRY]
- Stage: [STARTUP / GROWTH / MATURE]
- Main competitors: [LIST 2-3]
- Current situation: [BRIEF DESCRIPTION]

Create:
- Strengths, Weaknesses, Opportunities, Threats (4-5 items each)
- SO, WO, ST, WT strategy matrix
- Top 3 strategic priorities',
 '11111111-1111-1111-1111-111111111109', 'beginner', 'Claude or ChatGPT-4',
 ARRAY['SWOT', 'strategy', 'business planning', 'analysis'],
 'approved', '22222222-2222-2222-2222-222222222201', 39, 21),

('33333333-3333-3333-3333-333333333315', 'Travel Itinerary Planner',
 'Create a detailed day-by-day travel itinerary with activities, restaurants, budget estimates, and local tips.',
 'Plan a trip to [DESTINATION] for [NUMBER] days.

Trip details:
- Travelers: [NUMBER OF PEOPLE, AGES]
- Budget: [BACKPACKER / MID-RANGE / LUXURY]
- Interests: [HISTORY / FOOD / ADVENTURE / RELAXATION / NATURE]
- Must-sees: [ANYTHING SPECIFIC]

Create a day-by-day itinerary including:
1. Morning, afternoon, and evening activities
2. Restaurant recommendations for each meal
3. Transportation between activities
4. Estimated daily budget breakdown
5. Local tips
6. A "Plan B" for each day
7. Packing suggestions',
 '11111111-1111-1111-1111-111111111110', 'beginner', 'Any model',
 ARRAY['travel', 'itinerary', 'vacation', 'planning'],
 'approved', '22222222-2222-2222-2222-222222222202', 58, 42),

-- PENDING PROMPTS (for admin dashboard)
('33333333-3333-3333-3333-333333333316', 'Negotiation Script Builder',
 'Prepare for any negotiation with a structured script, talking points, and responses to common objections.',
 'Help me prepare for a negotiation about [WHAT: salary, contract, deal, price].

Context:
- My position: [WHAT I WANT]
- Their likely position: [WHAT THEY PROBABLY WANT]
- My BATNA: [WHAT I''LL DO IF THIS FAILS]

Create:
1. Opening statement
2. Top 3 talking points with evidence
3. Concessions I can offer
4. 5 likely objections and responses
5. Anchoring strategy
6. Walk-away point
7. Closing script',
 '11111111-1111-1111-1111-111111111109', 'intermediate', 'Claude or ChatGPT-4',
 ARRAY['negotiation', 'business', 'communication', 'salary'],
 'pending', '22222222-2222-2222-2222-222222222203', 0, 0),

('33333333-3333-3333-3333-333333333317', 'Landing Page Copy Generator',
 'Generate conversion-optimized landing page copy with headlines, benefits, social proof sections, and CTAs.',
 'Write landing page copy for [PRODUCT/SERVICE].

Details:
- What it does: [DESCRIPTION]
- Target customer: [WHO]
- Main pain point: [PROBLEM]
- Key differentiator: [WHY US]
- Price point: [PRICE]

Generate:
1. Hero section with headline, subheadline, CTA
2. Problem section
3. Solution section
4. Benefits section (3-4 benefits)
5. Social proof section
6. FAQ section (5 questions)
7. Final CTA section

Provide 3 headline variations.',
 '11111111-1111-1111-1111-111111111102', 'intermediate', 'Any model',
 ARRAY['landing page', 'copywriting', 'conversion', 'marketing'],
 'pending', '22222222-2222-2222-2222-222222222202', 0, 0),

('33333333-3333-3333-3333-333333333318', 'Regex Pattern Builder',
 'Describe what you want to match in plain English and get the regex pattern with explanation and test cases.',
 'I need a regular expression that matches: [DESCRIBE IN PLAIN ENGLISH]

Examples that SHOULD match:
- [EXAMPLE 1]
- [EXAMPLE 2]

Examples that should NOT match:
- [EXAMPLE 1]
- [EXAMPLE 2]

Language: [JavaScript / Python / Java / etc.]

Provide:
1. The regex pattern
2. Breakdown of each part
3. Test results against my examples
4. Edge cases
5. Code snippet for my language',
 '11111111-1111-1111-1111-111111111104', 'beginner', 'Any model',
 ARRAY['regex', 'programming', 'pattern matching', 'developer tools'],
 'pending', '22222222-2222-2222-2222-222222222201', 0, 0)

ON CONFLICT (id) DO NOTHING;

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Prompt Steps (for chain prompts)
ALTER TABLE prompt_steps DISABLE ROW LEVEL SECURITY;

INSERT INTO prompt_steps (id, prompt_id, step_number, title, content, description) VALUES
('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333305', 1,
 'Research Phase',
 'I need to create a content calendar for [BUSINESS/NICHE]. First, analyze these top competitors: [COMPETITOR 1], [COMPETITOR 2]. What content themes, posting frequency, and formats are working well for them? Summarize the key patterns you notice.',
 'Analyze competitor content strategies to inform your calendar'),

('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333305', 2,
 'Theme & Pillar Creation',
 'Based on the competitor research, create 4-5 content pillars for [BUSINESS/NICHE] that align with these goals: [GOAL 1], [GOAL 2]. For each pillar, suggest 3 content formats and the ideal platform for each.',
 'Define your content pillars and formats'),

('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333305', 3,
 'Calendar Generation',
 'Now create a 30-day content calendar using the pillars and formats above. Include: date, platform, content pillar, format, topic/title, brief description, and suggested hashtags. Arrange it so content pillars rotate evenly. Output as a table.',
 'Generate the full 30-day calendar'),

('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333309', 1,
 'Requirements Gathering',
 'I''m building an API for [APPLICATION DESCRIPTION]. The main resources/entities are: [LIST ENTITIES]. Users need to: [LIST KEY USER ACTIONS]. List all the API endpoints needed, grouped by resource. For each endpoint, specify: HTTP method, path, brief description, and whether it requires authentication.',
 'Define all required endpoints from user requirements'),

('44444444-4444-4444-4444-444444444405', '33333333-3333-3333-3333-333333333309', 2,
 'Schema & Response Design',
 'For each endpoint defined above, create: (1) the request body schema with field names, types, and validation rules, (2) the success response schema with example JSON, (3) possible error responses with status codes and messages. Follow REST best practices.',
 'Design request/response schemas for each endpoint')

ON CONFLICT (id) DO NOTHING;

ALTER TABLE prompt_steps ENABLE ROW LEVEL SECURITY;
