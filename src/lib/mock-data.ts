import { Category, Profile, Prompt, PromptStep } from './types'

export const mockProfiles: Profile[] = [
  {
    id: 'user-1',
    username: 'promptmaster',
    display_name: 'Alex Chen',
    avatar_url: null,
    bio: 'AI enthusiast and prompt engineer',
    role: 'admin',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'user-2',
    username: 'sarahbuilds',
    display_name: 'Sarah Kim',
    avatar_url: null,
    bio: 'Small business owner exploring AI',
    role: 'user',
    created_at: '2026-03-05T00:00:00Z',
    updated_at: '2026-03-05T00:00:00Z',
  },
  {
    id: 'user-3',
    username: 'devmarcus',
    display_name: 'Marcus Johnson',
    avatar_url: null,
    bio: 'Full-stack developer and AI tinkerer',
    role: 'user',
    created_at: '2026-03-10T00:00:00Z',
    updated_at: '2026-03-10T00:00:00Z',
  },
]

export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Finance & Accounting', slug: 'finance', description: 'Budgeting, forecasting, analysis, and financial planning', icon: '💰', prompt_count: 3, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-2', name: 'Marketing & Sales', slug: 'marketing', description: 'Campaigns, content strategy, lead generation, and outreach', icon: '📢', prompt_count: 2, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-3', name: 'Writing & Content', slug: 'writing', description: 'Blog posts, emails, copy, and creative writing', icon: '✍️', prompt_count: 2, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-4', name: 'Coding & Development', slug: 'coding', description: 'Code generation, debugging, architecture, and documentation', icon: '💻', prompt_count: 2, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-5', name: 'Design & Creative', slug: 'design', description: 'UI/UX, branding, image generation, and visual design', icon: '🎨', prompt_count: 1, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-6', name: 'Education & Learning', slug: 'education', description: 'Study plans, explanations, tutoring, and course creation', icon: '📚', prompt_count: 1, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-7', name: 'Productivity', slug: 'productivity', description: 'Task management, meetings, workflows, and automation', icon: '⚡', prompt_count: 1, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-8', name: 'Data & Analysis', slug: 'data', description: 'Data visualization, surveys, reporting, and insights', icon: '📊', prompt_count: 1, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-9', name: 'Business Strategy', slug: 'strategy', description: 'SWOT analysis, business plans, market research, and OKRs', icon: '🎯', prompt_count: 1, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-10', name: 'Personal & Fun', slug: 'personal', description: 'Travel, recipes, hobbies, games, and lifestyle', icon: '🎮', prompt_count: 1, created_at: '2026-03-01T00:00:00Z' },
]

export const mockSteps: PromptStep[] = [
  // Steps for "Content Calendar Builder" (prompt-5)
  {
    id: 'step-1',
    prompt_id: 'prompt-5',
    step_number: 1,
    title: 'Research Phase',
    content: 'I need to create a content calendar for [BUSINESS/NICHE]. First, analyze these top competitors: [COMPETITOR 1], [COMPETITOR 2]. What content themes, posting frequency, and formats are working well for them? Summarize the key patterns you notice.',
    description: 'Analyze competitor content strategies to inform your calendar',
    created_at: '2026-03-15T00:00:00Z',
  },
  {
    id: 'step-2',
    prompt_id: 'prompt-5',
    step_number: 2,
    title: 'Theme & Pillar Creation',
    content: 'Based on the competitor research, create 4-5 content pillars for [BUSINESS/NICHE] that align with these goals: [GOAL 1], [GOAL 2]. For each pillar, suggest 3 content formats (e.g., how-to post, behind-the-scenes, user story) and the ideal platform for each.',
    description: 'Define your content pillars and formats',
    created_at: '2026-03-15T00:00:00Z',
  },
  {
    id: 'step-3',
    prompt_id: 'prompt-5',
    step_number: 3,
    title: 'Calendar Generation',
    content: 'Now create a 30-day content calendar using the pillars and formats above. Include: date, platform, content pillar, format, topic/title, brief description (1-2 sentences), and suggested hashtags. Arrange it so content pillars rotate evenly and no two consecutive posts use the same format. Output as a table.',
    description: 'Generate the full 30-day calendar',
    created_at: '2026-03-15T00:00:00Z',
  },
  // Steps for "API Endpoint Designer" (prompt-9)
  {
    id: 'step-4',
    prompt_id: 'prompt-9',
    step_number: 1,
    title: 'Requirements Gathering',
    content: 'I\'m building an API for [APPLICATION DESCRIPTION]. The main resources/entities are: [LIST ENTITIES]. Users need to: [LIST KEY USER ACTIONS]. List all the API endpoints needed, grouped by resource. For each endpoint, specify: HTTP method, path, brief description, and whether it requires authentication.',
    description: 'Define all required endpoints from user requirements',
    created_at: '2026-03-18T00:00:00Z',
  },
  {
    id: 'step-5',
    prompt_id: 'prompt-9',
    step_number: 2,
    title: 'Schema & Response Design',
    content: 'For each endpoint defined above, create: (1) the request body schema (if applicable) with field names, types, and validation rules, (2) the success response schema with example JSON, (3) possible error responses with status codes and messages. Use consistent naming conventions and follow REST best practices.',
    description: 'Design request/response schemas for each endpoint',
    created_at: '2026-03-18T00:00:00Z',
  },
]

export const mockPrompts: Prompt[] = [
  // ---- FINANCE ----
  {
    id: 'prompt-1',
    title: 'Monthly Budget Analyzer',
    description: 'Paste your monthly transactions and get a complete spending analysis with actionable budgeting advice. Perfect for getting control of personal or business finances.',
    content: `I want you to act as a financial analyst. I'll provide my monthly transactions below. Please:

1. Categorize each transaction (housing, food, transportation, entertainment, subscriptions, etc.)
2. Calculate total spending per category
3. Show what percentage of total spending each category represents
4. Compare to the recommended 50/30/20 budgeting rule (needs/wants/savings)
5. Identify the top 3 areas where I could reduce spending
6. Suggest a realistic budget for next month based on my income of [YOUR MONTHLY INCOME]

Here are my transactions:
[PASTE YOUR TRANSACTIONS HERE - format: date, description, amount]`,
    category_id: 'cat-1',
    difficulty: 'beginner',
    model_recommendation: 'Any model (ChatGPT, Claude, Gemini)',
    tags: ['budget', 'personal finance', 'spending', 'analysis'],
    status: 'approved',
    author_id: 'user-1',
    vote_count: 47,
    bookmark_count: 23,
    created_at: '2026-03-12T00:00:00Z',
    updated_at: '2026-03-12T00:00:00Z',
  },
  {
    id: 'prompt-2',
    title: 'Cash Flow Forecast Generator',
    description: 'Generate a 6-month cash flow projection for your small business based on historical data and assumptions.',
    content: `Act as a CFO for a small business. I need a 6-month cash flow forecast.

Business details:
- Business type: [YOUR BUSINESS TYPE]
- Monthly recurring revenue: [AMOUNT]
- Monthly fixed costs: [LIST WITH AMOUNTS]
- Variable costs as % of revenue: [PERCENTAGE]
- Expected revenue growth rate: [% PER MONTH]
- Upcoming one-time expenses: [LIST WITH AMOUNTS AND DATES]
- Current cash balance: [AMOUNT]

Please create:
1. A month-by-month cash flow table (revenue, fixed costs, variable costs, one-time expenses, net cash flow, ending balance)
2. Identify any months where cash balance might go negative
3. Recommend actions to improve cash position
4. Suggest what cash reserve I should maintain`,
    category_id: 'cat-1',
    difficulty: 'intermediate',
    model_recommendation: 'Claude or ChatGPT-4',
    tags: ['cash flow', 'small business', 'forecasting', 'financial planning'],
    status: 'approved',
    author_id: 'user-2',
    vote_count: 35,
    bookmark_count: 18,
    created_at: '2026-03-14T00:00:00Z',
    updated_at: '2026-03-14T00:00:00Z',
  },
  {
    id: 'prompt-3',
    title: 'Invoice Email Template Generator',
    description: 'Create professional invoice follow-up emails for different scenarios — from friendly reminders to final notices.',
    content: `Generate a set of invoice follow-up email templates for a [TYPE OF BUSINESS]. I need 4 versions:

1. **Friendly Reminder** (sent 3 days before due date)
2. **First Follow-up** (sent 3 days after due date)
3. **Second Follow-up** (sent 14 days after due date)
4. **Final Notice** (sent 30 days after due date)

For each email, include:
- Subject line
- Body text (professional but warm tone)
- Placeholders for: client name, invoice number, amount, due date, payment link

My business name: [YOUR BUSINESS NAME]
My typical payment terms: [NET 15 / NET 30 / etc.]`,
    category_id: 'cat-1',
    difficulty: 'beginner',
    model_recommendation: 'Any model',
    tags: ['invoicing', 'email', 'templates', 'freelance', 'small business'],
    status: 'approved',
    author_id: 'user-3',
    vote_count: 28,
    bookmark_count: 15,
    created_at: '2026-03-16T00:00:00Z',
    updated_at: '2026-03-16T00:00:00Z',
  },

  // ---- MARKETING ----
  {
    id: 'prompt-4',
    title: 'Social Media Post Generator',
    description: 'Generate a week\'s worth of engaging social media posts for any platform, tailored to your brand and audience.',
    content: `Create 7 social media posts for [PLATFORM: Instagram/Twitter/LinkedIn/TikTok] for my [BUSINESS/BRAND TYPE].

Target audience: [DESCRIBE YOUR AUDIENCE]
Brand voice: [CASUAL/PROFESSIONAL/PLAYFUL/AUTHORITATIVE]
Goal: [AWARENESS/ENGAGEMENT/SALES/EDUCATION]

For each post, provide:
- The post text (with appropriate length for the platform)
- 3-5 relevant hashtags
- Best time to post (general recommendation)
- A suggestion for the visual/image to pair with it
- A call-to-action

Mix of post types: 2 educational, 2 engaging (questions/polls), 1 promotional, 1 behind-the-scenes, 1 user-generated content prompt.`,
    category_id: 'cat-2',
    difficulty: 'beginner',
    model_recommendation: 'Any model',
    tags: ['social media', 'content creation', 'marketing', 'branding'],
    status: 'approved',
    author_id: 'user-1',
    vote_count: 62,
    bookmark_count: 41,
    created_at: '2026-03-13T00:00:00Z',
    updated_at: '2026-03-13T00:00:00Z',
  },
  {
    id: 'prompt-5',
    title: 'Content Calendar Builder',
    description: 'A 3-step prompt chain that researches competitors, defines content pillars, and generates a full 30-day content calendar.',
    content: 'This is a multi-step prompt chain. Follow each step in order, using the output of the previous step as context for the next.',
    category_id: 'cat-2',
    difficulty: 'intermediate',
    model_recommendation: 'Claude or ChatGPT-4',
    tags: ['content calendar', 'content strategy', 'marketing', 'chain'],
    status: 'approved',
    author_id: 'user-3',
    vote_count: 53,
    bookmark_count: 34,
    created_at: '2026-03-15T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
  },

  // ---- WRITING ----
  {
    id: 'prompt-6',
    title: 'Blog Post Outline Generator',
    description: 'Create a detailed, SEO-friendly blog post outline on any topic. Includes headers, key points, and word count targets.',
    content: `Create a detailed blog post outline for the topic: "[YOUR TOPIC]"

Target audience: [WHO IS THIS FOR?]
Target word count: [1000/1500/2000/2500]
Primary keyword: [MAIN SEO KEYWORD]
Secondary keywords: [2-3 RELATED KEYWORDS]

Include:
1. A compelling title (with the primary keyword)
2. Meta description (under 160 characters)
3. Introduction hook (2-3 approaches to choose from)
4. 4-6 main sections with H2 headers
5. 2-3 bullet points per section describing what to cover
6. Suggested places to add images, examples, or data
7. Conclusion with call-to-action options
8. 3 internal linking suggestions`,
    category_id: 'cat-3',
    difficulty: 'beginner',
    model_recommendation: 'Any model',
    tags: ['blog', 'SEO', 'content writing', 'outline'],
    status: 'approved',
    author_id: 'user-2',
    vote_count: 44,
    bookmark_count: 29,
    created_at: '2026-03-11T00:00:00Z',
    updated_at: '2026-03-11T00:00:00Z',
  },
  {
    id: 'prompt-7',
    title: 'Cold Email Sequence Writer',
    description: 'Generate a 3-email cold outreach sequence with personalization hooks, value props, and follow-up strategies.',
    content: `Write a 3-email cold outreach sequence for [YOUR PRODUCT/SERVICE].

Context:
- I'm reaching out to: [TARGET ROLE, e.g., "marketing directors at mid-size SaaS companies"]
- My product/service: [BRIEF DESCRIPTION]
- Key value proposition: [MAIN BENEFIT]
- Social proof: [ANY METRICS, TESTIMONIALS, OR NOTABLE CLIENTS]

For each email:
- Subject line (A/B test: give 2 options)
- Email body (keep under 150 words)
- Clear CTA
- Personalization placeholder: [SPECIFIC DETAIL ABOUT THEIR COMPANY]

Email 1: Initial outreach (focus on their pain point)
Email 2: Follow-up after 3 days (add value, share a relevant insight)
Email 3: Break-up email after 5 more days (create gentle urgency)`,
    category_id: 'cat-3',
    difficulty: 'intermediate',
    model_recommendation: 'Claude or ChatGPT-4',
    tags: ['email', 'cold outreach', 'sales', 'B2B'],
    status: 'approved',
    author_id: 'user-1',
    vote_count: 38,
    bookmark_count: 22,
    created_at: '2026-03-17T00:00:00Z',
    updated_at: '2026-03-17T00:00:00Z',
  },

  // ---- CODING ----
  {
    id: 'prompt-8',
    title: 'Code Review Assistant',
    description: 'Get a thorough code review with suggestions for bugs, security issues, performance, and best practices.',
    content: `Review the following code and provide feedback in these categories:

1. **Bugs & Logic Errors** - Any logic mistakes, off-by-one errors, null pointer risks
2. **Security** - SQL injection, XSS, authentication issues, data exposure
3. **Performance** - Unnecessary loops, memory leaks, N+1 queries, caching opportunities
4. **Readability** - Naming conventions, code organization, comments needed
5. **Best Practices** - Design patterns, DRY violations, error handling

For each issue found:
- Severity: 🔴 Critical / 🟡 Warning / 🔵 Suggestion
- Line reference
- What's wrong
- How to fix it (with code example)

Language: [PROGRAMMING LANGUAGE]
Context: [WHAT THIS CODE DOES]

\`\`\`
[PASTE YOUR CODE HERE]
\`\`\``,
    category_id: 'cat-4',
    difficulty: 'beginner',
    model_recommendation: 'Claude or ChatGPT-4',
    tags: ['code review', 'debugging', 'best practices', 'security'],
    status: 'approved',
    author_id: 'user-3',
    vote_count: 71,
    bookmark_count: 45,
    created_at: '2026-03-10T00:00:00Z',
    updated_at: '2026-03-10T00:00:00Z',
  },
  {
    id: 'prompt-9',
    title: 'API Endpoint Designer',
    description: 'A 2-step chain that takes your app requirements and produces a complete RESTful API design with schemas and documentation.',
    content: 'This is a multi-step prompt chain. Follow each step in order, using the output of the previous step as context for the next.',
    category_id: 'cat-4',
    difficulty: 'intermediate',
    model_recommendation: 'Claude',
    tags: ['API', 'REST', 'backend', 'architecture', 'chain'],
    status: 'approved',
    author_id: 'user-1',
    vote_count: 42,
    bookmark_count: 27,
    created_at: '2026-03-18T00:00:00Z',
    updated_at: '2026-03-18T00:00:00Z',
  },

  // ---- DESIGN ----
  {
    id: 'prompt-10',
    title: 'UI/UX Audit Checklist',
    description: 'Get a comprehensive audit of your website or app\'s user experience with actionable improvement suggestions.',
    content: `Perform a UI/UX audit for my [WEBSITE/APP]. I'll describe the current state and you'll provide a structured assessment.

App/website description: [WHAT IT DOES]
Target users: [WHO USES IT]
Main user goal: [WHAT USERS COME TO DO]
Current pain points I've noticed: [ANY KNOWN ISSUES]

Evaluate across these dimensions (score each 1-10):
1. **First Impression** - Visual hierarchy, clarity of purpose, trust signals
2. **Navigation** - Information architecture, menu structure, findability
3. **Content** - Readability, tone, error messages, empty states
4. **Forms & Inputs** - Field labels, validation, error handling, progress
5. **Mobile Experience** - Responsive design, touch targets, load time
6. **Accessibility** - Color contrast, alt text, keyboard navigation, screen readers
7. **Conversion Flow** - CTAs, friction points, trust builders

For each dimension: score, 2-3 specific issues found, and concrete fix suggestions.
End with a prioritized action plan (quick wins vs. larger efforts).`,
    category_id: 'cat-5',
    difficulty: 'intermediate',
    model_recommendation: 'Claude or ChatGPT-4',
    tags: ['UI', 'UX', 'audit', 'design', 'accessibility'],
    status: 'approved',
    author_id: 'user-2',
    vote_count: 33,
    bookmark_count: 19,
    created_at: '2026-03-19T00:00:00Z',
    updated_at: '2026-03-19T00:00:00Z',
  },

  // ---- EDUCATION ----
  {
    id: 'prompt-11',
    title: 'Concept Explainer (Feynman Technique)',
    description: 'Get any complex topic explained simply, as if teaching it to a beginner. Uses the Feynman technique for deep understanding.',
    content: `Explain [CONCEPT/TOPIC] using the Feynman Technique. Here's how:

1. **Simple Explanation** - Explain it as if I'm a smart 12-year-old. No jargon. Use everyday analogies.
2. **Core Mechanism** - What's actually happening under the hood? Walk through the key process step by step.
3. **Real-World Example** - Give a concrete, relatable example showing this concept in action.
4. **Common Misconceptions** - What do most people get wrong about this? Correct those misunderstandings.
5. **Connection Map** - How does this concept connect to 3 related concepts I might already know?
6. **Test My Understanding** - Give me 3 questions I should be able to answer if I truly understand this.

My current level of knowledge: [NONE / SOME BASICS / INTERMEDIATE]
Why I'm learning this: [SCHOOL / WORK / CURIOSITY]`,
    category_id: 'cat-6',
    difficulty: 'beginner',
    model_recommendation: 'Any model',
    tags: ['learning', 'education', 'explanation', 'studying'],
    status: 'approved',
    author_id: 'user-1',
    vote_count: 56,
    bookmark_count: 38,
    created_at: '2026-03-08T00:00:00Z',
    updated_at: '2026-03-08T00:00:00Z',
  },

  // ---- PRODUCTIVITY ----
  {
    id: 'prompt-12',
    title: 'Weekly Review & Planning Template',
    description: 'Conduct a structured weekly review and plan your next week with clear priorities and time blocks.',
    content: `Help me conduct my weekly review and plan next week.

**REVIEW THIS WEEK:**
What I planned to do: [LIST YOUR PLANNED TASKS]
What I actually accomplished: [LIST WHAT GOT DONE]
What got blocked or postponed: [LIST INCOMPLETE ITEMS]
Biggest win this week: [YOUR WIN]
Biggest challenge: [YOUR CHALLENGE]

**PLAN NEXT WEEK:**
My top 3 priorities: [LIST THEM]
Meetings/commitments already scheduled: [LIST WITH DAYS/TIMES]
Deadlines coming up: [LIST WITH DATES]

Please:
1. Analyze my completion rate and identify patterns
2. Suggest what to carry forward vs. drop vs. delegate
3. Create a day-by-day plan for next week with time blocks
4. Identify my "one thing" for each day — the task that makes everything else easier
5. Add buffer time for unexpected tasks (suggest how much based on this week's pattern)`,
    category_id: 'cat-7',
    difficulty: 'beginner',
    model_recommendation: 'Any model',
    tags: ['productivity', 'planning', 'weekly review', 'time management'],
    status: 'approved',
    author_id: 'user-2',
    vote_count: 41,
    bookmark_count: 30,
    created_at: '2026-03-20T00:00:00Z',
    updated_at: '2026-03-20T00:00:00Z',
  },

  // ---- DATA ----
  {
    id: 'prompt-13',
    title: 'Survey Question Generator',
    description: 'Create effective, unbiased survey questions for customer research, employee feedback, or market research.',
    content: `Design a survey for [PURPOSE: customer satisfaction / market research / employee feedback / product feedback].

Context:
- Target respondents: [WHO WILL TAKE THIS]
- Goal: [WHAT DO I WANT TO LEARN?]
- How results will be used: [DECISIONS THIS WILL INFORM]
- Desired survey length: [5-10 / 10-15 / 15-20 questions]

Create the survey with:
1. An engaging intro paragraph (explains purpose, estimated time, confidentiality)
2. Screening questions (if needed)
3. Core questions — mix of:
   - Multiple choice (single and multi-select)
   - Likert scale (1-5 agreement/satisfaction)
   - Open-ended (limited to 2-3)
   - Ranking questions
4. Demographic questions (at the end)
5. Closing thank-you message

For each question, note:
- Why this question matters (what insight it provides)
- Whether it's required or optional
- Any skip logic (if answer X, skip to question Y)

Avoid: leading questions, double-barreled questions, jargon, and bias.`,
    category_id: 'cat-8',
    difficulty: 'beginner',
    model_recommendation: 'Any model',
    tags: ['survey', 'research', 'data collection', 'feedback'],
    status: 'approved',
    author_id: 'user-3',
    vote_count: 25,
    bookmark_count: 14,
    created_at: '2026-03-22T00:00:00Z',
    updated_at: '2026-03-22T00:00:00Z',
  },

  // ---- STRATEGY ----
  {
    id: 'prompt-14',
    title: 'SWOT Analysis Generator',
    description: 'Generate a comprehensive SWOT analysis for any business, product, or project with strategic recommendations.',
    content: `Perform a SWOT analysis for [BUSINESS/PRODUCT/PROJECT NAME].

Context:
- Industry: [YOUR INDUSTRY]
- Stage: [STARTUP / GROWTH / MATURE]
- Main competitors: [LIST 2-3]
- Current situation: [BRIEF DESCRIPTION OF WHERE THINGS STAND]

Create a detailed SWOT matrix:

**Strengths** (internal, positive) - What do we do well? What unique resources do we have?
**Weaknesses** (internal, negative) - Where do we fall short? What could we improve?
**Opportunities** (external, positive) - What trends could we leverage? What gaps exist in the market?
**Threats** (external, negative) - What obstacles do we face? What are competitors doing?

For each quadrant: provide 4-5 specific, actionable items (not generic statements).

Then create a strategy matrix:
- SO Strategies (use strengths to capture opportunities)
- WO Strategies (overcome weaknesses using opportunities)
- ST Strategies (use strengths to avoid threats)
- WT Strategies (minimize weaknesses and avoid threats)

End with: Top 3 strategic priorities based on this analysis.`,
    category_id: 'cat-9',
    difficulty: 'beginner',
    model_recommendation: 'Claude or ChatGPT-4',
    tags: ['SWOT', 'strategy', 'business planning', 'analysis'],
    status: 'approved',
    author_id: 'user-1',
    vote_count: 39,
    bookmark_count: 21,
    created_at: '2026-03-21T00:00:00Z',
    updated_at: '2026-03-21T00:00:00Z',
  },

  // ---- PERSONAL ----
  {
    id: 'prompt-15',
    title: 'Travel Itinerary Planner',
    description: 'Create a detailed day-by-day travel itinerary with activities, restaurants, budget estimates, and local tips.',
    content: `Plan a trip to [DESTINATION] for [NUMBER] days.

Trip details:
- Dates: [START DATE] to [END DATE]
- Travelers: [NUMBER OF PEOPLE, AGES, ANY SPECIAL NEEDS]
- Budget: [BUDGET / BACKPACKER / MID-RANGE / LUXURY]
- Interests: [HISTORY / FOOD / ADVENTURE / RELAXATION / NIGHTLIFE / NATURE]
- Accommodation preference: [HOTEL / AIRBNB / HOSTEL]
- Already booked: [ANY PRE-BOOKED ACTIVITIES OR HOTELS]
- Must-sees: [ANYTHING SPECIFIC YOU DON'T WANT TO MISS]
- Dietary restrictions: [ANY]

Create a day-by-day itinerary including:
1. Morning, afternoon, and evening activities
2. Restaurant recommendations for each meal (with cuisine type and price range)
3. Transportation between activities (how to get there, estimated cost)
4. Estimated daily budget breakdown
5. Local tips (tipping customs, safety, etiquette, best times to visit attractions)
6. A "Plan B" for each day in case of rain/closures
7. Packing suggestions specific to this destination and season`,
    category_id: 'cat-10',
    difficulty: 'beginner',
    model_recommendation: 'Any model',
    tags: ['travel', 'itinerary', 'vacation', 'planning'],
    status: 'approved',
    author_id: 'user-2',
    vote_count: 58,
    bookmark_count: 42,
    created_at: '2026-03-09T00:00:00Z',
    updated_at: '2026-03-09T00:00:00Z',
  },

  // ---- PENDING PROMPTS (for admin dashboard demo) ----
  {
    id: 'prompt-16',
    title: 'Negotiation Script Builder',
    description: 'Prepare for any negotiation with a structured script, talking points, and responses to common objections.',
    content: `Help me prepare for a negotiation about [WHAT: salary, contract, deal, price].

Context:
- My position: [WHAT I WANT]
- Their likely position: [WHAT THEY PROBABLY WANT]
- My BATNA (best alternative): [WHAT I'LL DO IF THIS FAILS]
- Relationship importance: [ONE-TIME / ONGOING]

Create:
1. Opening statement (sets collaborative tone)
2. My top 3 talking points with supporting evidence
3. Concessions I can offer (ranked by cost to me)
4. 5 likely objections and my responses to each
5. Anchoring strategy (what number/terms to open with and why)
6. Walk-away point (when to end the negotiation)
7. Closing script (how to finalize the agreement)`,
    category_id: 'cat-9',
    difficulty: 'intermediate',
    model_recommendation: 'Claude or ChatGPT-4',
    tags: ['negotiation', 'business', 'communication', 'salary'],
    status: 'pending',
    author_id: 'user-3',
    vote_count: 0,
    bookmark_count: 0,
    created_at: '2026-04-08T00:00:00Z',
    updated_at: '2026-04-08T00:00:00Z',
  },
  {
    id: 'prompt-17',
    title: 'Landing Page Copy Generator',
    description: 'Generate conversion-optimized landing page copy with headlines, benefits, social proof sections, and CTAs.',
    content: `Write landing page copy for [PRODUCT/SERVICE].

Details:
- What it does: [DESCRIPTION]
- Target customer: [WHO]
- Main pain point it solves: [PROBLEM]
- Key differentiator: [WHY US OVER COMPETITORS]
- Price point: [PRICE OR PRICING MODEL]
- Social proof available: [TESTIMONIALS, NUMBERS, LOGOS]

Generate:
1. Hero section: headline (under 10 words), subheadline, primary CTA
2. Problem section: describe the pain point vividly
3. Solution section: how the product solves it
4. Benefits section: 3-4 benefits with icons and descriptions
5. Social proof section: format the available proof effectively
6. FAQ section: 5 likely questions and answers
7. Final CTA section: urgency-driven closing

Provide 3 headline variations (benefit-driven, curiosity-driven, social-proof-driven).`,
    category_id: 'cat-2',
    difficulty: 'intermediate',
    model_recommendation: 'Any model',
    tags: ['landing page', 'copywriting', 'conversion', 'marketing'],
    status: 'pending',
    author_id: 'user-2',
    vote_count: 0,
    bookmark_count: 0,
    created_at: '2026-04-09T00:00:00Z',
    updated_at: '2026-04-09T00:00:00Z',
  },
  {
    id: 'prompt-18',
    title: 'Regex Pattern Builder',
    description: 'Describe what you want to match in plain English and get the regex pattern with explanation and test cases.',
    content: `I need a regular expression that matches: [DESCRIBE IN PLAIN ENGLISH WHAT YOU WANT TO MATCH]

Examples of strings that SHOULD match:
- [EXAMPLE 1]
- [EXAMPLE 2]
- [EXAMPLE 3]

Examples of strings that should NOT match:
- [EXAMPLE 1]
- [EXAMPLE 2]

Language/environment: [JavaScript / Python / Java / etc.]

Please provide:
1. The regex pattern
2. A breakdown of each part of the pattern (what each character/group does)
3. Test it against all my examples (show match/no-match results)
4. Edge cases to be aware of
5. The code snippet to use it in my language (match, search, replace, validate)`,
    category_id: 'cat-4',
    difficulty: 'beginner',
    model_recommendation: 'Any model',
    tags: ['regex', 'programming', 'pattern matching', 'developer tools'],
    status: 'pending',
    author_id: 'user-1',
    vote_count: 0,
    bookmark_count: 0,
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
  },
]
