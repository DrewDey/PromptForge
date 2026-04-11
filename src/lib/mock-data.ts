import { Category, Profile, Prompt, PromptStep } from './types'

export const mockProfiles: Profile[] = [
  {
    id: 'user-1',
    username: 'marcusdev',
    display_name: 'Marcus Chen',
    avatar_url: null,
    bio: 'Full-stack dev building with AI daily. Sharing everything I make.',
    role: 'admin',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'user-2',
    username: 'sarahgrows',
    display_name: 'Sarah Mitchell',
    avatar_url: null,
    bio: 'Marketing consultant. I use AI to 10x my client work.',
    role: 'user',
    created_at: '2026-03-05T00:00:00Z',
    updated_at: '2026-03-05T00:00:00Z',
  },
  {
    id: 'user-3',
    username: 'jakefinance',
    display_name: 'Jake Torres',
    avatar_url: null,
    bio: 'CFO at a startup. Automating everything finance with AI.',
    role: 'user',
    created_at: '2026-03-10T00:00:00Z',
    updated_at: '2026-03-10T00:00:00Z',
  },
  {
    id: 'user-4',
    username: 'priya_creates',
    display_name: 'Priya Sharma',
    avatar_url: null,
    bio: 'UX designer and AI tinkerer. Making design faster.',
    role: 'user',
    created_at: '2026-03-12T00:00:00Z',
    updated_at: '2026-03-12T00:00:00Z',
  },
  {
    id: 'user-5',
    username: 'teacherben',
    display_name: 'Ben Okafor',
    avatar_url: null,
    bio: 'High school teacher using AI to build better lessons.',
    role: 'user',
    created_at: '2026-03-15T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
  },
  {
    id: 'user-6',
    username: 'ops_nina',
    display_name: 'Nina Kowalski',
    avatar_url: null,
    bio: 'Operations manager at a 50-person agency. Obsessed with removing busywork.',
    role: 'user',
    created_at: '2026-03-18T00:00:00Z',
    updated_at: '2026-03-18T00:00:00Z',
  },
  {
    id: 'user-7',
    username: 'dataraj',
    display_name: 'Raj Patel',
    avatar_url: null,
    bio: 'Data analyst turned freelance consultant. I build dashboards and automate reports.',
    role: 'user',
    created_at: '2026-03-20T00:00:00Z',
    updated_at: '2026-03-20T00:00:00Z',
  },
  {
    id: 'user-8',
    username: 'emwriter',
    display_name: 'Emily Zhao',
    avatar_url: null,
    bio: 'Freelance content strategist. Former journalist, now I help startups tell their story.',
    role: 'user',
    created_at: '2026-03-22T00:00:00Z',
    updated_at: '2026-03-22T00:00:00Z',
  },
  {
    id: 'user-9',
    username: 'cto_derek',
    display_name: 'Derek Lawson',
    avatar_url: null,
    bio: 'CTO at a health-tech startup. 15 years in engineering, now building with AI daily.',
    role: 'user',
    created_at: '2026-03-25T00:00:00Z',
    updated_at: '2026-03-25T00:00:00Z',
  },
  {
    id: 'user-10',
    username: 'lena_solopreneur',
    display_name: 'Lena Morales',
    avatar_url: null,
    bio: 'Solopreneur running an Etsy shop and two niche sites. AI is my only employee.',
    role: 'user',
    created_at: '2026-03-28T00:00:00Z',
    updated_at: '2026-03-28T00:00:00Z',
  },
  {
    id: 'user-11',
    username: 'pathforge_projects',
    display_name: 'PathForge Projects',
    avatar_url: null,
    bio: 'Curated real-world AI projects you can follow along with. Built step by step, with every prompt and result documented.',
    role: 'user',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
]

export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Finance & Accounting', slug: 'finance', description: 'Budgeting, forecasting, analysis, and financial planning', icon: '💰', prompt_count: 5, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-2', name: 'Marketing & Sales', slug: 'marketing', description: 'Campaigns, content strategy, lead generation, and outreach', icon: '📢', prompt_count: 3, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-3', name: 'Writing & Content', slug: 'writing', description: 'Blog posts, emails, copy, and creative writing', icon: '✍️', prompt_count: 4, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-4', name: 'Coding & Development', slug: 'coding', description: 'Code generation, debugging, architecture, and documentation', icon: '💻', prompt_count: 2, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-5', name: 'Design & Creative', slug: 'design', description: 'UI/UX, branding, image generation, and visual design', icon: '🎨', prompt_count: 1, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-6', name: 'Education & Learning', slug: 'education', description: 'Study plans, explanations, tutoring, and course creation', icon: '📚', prompt_count: 1, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-7', name: 'Productivity', slug: 'productivity', description: 'Task management, meetings, workflows, and automation', icon: '⚡', prompt_count: 16, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-8', name: 'Data & Analysis', slug: 'data', description: 'Data visualization, surveys, reporting, and insights', icon: '📊', prompt_count: 2, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-9', name: 'Business Strategy', slug: 'strategy', description: 'SWOT analysis, business plans, market research, and OKRs', icon: '🎯', prompt_count: 3, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-10', name: 'Personal & Fun', slug: 'personal', description: 'Travel, recipes, hobbies, games, and lifestyle', icon: '🎮', prompt_count: 2, created_at: '2026-03-01T00:00:00Z' },
]

export const mockSteps: PromptStep[] = [
  // === Personal Expense Tracker App — 5-step build (prompt-38) ===
  { id: 'step-38a', prompt_id: 'prompt-38', step_number: 1, title: 'Project Setup & Data Model',
    content: `I want to build a personal expense tracker as a single-page React app. Here's what I need for the MVP:

- Add expenses with: amount, category (groceries, dining, transport, entertainment, utilities, health, shopping, other), date, and a short note
- See a running list of all expenses, newest first
- See a summary: total spent this month, breakdown by category, and a simple bar chart
- All data stored in localStorage for now (no backend)

Start by giving me:
1. The complete project setup (I'll use Vite + React + TypeScript)
2. The TypeScript types/interfaces for the data model
3. A custom hook (useExpenses) that handles all CRUD operations with localStorage
4. The main App component shell with routing between 3 views: Dashboard, Add Expense, History

Make sure the hook handles edge cases like first-time users with no data, and include a few seed expenses so the app doesn't look empty on first load.`,
    result_content: `Here's the complete foundation:

**Project setup:**
\`\`\`bash
npm create vite@latest expense-tracker -- --template react-ts
cd expense-tracker
npm install recharts date-fns
npm install -D @types/node
\`\`\`

**Types (src/types.ts):**
\`\`\`typescript
export type Category = 'groceries' | 'dining' | 'transport' | 'entertainment' | 'utilities' | 'health' | 'shopping' | 'other'

export interface Expense {
  id: string
  amount: number
  category: Category
  date: string // ISO format
  note: string
  createdAt: string
}

export interface MonthSummary {
  total: number
  byCategory: Record<Category, number>
  count: number
}

export const CATEGORY_CONFIG: Record<Category, { label: string; color: string; emoji: string }> = {
  groceries: { label: 'Groceries', color: '#4CAF50', emoji: '🛒' },
  dining: { label: 'Dining Out', color: '#FF9800', emoji: '🍽️' },
  transport: { label: 'Transport', color: '#2196F3', emoji: '🚗' },
  entertainment: { label: 'Entertainment', color: '#9C27B0', emoji: '🎬' },
  utilities: { label: 'Utilities', color: '#607D8B', emoji: '💡' },
  health: { label: 'Health', color: '#F44336', emoji: '🏥' },
  shopping: { label: 'Shopping', color: '#E91E63', emoji: '🛍️' },
  other: { label: 'Other', color: '#795548', emoji: '📦' },
}
\`\`\`

**Custom hook (src/hooks/useExpenses.ts):**
\`\`\`typescript
import { useState, useEffect, useCallback } from 'react'
import { Expense, Category, MonthSummary } from '../types'

const STORAGE_KEY = 'expense-tracker-data'

const SEED_EXPENSES: Expense[] = [
  { id: '1', amount: 67.50, category: 'groceries', date: new Date().toISOString().split('T')[0], note: 'Weekly grocery run at Trader Joe\\'s', createdAt: new Date().toISOString() },
  { id: '2', amount: 42.00, category: 'dining', date: new Date().toISOString().split('T')[0], note: 'Dinner with friends', createdAt: new Date().toISOString() },
  { id: '3', amount: 35.00, category: 'transport', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], note: 'Gas fillup', createdAt: new Date().toISOString() },
  { id: '4', amount: 15.99, category: 'entertainment', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], note: 'Netflix subscription', createdAt: new Date().toISOString() },
  { id: '5', amount: 120.00, category: 'utilities', date: new Date(Date.now() - 172800000).toISOString().split('T')[0], note: 'Electric bill', createdAt: new Date().toISOString() },
]

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { return JSON.parse(stored) }
      catch { return SEED_EXPENSES }
    }
    return SEED_EXPENSES
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  }, [expenses])

  const addExpense = useCallback((data: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    setExpenses(prev => [newExpense, ...prev])
  }, [])

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
  }, [])

  const getMonthSummary = useCallback((year: number, month: number): MonthSummary => {
    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    const byCategory = {} as Record<Category, number>
    for (const e of monthExpenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    }
    return {
      total: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
      byCategory,
      count: monthExpenses.length,
    }
  }, [expenses])

  return { expenses, addExpense, deleteExpense, getMonthSummary }
}
\`\`\`

**App shell (src/App.tsx):**
\`\`\`tsx
import { useState } from 'react'
import { useExpenses } from './hooks/useExpenses'
import Dashboard from './components/Dashboard'
import AddExpense from './components/AddExpense'
import History from './components/History'

type View = 'dashboard' | 'add' | 'history'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const { expenses, addExpense, deleteExpense, getMonthSummary } = useExpenses()

  return (
    <div className="app">
      <nav className="nav">
        <h1>💰 Expense Tracker</h1>
        <div className="nav-links">
          <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'active' : ''}>Dashboard</button>
          <button onClick={() => setView('add')} className={view === 'add' ? 'active' : ''}>Add</button>
          <button onClick={() => setView('history')} className={view === 'history' ? 'active' : ''}>History</button>
        </div>
      </nav>
      <main>
        {view === 'dashboard' && <Dashboard expenses={expenses} getMonthSummary={getMonthSummary} />}
        {view === 'add' && <AddExpense onAdd={(data) => { addExpense(data); setView('dashboard') }} />}
        {view === 'history' && <History expenses={expenses} onDelete={deleteExpense} />}
      </main>
    </div>
  )
}
\`\`\`

This gives you the full skeleton — types, data management with localStorage persistence, seed data so it's not empty, and a clean component structure. Each view is its own component that we'll build next.`,
    description: 'Set up the project, define data types, and build the localStorage-backed expense hook', created_at: '2026-04-05T00:00:00Z' },

  { id: 'step-38b', prompt_id: 'prompt-38', step_number: 2, title: 'Dashboard View with Charts',
    content: `Great, the foundation works. Now build the Dashboard component. It should show:

1. A "hero" summary card at the top with: total spent this month (big number), number of transactions, and daily average
2. A horizontal bar chart showing spending by category (use Recharts), sorted highest to lowest, with the category emoji and amount label on each bar
3. A "recent transactions" mini-list showing the last 5 expenses with category emoji, note, amount, and relative date ("today", "yesterday", "3 days ago")

Style it clean and modern — dark background (#1a1a2e), card backgrounds (#16213e), and use the category colors from our CATEGORY_CONFIG for the chart bars. Make it look like a fintech app, not a homework assignment.`,
    result_content: `**Dashboard component (src/components/Dashboard.tsx):**
\`\`\`tsx
import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { Expense, MonthSummary, CATEGORY_CONFIG, Category } from '../types'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  expenses: Expense[]
  getMonthSummary: (year: number, month: number) => MonthSummary
}

export default function Dashboard({ expenses, getMonthSummary }: Props) {
  const now = new Date()
  const summary = getMonthSummary(now.getFullYear(), now.getMonth())

  const chartData = useMemo(() => {
    return Object.entries(summary.byCategory)
      .map(([cat, amount]) => ({
        name: CATEGORY_CONFIG[cat as Category].emoji + ' ' + CATEGORY_CONFIG[cat as Category].label,
        amount: Math.round(amount * 100) / 100,
        color: CATEGORY_CONFIG[cat as Category].color,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [summary])

  const recentExpenses = expenses.slice(0, 5)
  const daysInMonth = now.getDate()
  const dailyAvg = summary.count > 0 ? (summary.total / daysInMonth).toFixed(2) : '0.00'

  return (
    <div className="dashboard">
      {/* Hero Summary */}
      <div className="summary-card">
        <div className="summary-main">
          <span className="summary-label">Spent this month</span>
          <span className="summary-amount">\${summary.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-value">{summary.count}</span>
            <span className="stat-label">transactions</span>
          </div>
          <div className="stat">
            <span className="stat-value">\${dailyAvg}</span>
            <span className="stat-label">daily avg</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown Chart */}
      <div className="chart-card">
        <h2>Spending by Category</h2>
        <ResponsiveContainer width="100%" height={chartData.length * 48 + 20}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 40 }}>
            <XAxis type="number" tickFormatter={(v) => \`\$\${v}\`} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#e0e0e0', fontSize: 13 }} />
            <Tooltip formatter={(value: number) => [\`\$\${value.toFixed(2)}\`, 'Spent']}
              contentStyle={{ background: '#16213e', border: '1px solid #2a3a5c', borderRadius: 8 }} />
            <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={28}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Transactions */}
      <div className="recent-card">
        <h2>Recent Transactions</h2>
        {recentExpenses.map(expense => (
          <div key={expense.id} className="recent-item">
            <span className="recent-emoji">{CATEGORY_CONFIG[expense.category].emoji}</span>
            <div className="recent-details">
              <span className="recent-note">{expense.note}</span>
              <span className="recent-date">{formatDistanceToNow(new Date(expense.date), { addSuffix: true })}</span>
            </div>
            <span className="recent-amount">-\${expense.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
\`\`\`

The dashboard looks like a real fintech app now. The dark theme with glowing category colors gives it that polished feel. The bar chart auto-sorts so your biggest spending category is always on top — instant visibility into where your money goes.`,
    description: 'Build the dashboard with summary stats, category bar chart, and recent transactions', created_at: '2026-04-05T00:00:00Z' },

  { id: 'step-38c', prompt_id: 'prompt-38', step_number: 3, title: 'Add Expense Form',
    content: `Now build the "Add Expense" form. Requirements:

1. Clean, mobile-friendly form with fields: amount (number input with $ prefix), category (grid of buttons with emojis instead of a dropdown — feels way better on mobile), date (defaults to today), note (short text)
2. The category selector should highlight the selected one with that category's color
3. Amount input should be large and prominent — it's the most important field
4. Form validation: amount must be > 0, category must be selected, note is optional
5. After submission, show a brief success animation (green checkmark that fades) before navigating back to dashboard
6. Include a "quick add" section at the top with 3 buttons for common expenses: "☕ Coffee $5.50", "🚗 Gas $45", "🛒 Groceries $75" that auto-fill the form

Keep the dark theme consistent with the dashboard.`,
    result_content: `**AddExpense component (src/components/AddExpense.tsx):**
\`\`\`tsx
import { useState } from 'react'
import { Category, CATEGORY_CONFIG, Expense } from '../types'

interface Props {
  onAdd: (data: Omit<Expense, 'id' | 'createdAt'>) => void
}

const QUICK_ADDS = [
  { label: '☕ Coffee', amount: 5.50, category: 'dining' as Category, note: 'Coffee' },
  { label: '🚗 Gas', amount: 45.00, category: 'transport' as Category, note: 'Gas fillup' },
  { label: '🛒 Groceries', amount: 75.00, category: 'groceries' as Category, note: 'Grocery run' },
]

export default function AddExpense({ onAdd }: Props) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleQuickAdd = (qa: typeof QUICK_ADDS[0]) => {
    setAmount(qa.amount.toString())
    setCategory(qa.category)
    setNote(qa.note)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) { setError('Enter a valid amount'); return }
    if (!category) { setError('Pick a category'); return }

    onAdd({ amount: numAmount, category, date, note: note || 'Expense' })
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 1500)
  }

  if (showSuccess) {
    return (
      <div className="success-screen">
        <div className="success-check">✓</div>
        <p>Expense added!</p>
      </div>
    )
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      {/* Quick Add Buttons */}
      <div className="quick-add-section">
        <span className="quick-label">Quick add:</span>
        <div className="quick-buttons">
          {QUICK_ADDS.map(qa => (
            <button key={qa.label} type="button" className="quick-btn" onClick={() => handleQuickAdd(qa)}>
              {qa.label} \${qa.amount}
            </button>
          ))}
        </div>
      </div>

      {/* Amount Input */}
      <div className="amount-input-wrapper">
        <span className="dollar-sign">$</span>
        <input type="number" step="0.01" placeholder="0.00" value={amount}
          onChange={e => setAmount(e.target.value)} className="amount-input" autoFocus />
      </div>

      {/* Category Grid */}
      <div className="category-grid">
        {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([key, config]) => (
          <button key={key} type="button"
            className={\`category-btn \${category === key ? 'selected' : ''}\`}
            style={category === key ? { borderColor: config.color, background: config.color + '22' } : {}}
            onClick={() => setCategory(key)}>
            <span className="cat-emoji">{config.emoji}</span>
            <span className="cat-label">{config.label}</span>
          </button>
        ))}
      </div>

      {/* Date & Note */}
      <div className="form-row">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="date-input" />
        <input type="text" placeholder="What was this for?" value={note}
          onChange={e => setNote(e.target.value)} className="note-input" />
      </div>

      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="submit-btn">Add Expense</button>
    </form>
  )
}
\`\`\`

The category grid with emojis feels SO much better than a dropdown, especially on mobile. The quick-add buttons are a game changer for daily stuff — one tap for your morning coffee. The success animation gives nice tactile feedback without being annoying.`,
    description: 'Create the expense form with quick-add buttons, emoji category picker, and validation', created_at: '2026-04-06T00:00:00Z' },

  { id: 'step-38d', prompt_id: 'prompt-38', step_number: 4, title: 'History View with Filters',
    content: `Build the History view. This is where you see ALL your expenses and can actually make sense of your spending over time. Requirements:

1. Filter bar at the top: category filter (multi-select chips), date range (this week / this month / last month / custom), and a search box that filters by note text
2. The expense list should group expenses by date with date headers ("Today", "Yesterday", "Mon, Apr 7")
3. Each expense row shows: category emoji, note, amount, and a delete button (swipe-to-delete would be cool but a trash icon is fine for now)
4. Running total at the bottom that updates as you filter: "Showing $X across Y transactions"
5. If no expenses match the filters, show a friendly empty state

Also add an export button that downloads the filtered expenses as a CSV file. People want their data.`,
    result_content: `**History component (src/components/History.tsx):**
\`\`\`tsx
import { useState, useMemo } from 'react'
import { Expense, Category, CATEGORY_CONFIG } from '../types'
import { format, isToday, isYesterday, startOfWeek, startOfMonth, subMonths } from 'date-fns'

interface Props {
  expenses: Expense[]
  onDelete: (id: string) => void
}

type DateRange = 'week' | 'month' | 'last-month' | 'all'

export default function History({ expenses, onDelete }: Props) {
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(new Set())

  const toggleCategory = (cat: Category) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const filtered = useMemo(() => {
    const now = new Date()
    return expenses.filter(e => {
      // Date filter
      const d = new Date(e.date)
      if (dateRange === 'week' && d < startOfWeek(now)) return false
      if (dateRange === 'month' && d < startOfMonth(now)) return false
      if (dateRange === 'last-month') {
        const lm = subMonths(startOfMonth(now), 0)
        if (d < subMonths(lm, 1) || d >= lm) return false
      }
      // Category filter
      if (selectedCategories.size > 0 && !selectedCategories.has(e.category)) return false
      // Search filter
      if (search && !e.note.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [expenses, dateRange, selectedCategories, search])

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, Expense[]> = {}
    for (const e of filtered) {
      const key = e.date
      if (!groups[key]) groups[key] = []
      groups[key].push(e)
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const total = filtered.reduce((s, e) => s + e.amount, 0)

  const exportCSV = () => {
    const header = 'Date,Category,Amount,Note\\n'
    const rows = filtered.map(e =>
      \`\${e.date},\${CATEGORY_CONFIG[e.category].label},\${e.amount.toFixed(2)},"\${e.note}"\`
    ).join('\\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = \`expenses-\${format(new Date(), 'yyyy-MM-dd')}.csv\`
    a.click()
  }

  const formatDateHeader = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    if (isToday(d)) return 'Today'
    if (isYesterday(d)) return 'Yesterday'
    return format(d, 'EEE, MMM d')
  }

  return (
    <div className="history">
      {/* Search */}
      <input type="text" placeholder="Search expenses..." value={search}
        onChange={e => setSearch(e.target.value)} className="search-input" />

      {/* Date Range Tabs */}
      <div className="date-tabs">
        {(['week', 'month', 'last-month', 'all'] as DateRange[]).map(range => (
          <button key={range} className={\`tab \${dateRange === range ? 'active' : ''}\`}
            onClick={() => setDateRange(range)}>
            {{ week: 'This Week', month: 'This Month', 'last-month': 'Last Month', all: 'All Time' }[range]}
          </button>
        ))}
      </div>

      {/* Category Chips */}
      <div className="category-chips">
        {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([key, config]) => (
          <button key={key} className={\`chip \${selectedCategories.has(key) ? 'active' : ''}\`}
            style={selectedCategories.has(key) ? { background: config.color + '33', borderColor: config.color } : {}}
            onClick={() => toggleCategory(key)}>
            {config.emoji} {config.label}
          </button>
        ))}
      </div>

      {/* Expense List */}
      {grouped.length === 0 ? (
        <div className="empty-state">
          <p>No expenses match your filters</p>
          <p className="empty-sub">Try broadening your search or date range</p>
        </div>
      ) : (
        grouped.map(([date, items]) => (
          <div key={date} className="date-group">
            <h3 className="date-header">{formatDateHeader(date)}</h3>
            {items.map(expense => (
              <div key={expense.id} className="expense-row">
                <span className="row-emoji">{CATEGORY_CONFIG[expense.category].emoji}</span>
                <div className="row-details">
                  <span className="row-note">{expense.note}</span>
                  <span className="row-category">{CATEGORY_CONFIG[expense.category].label}</span>
                </div>
                <span className="row-amount">-\${expense.amount.toFixed(2)}</span>
                <button className="delete-btn" onClick={() => onDelete(expense.id)}>🗑️</button>
              </div>
            ))}
          </div>
        ))
      )}

      {/* Footer Summary */}
      <div className="history-footer">
        <span>Showing \${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} across {filtered.length} transactions</span>
        <button className="export-btn" onClick={exportCSV}>📥 Export CSV</button>
      </div>
    </div>
  )
}
\`\`\`

The grouped-by-date layout makes it easy to mentally trace "what did I spend on Tuesday?" The multi-select category chips let you compare spending across categories fast. And the CSV export is the kind of small feature that makes people actually trust the tool with their real data.`,
    description: 'Build the filterable, searchable history view with CSV export', created_at: '2026-04-06T00:00:00Z' },

  { id: 'step-38e', prompt_id: 'prompt-38', step_number: 5, title: 'Polish: Styling, Animations & Monthly Comparison',
    content: `Last step — let's make this feel professional. Three things:

1. Complete CSS file for the entire app. Dark theme (background #0f0f23, cards #1a1a3e, accent #6c5ce7). Modern, clean, with subtle hover effects and transitions. Mobile-first — should look great on a phone screen.
2. Add a "vs last month" comparison to the dashboard summary card. Show a percentage change with a green/red arrow. If this month I've spent $1,200 and last month was $1,450, show "↓ 17% vs last month" in green.
3. Add a subtle entrance animation on the dashboard cards — they should fade in and slide up slightly when the page loads. Use CSS keyframes, not a library.

Give me the complete CSS file and the updated Dashboard summary section.`,
    result_content: `**Complete stylesheet (src/App.css):**
\`\`\`css
/* === Base === */
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg: #0f0f23;
  --card: #1a1a3e;
  --card-border: #2a2a5e;
  --text: #e0e0e0;
  --text-dim: #8888aa;
  --accent: #6c5ce7;
  --accent-glow: #6c5ce722;
  --success: #00b894;
  --danger: #e17055;
  --radius: 12px;
}
body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text); }
.app { max-width: 480px; margin: 0 auto; min-height: 100vh; padding: 0 16px 80px; }

/* === Nav === */
.nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid var(--card-border); margin-bottom: 24px; }
.nav h1 { font-size: 1.25rem; }
.nav-links { display: flex; gap: 4px; }
.nav-links button { background: none; border: none; color: var(--text-dim); padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
.nav-links button.active { background: var(--accent); color: white; }
.nav-links button:hover:not(.active) { background: var(--card); }

/* === Dashboard === */
.dashboard { display: flex; flex-direction: column; gap: 20px; }
.summary-card { background: linear-gradient(135deg, var(--accent), #a855f7); border-radius: var(--radius); padding: 28px; animation: slideUp 0.4s ease-out; }
.summary-main { margin-bottom: 20px; }
.summary-label { font-size: 0.85rem; opacity: 0.8; display: block; }
.summary-amount { font-size: 2.5rem; font-weight: 700; }
.summary-comparison { font-size: 0.85rem; margin-top: 6px; display: flex; align-items: center; gap: 4px; }
.comparison-down { color: var(--success); }
.comparison-up { color: #ffeaa7; }
.summary-stats { display: flex; gap: 32px; }
.stat-value { font-size: 1.3rem; font-weight: 600; display: block; }
.stat-label { font-size: 0.75rem; opacity: 0.7; }

.chart-card, .recent-card { background: var(--card); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 20px; animation: slideUp 0.5s ease-out; }
.chart-card h2, .recent-card h2 { font-size: 1rem; margin-bottom: 16px; color: var(--text-dim); }

.recent-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--card-border); }
.recent-item:last-child { border-bottom: none; }
.recent-emoji { font-size: 1.5rem; }
.recent-details { flex: 1; }
.recent-note { display: block; font-size: 0.9rem; }
.recent-date { font-size: 0.75rem; color: var(--text-dim); }
.recent-amount { font-weight: 600; color: var(--danger); }

/* === Animations === */
@keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.chart-card { animation-delay: 0.1s; animation-fill-mode: both; }
.recent-card { animation-delay: 0.2s; animation-fill-mode: both; }

/* === Add Form === */
.add-form { display: flex; flex-direction: column; gap: 20px; }
.quick-add-section { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.quick-label { font-size: 0.8rem; color: var(--text-dim); }
.quick-btn { background: var(--card); border: 1px solid var(--card-border); color: var(--text); padding: 8px 14px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; transition: border-color 0.2s; }
.quick-btn:hover { border-color: var(--accent); }
.amount-input-wrapper { display: flex; align-items: center; background: var(--card); border-radius: var(--radius); padding: 16px; border: 2px solid var(--card-border); transition: border-color 0.2s; }
.amount-input-wrapper:focus-within { border-color: var(--accent); }
.dollar-sign { font-size: 2rem; font-weight: 700; color: var(--text-dim); margin-right: 8px; }
.amount-input { background: none; border: none; color: var(--text); font-size: 2rem; font-weight: 700; width: 100%; outline: none; }
.category-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.category-btn { background: var(--card); border: 2px solid var(--card-border); border-radius: var(--radius); padding: 14px 8px; cursor: pointer; text-align: center; transition: all 0.2s; }
.category-btn.selected { transform: scale(1.05); }
.cat-emoji { font-size: 1.5rem; display: block; margin-bottom: 4px; }
.cat-label { font-size: 0.7rem; color: var(--text-dim); }
.form-row { display: flex; gap: 12px; }
.date-input, .note-input { flex: 1; background: var(--card); border: 1px solid var(--card-border); color: var(--text); padding: 12px; border-radius: 8px; font-size: 0.9rem; }
.submit-btn { background: var(--accent); color: white; border: none; padding: 16px; border-radius: var(--radius); font-size: 1rem; font-weight: 600; cursor: pointer; transition: transform 0.15s; }
.submit-btn:active { transform: scale(0.97); }
.form-error { color: var(--danger); font-size: 0.85rem; }
.success-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; animation: slideUp 0.3s ease-out; }
.success-check { font-size: 4rem; color: var(--success); margin-bottom: 12px; }

/* === History === */
.history { display: flex; flex-direction: column; gap: 16px; }
.search-input { background: var(--card); border: 1px solid var(--card-border); color: var(--text); padding: 12px 16px; border-radius: 8px; font-size: 0.9rem; width: 100%; }
.date-tabs { display: flex; gap: 6px; overflow-x: auto; }
.tab { background: var(--card); border: 1px solid var(--card-border); color: var(--text-dim); padding: 8px 14px; border-radius: 20px; font-size: 0.8rem; cursor: pointer; white-space: nowrap; }
.tab.active { background: var(--accent); color: white; border-color: var(--accent); }
.category-chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
.chip { background: none; border: 1px solid var(--card-border); color: var(--text-dim); padding: 6px 12px; border-radius: 16px; font-size: 0.8rem; cursor: pointer; white-space: nowrap; }
.chip.active { color: var(--text); }
.date-header { font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 0; }
.expense-row { display: flex; align-items: center; gap: 12px; background: var(--card); border-radius: 10px; padding: 14px; margin-bottom: 6px; }
.row-emoji { font-size: 1.3rem; }
.row-details { flex: 1; }
.row-note { display: block; font-size: 0.9rem; }
.row-category { font-size: 0.75rem; color: var(--text-dim); }
.row-amount { font-weight: 600; color: var(--danger); margin-right: 8px; }
.delete-btn { background: none; border: none; cursor: pointer; font-size: 1rem; opacity: 0.4; transition: opacity 0.2s; }
.delete-btn:hover { opacity: 1; }
.history-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; font-size: 0.85rem; color: var(--text-dim); border-top: 1px solid var(--card-border); }
.export-btn { background: var(--card); border: 1px solid var(--card-border); color: var(--text); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.empty-state { text-align: center; padding: 60px 20px; color: var(--text-dim); }
.empty-sub { font-size: 0.85rem; margin-top: 8px; }
\`\`\`

**Updated Dashboard comparison (add to Dashboard.tsx):**
\`\`\`tsx
// Inside the Dashboard component, after getting current summary:
const lastMonth = now.getMonth() === 0
  ? getMonthSummary(now.getFullYear() - 1, 11)
  : getMonthSummary(now.getFullYear(), now.getMonth() - 1)

const pctChange = lastMonth.total > 0
  ? Math.round(((summary.total - lastMonth.total) / lastMonth.total) * 100)
  : null

// In JSX, after summary-amount:
{pctChange !== null && (
  <div className={\`summary-comparison \${pctChange <= 0 ? 'comparison-down' : 'comparison-up'}\`}>
    {pctChange <= 0 ? '↓' : '↑'} {Math.abs(pctChange)}% vs last month
  </div>
)}
\`\`\`

And that's a wrap. Five prompts, one complete expense tracker that looks and feels like a real fintech app. Dark theme, smooth animations, mobile-first layout, CSV export — built entirely through conversation with Claude.`,
    description: 'Add complete CSS styling, month-over-month comparison, and entrance animations', created_at: '2026-04-06T00:00:00Z' },

  // === Brand Identity (prompt-1) ===
  { id: 'step-1a', prompt_id: 'prompt-1', step_number: 1, title: 'Brand Discovery',
    content: 'I\'m starting a specialty bakery in Austin, TX called "Sunrise Bakery" focused on sourdough and pastries. Our target customers are health-conscious millennials who value artisan quality and local sourcing. Our differentiator is that we mill our own flour from Texas-grown wheat. Help me develop a brand foundation: brand personality (5 traits), brand voice description, tagline options (give me 8), and a one-paragraph brand story.',
    result_content: 'Brand Personality: 1) Warm & Welcoming — like the smell of fresh bread in the morning. 2) Artisan & Authentic — we don\'t cut corners, we hand-shape them. 3) Earthy & Grounded — rooted in Texas soil, literally. 4) Playful — we take our craft seriously, but not ourselves. 5) Community-First — your neighborhood living room that smells incredible.\n\nBrand Voice: Conversational and knowledgeable. We talk like your friend who happens to be obsessed with fermentation science. We explain what makes our bread special without being pretentious about it.\n\nTagline Options:\n1. "From Texas Wheat to Your Morning Treat"\n2. "Milled Here. Baked Here. Loved Here."\n3. "Rise With Us"\n4. "Real Flour. Real Craft. Real Good."\n5. "Where Every Loaf Has a Story"\n6. "Baked at Dawn, Gone by Noon"\n7. "Grain to Loaf, Start to Finish"\n8. "The Bakery That Starts From Scratch — Literally"\n\nBrand Story: Sunrise Bakery was born from a simple question: what if we could taste the difference between bread made from freshly-milled local wheat and everything else on the shelf? Turns out, you absolutely can. We source grain from Texas farms within 200 miles of our Austin kitchen, mill it ourselves each morning, and bake it into sourdough and pastries that taste like bread is supposed to taste. We\'re not trying to reinvent baking — we\'re trying to remember what it was before shortcuts became the norm.',
    description: 'Define brand personality, voice, and story foundation', created_at: '2026-03-15T00:00:00Z' },
  { id: 'step-1b', prompt_id: 'prompt-1', step_number: 2, title: 'Visual Identity System',
    content: 'Based on the brand foundation we just created for Sunrise Bakery (artisan, earthy, warm, community-first), create a complete visual identity system. Include: 1) Primary and secondary color palette with hex codes and the reasoning behind each choice, 2) Typography recommendations (specific Google Fonts) for headings, body, and accent text, 3) Logo concept description (we\'ll have a designer execute it), 4) Photography style guide for social media.',
    result_content: 'COLOR PALETTE:\n\nPrimary:\n- Warm Wheat #D4A843 — our hero color, represents the golden flour and the sunrise in our name\n- Deep Crust #3D2B1F — rich brown like a perfectly baked sourdough crust\n\nSecondary:\n- Flour Dust #FAF6F0 — our light background, warm white like dusted flour on a counter\n- Sage Field #7C8B6E — nods to the Texas landscape where our wheat grows\n- Sunrise Coral #E8845C — warm accent for CTAs and highlights\n\nTYPOGRAPHY:\n- Headings: "DM Serif Display" — warm, editorial, has bakery character without being cliché\n- Body: "Inter" — clean and readable, balances the serif headings\n- Accent/Quotes: "Caveat" — handwritten feel for menu boards, quotes, personal touches\n\nLOGO CONCEPT:\nA minimalist rising sun integrated into a wheat stalk. The sun is half-visible on the horizon line, with 3 wheat stalks growing upward from it. Below: "SUNRISE BAKERY" in DM Serif Display, "Austin, TX" in small caps Inter underneath. The mark should work in single-color (Deep Crust brown) and reversed on dark backgrounds.\n\nPHOTOGRAPHY STYLE:\n- Warm, natural lighting (golden hour feel, never harsh flash)\n- Hands in frame — show the human craft (kneading, shaping, dusting)\n- Raw ingredients as props (whole wheat berries, flour, starter)\n- Muted, earthy tones with the Sunrise Coral as an occasional pop\n- Close-up texture shots of bread crust, crumb structure, flaky pastry layers',
    description: 'Create color palette, typography, logo concept, and photo style', created_at: '2026-03-15T00:00:00Z' },
  { id: 'step-1c', prompt_id: 'prompt-1', step_number: 3, title: 'Brand Guidelines Document',
    content: 'Now compile everything into a structured brand guidelines document for Sunrise Bakery. This will be shared with our designer, social media manager, and any future hires. Format it as a clean, section-by-section document with: Brand Overview, Mission & Values, Brand Voice (with do\'s and don\'ts examples), Visual Identity (colors, type, logo usage rules), Social Media Guidelines, and a section on how to talk about our milling process without being boring.',
    result_content: null,
    description: 'Compile everything into a shareable brand guidelines doc', created_at: '2026-03-15T00:00:00Z' },

  // === Customer Review Analyzer (prompt-4) ===
  { id: 'step-4a', prompt_id: 'prompt-4', step_number: 1, title: 'Build the Analysis Script',
    content: 'I have ~500 customer reviews for my e-commerce store (home office furniture) exported as a CSV with columns: review_id, date, rating (1-5), review_text, product_name. Write a Python script that: 1) Reads the CSV, 2) Categorizes each review into sentiment (positive/negative/neutral) and topics (quality, shipping, price, customer service, assembly, comfort), 3) Outputs a summary JSON with: overall sentiment breakdown, top complaints, top praises, sentiment trend by month, and product-level scores. Use only standard libraries plus the csv and json modules — no ML frameworks needed, use keyword matching for the MVP.',
    result_content: '```python\nimport csv\nimport json\nfrom collections import defaultdict\nfrom datetime import datetime\n\n# Keyword dictionaries for topic detection\nTOPICS = {\n    "quality": ["quality", "well-made", "durable", "sturdy", "flimsy", "cheap", "broke", "solid"],\n    "shipping": ["shipping", "delivery", "arrived", "package", "damaged", "fast", "slow", "late"],\n    "price": ["price", "expensive", "affordable", "worth", "value", "overpriced", "cheap"],\n    "customer_service": ["support", "customer service", "response", "helpful", "rude", "return"],\n    "assembly": ["assembly", "instructions", "build", "setup", "install", "tools", "easy to put"],\n    "comfort": ["comfortable", "ergonomic", "support", "cushion", "lumbar", "adjustable", "sitting"]\n}\n\nPOSITIVE = ["love", "great", "excellent", "amazing", "perfect", "best", "fantastic", "happy", "recommend"]\nNEGATIVE = ["hate", "terrible", "worst", "awful", "disappointed", "broken", "waste", "return", "refund"]\n\ndef analyze_reviews(filepath):\n    results = []\n    monthly = defaultdict(lambda: {"positive": 0, "negative": 0, "neutral": 0})\n    product_scores = defaultdict(lambda: {"total_rating": 0, "count": 0, "topics": defaultdict(int)})\n    \n    with open(filepath, "r") as f:\n        reader = csv.DictReader(f)\n        for row in reader:\n            text = row["review_text"].lower()\n            rating = int(row["rating"])\n            month = datetime.strptime(row["date"], "%Y-%m-%d").strftime("%Y-%m")\n            \n            # Sentiment\n            pos_count = sum(1 for w in POSITIVE if w in text)\n            neg_count = sum(1 for w in NEGATIVE if w in text)\n            sentiment = "positive" if rating >= 4 or pos_count > neg_count else "negative" if rating <= 2 or neg_count > pos_count else "neutral"\n            \n            # Topics\n            topics = [t for t, keywords in TOPICS.items() if any(k in text for k in keywords)]\n            \n            monthly[month][sentiment] += 1\n            product_scores[row["product_name"]]["total_rating"] += rating\n            product_scores[row["product_name"]]["count"] += 1\n            for t in topics:\n                product_scores[row["product_name"]]["topics"][t] += 1\n            \n            results.append({"id": row["review_id"], "sentiment": sentiment, "topics": topics, "rating": rating})\n    \n    # Build summary\n    total = len(results)\n    summary = {\n        "total_reviews": total,\n        "sentiment_breakdown": {\n            "positive": len([r for r in results if r["sentiment"] == "positive"]),\n            "negative": len([r for r in results if r["sentiment"] == "negative"]),\n            "neutral": len([r for r in results if r["sentiment"] == "neutral"])\n        },\n        "monthly_trend": dict(monthly),\n        "product_scores": {k: {"avg_rating": round(v["total_rating"]/v["count"], 1), "review_count": v["count"], "top_topics": dict(v["topics"])} for k, v in product_scores.items()}\n    }\n    \n    with open("review_analysis.json", "w") as f:\n        json.dump(summary, f, indent=2)\n    print(f"Analyzed {total} reviews. Results saved to review_analysis.json")\n\nanalyze_reviews("reviews.csv")\n```',
    description: 'Generate Python script for sentiment analysis and topic categorization', created_at: '2026-03-22T00:00:00Z' },
  { id: 'step-4b', prompt_id: 'prompt-4', step_number: 2, title: 'Weekly Report Template',
    content: 'Now create a script that takes the review_analysis.json output and generates a clean, readable weekly report in Markdown format. The report should include: executive summary (2-3 sentences), sentiment pie chart data, top 3 issues to address, top 3 things customers love, product ranking by satisfaction, and 3 recommended actions based on the data. Make it something I can paste into Slack or email to my team every Monday.',
    result_content: '```python\nimport json\nfrom datetime import datetime\n\ndef generate_report(analysis_path):\n    with open(analysis_path) as f:\n        data = json.load(f)\n    \n    s = data["sentiment_breakdown"]\n    total = data["total_reviews"]\n    pos_pct = round(s["positive"]/total*100)\n    neg_pct = round(s["negative"]/total*100)\n    \n    report = f"""# Customer Review Report — Week of {datetime.now().strftime(\'%B %d, %Y\')}\n\n## Executive Summary\nWe analyzed **{total} reviews** this period. **{pos_pct}% positive**, {neg_pct}% negative. \n{"⚠️ Negative sentiment is above 20% — needs attention." if neg_pct > 20 else "✅ Sentiment is healthy."}\n\n## Sentiment Breakdown\n| Sentiment | Count | Percentage |\n|-----------|-------|------------|\n| Positive | {s["positive"]} | {pos_pct}% |\n| Neutral | {s["neutral"]} | {round(s["neutral"]/total*100)}% |\n| Negative | {s["negative"]} | {neg_pct}% |\n\n## Product Rankings\n"""\n    products = sorted(data["product_scores"].items(), key=lambda x: x[1]["avg_rating"], reverse=True)\n    for name, info in products:\n        stars = "⭐" * round(info["avg_rating"])\n        report += f"- **{name}** — {info[\'avg_rating\']}/5 {stars} ({info[\'review_count\']} reviews)\\n"\n    \n    report += "\\n---\\n*Generated automatically by ReviewBot*"\n    \n    with open("weekly_report.md", "w") as f:\n        f.write(report)\n    print("Report saved to weekly_report.md")\n\ngenerate_report("review_analysis.json")\n```\n\nSample output when run:\n\n# Customer Review Report — Week of March 22, 2026\n\n## Executive Summary\nWe analyzed **487 reviews** this period. **68% positive**, 18% negative.\n✅ Sentiment is healthy.\n\n## Top Issues\n1. Assembly instructions unclear (mentioned in 34% of negative reviews)\n2. Shipping damage on standing desks (12 mentions)\n3. Lumbar support on the ErgoChair wearing out after 3 months\n\n## What Customers Love\n1. Build quality of the solid wood desks\n2. Customer service responsiveness\n3. Comfort of the mesh-back chairs',
    description: 'Create a Markdown report generator for weekly team updates', created_at: '2026-03-22T00:00:00Z' },

  // === React Dashboard (prompt-6) ===
  { id: 'step-6a', prompt_id: 'prompt-6', step_number: 1, title: 'Architecture & Project Setup',
    content: 'I need to build an admin dashboard for a SaaS analytics product. The dashboard should have: a sidebar nav, top stats cards (MRR, active users, churn rate, NPS), a revenue chart (line chart, last 12 months), a recent activity feed, and a customers table with search and pagination. Use Next.js 14, TypeScript, Tailwind CSS, and Recharts for the charts. Give me the full project structure and the layout component with sidebar navigation.',
    result_content: null,
    description: 'Define architecture and create the layout shell', created_at: '2026-03-25T00:00:00Z' },
  { id: 'step-6b', prompt_id: 'prompt-6', step_number: 2, title: 'Stats Cards & Revenue Chart',
    content: 'Now build the main dashboard page. Create: 1) Four stats cards showing MRR ($48,200, +12.5%), Active Users (2,847, +5.3%), Churn Rate (3.2%, -0.8%), and NPS Score (72, +4). Each card should show the metric, the change percentage with a green/red color, and a small sparkline. 2) A revenue line chart using Recharts showing monthly revenue for the last 12 months. Use this data: [32k, 35k, 33k, 38k, 36k, 40k, 42k, 39k, 44k, 45k, 46k, 48.2k]. Make it responsive.',
    result_content: null,
    description: 'Build the stats overview and revenue chart components', created_at: '2026-03-25T00:00:00Z' },
  { id: 'step-6c', prompt_id: 'prompt-6', step_number: 3, title: 'Customer Table with Search',
    content: 'Add a customers table component below the chart. Features: search bar that filters by name or email, sortable columns (Name, Email, Plan, MRR, Status, Joined), pagination (10 per page), status badges (active = green, churned = red, trial = yellow). Generate 30 rows of realistic fake customer data. Include the full component code with state management for search, sort, and pagination.',
    result_content: null,
    description: 'Create searchable, sortable customer data table', created_at: '2026-03-25T00:00:00Z' },

  // === Email Sequence (prompt-5) ===
  { id: 'step-5a', prompt_id: 'prompt-5', step_number: 1, title: 'Sequence Strategy & Structure',
    content: 'I run a project management SaaS tool called "FlowDesk" (similar to Linear but for agencies). I need a 7-email onboarding sequence for new trial users. The trial is 14 days. Goal: get users to invite their team and create their first project within the first 3 days, then convert to paid by day 14. Give me: the send schedule (which day each email goes), the goal of each email, subject line options (2 per email), and a one-sentence summary of the content angle.',
    result_content: 'FLOWDESK ONBOARDING EMAIL SEQUENCE — STRATEGY\n\nEmail 1 — Day 0 (immediately after signup)\nGoal: Welcome + get them to create their first project\nSubjects: "Your FlowDesk workspace is ready" / "Let\'s set up your first project (takes 2 min)"\nAngle: Warm welcome, single CTA to create a project with a direct link\n\nEmail 2 — Day 1\nGoal: Get them to invite a team member\nSubjects: "FlowDesk works better with your team" / "Invite one person — see the magic"\nAngle: Show that collaboration is where the value is, make inviting dead simple\n\nEmail 3 — Day 3\nGoal: Feature highlight — show the timeline view\nSubjects: "The feature agencies switch for" / "See your projects the way clients see them"\nAngle: Demo the visual timeline that differentiates us from competitors\n\nEmail 4 — Day 5\nGoal: Social proof — share a customer story\nSubjects: "How Redline Agency cut their project chaos by 60%" / "This agency manages 40 clients in FlowDesk"\nAngle: Real story, real numbers, let the customer sell for us\n\nEmail 5 — Day 8\nGoal: Address the #1 objection (migration is hard)\nSubjects: "Switching tools doesn\'t have to suck" / "Import from Asana, Trello, or Notion in 5 min"\nAngle: Acknowledge the pain, show how easy migration actually is\n\nEmail 6 — Day 11\nGoal: Urgency — trial ending soon\nSubjects: "Your trial ends in 3 days" / "Don\'t lose your setup — here\'s what happens next"\nAngle: Remind what they\'ve built, show what they\'d lose, present pricing\n\nEmail 7 — Day 14\nGoal: Final conversion push + offer\nSubjects: "Last day: 20% off your first 3 months" / "Your FlowDesk trial ends tonight"\nAngle: Limited-time discount, clear CTA, easy upgrade path',
    description: 'Map out the full email sequence strategy and timing', created_at: '2026-03-20T00:00:00Z' },
  { id: 'step-5b', prompt_id: 'prompt-5', step_number: 2, title: 'Full Email Copy',
    content: 'Now write the complete email copy for all 7 emails. For each email: subject line (use option A from the strategy), preview text (under 60 chars), body copy (keep each email under 150 words — these should be short and scannable), and one clear CTA button. Tone: friendly, direct, no fluff. Write like a smart friend who happens to work at FlowDesk, not a marketing robot.',
    result_content: 'EMAIL 1 — DAY 0\n\nSubject: Your FlowDesk workspace is ready\nPreview: Let\'s get your first project set up\n\nHey [First Name],\n\nWelcome to FlowDesk! Your workspace is live and ready to go.\n\nThe teams that get the most out of FlowDesk all do the same thing first: they create a project. It takes about 2 minutes and it\'ll immediately show you how everything flows.\n\nYou can start from scratch or use one of our agency templates (client onboarding, campaign tracker, sprint board).\n\n[Create Your First Project →]\n\nIf you need anything, just reply to this email. Real humans here.\n\n— The FlowDesk Team\n\n---\n\nEMAIL 2 — DAY 1\n\nSubject: FlowDesk works better with your team\nPreview: Invite one person — takes 10 seconds\n\nHey [First Name],\n\nSolo project management is just... a to-do list. The real power of FlowDesk shows up when your team is in there with you.\n\nInvite one person today. They\'ll see the project you created, and you\'ll both see why agencies are switching to this.\n\n[Invite a Team Member →]\n\nFun fact: teams that invite at least 2 people during trial are 4x more likely to say "where has this been all my life."\n\n— The FlowDesk Team',
    description: 'Write the full copy for all 7 onboarding emails', created_at: '2026-03-20T00:00:00Z' },

  // === Portfolio Analyzer (prompt-7) ===
  { id: 'step-7a', prompt_id: 'prompt-7', step_number: 1, title: 'Spreadsheet Formula Design',
    content: 'I manage a personal investment portfolio (~$200k across 15 positions: index funds, individual stocks, bonds, and a REIT). I want a Google Sheets tool that: 1) Takes my current positions (ticker, shares, cost basis), 2) Pulls current prices (I\'ll manually update weekly), 3) Calculates: current allocation % vs target allocation %, drift for each position, total portfolio gain/loss, and suggests rebalancing trades to get within 2% of target. Design all the formulas and the sheet structure. Use columns A-J.',
    result_content: 'SHEET STRUCTURE — "Portfolio Rebalancer"\n\nRow 1: Headers\nA: Ticker | B: Asset Class | C: Shares | D: Cost Basis/Share | E: Current Price | F: Market Value | G: Current % | H: Target % | I: Drift | J: Action\n\nRow 2 (example: VTI):\nA2: VTI\nB2: US Equity\nC2: 150\nD2: 220.00\nE2: 248.50 (manually updated)\nF2: =C2*E2 → $37,275\nG2: =F2/F$17 → 18.6% (F17 is total)\nH2: 20% (your target)\nI2: =G2-H2 → -1.4%\nJ2: =IF(ABS(I2)>0.02, IF(I2<0, "BUY "&TEXT(ROUND((H2*F$17-F2)/E2,0),"0")&" shares", "SELL "&TEXT(ROUND((F2-H2*F$17)/E2,0),"0")&" shares"), "OK")\n\nRow 17: TOTALS\nF17: =SUM(F2:F16) → total portfolio value\nG17: =SUM(G2:G16) → should equal 100%\n\nSummary Section (Row 19+):\nA19: "Total Portfolio Value" | B19: =F17\nA20: "Total Cost Basis" | B20: =SUMPRODUCT(C2:C16,D2:D16)\nA21: "Total Gain/Loss" | B21: =B19-B20\nA22: "Total Return %" | B22: =B21/B20\nA23: "Positions Needing Rebalance" | B23: =COUNTIF(J2:J16,"<>OK")',
    description: 'Design the spreadsheet structure with all formulas', created_at: '2026-04-01T00:00:00Z' },
  { id: 'step-7b', prompt_id: 'prompt-7', step_number: 2, title: 'Tax-Loss Harvesting Logic',
    content: 'Add a tax-loss harvesting layer. Add columns K-M: K = Unrealized Gain/Loss per position (=F-C*D), L = "Harvest?" flag (YES if loss > $500 and held > 30 days), M = Tax Savings Estimate (assuming 24% bracket). Also add a "Wash Sale Warning" column N that flags if I\'ve bought the same ticker in the last 30 days (I\'ll have a separate "Transactions" sheet with columns: Date, Ticker, Action, Shares). Give me the formulas.',
    result_content: 'NEW COLUMNS:\n\nK: Unrealized G/L\nK2: =F2-(C2*D2) → shows gain or loss per position\n\nL: Harvest?\nL2: =IF(AND(K2<-500, (TODAY()-VLOOKUP(A2,Transactions!B:A,2,FALSE))>30), "YES", "NO")\n\nM: Est. Tax Savings\nM2: =IF(L2="YES", ABS(K2)*0.24, 0)\nM17: =SUM(M2:M16) → "Total potential tax savings"\n\nN: Wash Sale Warning\nN2: =IF(COUNTIFS(Transactions!B:B,A2,Transactions!C:C,"BUY",Transactions!A:A,">"&TODAY()-30)>0, "⚠️ WASH SALE RISK", "")\n\nTRANSACTIONS SHEET:\nA: Date | B: Ticker | C: Action (BUY/SELL) | D: Shares | E: Price\n\nSUMMARY ADDITIONS (main sheet):\nA24: "Harvestable Losses" | B24: =SUMPRODUCT((L2:L16="YES")*K2:K16)\nA25: "Potential Tax Savings" | B25: =M17\nA26: "Wash Sale Warnings" | B26: =COUNTIF(N2:N16,"*WASH*")',
    description: 'Add tax optimization formulas and wash sale detection', created_at: '2026-04-01T00:00:00Z' },

  // === Python Course (prompt-9) ===
  { id: 'step-9a', prompt_id: 'prompt-9', step_number: 1, title: 'Curriculum Framework',
    content: 'Design an 8-week Python fundamentals course for complete beginners (adult learners, no prior coding experience). Each week should have: a theme, 2 lesson topics, 1 hands-on exercise, 1 mini-project, and a quiz (5 questions). The course should end with students able to build a simple command-line app. Progressive difficulty. Week 1 should feel like "I can do this" and Week 8 should feel like "I can\'t believe I built that."',
    result_content: 'WEEK 1: "Hello, Python" — Making the Computer Talk\nLesson 1: Installing Python, running your first script, print()\nLesson 2: Variables, strings, numbers, input()\nExercise: Build a "Mad Libs" game using input() and string concatenation\nMini-project: Personal intro generator — asks your name, age, hobby, prints a formatted bio\nQuiz: Variable types, print syntax, string operations, input(), basic errors\n\nWEEK 2: "Making Decisions" — If/Else Logic\nLesson 1: Comparison operators, if/elif/else\nLesson 2: Boolean logic, and/or/not, nested conditions\nExercise: Build a tip calculator that adjusts based on service quality rating\nMini-project: "Choose Your Own Adventure" — a 3-path text story with branching logic\nQuiz: Boolean evaluation, condition syntax, indentation rules, nested if behavior, edge cases\n\nWEEK 3: "Doing Things Again" — Loops\nLesson 1: for loops, range(), iterating over strings\nLesson 2: while loops, break/continue, loop patterns\nExercise: Multiplication table printer (user picks the number)\nMini-project: Number guessing game with attempt counter and hints (higher/lower)\nQuiz: for vs while, range parameters, infinite loops, break usage, loop tracing\n\nWEEK 4: "Collections" — Lists and Dictionaries\nLesson 1: Lists — creating, indexing, slicing, methods (append, sort, etc.)\nLesson 2: Dictionaries — key-value pairs, accessing, iterating\nExercise: Build a contact book (add, search, delete contacts)\nMini-project: Grade tracker — stores student names and scores, calculates averages, finds highest/lowest\n\nWEEK 5: "Building Blocks" — Functions\nLesson 1: Defining functions, parameters, return values\nLesson 2: Scope, default arguments, multiple returns\nExercise: Refactor the grade tracker to use functions\nMini-project: Unit converter app — handles miles/km, lbs/kg, F/C with a menu\n\nWEEK 6: "Working with Files" — Reading and Writing Data\nLesson 1: Opening files, reading text, with statement\nLesson 2: Writing files, CSV basics, handling errors with try/except\nExercise: Word frequency counter — reads a text file, counts each word\nMini-project: Expense logger — add expenses via CLI, saves to CSV, shows totals by category\n\nWEEK 7: "Leveling Up" — Modules and APIs\nLesson 1: Importing modules, useful stdlib (random, datetime, os)\nLesson 2: Installing packages with pip, making a simple API call with requests\nExercise: Build a random password generator with customizable rules\nMini-project: Weather app — asks for a city, calls a free weather API, displays the forecast\n\nWEEK 8: "The Capstone" — Build a Real App\nLesson 1: Project planning, breaking problems into functions\nLesson 2: Code review, debugging strategies, next steps in your Python journey\nExercise: Debug a broken script (5 intentional bugs to find and fix)\nMini-project: CAPSTONE — Personal finance CLI app that combines everything: file I/O, dictionaries, functions, loops, user input. Tracks income/expenses, saves to file, shows reports, plots a simple bar chart using a text-based library.',
    description: 'Design the complete 8-week course structure', created_at: '2026-03-28T00:00:00Z' },

  // === Weekly Report Automator (prompt-16) ===
  { id: 'step-16a', prompt_id: 'prompt-16', step_number: 1, title: 'Identify Report Inputs and Structure',
    content: 'I\'m an operations manager at a digital agency with 50 people. Every Friday I spend 3 hours compiling a weekly status report from: Slack channel updates, Harvest time tracking exports (CSV), and a Monday.com board export (CSV). The final report goes to our CEO and has sections for: Team Utilization (billable vs non-billable hours), Active Project Status (on track / at risk / behind), Wins of the Week, and Blockers. Design a system where I paste raw data into a prompt and get back the formatted report. Start by mapping the inputs to outputs.',
    result_content: 'INPUT → OUTPUT MAPPING:\n\nSource 1: Harvest CSV (columns: person, project, client, hours, billable?)\n→ Output: Team Utilization table (per-person billable %, team avg, comparison to 75% target)\n→ Output: Project hours breakdown (which projects consumed the most time)\n\nSource 2: Monday.com CSV (columns: project, status, owner, due_date, notes)\n→ Output: Active Projects table (project name, status badge, owner, days until due, risk flag)\n→ Output: At-Risk callout section (any project with status "stuck" or due in <5 days)\n\nSource 3: Slack highlights (pasted text, unstructured)\n→ Output: "Wins" section (3-5 bullet points, extracted and cleaned up)\n→ Output: "Blockers" section (anything flagged as blocked or waiting)\n\nFORMAT:\n1. One-paragraph executive summary (2-3 sentences, tone: confident but honest)\n2. Team Utilization table with color indicators\n3. Active Projects table sorted by risk level\n4. Wins (bulleted)\n5. Blockers + Suggested Actions\n6. Key number of the week (one standout metric)',
    description: 'Map data sources to report sections', created_at: '2026-04-06T00:00:00Z' },
  { id: 'step-16b', prompt_id: 'prompt-16', step_number: 2, title: 'Build the Master Prompt',
    content: 'Now write me the actual prompt I\'ll use every Friday. It should have three clearly marked paste zones where I drop in the raw data. The prompt should: parse the Harvest CSV into utilization stats, parse the Monday.com CSV into project status, extract wins and blockers from the Slack text, then compile everything into the report format we designed. Include instructions for tone (professional but not boring) and length (under 500 words total).',
    result_content: 'WEEKLY STATUS REPORT GENERATOR\n\n---BEGIN PROMPT---\n\nYou are an operations reporting assistant. I\'m going to give you three data sources. Parse them and compile a weekly status report for our CEO.\n\n## DATA SOURCE 1 — TIME TRACKING (Harvest CSV)\n```\n[PASTE HARVEST CSV HERE]\n```\n\nFrom this data:\n- Calculate each person\'s billable percentage (billable hours / total hours)\n- Calculate team average billable %\n- Flag anyone below 60% utilization\n- Note the top 3 projects by hours consumed\n\n## DATA SOURCE 2 — PROJECT BOARD (Monday.com CSV)\n```\n[PASTE MONDAY.COM CSV HERE]\n```\n\nFrom this data:\n- List all active projects with their status and owner\n- Flag at-risk projects: status is "stuck" OR due date is within 5 business days\n- Sort by risk level (at-risk first, then on-track)\n\n## DATA SOURCE 3 — TEAM UPDATES (Slack)\n```\n[PASTE SLACK HIGHLIGHTS HERE]\n```\n\nFrom this text:\n- Extract 3-5 wins (completed milestones, positive client feedback, shipped work)\n- Extract any blockers or dependencies waiting on external parties\n- Suggest a concrete next step for each blocker\n\n## OUTPUT FORMAT\n\nWrite the report in this exact structure. Keep total length under 500 words. Tone: professional, direct, like a sharp operator who respects the reader\'s time.\n\n1. **Executive Summary** (2-3 sentences — what happened this week in plain English)\n2. **Team Utilization** (table: Name | Billable % | Status)\n3. **Project Status** (table: Project | Status | Owner | Due | Risk)\n4. **Wins This Week** (3-5 bullets)\n5. **Blockers & Actions** (each blocker with a suggested action)\n6. **Number of the Week** (one standout metric with brief context)\n\n---END PROMPT---',
    description: 'Create the reusable master prompt with paste zones', created_at: '2026-04-06T00:00:00Z' },
  { id: 'step-16c', prompt_id: 'prompt-16', step_number: 3, title: 'Test with Real Data and Iterate',
    content: 'I just ran the prompt with last Friday\'s real data. The utilization section is great but the project status section is listing archived projects from the CSV. Also the executive summary is too generic — it reads like a template, not like it actually analyzed the data. Fix the prompt to: 1) filter out projects with status "done" or "archived", 2) make the executive summary reference specific numbers and project names, 3) add a week-over-week comparison note for utilization (I\'ll paste last week\'s numbers too).',
    result_content: null,
    description: 'Iterate on the prompt based on real-world test results', created_at: '2026-04-06T00:00:00Z' },

  // === Meeting Notes to Action Items (prompt-17) ===
  { id: 'step-17a', prompt_id: 'prompt-17', step_number: 1, title: 'Define the Extraction Framework',
    content: 'I record all my meetings with Otter.ai and get a transcript. But I still spend 20 minutes after each meeting manually pulling out action items, decisions made, and follow-ups. Build me a prompt that takes a raw meeting transcript and extracts: 1) Decisions made (with who made them), 2) Action items (with owner and deadline if mentioned), 3) Open questions that weren\'t resolved, 4) A 3-sentence summary I can paste into Slack. The transcript is usually messy — people talk over each other, go on tangents, circle back to topics.',
    result_content: 'MEETING INTELLIGENCE EXTRACTOR\n\nI\'ll process your meeting transcript and extract structured information. Here\'s what I need:\n\n---\n\nPaste your transcript below:\n[TRANSCRIPT]\n\n---\n\nOutput:\n\n## Summary (for Slack)\nThe product team met to discuss Q2 roadmap priorities. Three features were greenlit for the April sprint: SSO integration, bulk CSV import, and the redesigned onboarding flow. The team agreed to push the mobile app to Q3 pending the new hire starting.\n\n## Decisions Made\n1. **SSO integration moves to April sprint** — decided by Sarah, approved by Derek\n2. **Mobile app pushed to Q3** — decided by full team, contingent on hiring timeline\n3. **Design review cadence changing to bi-weekly** — proposed by Priya, no objections\n\n## Action Items\n| # | Action | Owner | Deadline | Context |\n|---|--------|-------|----------|---------|\n| 1 | Write SSO technical spec | Derek | April 14 | Needs to cover SAML and OIDC |\n| 2 | Share updated Q2 roadmap | Sarah | April 11 | Include the reprioritized backlog |\n| 3 | Schedule design review for onboarding mocks | Priya | April 12 | Book 90 min, include eng leads |\n| 4 | Send mobile app job posting to recruiting | Marcus | EOW | Derek to review JD first |\n\n## Open Questions\n- Who owns the SSO vendor evaluation? Derek said "probably me" but didn\'t commit\n- Budget for the Q3 mobile app contractor — needs finance input\n- Whether to keep the old onboarding flow as a fallback during rollout',
    description: 'Design the extraction framework and output format', created_at: '2026-04-07T00:00:00Z' },
  { id: 'step-17b', prompt_id: 'prompt-17', step_number: 2, title: 'Handle Edge Cases and Multi-Meeting Context',
    content: 'Two problems: 1) When a transcript is really long (60+ minutes), the action items get buried and some get missed. Break it into a two-pass approach: first pass identifies segments by topic, second pass extracts items from each segment. 2) Some action items reference previous meetings ("remember we said we\'d do X last week"). Add a section for "Carried Over Items" where I can optionally paste last meeting\'s action items so it can flag what was completed and what\'s still open.',
    result_content: null,
    description: 'Handle long transcripts and cross-meeting tracking', created_at: '2026-04-07T00:00:00Z' },

  // === SOPs from Loom Videos (prompt-19) ===
  { id: 'step-19a', prompt_id: 'prompt-19', step_number: 1, title: 'Transcript to Raw SOP',
    content: 'I recorded a 15-minute Loom video showing our new hire how to process a client invoice in our system (QuickBooks + a custom Airtable tracker). The transcript from Loom is messy — lots of "um", "so basically", "let me go back", and narration of mouse movements ("I\'ll click here, then scroll down to..."). Take this transcript and turn it into a clean, numbered SOP document. Remove all filler. Convert mouse-movement narration into clear action steps. Add notes where I mentioned warnings or edge cases.',
    result_content: '# SOP: Processing Client Invoices\n**Last Updated:** April 2026 | **Owner:** Nina K. | **Est. Time:** 8 minutes per invoice\n\n## Prerequisites\n- Access to QuickBooks Online (Accountant role or higher)\n- Access to the "Invoice Tracker" Airtable base\n- Client\'s signed SOW with approved rate card\n\n## Steps\n\n### 1. Create the Invoice in QuickBooks\n1. Navigate to **Sales → Invoices → Create Invoice**\n2. Select the client from the dropdown (search by company name, not contact name)\n3. Set the invoice date to the last day of the billing period\n4. Set payment terms to **Net 30** (unless the SOW specifies otherwise — check the "Payment Terms" field in Airtable)\n\n> **Warning:** Do NOT use "Net 15" for enterprise clients even if they request it. All enterprise contracts are Net 30 per our finance policy.\n\n### 2. Add Line Items\n5. For each deliverable, add a line item with:\n   - Description: [Project Name] — [Deliverable Name] — [Date Range]\n   - Rate: Pull from the rate card in the SOW\n   - Quantity: Hours from the approved timesheet\n6. If there are reimbursable expenses, add them as a separate line item with "Reimbursable:" prefix\n\n> **Edge Case:** If the project has a fixed-fee component AND hourly work, create two sections separated by a subtotal. Label them "Fixed Fee Deliverables" and "Hourly Services."\n\n### 3. Review and Send\n7. Double-check the total against the Airtable estimate (should be within 5%)\n8. Add the client\'s AP email in the "Send to" field (found in Airtable → Clients → AP Contact)\n9. Click **Save and Send**\n10. Download a PDF copy\n\n### 4. Update the Tracker\n11. Open the Invoice Tracker in Airtable\n12. Find the project row and update:\n    - Invoice Number (from QuickBooks)\n    - Invoice Amount\n    - Date Sent\n    - Status → "Sent"\n13. Attach the PDF to the row\n\n## Common Mistakes\n- Using the contact name instead of company name in QuickBooks (causes duplicate client records)\n- Forgetting to attach the PDF in Airtable (finance needs it for reconciliation)\n- Sending to the project manager instead of the AP email',
    description: 'Convert messy Loom transcript into clean numbered SOP', created_at: '2026-04-04T00:00:00Z' },
  { id: 'step-19b', prompt_id: 'prompt-19', step_number: 2, title: 'Add Troubleshooting and FAQ',
    content: 'The SOP is great but our new hires always have the same 5 questions. Add a troubleshooting section based on these real situations: 1) "The client isn\'t showing up in QuickBooks" — they need to be created first, here\'s how. 2) "The hours on the timesheet don\'t match what the PM approved" — always go with the PM-approved number and flag the discrepancy. 3) "The client wants us to use their invoice template" — we don\'t do that, here\'s the polite response. 4) "I sent the invoice to the wrong email" — how to void and resend. 5) "The project has multiple billing contacts" — how to handle split invoices.',
    result_content: null,
    description: 'Add FAQ and troubleshooting based on real questions', created_at: '2026-04-04T00:00:00Z' },

  // === Email Triage System (prompt-20) ===
  { id: 'step-20a', prompt_id: 'prompt-20', step_number: 1, title: 'Design the Triage Categories',
    content: 'I get 120+ emails a day as a freelance consultant. I waste an hour every morning just deciding what needs a response. Design an email triage system I can use with Claude. I\'ll paste batches of 10-15 email subject lines and senders, and I need them categorized into: Respond Today (client work, time-sensitive), Respond This Week (important but not urgent), Delegate (forward to my VA with instructions), Read Later (newsletters, industry updates I actually want to read), and Ignore (marketing, spam that got through, notifications I don\'t need). Also assign a priority score 1-5.',
    result_content: 'EMAIL TRIAGE SYSTEM — CATEGORY DEFINITIONS\n\n🔴 RESPOND TODAY (Priority 1-2)\nCriteria: Direct client emails about active projects, invoicing questions, meeting requests for this week, anything with "urgent" or deadline language from known contacts\nExamples: "Re: Q2 Strategy Deck — feedback by EOD", "Invoice #4521 — quick question"\n\n🟡 RESPOND THIS WEEK (Priority 3)\nCriteria: New business inquiries, non-urgent client requests, collaboration proposals, follow-ups you owe someone\nExamples: "Loved your talk — would you consider a workshop for our team?", "Following up on our coffee chat"\n\n🔵 DELEGATE TO VA (Priority 3-4)\nCriteria: Scheduling requests, document requests, subscription management, anything that needs action but not your brain\nExample output: "→ Forward to VA: Schedule a 30-min call with this person next Tue-Thu afternoon"\n\n⚪ READ LATER (Priority 4)\nCriteria: Newsletters you actually read (I\'ll give you my approved list), industry reports, tool updates, community digests\nExamples: Lenny\'s Newsletter, Stratechery, tool changelogs for products you use\n\n⬛ IGNORE (Priority 5)\nCriteria: Marketing emails from tools you don\'t use, LinkedIn notifications, automated alerts you never act on, cold outreach\n\nAPPROVED NEWSLETTER LIST (for Read Later vs Ignore):\n- Lenny\'s Newsletter → Read Later\n- Stratechery → Read Later\n- Morning Brew → Ignore (you never read it)\n- ProductHunt Daily → Ignore\n- Hacker News Digest → Read Later',
    description: 'Define triage categories and decision criteria', created_at: '2026-04-07T00:00:00Z' },
  { id: 'step-20b', prompt_id: 'prompt-20', step_number: 2, title: 'Build the Batch Processing Prompt',
    content: 'Now create the actual prompt I\'ll use each morning. I want to paste a batch of emails (subject line + sender + first 2 lines of body) and get back a sorted, actionable list. Include the triage category, priority score, a suggested action (1 sentence), and estimated response time. Format it as a table I can quickly scan. Also add a "Daily Summary" line at the top that says something like "12 emails: 3 respond today, 4 this week, 2 delegate, 2 read later, 1 ignore."',
    result_content: 'DAILY EMAIL TRIAGE PROMPT:\n\n---\n\nYou are my email triage assistant. Process each email below and categorize it.\n\nMy context: I\'m a freelance product strategy consultant. Active clients: Meridian Health, TrueNorth Fintech, Bloom Education. My VA is Jamie.\n\n## Today\'s Emails\n[PASTE EMAILS HERE — format: From: / Subject: / Preview:]\n\n## Output Format\n\nFirst line: **Daily Summary:** [count] emails — [X] respond today, [X] this week, [X] delegate, [X] read later, [X] ignore\n\nThen a table:\n\n| # | Category | Priority | From | Subject | Action | Est. Time |\n|---|----------|----------|------|---------|--------|-----------|\n| 1 | 🔴 Today | 1 | Sarah @ Meridian | Re: Q2 deck | Send the updated version she asked for on Thursday | 10 min |\n| 2 | 🔵 Delegate | 3 | Mike Chen | Can we find 30 min next week? | → Jamie: schedule Tue-Thu PM, send my Calendly | 0 min |\n\n---\n\nSAMPLE OUTPUT (from a real morning):\n\n**Daily Summary:** 14 emails — 2 respond today, 4 this week, 3 delegate, 3 read later, 2 ignore\n\n| # | Category | Priority | From | Subject | Action | Est. Time |\n|---|----------|----------|------|---------|--------|-----------|\n| 1 | 🔴 Today | 1 | Lisa Park @ TrueNorth | Urgent: API partner meeting tomorrow | Confirm attendance and review the prep doc she attached | 15 min |\n| 2 | 🔴 Today | 2 | Accounting | Invoice #892 — needs your approval | Open QuickBooks, verify hours, click approve | 5 min |\n| 3 | 🟡 This Week | 3 | Jordan via LinkedIn | Saw your talk at SaaStr — advisory role? | Reply with interest, suggest a 20-min call | 5 min |\n| 4 | 🔵 Delegate | 3 | Bloom team | Can you send the workshop slides? | → Jamie: slides are in Google Drive / Q1 Workshops / Bloom, send the final PDF | 0 min |\n| 5 | ⚪ Read Later | 4 | Lenny Rachitsky | This week: Why your onboarding sucks | Read during lunch — relevant to TrueNorth project | 0 min |\n| 6 | ⬛ Ignore | 5 | Salesforce | Your monthly feature digest | Auto-archive | 0 min |\n\nTotal response time today: ~25 minutes',
    description: 'Create the batch processing prompt with table output', created_at: '2026-04-07T00:00:00Z' },

  // === Zapier Workflow Designer (prompt-22) ===
  { id: 'step-22a', prompt_id: 'prompt-22', step_number: 1, title: 'Map Current Manual Process',
    content: 'I run a small consulting firm. When a new lead fills out our website contact form (Typeform), here\'s what I currently do manually: 1) Copy their info into a Google Sheet, 2) Look up their company on LinkedIn to gauge size, 3) Send them a personalized email based on their company size (small = one template, mid-market = another, enterprise = another), 4) Create a deal in HubSpot with their info, 5) Send myself a Slack reminder to follow up in 3 days. This takes 15 minutes per lead and I get 5-8 per day. Design a Zapier automation that handles all of this.',
    result_content: 'ZAPIER AUTOMATION: New Lead Processing Pipeline\n\nTRIGGER: New Typeform Response\n\nSTEP 1: Google Sheets → Create Row\n- Sheet: "Lead Tracker 2026"\n- Map fields: Name, Email, Company, Company Size (from Typeform dropdown), Message, Timestamp\n- Why: Maintains your master lead log without changing your existing workflow\n\nSTEP 2: Filter by Company Size\n- Branching path based on Typeform "Company Size" field:\n  - Path A: 1-20 employees → "Small"\n  - Path B: 21-200 employees → "Mid-Market"\n  - Path C: 200+ employees → "Enterprise"\n\nSTEP 3A/B/C: Gmail → Send Email (3 variants)\n- From: your email (not a noreply)\n- To: Lead\'s email\n- Subject variants:\n  - Small: "Thanks for reaching out, {{first_name}} — here\'s how I work with teams your size"\n  - Mid-Market: "{{company}} + [Your Firm] — let\'s talk"\n  - Enterprise: "Re: {{company}} partnership inquiry"\n- Body: Paste your existing templates but replace placeholders with Typeform fields\n- Delay: Add a 12-minute delay so it doesn\'t feel automated\n\nSTEP 4: HubSpot → Create Deal\n- Deal Name: "{{company}} — Inbound {{date}}"\n- Pipeline: "New Business"\n- Stage: "Qualified Lead"\n- Contact: Create or update with name + email + company\n- Deal Amount: Leave blank (you\'ll fill in after discovery call)\n\nSTEP 5: Slack → Send Message\n- Channel: #leads (or DM to yourself)\n- Message: "New lead: {{name}} from {{company}} ({{company_size}}). Email sent ({{template_type}}). Follow up by {{date+3 days}}."\n\nSTEP 6: Slack → Schedule Reminder\n- Remind you in #leads in 3 days: "Follow up with {{name}} at {{company}} — did they reply to your email?"\n\nESTIMATED SETUP TIME: 45 minutes\nESTIMATED TIME SAVED: 75-120 minutes per day (5-8 leads × 15 min each)',
    description: 'Map manual steps and design the Zapier automation flow', created_at: '2026-04-05T00:00:00Z' },
  { id: 'step-22b', prompt_id: 'prompt-22', step_number: 2, title: 'Write the Email Templates',
    content: 'Write the three email templates for the Zapier flow. Context: I\'m a product strategy consultant. Small companies usually want a one-time strategy sprint (2-4 weeks, $5-15K). Mid-market wants ongoing advisory (monthly retainer, $8-20K/month). Enterprise wants a dedicated embedded consultant (quarterly engagements, $50-150K). Each email should: acknowledge their specific message from the form, position the right service, include one social proof point, and have a clear CTA (book a 20-min call via Calendly). Keep them under 120 words each. Warm, not salesy.',
    result_content: null,
    description: 'Write personalized email templates for each company size', created_at: '2026-04-05T00:00:00Z' },

  // === Daily Planning Prompt (prompt-23) ===
  { id: 'step-23a', prompt_id: 'prompt-23', step_number: 1, title: 'Design the Planning Framework',
    content: 'I want a daily planning prompt I run every morning at 8am. I\'ll paste my calendar events and my to-do list from Todoist (copy-pasted). The prompt should: 1) Look at my calendar and identify focus blocks vs meeting-heavy periods, 2) Take my to-do list and assign tasks to specific time slots based on energy levels (deep work in the morning, admin in the afternoon), 3) Flag if I\'m overcommitted (>6 hours of meetings or >8 tasks), 4) Suggest what to defer if overloaded. I\'m a morning person — my peak focus is 8-11am.',
    result_content: 'DAILY PLANNING FRAMEWORK:\n\nENERGY-BASED TIME BLOCKING:\n- 8:00-11:00am → PEAK FOCUS: Deep work only. No meetings if possible. Assign: writing, strategy, complex problem-solving, coding.\n- 11:00am-12:30pm → HIGH ENERGY: Meetings that require your active brain (strategy calls, client work, 1:1s)\n- 12:30-1:30pm → Break/lunch\n- 1:30-3:30pm → MODERATE ENERGY: Collaborative work, feedback sessions, lighter meetings\n- 3:30-5:00pm → LOW ENERGY: Admin, email, routine tasks, planning tomorrow\n\nOVERLOAD RULES:\n- > 6 hours meetings = RED FLAG. Suggest rescheduling the lowest-priority meeting.\n- > 8 tasks = OVERCOMMITTED. Suggest deferring the 2 lowest-priority tasks to tomorrow.\n- < 90 min of uninterrupted focus time = WARNING. You won\'t get deep work done.\n\nOUTPUT FORMAT:\n```\n☀️ DAILY PLAN — [Date]\n\nToday\'s Focus: [One sentence — what makes today successful?]\n\n8:00-11:00 | DEEP WORK\n  → [Task 1] (est. 45 min)\n  → [Task 2] (est. 60 min)\n\n11:00-11:30 | Meeting: [Name] — [Prep needed?]\n11:30-12:30 | Meeting: [Name] — [Prep needed?]\n\n12:30-1:30 | Lunch\n\n1:30-3:30 | COLLABORATIVE\n  → [Task or meeting]\n\n3:30-5:00 | ADMIN\n  → Email batch\n  → [Task 3]\n  → Plan tomorrow\n\n⚠️ Watch out: [Any overload warnings]\n📌 Deferred to tomorrow: [Tasks that didn\'t fit]\n```',
    description: 'Design the energy-based planning framework', created_at: '2026-04-08T00:00:00Z' },

  // === Notion Workspace Architecture (prompt-25) ===
  { id: 'step-25a', prompt_id: 'prompt-25', step_number: 1, title: 'Audit Current Chaos',
    content: 'I have a Notion workspace that\'s become a dumping ground. 400+ pages, no consistent structure, 15 databases that overlap, and I can never find anything. Here\'s what I use Notion for: project management (freelance consulting, 3-5 active clients), CRM (tracking prospects and past clients), content planning (I write a weekly newsletter), personal knowledge base (articles, ideas, book notes), and meeting notes. Design a clean workspace architecture from scratch. I want to migrate to a new structure, not patch the old one.',
    result_content: 'NOTION WORKSPACE ARCHITECTURE — "The Clean Slate"\n\n## TOP-LEVEL STRUCTURE (Sidebar)\n```\n📋 Dashboard (home page)\n📂 Client Work\n   → Projects DB\n   → Meeting Notes DB\n   → Deliverables DB\n📂 Pipeline\n   → CRM DB (prospects + past clients)\n   → Proposals DB\n📂 Content\n   → Newsletter DB\n   → Content Ideas DB\n📂 Knowledge\n   → Notes DB (articles, books, ideas)\n   → Templates\n📂 Admin\n   → Invoicing tracker\n   → Expenses\n   → SOPs\n```\n\n## DATABASE DESIGN (5 core databases, down from 15)\n\n### 1. Projects DB\nProperties: Client (relation → CRM), Status (Active/Complete/On Hold), Start Date, End Date, Type (Strategy Sprint / Advisory / Embedded), Revenue, Health (🟢🟡🔴)\nViews: Active Projects (board by status), By Client (table grouped), Timeline (calendar), Completed Archive\n\n### 2. CRM DB\nProperties: Company, Contact Name, Email, Stage (Lead/Prospect/Active Client/Past Client), Source, Last Contact Date, Lifetime Value, Notes\nViews: Active Pipeline (board by stage), All Contacts (table), Need Follow-up (filtered: last contact >30 days ago)\n\n### 3. Meeting Notes DB\nProperties: Date, Client (relation → CRM), Project (relation → Projects), Type (Discovery/Check-in/Internal/Workshop), Action Items (checkbox), Follow-up Date\nViews: This Week, By Client, Needs Follow-up\n\n### 4. Newsletter DB\nProperties: Issue #, Title, Status (Idea/Drafting/Ready/Published), Publish Date, Topic Tags, Word Count, Open Rate\nViews: Editorial Calendar (calendar by publish date), Pipeline (board by status)\n\n### 5. Notes DB\nProperties: Title, Type (Article/Book/Idea/Reference), Tags (multi-select), Source URL, Date Added, Status (Inbox/Processed/Archived)\nViews: Inbox (unprocessed), By Tag, Recent\n\n## DASHBOARD\nThe home page shows:\n- Today\'s meetings (filtered Meeting Notes DB)\n- Active projects (filtered Projects DB, board view)\n- Pipeline snapshot (CRM DB, board view)\n- This week\'s newsletter status\n- Quick capture button (creates a new Notes DB entry)',
    description: 'Design the full workspace architecture and database structure', created_at: '2026-04-03T00:00:00Z' },
  { id: 'step-25b', prompt_id: 'prompt-25', step_number: 2, title: 'Migration Plan and Templates',
    content: 'The architecture looks great. Now give me: 1) A step-by-step migration plan — what order to build things so I don\'t lose any data, how to map my existing 15 databases into the new 5, and how long each step should take. 2) Templates for the most common entries: new client project kickoff, meeting notes, newsletter draft, and a weekly review template I fill out every Friday.',
    result_content: null,
    description: 'Create migration plan and entry templates', created_at: '2026-04-03T00:00:00Z' },

  // === Contract Clause Library (prompt-29) ===
  { id: 'step-29a', prompt_id: 'prompt-29', step_number: 1, title: 'Analyze Existing Contracts',
    content: 'I\'m a freelance consultant and I\'ve signed 23 contracts over the past 3 years, but I negotiate each one from scratch because I can never remember which clauses I\'ve used before. I just went through all 23 and copied out the key clauses. Here are the areas I need standardized: scope of work definition, payment terms, late payment penalties, intellectual property assignment, confidentiality, limitation of liability, termination clause, and non-solicitation. For each area, write me 3 versions: client-friendly (maximum flexibility for them), balanced (fair to both), and consultant-friendly (maximum protection for me). Use plain English, not legalese.',
    result_content: '## FREELANCE CONSULTANT CLAUSE LIBRARY\n\n### 1. Payment Terms\n\n**Client-Friendly:**\nPayment is due within 45 days of invoice receipt. Invoices are sent monthly in arrears based on actual hours worked.\n\n**Balanced:**\nPayment is due within 30 days of invoice receipt. A deposit of 25% of the estimated project fee is due before work begins. Remaining balance is invoiced monthly based on work completed.\n\n**Consultant-Friendly:**\nPayment is due within 15 days of invoice receipt. A non-refundable deposit of 50% is due before work begins. Remaining 50% is invoiced at project midpoint. All invoices are due upon receipt; the 15-day window is a courtesy.\n\n### 2. Late Payment\n\n**Client-Friendly:**\nIf payment is more than 30 days overdue, a reminder will be sent. No penalties apply for the first late payment.\n\n**Balanced:**\nInvoices unpaid after 30 days incur a 1.5% monthly late fee. Work may be paused on invoices overdue by more than 45 days until payment is received.\n\n**Consultant-Friendly:**\nInvoices unpaid after 15 days incur a 2% monthly late fee. All work stops on invoices overdue by more than 30 days. Consultant reserves the right to retain all work product until outstanding invoices are paid in full.\n\n### 3. Termination\n\n**Client-Friendly:**\nEither party may terminate with 7 days written notice. Client pays only for work completed through the termination date.\n\n**Balanced:**\nEither party may terminate with 14 days written notice. Client pays for all work completed through the termination date plus any pre-approved expenses. If client terminates within the first 30 days, the deposit is non-refundable.\n\n**Consultant-Friendly:**\nEither party may terminate with 30 days written notice. If client terminates for reasons other than consultant\'s material breach, a termination fee of 25% of remaining contract value applies. All completed and in-progress work product must be paid for in full.\n\n### 4. Intellectual Property\n\n**Client-Friendly:**\nAll work product becomes client\'s property upon creation. Consultant retains no rights to any deliverables.\n\n**Balanced:**\nFinal deliverables become client\'s property upon full payment. Consultant retains the right to use anonymized versions of the work in their portfolio and case studies. Pre-existing tools and frameworks used in the engagement remain consultant\'s property.\n\n**Consultant-Friendly:**\nClient receives a perpetual license to use all deliverables upon full payment. Consultant retains ownership of all work product and may reuse methodologies, frameworks, and anonymized outputs in future engagements.',
    description: 'Create three tiers of standard clauses for key contract areas', created_at: '2026-04-02T00:00:00Z' },

  // === Spreadsheet Audit Bot (prompt-33) ===
  { id: 'step-33a', prompt_id: 'prompt-33', step_number: 1, title: 'Define the Audit Checklist',
    content: 'I maintain 12 Google Sheets that drive our company\'s reporting (headcount, revenue, expenses, forecasts). Every quarter someone breaks a formula, changes a cell format, or deletes a column and we don\'t catch it until the board report looks wrong. Build me a prompt where I paste a spreadsheet\'s formula summary (I can export a list of all formulas from Google Sheets using an Apps Script) and it audits for: broken references (#REF, #N/A, #VALUE errors), circular references, hardcoded numbers where formulas should be, inconsistent formula patterns in a column (e.g., row 15 uses SUM but row 16 uses a hardcoded value), and cells that reference other sheets that might have been renamed.',
    result_content: 'SPREADSHEET AUDIT SYSTEM\n\n## Audit Checklist (7 categories, 18 specific checks)\n\n### Category 1: Error Detection\n- [ ] Scan for #REF! errors (broken cell references)\n- [ ] Scan for #N/A errors (failed lookups)\n- [ ] Scan for #VALUE! errors (type mismatches)\n- [ ] Scan for #DIV/0! errors (division by zero)\n\n### Category 2: Formula Integrity\n- [ ] Identify hardcoded values in columns that should be formula-driven\n  - Detection: If 90% of cells in a column use formulas and 10% are hardcoded, flag the hardcoded ones\n- [ ] Check for inconsistent formula patterns\n  - Detection: Compare the formula structure (ignoring row numbers) across a column; flag outliers\n- [ ] Detect circular references\n  - Detection: Any cell that references itself directly or through a chain\n\n### Category 3: Cross-Sheet References\n- [ ] List all formulas referencing other sheets\n- [ ] Flag references to sheets not present in the workbook\n- [ ] Flag references using IMPORTRANGE (fragile — depends on other files being accessible)\n\n### Category 4: Data Validation\n- [ ] Columns with mixed data types (numbers and text in the same column)\n- [ ] Date columns with inconsistent formats\n- [ ] Negative values in columns that should only be positive (e.g., headcount)\n\n### Category 5: Structural Issues\n- [ ] Empty rows in the middle of data ranges (breaks SUM/VLOOKUP)\n- [ ] Merged cells (break sorting and formulas)\n\n### Category 6: Staleness\n- [ ] Cells referencing dates more than 90 days old in "current" sections\n- [ ] TODAY() or NOW() functions that may cause recalculation issues\n\n### Category 7: Risk Assessment\n- Each finding gets a severity: 🔴 Critical (wrong numbers showing), 🟡 Warning (will break eventually), 🟢 Info (best practice suggestion)\n\n## Output Format\n```\nAUDIT REPORT: [Sheet Name]\nDate: [Today]\nTotal formulas scanned: [N]\nIssues found: [N] (X critical, Y warnings, Z info)\n\n🔴 CRITICAL\n1. Cell F15: #REF! error — formula references a deleted column\n2. Cell B22: Hardcoded value "$48,000" in a column where every other cell uses =SUM()\n\n🟡 WARNING\n3. Cells D2:D50 — inconsistent pattern: 47 cells use =B*C, but D15 and D33 use different formulas\n4. Cell G5 references sheet "Q4 Forecast" which does not exist in this workbook\n\n🟢 INFO\n5. Column A has 3 merged cell ranges — consider unmerging for formula reliability\n```',
    description: 'Design the comprehensive audit checklist and output format', created_at: '2026-04-01T00:00:00Z' },
  { id: 'step-33b', prompt_id: 'prompt-33', step_number: 2, title: 'Build the Apps Script Exporter',
    content: 'Write a Google Apps Script that I can run on any spreadsheet. It should: 1) Loop through all sheets in the workbook, 2) For each cell with a formula, capture: sheet name, cell reference, formula text, current value, and whether it\'s an error. 3) Export the whole thing as a JSON blob I can paste into the audit prompt. Also include a count summary at the top (total cells, total formulas, total errors). Keep the script under 50 lines if possible.',
    result_content: null,
    description: 'Create the Apps Script to export formula data for auditing', created_at: '2026-04-01T00:00:00Z' },
]

export const mockPrompts: Prompt[] = [
  // ---- MARKETING ----
  {
    id: 'prompt-1',
    title: 'Complete Brand Identity Package for Sunrise Bakery',
    description: 'Built a full brand identity from scratch — personality, voice, color palette, typography, logo concept, photography guidelines, and a shareable brand guide. Used for a real bakery launch in Austin.',
    content: 'I needed to launch a specialty bakery and had zero branding. I used Claude to go from nothing to a complete brand identity in one afternoon. Three prompts, each building on the last, from brand discovery to visual system to a final guidelines document I could hand to my designer and social media manager.',
    result_content: 'The final brand guidelines document covered: brand story and mission, 5 personality traits with examples, voice guidelines with do\'s and don\'ts, complete color palette (5 colors with hex codes), typography system (3 fonts), logo concept description, and social media photography rules. My designer said it was the most thorough creative brief she\'d ever received from a client. The whole thing took about 2 hours start to finish.',
    category_id: 'cat-2',
    difficulty: 'beginner',
    model_used: 'claude-sonnet-4-6',
    model_recommendation: 'Claude 4.6 Sonnet',
    tools_used: ['Claude'],
    tags: ['branding', 'identity', 'bakery', 'design system', 'small business'],
    status: 'approved',
    author_id: 'user-2',
    vote_count: 83,
    bookmark_count: 47,
    created_at: '2026-03-15T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
  },
  {
    id: 'prompt-2',
    title: 'YouTube Video Script Pipeline — From Idea to Upload',
    description: 'Created a complete 12-minute YouTube video script about productivity systems, including hook, story beats, b-roll suggestions, and a thumbnail concept. One prompt, full output.',
    content: 'I run a productivity YouTube channel (8K subs) and scripting was taking me 6+ hours per video. I built a single detailed prompt that generates a complete, ready-to-film script. The key was giving Claude my exact style, pacing preferences, and audience context upfront.',
    result_content: 'Generated a 2,800-word script for "The 3-Folder System That Replaced My Entire Productivity Stack." Included: a 30-second cold open hook, 4 story beats with transitions, specific b-roll callouts (e.g., "cut to: screen recording of folder structure"), 2 audience interaction points ("comment below which folder you\'d start with"), a sponsor integration slot, end screen CTA, and 3 thumbnail text options. I filmed it in one take using the script as my teleprompter notes. Video got 12K views — my best performing that month.',
    category_id: 'cat-3',
    difficulty: 'beginner',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude'],
    tags: ['youtube', 'video script', 'content creation', 'productivity'],
    status: 'approved',
    author_id: 'user-1',
    vote_count: 95,
    bookmark_count: 62,
    created_at: '2026-03-18T00:00:00Z',
    updated_at: '2026-03-18T00:00:00Z',
  },

  // ---- WRITING ----
  {
    id: 'prompt-3',
    title: '12-Week Strength Training Program with Nutrition Guide',
    description: 'Generated a complete progressive overload training program customized for my goals — 4 days/week, with warm-ups, exercises, sets/reps, deload weeks, and a meal framework.',
    content: 'I wanted a structured gym program but didn\'t want to pay $200 for a personal trainer\'s template. I gave Claude my stats, equipment access, goals, and injury history, and got back a program that\'s more detailed than anything I\'ve bought online.',
    result_content: 'The program included: a 4-day Upper/Lower split, 3 mesocycles (weeks 1-4 hypertrophy focus, weeks 5-8 strength, weeks 9-12 peak), deload every 4th week, specific exercises with alternatives for each, warm-up protocols, RPE targets, and progressive overload rules (add 5lbs upper / 10lbs lower when you hit all reps). The nutrition section covered: calorie targets based on my stats (2,650 cal maintenance, 2,900 lean bulk), macro split (180g protein, 350g carbs, 85g fat), meal timing around workouts, and a sample day of eating. I\'ve been running it for 6 weeks and my squat is up 25lbs.',
    category_id: 'cat-10',
    difficulty: 'beginner',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude'],
    tags: ['fitness', 'training program', 'nutrition', 'health', 'personal'],
    status: 'approved',
    author_id: 'user-1',
    vote_count: 112,
    bookmark_count: 78,
    created_at: '2026-03-10T00:00:00Z',
    updated_at: '2026-03-10T00:00:00Z',
  },

  // ---- DATA ----
  {
    id: 'prompt-4',
    title: 'Automated Customer Review Analyzer with Weekly Reports',
    description: 'Built a Python tool that categorizes 500+ customer reviews by sentiment and topic, then generates a clean weekly report I paste into Slack every Monday.',
    content: 'We were drowning in customer reviews across our e-commerce store and had no systematic way to track sentiment or spot trends. I used ChatGPT to build a Python script that reads our review CSV export, categorizes everything, and spits out a Markdown report. No ML frameworks — just keyword matching for the MVP. Total build time: about 3 hours across 2 prompts.',
    result_content: 'The system processes ~500 reviews per run and outputs: overall sentiment breakdown (68% positive, 14% neutral, 18% negative in our first run), sentiment trend by month, product-level satisfaction scores, top 3 complaints, top 3 praises, and specific action items. The weekly Markdown report goes straight into our #product-feedback Slack channel. Our product manager said it replaced a manual process that was taking her 4 hours every week. The script is 120 lines of Python with zero dependencies beyond the standard library.',
    category_id: 'cat-8',
    difficulty: 'intermediate',
    model_used: 'chatgpt-5-4',
    model_recommendation: 'ChatGPT 5.4',
    tools_used: ['ChatGPT', 'Python', 'Google Sheets'],
    tags: ['python', 'sentiment analysis', 'automation', 'customer feedback', 'reporting'],
    status: 'approved',
    author_id: 'user-3',
    vote_count: 67,
    bookmark_count: 39,
    created_at: '2026-03-22T00:00:00Z',
    updated_at: '2026-03-22T00:00:00Z',
  },

  // ---- MARKETING ----
  {
    id: 'prompt-5',
    title: 'SaaS Onboarding Email Sequence — 7 Emails That Convert',
    description: 'Designed and wrote a complete 7-email onboarding drip campaign for a project management SaaS. Includes strategy, timing, subject lines, and full copy for every email.',
    content: 'I\'m the solo marketer at FlowDesk (a PM tool for agencies). We had a 14-day trial but no onboarding emails — just a welcome email and a "trial ending" email. I used ChatGPT Thinking to first map out the strategy, then write all the copy. The result is a 7-email sequence designed to drive two key actions: invite a team member (day 1-2) and create a first project (day 0).',
    result_content: 'The sequence covers: Day 0 (welcome + first project), Day 1 (team invite), Day 3 (feature highlight), Day 5 (customer story), Day 8 (objection handling — migration fears), Day 11 (urgency — trial ending), Day 14 (final push + 20% discount). Each email is under 150 words, has a single CTA, and is written in a conversational tone. After implementing in Mailchimp, our trial-to-paid conversion went from 8% to 14% in the first month. The strategy doc alone saved me weeks of planning.',
    category_id: 'cat-2',
    difficulty: 'intermediate',
    model_used: 'chatgpt-5-4-thinking',
    model_recommendation: 'ChatGPT 5.4 Thinking',
    tools_used: ['ChatGPT', 'Mailchimp'],
    tags: ['email marketing', 'SaaS', 'onboarding', 'conversion', 'drip campaign'],
    status: 'approved',
    author_id: 'user-2',
    vote_count: 74,
    bookmark_count: 51,
    created_at: '2026-03-20T00:00:00Z',
    updated_at: '2026-03-20T00:00:00Z',
  },

  // ---- CODING ----
  {
    id: 'prompt-6',
    title: 'Full SaaS Admin Dashboard — From Wireframe to Working Code',
    description: 'Built a complete admin dashboard with stats cards, revenue charts, activity feed, and a searchable customer table. Next.js + Tailwind + Recharts. Three prompts from architecture to finished product.',
    content: 'I needed an internal analytics dashboard for our SaaS but didn\'t want to spend 2 weeks building it. I used Claude Opus Extended to go from a rough wireframe description to working, responsive code in about 4 hours. Three prompts, each building on the last: architecture/layout, then the metrics + chart, then the data table with search and pagination.',
    result_content: 'The final dashboard includes: responsive sidebar navigation, 4 KPI cards with sparklines and trend indicators (MRR, Active Users, Churn Rate, NPS), a 12-month revenue line chart with tooltips, a recent activity feed, and a full-featured customer table (search, sort by any column, pagination, status badges). All built in Next.js 14 with TypeScript, styled with Tailwind CSS, charts via Recharts. The code was clean enough to ship to production with minor tweaks — I mostly just swapped in real API calls for the mock data.',
    category_id: 'cat-4',
    difficulty: 'advanced',
    model_used: 'claude-opus-4-6-ext',
    model_recommendation: 'Claude 4.6 Opus Extended',
    tools_used: ['Claude', 'Next.js', 'Tailwind CSS', 'Recharts', 'TypeScript'],
    tags: ['dashboard', 'react', 'nextjs', 'admin panel', 'charts', 'full-stack'],
    status: 'approved',
    author_id: 'user-1',
    vote_count: 134,
    bookmark_count: 89,
    created_at: '2026-03-25T00:00:00Z',
    updated_at: '2026-03-25T00:00:00Z',
  },

  // ---- FINANCE ----
  {
    id: 'prompt-7',
    title: 'Investment Portfolio Rebalancer with Tax-Loss Harvesting',
    description: 'Built a Google Sheets tool that tracks my $200K portfolio, calculates drift from target allocation, suggests rebalancing trades, and identifies tax-loss harvesting opportunities.',
    content: 'I manage my own portfolio (15 positions across index funds, stocks, bonds, and a REIT) and was doing rebalancing manually in a notebook. I used ChatGPT Thinking to design a spreadsheet that does it all automatically — allocation tracking, drift calculation, trade suggestions, AND tax-loss harvesting with wash sale warnings. Two prompts: first the core rebalancer, then the tax optimization layer.',
    result_content: 'The finished spreadsheet has: automatic market value calculation per position, current vs target allocation %, drift detection with 2% threshold, specific trade recommendations ("BUY 12 shares of VTI" / "SELL 8 shares of AAPL"), unrealized gain/loss per position, tax-loss harvesting flags (positions with >$500 loss held >30 days), estimated tax savings at my bracket, and wash sale risk warnings that cross-reference a transactions log. Saved me from accidentally triggering a wash sale last month that would have cost me $1,200 in lost deductions.',
    category_id: 'cat-1',
    difficulty: 'advanced',
    model_used: 'chatgpt-5-4-thinking',
    model_recommendation: 'ChatGPT 5.4 Thinking',
    tools_used: ['ChatGPT', 'Google Sheets'],
    tags: ['investing', 'portfolio', 'tax optimization', 'spreadsheet', 'personal finance'],
    status: 'approved',
    author_id: 'user-3',
    vote_count: 91,
    bookmark_count: 58,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },

  // ---- STRATEGY ----
  {
    id: 'prompt-8',
    title: 'Competitive Landscape Report for Fintech Startup',
    description: 'Generated a 15-page competitive analysis covering 8 competitors in the embedded payments space — feature matrices, pricing breakdowns, positioning maps, and strategic recommendations.',
    content: 'We were preparing for our Series A pitch and needed a competitive analysis fast. I used Gemini Pro to research and structure a comprehensive landscape report. I gave it our product positioning, listed 8 competitors, and asked for a systematic breakdown. The output was thorough enough that our investor said it was "one of the better competitive analyses" they\'d seen from a seed-stage company.',
    result_content: 'The report covered: market overview and sizing ($4.2B embedded payments market, 34% CAGR), 8 competitor profiles (Stripe Connect, Adyen for Platforms, PayPal Commerce, Square, Payrix, Finix, Rainforest, WePay), feature comparison matrix across 15 dimensions, pricing model comparison (flat-rate vs interchange-plus vs rev-share), positioning map (self-serve vs enterprise, vertical vs horizontal), gap analysis showing underserved segments, and 5 strategic recommendations for our differentiation. Each competitor section included: founding year, funding, target market, key features, pricing, strengths, and weaknesses.',
    category_id: 'cat-9',
    difficulty: 'intermediate',
    model_used: 'gemini-2-5-pro',
    model_recommendation: 'Gemini 2.5 Pro',
    tools_used: ['Gemini', 'Google Docs'],
    tags: ['competitive analysis', 'fintech', 'startup', 'Series A', 'market research'],
    status: 'approved',
    author_id: 'user-3',
    vote_count: 56,
    bookmark_count: 34,
    created_at: '2026-03-28T00:00:00Z',
    updated_at: '2026-03-28T00:00:00Z',
  },

  // ---- EDUCATION ----
  {
    id: 'prompt-9',
    title: 'Complete 8-Week Python Course for Beginners',
    description: 'Designed a full Python fundamentals curriculum — lesson plans, exercises, quizzes, and projects for each week. Built for adult learners with zero coding experience.',
    content: 'I teach an evening coding class at a community college and needed to build a Python fundamentals course from scratch. I used Claude to design the entire 8-week curriculum in one session. The key was specifying the audience (adult beginners, no CS background) and the end goal (build a real CLI app by week 8). Each week has lessons, exercises, a mini-project, and a quiz.',
    result_content: 'The curriculum goes from "Hello, Python" (week 1: print, variables, input) all the way to a capstone personal finance CLI app (week 8). Week-by-week progression: variables & strings → if/else logic → loops → lists & dictionaries → functions → file I/O → modules & APIs → capstone project. Every week has 2 lessons, a hands-on exercise, a mini-project, and a 5-question quiz. The mini-projects build in complexity: Mad Libs → Choose Your Own Adventure → Number Guessing Game → Contact Book → Unit Converter → Expense Logger → Weather App → Full Finance CLI. Students loved it — 85% completion rate, up from 60% with my old curriculum.',
    category_id: 'cat-6',
    difficulty: 'intermediate',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude', 'Jupyter Notebooks'],
    tags: ['python', 'curriculum', 'teaching', 'beginner', 'course design'],
    status: 'approved',
    author_id: 'user-5',
    vote_count: 88,
    bookmark_count: 63,
    created_at: '2026-03-28T00:00:00Z',
    updated_at: '2026-03-28T00:00:00Z',
  },

  // ---- DESIGN ----
  {
    id: 'prompt-10',
    title: 'Mobile App UI Component Specs for Fitness App',
    description: 'Created a complete UI design system spec — colors, typography, spacing, component states, and interaction patterns for a fitness tracking mobile app.',
    content: 'I\'m a solo developer building a fitness app and I\'m not a designer. I used Gemini to generate comprehensive UI specs that I could implement directly in React Native. Instead of vague design advice, I asked for specific values: hex codes, font sizes in pixels, border radii, spacing scales, and component state descriptions I could code against.',
    result_content: 'The spec covered: a 10-color palette with primary/secondary/semantic colors (all with hex + RGB), 6-step type scale with specific font sizes and line heights for React Native, 8px spacing scale (4/8/12/16/24/32/48/64), component specs for 12 core components (buttons, cards, inputs, tabs, progress bars, workout cards, stat circles, nav bar, modals, toasts, avatars, badges), each with default/hover/pressed/disabled states, plus dark mode variants for every color. My favorite part: the workout card spec was so detailed that implementing it took 20 minutes instead of the usual 2 hours of guessing.',
    category_id: 'cat-5',
    difficulty: 'intermediate',
    model_used: 'gemini-2-5-pro',
    model_recommendation: 'Gemini 2.5 Pro',
    tools_used: ['Gemini', 'Figma', 'React Native'],
    tags: ['UI design', 'design system', 'mobile app', 'fitness', 'components'],
    status: 'approved',
    author_id: 'user-4',
    vote_count: 45,
    bookmark_count: 31,
    created_at: '2026-04-02T00:00:00Z',
    updated_at: '2026-04-02T00:00:00Z',
  },

  // ---- PRODUCTIVITY ----
  {
    id: 'prompt-11',
    title: 'Personal Knowledge Base with AI Auto-Tagging',
    description: 'Built a Notion + Python system that automatically categorizes and tags my notes, articles, and bookmarks using the Claude API. Saves me 30 minutes of manual organizing daily.',
    content: 'I save 10-15 articles, notes, and bookmarks per day into Notion but never organized them. After 6 months I had 2,000+ untagged pages that were impossible to search. I used Claude to build a Python script that connects to the Notion API, reads each page\'s content, and auto-generates category tags and a 1-sentence summary. The whole pipeline runs as a daily cron job.',
    result_content: 'The system processes new Notion pages nightly: reads the page content via Notion API, sends it to Claude API with a classification prompt, gets back 2-4 tags from a fixed taxonomy (60 tags across 8 categories) plus a 1-sentence summary, then updates the Notion page properties automatically. Processing 2,000 backlog pages cost about $3 in API calls. Now it handles 10-15 new pages daily for pennies. My Notion is fully searchable and organized for the first time ever. The classification accuracy is about 90% — I manually fix the occasional misfire during my weekly review.',
    category_id: 'cat-7',
    difficulty: 'advanced',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude API', 'Python', 'Notion API'],
    tags: ['automation', 'notion', 'knowledge management', 'API', 'productivity'],
    status: 'approved',
    author_id: 'user-1',
    vote_count: 103,
    bookmark_count: 71,
    created_at: '2026-04-05T00:00:00Z',
    updated_at: '2026-04-05T00:00:00Z',
  },

  // ---- FINANCE ----
  {
    id: 'prompt-12',
    title: 'Startup Financial Model with 3-Year Projections',
    description: 'Generated a complete SaaS financial model — revenue projections, expense breakdown, cash runway, and key metrics. Used it in our actual seed pitch deck.',
    content: 'We needed a financial model for our seed round pitch but couldn\'t afford a fractional CFO. I gave Claude our current numbers (MRR, growth rate, burn, team size) and our plans (hiring timeline, marketing spend increase) and asked it to build a full 3-year model. The output was a structured spreadsheet framework with all the formulas and logic explained.',
    result_content: 'The model covered: monthly revenue projections with cohort-based growth (new MRR, expansion, churn), COGS breakdown (hosting, API costs, support), operating expenses by department (engineering, sales, marketing, G&A), headcount plan with fully-loaded costs, cash flow statement, runway calculation at current burn, key SaaS metrics (LTV, CAC, LTV:CAC ratio, payback period, gross margin, net revenue retention), and sensitivity analysis showing 3 scenarios (conservative, base, aggressive). Our lead investor specifically called out the financial model quality during diligence. We closed $1.8M.',
    category_id: 'cat-1',
    difficulty: 'intermediate',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude', 'Google Sheets'],
    tags: ['financial model', 'startup', 'SaaS', 'fundraising', 'pitch deck'],
    status: 'approved',
    author_id: 'user-3',
    vote_count: 79,
    bookmark_count: 44,
    created_at: '2026-04-03T00:00:00Z',
    updated_at: '2026-04-03T00:00:00Z',
  },

  // ---- CODING ----
  {
    id: 'prompt-13',
    title: 'E-commerce Product Description Engine — 50 Products in 2 Hours',
    description: 'Built a reusable prompt system that generates consistent, high-quality product descriptions for an online furniture store. Tested on 50 products with editorial-level results.',
    content: 'I run an online furniture store with 200+ products and most had terrible 2-line descriptions from the manufacturer. Rewriting them all manually would take weeks. I built a prompt template with Claude that takes product specs and generates descriptions in our brand voice. The key was creating a "style calibration" step first, then using that as context for all product descriptions.',
    result_content: 'Ran it on 50 products across 6 categories (desks, chairs, shelving, lighting, accessories, storage). Each description includes: a compelling headline, 3-4 sentence lifestyle description, bulleted feature list, materials and dimensions, care instructions, and 3 suggested search keywords. Consistency was excellent — our editor reviewed all 50 and only needed to tweak 4 of them. Average generation time: 45 seconds per product. We saw a 23% increase in conversion rate on the pages with AI-written descriptions vs the old manufacturer copy.',
    category_id: 'cat-3',
    difficulty: 'intermediate',
    model_used: 'claude-sonnet-4-6',
    model_recommendation: 'Claude 4.6 Sonnet',
    tools_used: ['Claude', 'Shopify'],
    tags: ['e-commerce', 'product descriptions', 'copywriting', 'shopify', 'bulk content'],
    status: 'approved',
    author_id: 'user-2',
    vote_count: 61,
    bookmark_count: 38,
    created_at: '2026-04-06T00:00:00Z',
    updated_at: '2026-04-06T00:00:00Z',
  },

  // ---- PENDING (admin queue) ----
  {
    id: 'prompt-14',
    title: 'AI-Powered Meal Prep Planner Based on Grocery Sales',
    description: 'Created a system that takes this week\'s grocery store sales flyer and generates a 7-day meal prep plan optimized for budget and nutrition.',
    content: 'I wanted to eat healthy on a budget but meal planning was taking forever. I built a prompt that takes sale items as input and creates a full week of meals around what\'s cheap this week.',
    result_content: 'The output includes: 7 days of breakfast, lunch, dinner, and snacks built around sale items, a consolidated grocery list with estimated costs, prep instructions for Sunday batch cooking (what to prep, what order, estimated time), macros per meal, and total weekly grocery cost. Last week it built a full plan around chicken thighs ($1.99/lb), sweet potatoes ($0.79/lb), and frozen broccoli (2 for $5) that came in at $47 for the whole week.',
    category_id: 'cat-10',
    difficulty: 'beginner',
    model_used: 'chatgpt-5-4',
    model_recommendation: 'ChatGPT 5.4',
    tools_used: ['ChatGPT'],
    tags: ['meal prep', 'budget', 'nutrition', 'cooking', 'grocery'],
    status: 'pending',
    author_id: 'user-4',
    vote_count: 0,
    bookmark_count: 0,
    created_at: '2026-04-09T00:00:00Z',
    updated_at: '2026-04-09T00:00:00Z',
  },
  {
    id: 'prompt-15',
    title: 'Automated Podcast Show Notes Generator',
    description: 'Built a pipeline that takes a podcast transcript and generates: episode title options, show notes, timestamps, key quotes, and social media clips — all in one prompt.',
    content: 'I produce a weekly business podcast and show notes were taking 2 hours per episode. I built a single prompt that takes the transcript and generates everything I need for publishing.',
    result_content: 'From a 45-minute transcript, the system generates: 5 episode title options, a 3-paragraph episode summary, timestamped chapter markers, 5 key quotes formatted for social media, 3 "audiogram clip" suggestions (the most engaging 60-second segments), guest bio blurb, related episode suggestions, and SEO-optimized show notes with headers. Cut my post-production time from 2 hours to 15 minutes.',
    category_id: 'cat-3',
    difficulty: 'beginner',
    model_used: 'claude-sonnet-4-6',
    model_recommendation: 'Claude 4.6 Sonnet',
    tools_used: ['Claude', 'Descript'],
    tags: ['podcast', 'show notes', 'content repurposing', 'automation'],
    status: 'pending',
    author_id: 'user-5',
    vote_count: 0,
    bookmark_count: 0,
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
  },

  // ---- PRODUCTIVITY ----
  {
    id: 'prompt-16',
    title: 'Weekly Status Report Automator — From Raw Data to CEO-Ready in 5 Minutes',
    description: 'Built a 3-step prompt system that takes raw data from Harvest, Monday.com, and Slack and compiles a formatted weekly status report. Replaced a 3-hour Friday ritual.',
    content: 'Every Friday I spent 3 hours pulling data from three different tools (Harvest for time tracking, Monday.com for project status, Slack for team updates) and compiling it into a report for our CEO. I built a prompt system where I paste the raw exports and Slack highlights, and it generates the full report in the right format. Three iterations: first I mapped inputs to outputs, then built the master prompt with paste zones, then tested with real data and fixed edge cases where it was including archived projects and writing generic summaries.',
    result_content: 'The final prompt has three clearly marked paste zones (Harvest CSV, Monday.com CSV, Slack text). It parses everything and outputs: an executive summary that references specific numbers and project names (not generic), a team utilization table with 75% target comparison, project status sorted by risk level (filtered to active only), wins and blockers extracted from Slack, and a "number of the week" highlight. The report comes out under 500 words every time. My Friday reporting went from 3 hours to about 12 minutes (5 min gathering data, 2 min pasting, 5 min reviewing). CEO said the reports actually got better because the AI catches patterns I was missing.',
    category_id: 'cat-7',
    difficulty: 'intermediate',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude', 'Harvest', 'Monday.com', 'Slack'],
    tags: ['reporting', 'automation', 'operations', 'weekly report', 'data parsing'],
    status: 'approved',
    author_id: 'user-6',
    vote_count: 118,
    bookmark_count: 82,
    created_at: '2026-04-06T00:00:00Z',
    updated_at: '2026-04-06T00:00:00Z',
  },
  {
    id: 'prompt-17',
    title: 'Meeting Notes to Action Items — Never Lose a Follow-Up Again',
    description: 'Built a prompt that takes messy Otter.ai meeting transcripts and extracts decisions, action items with owners, open questions, and a Slack-ready summary. Handles 60-minute transcripts.',
    content: 'I was spending 20 minutes after every meeting pulling out action items from Otter.ai transcripts. The transcripts are messy — people talk over each other, go on tangents, reference previous meetings. I built a two-step system: first it segments the transcript by topic, then extracts structured information from each segment. Also added a "carried over items" feature where I paste last meeting\'s action items and it flags what was completed vs still open.',
    result_content: 'The system outputs: a 3-sentence summary formatted for Slack, a "Decisions Made" section with who decided what, an action items table (owner, deadline, context), and open questions that weren\'t resolved. For a 45-minute product team meeting, it correctly extracted 4 decisions, 6 action items, and 3 open questions. The two-pass approach for long meetings (segment by topic first, then extract) catches about 95% of action items vs maybe 70% when I was doing it manually. I run it for every meeting now — takes about 90 seconds per transcript. Team started calling it "the accountability bot" because nothing falls through the cracks anymore.',
    category_id: 'cat-7',
    difficulty: 'beginner',
    model_used: 'claude-sonnet-4-6',
    model_recommendation: 'Claude 4.6 Sonnet',
    tools_used: ['Claude', 'Otter.ai', 'Slack'],
    tags: ['meetings', 'action items', 'transcription', 'productivity', 'team management'],
    status: 'approved',
    author_id: 'user-9',
    vote_count: 142,
    bookmark_count: 98,
    created_at: '2026-04-07T00:00:00Z',
    updated_at: '2026-04-07T00:00:00Z',
  },
  {
    id: 'prompt-18',
    title: 'Inbox Zero System — AI Email Triage That Actually Works',
    description: 'Built a daily email processing workflow using Claude. Paste 10-15 email previews each morning, get them categorized by urgency with specific next actions. Cut my email time from 60 minutes to 15.',
    content: 'I get 120+ emails a day as a freelance consultant. I was spending a full hour every morning just reading and deciding what needed attention. I built a triage system with two prompts: first I defined five categories with specific criteria (Respond Today, Respond This Week, Delegate to VA, Read Later, Ignore), including an approved newsletter list. Then I built a batch processing prompt where I paste email previews and get a sorted, actionable table with priority scores, suggested actions, and estimated response times.',
    result_content: 'The system processes batches of 10-15 emails and outputs a daily summary ("14 emails: 2 respond today, 4 this week, 3 delegate, 3 read later, 2 ignore") followed by a table with category, priority (1-5), sender, subject, suggested action, and time estimate. The total estimated response time helps me see at a glance if my day is manageable. Best part: the delegate entries include specific instructions for my VA (e.g., "Jamie: slides are in Google Drive / Q1 Workshops / Bloom, send the final PDF"). My morning email routine went from 60 minutes of anxiety to 15 minutes of execution. I\'ve been using it daily for 3 weeks straight.',
    category_id: 'cat-7',
    difficulty: 'beginner',
    model_used: 'claude-sonnet-4-6',
    model_recommendation: 'Claude 4.6 Sonnet',
    tools_used: ['Claude', 'Gmail'],
    tags: ['email', 'inbox zero', 'triage', 'daily routine', 'productivity'],
    status: 'approved',
    author_id: 'user-8',
    vote_count: 167,
    bookmark_count: 112,
    created_at: '2026-04-07T00:00:00Z',
    updated_at: '2026-04-07T00:00:00Z',
  },
  {
    id: 'prompt-19',
    title: 'Loom Video to SOP — Turn Screen Recordings into Training Docs',
    description: 'Converted a messy 15-minute Loom transcript into a clean, numbered SOP with screenshots placeholders, warnings, edge cases, and a troubleshooting FAQ. Now used for all our internal processes.',
    content: 'I was recording Loom videos to train new hires at our agency, but nobody watches 15-minute videos when they need a quick reference. I started taking the Loom transcripts (full of "um", "so basically", and mouse-movement narration) and running them through Claude to generate proper SOP documents. Two prompts: first converts the transcript to a clean numbered procedure, then adds a troubleshooting section based on common questions I\'ve gotten from past new hires.',
    result_content: 'From a 15-minute Loom about processing invoices (QuickBooks + Airtable), the system generated a professional SOP with: prerequisites, 13 numbered steps, 3 warning callouts, 2 edge case notes, estimated completion time (8 minutes per invoice), and a troubleshooting FAQ covering the 5 most common questions. The transcript was 2,400 words of meandering narration; the SOP is 800 words of crisp instructions. I\'ve now converted 8 of our core processes this way. New hire onboarding time dropped from 3 days to 1.5 days because they can actually reference these docs instead of re-watching videos.',
    category_id: 'cat-7',
    difficulty: 'beginner',
    model_used: 'claude-sonnet-4-6',
    model_recommendation: 'Claude 4.6 Sonnet',
    tools_used: ['Claude', 'Loom', 'Notion'],
    tags: ['SOP', 'documentation', 'training', 'onboarding', 'operations'],
    status: 'approved',
    author_id: 'user-6',
    vote_count: 89,
    bookmark_count: 64,
    created_at: '2026-04-04T00:00:00Z',
    updated_at: '2026-04-04T00:00:00Z',
  },
  {
    id: 'prompt-20',
    title: 'Daily Email Triage System with Priority Scoring',
    description: 'Designed a complete email triage framework with 5 categories, VA delegation instructions, and a batch processing prompt. Processes 15 emails in under 2 minutes.',
    content: 'Similar problem to the Inbox Zero project but my approach was different — I focused on building a reusable framework with specific rules for my consulting business. I defined 5 triage categories with exact criteria (what makes something "respond today" vs "this week"), created an approved newsletter list (Lenny\'s Newsletter = read later, Morning Brew = ignore), and built the processing prompt with a table output that includes estimated response time per email. The key insight was including VA delegation instructions directly in the output.',
    result_content: 'The framework document is about 400 words covering exact rules for each category. The batch processing prompt takes emails in a simple format (From / Subject / Preview) and outputs a summary line plus a sortable table. In testing with real emails over 2 weeks: correctly categorized about 92% of emails on the first try. The 8% that were wrong were mostly edge cases like a newsletter from a potential client (should be "respond" not "read later") — I\'ve since added rules for those. Average batch of 15 emails processed in about 90 seconds. Total daily email time: down from 50 minutes to about 12 minutes.',
    category_id: 'cat-7',
    difficulty: 'intermediate',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude', 'Gmail', 'Notion'],
    tags: ['email management', 'triage system', 'VA delegation', 'daily workflow'],
    status: 'approved',
    author_id: 'user-10',
    vote_count: 73,
    bookmark_count: 48,
    created_at: '2026-04-07T00:00:00Z',
    updated_at: '2026-04-07T00:00:00Z',
  },
  {
    id: 'prompt-21',
    title: 'Client Proposal Generator — From Discovery Call to Polished PDF in 30 Minutes',
    description: 'Built a prompt that takes my discovery call notes and generates a complete consulting proposal — scope, timeline, pricing, terms. Generates proposals 5x faster than my old process.',
    content: 'Writing consulting proposals used to take me half a day. I\'d procrastinate because it was tedious, which meant slow turnaround, which meant losing deals. I built a single prompt that takes my discovery call notes (I just brain-dump everything the client said) and generates a structured proposal. I gave it my pricing model, my standard terms, and a few examples of past proposals so it matches my voice.',
    result_content: 'The prompt generates: a 1-paragraph executive summary restating the client\'s problem in their own words, a detailed scope section with 3-5 workstreams (each with deliverables and milestones), a suggested timeline (usually 4-8 weeks), three pricing options (good/better/best — I always give options), payment terms, and a "Why Me" section with relevant experience. The output is about 1,500 words and reads like I wrote it, not a bot. My proposal turnaround went from 3-4 days to same-day. Close rate went from 35% to 50% — I think because clients get impressed by the fast turnaround and the quality of the scope breakdown.',
    category_id: 'cat-9',
    difficulty: 'intermediate',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude', 'Google Docs', 'Notion'],
    tags: ['proposals', 'consulting', 'sales', 'client management', 'freelance'],
    status: 'approved',
    author_id: 'user-8',
    vote_count: 96,
    bookmark_count: 71,
    created_at: '2026-04-05T00:00:00Z',
    updated_at: '2026-04-05T00:00:00Z',
  },
  {
    id: 'prompt-22',
    title: 'Zapier Lead Processing Workflow — Designed Entirely with AI',
    description: 'Used Claude to design a 6-step Zapier automation that processes new leads: logs them, sizes the company, sends a personalized email template, creates a HubSpot deal, and schedules follow-up. Saves 75+ minutes daily.',
    content: 'When a lead fills out our Typeform, I was manually copying their info to a Google Sheet, looking up their company, sending a personalized email based on company size, creating a HubSpot deal, and setting a Slack reminder. 15 minutes per lead, 5-8 leads a day. I used Claude to map my manual process step by step, design the Zapier automation, and write the three email templates (small business, mid-market, enterprise). Two prompts total.',
    result_content: 'The final Zapier automation has 6 steps: Typeform trigger, Google Sheets logging, filter/branching by company size, personalized Gmail send (with a 12-minute delay so it doesn\'t feel automated), HubSpot deal creation, and Slack notification with a 3-day follow-up reminder. The three email templates are each under 120 words, warm but professional, with the right CTA for each company size (small = book a call, mid-market = let\'s talk, enterprise = let me send a case study). Setup took 45 minutes. I was saving about 90 minutes per day from day one. After 3 weeks, my response time to new leads went from 4-6 hours to under 15 minutes, and my meeting booking rate from inbound leads jumped from 20% to 38%.',
    category_id: 'cat-7',
    difficulty: 'intermediate',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude', 'Zapier', 'Typeform', 'Gmail', 'HubSpot', 'Slack'],
    tags: ['automation', 'zapier', 'lead processing', 'CRM', 'workflow'],
    status: 'approved',
    author_id: 'user-10',
    vote_count: 85,
    bookmark_count: 59,
    created_at: '2026-04-05T00:00:00Z',
    updated_at: '2026-04-05T00:00:00Z',
  },
  {
    id: 'prompt-23',
    title: 'Morning Planning Prompt — Energy-Based Time Blocking with AI',
    description: 'Created a daily planning prompt that takes my calendar and to-do list, assigns tasks to time slots based on my energy patterns, and warns me when I\'m overcommitted. Use it every morning at 8am.',
    content: 'I was starting every day staring at my to-do list feeling overwhelmed. I built a planning prompt that does the thinking for me. I paste my calendar events and Todoist tasks, and it creates a time-blocked schedule based on my energy patterns (I\'m a morning person — peak focus 8-11am). It assigns deep work to mornings, meetings to midday, and admin to afternoons. If I have more than 6 hours of meetings or 8+ tasks, it tells me I\'m overcommitted and suggests what to defer.',
    result_content: 'The output is a clean daily plan with time blocks, tasks assigned to energy-appropriate slots, and overload warnings. Example output: "Today\'s Focus: Ship the Q2 roadmap and prep for the TrueNorth check-in." Then a schedule from 8am to 5pm with specific tasks in each block. The best feature is the warning system — last Tuesday it flagged that I had 7 hours of meetings and less than 45 minutes of focus time, and suggested rescheduling my 1:1 with a direct report. It was right. I\'ve been using it daily for a month. I feel noticeably less stressed and I\'m getting through my to-do list more consistently. The 5 minutes it takes to run the prompt saves me 30+ minutes of decision paralysis.',
    category_id: 'cat-7',
    difficulty: 'beginner',
    model_used: 'chatgpt-5-4',
    model_recommendation: 'ChatGPT 5.4',
    tools_used: ['ChatGPT', 'Google Calendar', 'Todoist'],
    tags: ['daily planning', 'time blocking', 'routine', 'focus', 'energy management'],
    status: 'approved',
    author_id: 'user-9',
    vote_count: 203,
    bookmark_count: 145,
    created_at: '2026-04-08T00:00:00Z',
    updated_at: '2026-04-08T00:00:00Z',
  },
  {
    id: 'prompt-24',
    title: 'Job Description Writer — From Hiring Manager Brain Dump to Posted in 20 Minutes',
    description: 'Built a prompt that takes rough hiring notes and produces a complete, bias-conscious job description with role summary, requirements, interview process, and compensation transparency.',
    content: 'As a CTO, I write 3-4 job descriptions a quarter and they always take way too long because I overthink them. I built a prompt where I brain-dump everything — what the role does, who they\'d work with, what matters, what doesn\'t — and it produces a structured JD. I also added specific instructions to avoid bias-loaded language (no "rockstar", "ninja", or unnecessarily gendered phrases) and to distinguish true requirements from nice-to-haves.',
    result_content: 'The output includes: a 2-sentence role hook (not the boring "we\'re looking for a..." opening), a "What You\'ll Actually Do" section with 5-6 bullet points of real day-to-day work (not vague responsibilities), "What You Bring" split into Requirements (3-4 hard requirements) and "Bonus Points" (nice-to-haves clearly labeled), "What We Offer" (comp range, benefits, growth), the interview process (4 steps with timeline), and a team description. Tested it on a Senior Backend Engineer JD — went from brain dump to polished posting in 18 minutes. Our recruiter said the applications were higher quality because the JD was more specific about what the job actually looks like day-to-day. Used it for 5 roles since, all filled within 4 weeks.',
    category_id: 'cat-7',
    difficulty: 'beginner',
    model_used: 'claude-sonnet-4-6',
    model_recommendation: 'Claude 4.6 Sonnet',
    tools_used: ['Claude', 'Greenhouse'],
    tags: ['hiring', 'job description', 'HR', 'recruiting', 'team building'],
    status: 'approved',
    author_id: 'user-9',
    vote_count: 77,
    bookmark_count: 52,
    created_at: '2026-04-06T00:00:00Z',
    updated_at: '2026-04-06T00:00:00Z',
  },
  {
    id: 'prompt-25',
    title: 'Notion Workspace Architecture — From 400-Page Chaos to 5-Database Clarity',
    description: 'Redesigned my entire Notion workspace from scratch. Went from 15 overlapping databases and 400 unorganized pages to a clean 5-database system with a dashboard, templates, and a migration plan.',
    content: 'My Notion had become a graveyard of abandoned databases and unsearchable pages. I used it for project management, CRM, content planning, knowledge management, and meeting notes — but nothing was connected and I couldn\'t find anything. I used Claude to design a completely new architecture (not patching the old one) and then create a step-by-step migration plan so I wouldn\'t lose any data during the transition.',
    result_content: 'The new architecture has 5 core databases (down from 15): Projects, CRM, Meeting Notes, Newsletter, and Notes. Each has carefully designed properties and multiple views for different contexts. The dashboard page shows today\'s meetings, active projects, pipeline status, newsletter progress, and a quick-capture button. The migration plan covered what to build first (the CRM, because everything relates to it), how to merge overlapping databases, and a checklist for each step with time estimates. Also got templates for: new client project kickoff, meeting notes, newsletter draft, and a weekly review. Total migration took about 6 hours over a weekend. I\'ve been running on the new system for 5 weeks and I can actually find things now. My weekly review on Fridays takes 15 minutes instead of 45.',
    category_id: 'cat-7',
    difficulty: 'intermediate',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude', 'Notion'],
    tags: ['notion', 'workspace design', 'organization', 'databases', 'knowledge management'],
    status: 'approved',
    author_id: 'user-8',
    vote_count: 156,
    bookmark_count: 109,
    created_at: '2026-04-03T00:00:00Z',
    updated_at: '2026-04-03T00:00:00Z',
  },
  {
    id: 'prompt-26',
    title: 'Weekly Review Template — The 30-Minute Friday Ritual That Changed My Output',
    description: 'Designed a structured weekly review prompt that looks at what I accomplished, what slipped, what I learned, and what next week should focus on. Runs every Friday at 4pm.',
    content: 'I was ending every week without any sense of what I actually accomplished or what needed to carry forward. I\'d start Monday with a vague sense of dread instead of a clear plan. I built a weekly review prompt that I run every Friday afternoon. I paste in my completed tasks from Todoist, my calendar summary, and any notes from the week, and it gives me a structured reflection plus next week\'s top 3 priorities.',
    result_content: 'The review output has 5 sections: Wins (what I shipped or completed, pulled from the task list), Misses (what was planned but didn\'t happen, with a brief "why" for each), Insights (patterns or lessons from the week — the AI is surprisingly good at spotting these), Energy Check (which activities gave me energy vs drained me, based on my calendar), and Next Week\'s Focus (3 concrete priorities based on what\'s in progress and what slipped). The energy check section was an unexpected gem — after 6 weeks of data, I noticed all my "draining" activities were 1:1s scheduled before 10am. Moved them all to afternoons and my mornings got dramatically more productive. The whole review takes about 30 minutes including the reflection time.',
    category_id: 'cat-7',
    difficulty: 'beginner',
    model_used: 'chatgpt-5-4',
    model_recommendation: 'ChatGPT 5.4',
    tools_used: ['ChatGPT', 'Todoist', 'Google Calendar'],
    tags: ['weekly review', 'reflection', 'planning', 'habits', 'personal productivity'],
    status: 'approved',
    author_id: 'user-10',
    vote_count: 131,
    bookmark_count: 88,
    created_at: '2026-04-08T00:00:00Z',
    updated_at: '2026-04-08T00:00:00Z',
  },
  {
    id: 'prompt-27',
    title: 'Slack Channel Summarizer — Never Miss What Happened While You Were Focused',
    description: 'Built a prompt that takes a day\'s worth of Slack messages from a busy channel and produces a 2-minute summary with key decisions, requests, and things that need your attention.',
    content: 'I\'m in 14 Slack channels and my team\'s main channel gets 200+ messages per day. When I\'m in focus mode or back from PTO, I was spending 30-40 minutes scrolling through catching up. I built a prompt that I paste a channel\'s daily messages into and get back a structured summary. The trick was teaching it to distinguish signal from noise — reactions to memes are not important, but a thread where someone made a decision that affects the project is.',
    result_content: 'The summary output has 4 sections: Decisions Made (things that were agreed upon and affect the team), Action Items That Mention You (tagged requests or assignments), Key Updates (project status changes, launches, incidents), and Skip Zone (things that happened but you don\'t need to act on, listed as one-liners so you know you didn\'t miss them). For a 200-message day in our #engineering channel, the summary is usually 15-20 lines. The "Skip Zone" is the underrated feature — it gives you confidence that you didn\'t miss something important without having to read everything. I use it every day after lunch and after my morning focus block. Team adopted it too — 4 other people now run the same prompt for their own catch-up.',
    category_id: 'cat-7',
    difficulty: 'beginner',
    model_used: 'claude-sonnet-4-6',
    model_recommendation: 'Claude 4.6 Sonnet',
    tools_used: ['Claude', 'Slack'],
    tags: ['slack', 'summarization', 'team communication', 'catch-up', 'async work'],
    status: 'approved',
    author_id: 'user-9',
    vote_count: 178,
    bookmark_count: 121,
    created_at: '2026-04-09T00:00:00Z',
    updated_at: '2026-04-09T00:00:00Z',
  },
  {
    id: 'prompt-28',
    title: 'Personal CRM — Track Relationships Without a Sales Tool',
    description: 'Designed a lightweight personal CRM in Google Sheets with AI-assisted relationship summaries. Tracks 150+ professional contacts with last-touch dates, context notes, and follow-up nudges.',
    content: 'I\'m a freelance consultant and relationships are my business. But I kept dropping the ball — forgetting to follow up with people I\'d met at conferences, losing track of who introduced me to whom, not remembering what we talked about last time. I didn\'t want a heavy CRM tool, so I used Claude to design a Google Sheets-based personal CRM with smart follow-up rules. Then I built a prompt that takes my meeting notes and generates the contact entry automatically.',
    result_content: 'The CRM sheet has columns for: Name, Company, Role, How We Met, Last Contact Date, Relationship Strength (1-5), Tags (client/prospect/mentor/peer/friend), Context Notes, and Next Action. A separate "Interactions" sheet logs every touchpoint. The smart follow-up formulas flag contacts where: Relationship Strength >= 3 and Last Contact > 30 days ago (shows "RECONNECT"), someone referred you business and you haven\'t thanked them (shows "SEND THANKS"), or you promised a follow-up and it\'s been > 7 days (shows "OVERDUE"). The AI prompt for adding contacts takes my brain-dump notes ("Met Lisa at SaaStr, she runs product at Stripe, talked about the challenges of platform pricing, she mentioned she might need a consultant for their SMB tier launch in Q3") and outputs a formatted row ready to paste. Currently tracking 153 contacts. I\'ve reconnected with 12 people I would have lost touch with entirely.',
    category_id: 'cat-7',
    difficulty: 'intermediate',
    model_used: 'chatgpt-5-4',
    model_recommendation: 'ChatGPT 5.4',
    tools_used: ['ChatGPT', 'Google Sheets'],
    tags: ['CRM', 'networking', 'relationships', 'freelance', 'follow-up'],
    status: 'approved',
    author_id: 'user-8',
    vote_count: 94,
    bookmark_count: 67,
    created_at: '2026-04-04T00:00:00Z',
    updated_at: '2026-04-04T00:00:00Z',
  },
  {
    id: 'prompt-29',
    title: 'Freelance Contract Clause Library — 3 Versions of Every Key Clause',
    description: 'Built a reusable library of contract clauses in plain English: payment terms, IP, termination, liability, and more. Each clause has client-friendly, balanced, and consultant-friendly versions.',
    content: 'After 23 consulting contracts over 3 years, I was still negotiating each one from scratch because I could never find my old clauses. I dumped all 23 contracts into a spreadsheet, identified the 8 key clause areas I always negotiate, and used Claude to write standardized versions at three protection levels: client-friendly (when I want the deal and they have leverage), balanced (my default), and consultant-friendly (when I have leverage or it\'s a risky engagement).',
    result_content: 'The library covers 8 clause areas with 3 versions each (24 total clauses): Payment Terms (Net 45/Net 30 with deposit/Net 15 with 50% upfront), Late Payment (no penalty/1.5% monthly + pause/2% monthly + work stoppage + lien), Termination (7-day notice/14-day with deposit retention/30-day with kill fee), IP Assignment (full transfer/transfer with portfolio rights/license-only), Confidentiality, Limitation of Liability, Non-Solicitation, and Scope Change Process. All written in plain English — no "whereas" or "hereinafter." I keep it as a Notion database and pull the appropriate version when drafting a new contract. Building a new contract went from 2 hours to 20 minutes. My lawyer reviewed the whole library and said it was "surprisingly solid for something AI-generated" — she suggested a few tweaks to the liability clauses which I incorporated.',
    category_id: 'cat-9',
    difficulty: 'advanced',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude', 'Notion'],
    tags: ['contracts', 'legal', 'freelance', 'consulting', 'negotiation'],
    status: 'approved',
    author_id: 'user-8',
    vote_count: 64,
    bookmark_count: 43,
    created_at: '2026-04-02T00:00:00Z',
    updated_at: '2026-04-02T00:00:00Z',
  },

  // ---- DATA & ANALYSIS ----
  {
    id: 'prompt-30',
    title: 'Quarterly Business Review Deck — Data to Slides in One Prompt',
    description: 'Built a prompt that takes raw quarterly metrics and generates a complete QBR presentation outline with executive summary, charts to create, talking points, and risk callouts.',
    content: 'I prepare QBR decks for my 4 clients every quarter. Each one used to take a full day — pulling data, figuring out the story, writing slide copy. I built a prompt where I paste the quarter\'s key metrics (revenue, usage, support tickets, NPS, churn) along with the previous quarter\'s numbers, and it generates a complete deck outline with the narrative already threaded through.',
    result_content: 'The output includes: a 3-slide executive summary (quarter headline, key wins, areas of concern), a recommended slide order (10-12 slides), specific chart suggestions for each data point ("use a waterfall chart for the MRR bridge showing new, expansion, contraction, and churn"), talking points per slide (what to say, not just what to show), a "Risks & Mitigation" slide with red/yellow/green status, and a "Next Quarter Priorities" slide with 3 recommended focus areas based on the data. For my SaaS client: their QBR showed 12% MRR growth but the prompt flagged that logo retention was declining even though net retention was healthy — something I probably would have glossed over. The client\'s VP of Customer Success said it was the most insightful QBR they\'d seen from a consultant.',
    category_id: 'cat-8',
    difficulty: 'intermediate',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude', 'Google Slides', 'Google Sheets'],
    tags: ['QBR', 'presentations', 'data analysis', 'consulting', 'quarterly review'],
    status: 'approved',
    author_id: 'user-7',
    vote_count: 72,
    bookmark_count: 49,
    created_at: '2026-04-06T00:00:00Z',
    updated_at: '2026-04-06T00:00:00Z',
  },

  // ---- CODING ----
  {
    id: 'prompt-31',
    title: 'API Documentation Generator — From Codebase to Developer Docs',
    description: 'Built a system where I paste my Express.js route files and it generates complete API documentation: endpoints, parameters, request/response examples, error codes, and rate limits.',
    content: 'Our API had grown to 40+ endpoints but the documentation was 6 months out of date. Writing docs manually is soul-crushing, so I built a prompt where I paste a route file and get back structured documentation. The key was having it generate realistic request/response examples, not just schema definitions. I also had it infer error scenarios from the validation middleware.',
    result_content: 'For a 200-line routes file with 8 endpoints, the prompt generated: endpoint description, HTTP method and URL, authentication requirements (inferred from middleware), request parameters (path, query, body) with types and validation rules, 2-3 request examples with realistic data, success response with example, 3-4 error responses (400 validation, 401 auth, 404 not found, 429 rate limit) with example payloads, and rate limiting notes. The output is in Markdown that I paste directly into our docs site (Docusaurus). Documented all 40 endpoints in about 5 hours instead of the 3 weeks it would have taken manually. Our developer NPS on API docs went from -20 (yes, negative) to +45 after the update.',
    category_id: 'cat-4',
    difficulty: 'intermediate',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude', 'VS Code', 'Docusaurus'],
    tags: ['API', 'documentation', 'Express.js', 'developer experience', 'backend'],
    status: 'approved',
    author_id: 'user-1',
    vote_count: 87,
    bookmark_count: 55,
    created_at: '2026-04-07T00:00:00Z',
    updated_at: '2026-04-07T00:00:00Z',
  },

  // ---- WRITING ----
  {
    id: 'prompt-32',
    title: 'Newsletter Pipeline — From Idea to Published in 90 Minutes',
    description: 'Created a 3-prompt pipeline for writing my weekly newsletter: brainstorm angles from a topic, write the full draft in my voice, then generate the email subject and social promotion.',
    content: 'I write a weekly newsletter about product strategy (2,100 subscribers). The writing itself takes me 3-4 hours and I dread it every week. I built a pipeline where I feed in a raw topic and my rough thoughts, and get back a nearly-finished draft. The key was spending time upfront calibrating my voice — I pasted 5 of my best past newsletters and had Claude analyze my style patterns.',
    result_content: 'The pipeline has 3 prompts: (1) Angle Generator — I give a topic and get 5 angles with a hook and thesis for each, then pick one. (2) Draft Writer — Takes the angle and my rough notes and writes the full newsletter (800-1,200 words) in my voice. The voice calibration prompt identified my style as "conversational authority with strategic metaphors and one contrarian take per piece." (3) Promotion Generator — Takes the draft and produces: 3 email subject lines, a 280-char tweet thread hook, and a LinkedIn post. My writing time went from 3.5 hours to about 90 minutes (30 min prep + rough notes, 5 min prompt pipeline, 55 min editing and adding personal touches). Open rate stayed steady at 42%, meaning readers can\'t tell the difference. The editing phase is where I add my personality — the AI gets the structure and logic right, I add the flavor.',
    category_id: 'cat-3',
    difficulty: 'intermediate',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude', 'ConvertKit', 'Notion'],
    tags: ['newsletter', 'writing', 'content creation', 'personal brand', 'email'],
    status: 'approved',
    author_id: 'user-8',
    vote_count: 108,
    bookmark_count: 76,
    created_at: '2026-04-08T00:00:00Z',
    updated_at: '2026-04-08T00:00:00Z',
  },

  // ---- PRODUCTIVITY ----
  {
    id: 'prompt-33',
    title: 'Spreadsheet Audit Bot — Find Broken Formulas Before the Board Does',
    description: 'Built a system to audit Google Sheets for broken formulas, hardcoded values, inconsistent patterns, and cross-sheet reference issues. Includes an Apps Script exporter and an AI audit prompt.',
    content: 'We have 12 Google Sheets that drive all our company reporting — headcount, revenue, expenses, forecasts. Every quarter someone breaks a formula or changes a cell format and we don\'t catch it until the board report looks wrong. I used Grok to build a two-part system: an Apps Script that exports all formulas from a sheet as JSON, and a prompt that audits the JSON for 18 different types of issues across 7 categories.',
    result_content: 'The audit system checks for: error values (#REF!, #N/A, #VALUE!, #DIV/0!), hardcoded numbers where formulas should be, inconsistent formula patterns in columns, circular references, broken cross-sheet references, mixed data types, empty rows in data ranges, merged cells, and stale date references. Each finding gets a severity rating (Critical / Warning / Info) with specific cell references and fix suggestions. First run on our revenue sheet caught 3 critical issues: a #REF! error in a cell that fed into the board deck total, a hardcoded $48K where a SUM formula should have been (someone pasted over it 2 months ago), and 2 cells referencing a "Q4 Forecast" sheet that had been renamed to "Q4 Forecast v2." The Apps Script exporter is 42 lines and runs on any Google Sheet in about 10 seconds.',
    category_id: 'cat-7',
    difficulty: 'advanced',
    model_used: 'grok-3',
    model_recommendation: 'Grok 3',
    tools_used: ['Grok', 'Google Sheets', 'Google Apps Script'],
    tags: ['spreadsheet', 'audit', 'data quality', 'formulas', 'reporting'],
    status: 'approved',
    author_id: 'user-7',
    vote_count: 68,
    bookmark_count: 41,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'prompt-34',
    title: 'Standup Bot — Async Standup Summaries From Slack Threads',
    description: 'Built a prompt that reads our async Slack standup thread and creates a team summary with blockers, capacity warnings, and cross-team dependencies. Product manager calls it "indispensable."',
    content: 'Our remote team does async standups in a Slack thread every morning. The problem: nobody reads everyone else\'s updates, blockers get buried, and cross-dependencies go unnoticed. I built a prompt that I paste the full standup thread into at 10am, and it generates a structured team summary that goes into #team-updates. Now everyone reads the 30-second summary instead of scrolling through 12 individual updates.',
    result_content: 'The summary output has 5 sections: Shipping Today (things that are getting deployed or delivered), In Progress (what\'s actively being worked on), Blocked (with what\'s blocking and a suggested unblock action), Capacity Check (flags if anyone mentioned being overloaded or has too many things in progress), and Dependencies (when someone\'s work depends on another team member\'s output — these are the ones that always slip). For a 12-person eng team, the standup thread is usually 2,500-3,000 words of individual updates. The summary is about 300 words. Our PM said she catches 2-3 dependency conflicts per week that she would have missed before. The blocked items section alone has probably saved us from at least 4 missed deadlines in the last month.',
    category_id: 'cat-7',
    difficulty: 'beginner',
    model_used: 'claude-sonnet-4-6',
    model_recommendation: 'Claude 4.6 Sonnet',
    tools_used: ['Claude', 'Slack'],
    tags: ['standup', 'team management', 'async', 'slack', 'remote work'],
    status: 'approved',
    author_id: 'user-9',
    vote_count: 149,
    bookmark_count: 97,
    created_at: '2026-04-09T00:00:00Z',
    updated_at: '2026-04-09T00:00:00Z',
  },

  // ---- FINANCE ----
  {
    id: 'prompt-35',
    title: 'Expense Report Automation — Receipt Photo to Categorized Spreadsheet',
    description: 'Built a workflow where I describe my receipts and expenses, and the AI categorizes them, flags policy violations, and generates a formatted expense report ready for accounting.',
    content: 'I travel 2-3 times a month for client work and expense reports were my most-hated task. I\'d procrastinate for weeks, then spend 2 hours sorting receipts and categorizing everything. I built a prompt where I just list out my expenses in plain English ("$47 uber to client office Monday, $23 lunch with Sarah from Meridian, $189 hotel Tuesday night") and it generates a formatted expense report with categories, policy compliance checks, and totals.',
    result_content: 'The prompt takes my brain-dump list of expenses and outputs: a formatted table with Date, Description, Category (Travel, Meals, Lodging, Office, Client Entertainment), Amount, and Policy Status. It knows our expense policy rules: meals capped at $75/person, flights must be economy for trips under 6 hours, hotel per-diem is $200/night, Uber/Lyft preferred over rental cars for trips under 3 days. Any expense that exceeds a policy limit gets flagged with a note ("$95 dinner — exceeds $75 meal cap, needs manager approval"). The totals section breaks down by category and by client (for client-billable expenses). My expense reports now take about 10 minutes instead of 2 hours. Accounting said the reports are actually more accurate because the AI catches category mistakes I used to make (like putting client lunches under "Meals" instead of "Client Entertainment").',
    category_id: 'cat-1',
    difficulty: 'beginner',
    model_used: 'chatgpt-5-4',
    model_recommendation: 'ChatGPT 5.4',
    tools_used: ['ChatGPT', 'Google Sheets'],
    tags: ['expenses', 'finance', 'travel', 'automation', 'accounting'],
    status: 'approved',
    author_id: 'user-6',
    vote_count: 83,
    bookmark_count: 56,
    created_at: '2026-04-03T00:00:00Z',
    updated_at: '2026-04-03T00:00:00Z',
  },

  // ---- PENDING (admin queue) ----
  {
    id: 'prompt-36',
    title: 'AI-Powered Interview Prep System — Custom Questions Based on Job Description',
    description: 'Built a prompt that takes a job description and my resume, generates 15 tailored interview questions with STAR-format answer frameworks, and runs a mock interview with feedback.',
    content: 'I was interviewing for a Staff Engineer role and wanted to practice with realistic questions, not generic "tell me about yourself" stuff. I built a prompt that analyzes the job description, identifies the key competencies they\'re testing for, cross-references with my resume to find relevant experience, and generates targeted questions with coaching on how to structure my answers.',
    result_content: 'From a Staff Engineer JD at a fintech company, the prompt generated 15 questions across 4 categories: Technical Architecture (5), Leadership & Influence (4), System Design (3), and Behavioral (3). Each question came with: why the interviewer is asking it, which competency it tests, a STAR framework outline using a specific experience from my resume, and 2 things to avoid saying. The mock interview mode asks questions one at a time and gives feedback on my answers (too long, not enough specifics, missed the leadership angle, etc.). I ran through the full prep in about 3 hours over 2 evenings. Got an offer with "strongest behavioral interview we\'ve seen this cycle" feedback from the hiring manager.',
    category_id: 'cat-7',
    difficulty: 'intermediate',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude'],
    tags: ['interview prep', 'career', 'job search', 'practice', 'STAR method'],
    status: 'pending',
    author_id: 'user-1',
    vote_count: 0,
    bookmark_count: 0,
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
  },
  {
    id: 'prompt-37',
    title: 'Etsy Listing Optimizer — SEO-Driven Titles, Tags, and Descriptions',
    description: 'Built a prompt system that takes my handmade product details and generates Etsy-optimized listings with keyword-rich titles, all 13 tags, and conversion-focused descriptions. Sales up 34%.',
    content: 'I sell handmade ceramics on Etsy and my listings were terrible — short descriptions, generic titles, maybe 5 tags out of the allowed 13. I built a prompt that takes my product details (what it is, materials, dimensions, who it\'s for) and generates a complete optimized listing. I also had it research Etsy SEO best practices and build those rules into the prompt.',
    result_content: 'For each product, the prompt generates: an SEO-optimized title using the full 140-character limit (front-loaded with primary keyword, includes material, style, and use case), all 13 tags (mix of broad and long-tail, no repeated words across tags per Etsy guidelines), a 4-paragraph description (hook, details, story/care instructions, shipping info), and 3 occasion suggestions for the "perfect gift for" angle. Tested on 20 listings over 6 weeks: views up 52%, favorites up 28%, and actual sales up 34% compared to the same products with my old listings. The biggest win was the tags — I didn\'t know you shouldn\'t repeat words across tags, and the AI generated tag combinations that covered way more search terms than I was capturing before.',
    category_id: 'cat-2',
    difficulty: 'beginner',
    model_used: 'chatgpt-5-4',
    model_recommendation: 'ChatGPT 5.4',
    tools_used: ['ChatGPT', 'Etsy'],
    tags: ['etsy', 'SEO', 'e-commerce', 'handmade', 'product listing'],
    status: 'pending',
    author_id: 'user-10',
    vote_count: 0,
    bookmark_count: 0,
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
  },

  // ---- FINANCE: One-Shot Deep Prompt ----
  {
    id: 'prompt-39',
    title: 'Complete Personal Budget System in Google Sheets — One Prompt',
    description: 'One detailed prompt that generates an entire budgeting system: income tracking, expense categories with formulas, monthly dashboard, savings goals, and conditional formatting — all ready to copy into a fresh spreadsheet.',
    content: `I was spending 20 minutes a week manually categorizing expenses in a messy spreadsheet that had no structure. I decided to see if Claude could design a complete budgeting system in one shot — every formula, every layout decision, every conditional format rule. I wrote one very detailed prompt describing exactly what I needed, and the result was a fully-architected budget system I could build in Google Sheets in about 30 minutes.\n\nThe key to making this work as a single prompt was front-loading ALL my requirements: my income structure (salary + side income), my spending categories, my savings goals, and exactly what kind of dashboard view I wanted. The more specific you are upfront, the less back-and-forth you need.\n\n---\n\nHere's the exact prompt I used:\n\nDesign a complete personal budget system for Google Sheets. I need three tabs:\n\n**Tab 1: "Monthly Log"**\n- Columns: Date, Description, Category (dropdown from list), Amount, Payment Method (dropdown: credit card / debit / cash / transfer), Notes\n- Category list: Housing, Groceries, Dining Out, Transport, Utilities, Subscriptions, Health, Shopping, Entertainment, Education, Savings Transfer, Income\n- Auto-calculate a running balance in column G\n- Conditional formatting: Income rows green background, expenses over $200 red text\n- Data validation on Category and Payment Method columns\n\n**Tab 2: "Dashboard"**\n- Section 1: Monthly Summary — Total Income, Total Expenses, Net (income minus expenses), Savings Rate (net / income as percentage)\n- Section 2: Category Breakdown — each category with: budgeted amount (I'll fill in), actual spent (SUMIFS from Monthly Log), difference, and a percentage bar using REPT("█") and REPT("░") characters\n- Section 3: Savings Goals — 3 goals (Emergency Fund $10,000, Vacation $3,000, New Laptop $1,500) with current amount, target, percentage complete, and months remaining at current savings rate\n- Section 4: Monthly Trend — show last 6 months of total income vs total expenses (I'll copy formulas across columns)\n\n**Tab 3: "Settings"**\n- Category list (referenced by data validation in Monthly Log)\n- Payment methods list\n- Monthly budget targets per category\n- Tax rate for income calculations\n\nFor every cell that has a formula, give me the exact formula assuming the Monthly Log data starts in row 2 with headers in row 1. Use named ranges where it makes sense. Make sure all SUMIFS reference the correct tab. Include the conditional formatting rules as step-by-step instructions I can apply in Google Sheets.`,
    result_content: `The output was a 2,500-word structured document covering all three tabs completely. Here are the highlights:\n\n**Monthly Log tab** — Claude gave exact formulas for the running balance: \`=IF(L2="Income", G1+F2, G1-F2)\` with an initial balance cell, plus ARRAYFORMULA versions for auto-extending. The conditional formatting rules were written as literal steps: "Select range A2:G1000 → Format → Conditional formatting → Custom formula: =$E2='Income' → Background #d4edda".\n\n**Dashboard tab** — The category breakdown section was the star. Each category row used:\n- Budgeted: pulls from Settings tab via \`=Settings!B2\`\n- Actual: \`=SUMIFS('Monthly Log'!F:F, 'Monthly Log'!D:D, A5, 'Monthly Log'!A:A, ">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1))\`\n- Visual bar: \`=REPT("█", MIN(ROUND(C5/B5*20),20)) & REPT("░", 20-MIN(ROUND(C5/B5*20),20))\` — this creates a 20-character progress bar that fills proportionally\n- Status: \`=IF(C5>B5, "🔴 Over by $"&TEXT(C5-B5,"#,##0"), "🟢 Under by $"&TEXT(B5-C5,"#,##0"))\`\n\n**Savings goals** — Months remaining formula: \`=IF(D2>0, ROUND((B2-A2)/D2, 1), "No savings this month")\` where D2 references the current month's net savings.\n\n**What I actually built:** I spent about 30 minutes setting up the sheets, copying formulas, and configuring dropdowns. The visual budget bars in the Dashboard tab are genuinely useful — at a glance I can see I'm at 80% of my dining budget with 10 days left in the month. My savings rate went from "I have no idea" to a clear 22% within the first month of using this.\n\nThe one thing I adjusted: Claude's conditional formatting for expenses over $200 used red text, but I changed it to a subtle red background tint instead — easier to scan.`,
    category_id: 'cat-1',
    difficulty: 'beginner',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude', 'Google Sheets'],
    tags: ['budget', 'personal finance', 'google sheets', 'formulas', 'one-shot', 'spreadsheet'],
    status: 'approved',
    author_id: 'user-11',
    vote_count: 134,
    bookmark_count: 91,
    created_at: '2026-04-02T00:00:00Z',
    updated_at: '2026-04-02T00:00:00Z',
  },

  // ---- FINANCE: Multi-Step Build (5 prompts) ----
  {
    id: 'prompt-38',
    title: 'Personal Expense Tracker App — Built in 5 Prompts with Claude',
    description: 'Built a dark-themed, mobile-friendly expense tracker from scratch using React and TypeScript over 5 iterative prompts. Complete with charts, category filtering, CSV export, and smooth animations.',
    content: `I wanted a personal expense tracker that actually looked good and worked the way I think about money — not a bloated app with 50 features I'll never use. I decided to build it step by step with Claude, starting from zero and refining each piece before moving to the next.\n\nThe approach: 5 focused prompts, each one building on the last. I didn't try to describe the whole app upfront — instead, I got the foundation right first (data model and storage), then built each view one at a time, and finished with styling and polish. This iterative approach meant each prompt could be specific and detailed, and I could test each piece before moving on.\n\nWhat I ended up with: a sleek, dark-themed expense tracker that runs entirely in the browser (localStorage, no backend), with a dashboard showing spending charts, a smart expense form with quick-add buttons, and a full history view with filters and CSV export. It looks like a real fintech app, not a tutorial project.\n\nTools: Vite + React + TypeScript for the app, Recharts for the bar chart, date-fns for date formatting. Total build time across all 5 prompts: about 2 hours.`,
    result_content: `The final app has three views:\n\n**Dashboard** — A gradient hero card showing total spent this month with a "vs last month" comparison (↓ 17% in green or ↑ 8% in amber). Below that, a horizontal bar chart of spending by category sorted highest-first with emoji labels. And a quick-glance list of the 5 most recent transactions.\n\n**Add Expense** — Instead of a boring dropdown for categories, it uses an emoji grid (🛒 Groceries, 🍽️ Dining, 🚗 Transport, etc.) that highlights with the category's color when selected. The amount input is huge and prominent. Three "quick add" buttons at the top for common expenses (☕ Coffee $5.50, 🚗 Gas $45, 🛒 Groceries $75) that pre-fill the form. Green checkmark success animation after adding.\n\n**History** — Date-grouped expense list ("Today", "Yesterday", "Mon, Apr 7"), filterable by category chips, date range tabs (This Week / This Month / Last Month / All Time), and a search box. Running total updates as you filter. Export button downloads everything as a CSV.\n\nThe dark theme (#0f0f23 background, #6c5ce7 accent purple) with subtle slide-up animations on the dashboard cards gives it that polished fintech feel. Mobile-first layout at 480px max width — looks great on a phone.`,
    category_id: 'cat-1',
    difficulty: 'intermediate',
    model_used: 'claude-opus-4-6',
    model_recommendation: 'Claude 4.6 Opus',
    tools_used: ['Claude', 'React', 'TypeScript', 'Recharts', 'Vite'],
    tags: ['expense tracker', 'react', 'typescript', 'personal finance', 'dark theme', 'web app'],
    status: 'approved',
    author_id: 'user-11',
    vote_count: 156,
    bookmark_count: 103,
    created_at: '2026-04-06T00:00:00Z',
    updated_at: '2026-04-06T00:00:00Z',
  },
]
