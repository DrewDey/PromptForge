'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, LogIn, FileText, GitBranch, Check, AlertCircle, ArrowUp, ArrowDown, ChevronRight, Layers, Cpu, Eye } from 'lucide-react'
import { getModelsByProvider, getModelName } from '@/lib/models'
import { submitProject } from '@/lib/actions'
import ImageUpload from '@/components/ImageUpload'

const categories = [
  { slug: 'finance', name: 'Finance & Accounting' },
  { slug: 'marketing', name: 'Marketing & Sales' },
  { slug: 'writing', name: 'Writing & Content' },
  { slug: 'coding', name: 'Coding & Development' },
  { slug: 'design', name: 'Design & Creative' },
  { slug: 'education', name: 'Education & Learning' },
  { slug: 'productivity', name: 'Productivity' },
  { slug: 'data', name: 'Data & Analysis' },
  { slug: 'strategy', name: 'Business Strategy' },
  { slug: 'personal', name: 'Personal & Fun' },
]

type Step = { title: string; content: string; result_content: string; description: string }

// Mirrors PromptCard's difficulty chip palette so the preview card reads the same
// as the Browse grid's real cards.
const difficultyPreviewConfig: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  intermediate: { label: 'Intermediate', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  advanced: { label: 'Advanced', color: 'text-red-600 bg-red-50 border-red-200' },
}

/**
 * BuilderPreview — a reactive mini-card that mirrors how the project will look on
 * Browse. Kept inline in this file because it's tightly coupled to the form's
 * local state and only used here. Structure intentionally parallels PromptCard
 * (title / description / OUTCOME pull-quote / category · steps row / step-flow
 * chips / footer with difficulty + model + vote counter) so "what the preview
 * shows" and "what Browse shows" can't drift.
 */
function BuilderPreview({
  title,
  description,
  categorySlug,
  difficulty,
  filledSteps,
  totalSteps,
  modelId,
  customModel,
  finalResult,
  resultContent,
  isChain,
}: {
  title: string
  description: string
  categorySlug: string
  difficulty: string
  filledSteps: number
  totalSteps: number
  modelId: string
  customModel: string
  finalResult: string
  resultContent: string
  isChain: boolean
}) {
  const categoryName = categories.find((c) => c.slug === categorySlug)?.name
  const diffConfig = difficulty ? difficultyPreviewConfig[difficulty] : null
  const modelDisplay =
    modelId === 'other' ? customModel.trim() : modelId ? getModelName(modelId) : ''
  const outcomePreview = (isChain ? finalResult : finalResult || resultContent).trim()
  // In multi-step mode show FILLED steps (or total as a scaffold hint). In
  // single-prompt mode there's no step flow to render.
  const stepCount = isChain ? (filledSteps > 0 ? filledSteps : totalSteps) : 0
  const hasAnyInput = !!(
    title.trim() ||
    description.trim() ||
    categorySlug ||
    difficulty ||
    modelDisplay ||
    outcomePreview ||
    (isChain && filledSteps > 0)
  )

  return (
    <div className="lg:sticky lg:top-6 space-y-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-surface-500">
          <Eye className="w-3 h-3" aria-hidden="true" /> Live preview
        </span>
        <span className="hidden lg:inline text-[10px] text-surface-400">
          How it appears on Browse
        </span>
      </div>

      <div className="border border-surface-200 bg-white p-5 relative overflow-hidden">
        {/* Top accent — the same hover-accent PromptCard reveals, shown statically
            here so the preview carries a recognisable brand fingerprint even when
            the form is empty. */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-orange" />

        <h3 className="font-semibold text-base leading-snug mb-1.5 text-surface-900">
          {title.trim() || <span className="text-surface-300">Your project title</span>}
        </h3>

        <p className="text-[13px] text-surface-500 mb-3 leading-relaxed line-clamp-2">
          {description.trim() || (
            <span className="text-surface-300">A short description will appear here</span>
          )}
        </p>

        {outcomePreview && (
          <div className="border-l-2 border-brand-orange/50 bg-brand-orange/[0.03] pl-3 pr-2 py-1.5 mb-3">
            <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-brand-orange mb-0.5">
              Outcome
            </span>
            <p className="text-[12px] text-surface-700 leading-snug line-clamp-2">
              {outcomePreview}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap mb-4 min-h-[16px]">
          {categoryName ? (
            <span className="text-[11px] font-medium text-surface-500">{categoryName}</span>
          ) : (
            <span className="text-[11px] font-medium text-surface-300">Category</span>
          )}
          {stepCount > 0 && (
            <span className="text-[11px] font-medium text-surface-400 flex items-center gap-1 ml-auto">
              <Layers className="w-3 h-3" aria-hidden="true" />
              {stepCount} {stepCount === 1 ? 'step' : 'steps'}
            </span>
          )}
        </div>

        {stepCount > 0 && (
          <div className="flex items-center gap-1.5 mb-4 overflow-hidden">
            {Array.from({ length: Math.min(stepCount, 4) }).map((_, i) => (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <div className="flex items-center justify-center text-[10px] font-semibold border shrink-0 bg-surface-100 text-surface-500 border-surface-200 w-5 h-5">
                  {i + 1}
                </div>
                {i < Math.min(stepCount - 1, 3) && (
                  <ChevronRight className="w-3 h-3 text-surface-300 shrink-0" aria-hidden="true" />
                )}
              </div>
            ))}
            {stepCount > 4 && (
              <div className="flex items-center justify-center bg-surface-100 text-surface-500 text-[10px] font-semibold border border-surface-200 shrink-0 w-5 h-5">
                +{stepCount - 4}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-surface-100">
          <div className="flex items-center gap-2 min-w-0">
            {diffConfig ? (
              <span className={`text-[11px] font-medium px-2 py-0.5 border shrink-0 ${diffConfig.color}`}>
                {diffConfig.label}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-surface-300 px-2 py-0.5 border border-dashed border-surface-200 shrink-0">
                difficulty
              </span>
            )}
            {modelDisplay ? (
              <span className="text-[11px] text-surface-400 flex items-center gap-1 min-w-0">
                <Cpu className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{modelDisplay}</span>
              </span>
            ) : (
              <span className="text-[11px] text-surface-300 flex items-center gap-1 min-w-0">
                <Cpu className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">model</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-surface-400 shrink-0">
            <span className="flex items-center gap-1 tabular-nums" aria-label="Upvotes">
              <ArrowUp className="w-3 h-3" aria-hidden="true" />
              0
            </span>
          </div>
        </div>
      </div>

      {!hasAnyInput && (
        <p className="text-xs text-surface-400 leading-relaxed">
          Fill in the form and your card preview will come to life here — exactly how it will look on the Browse grid.
        </p>
      )}
    </div>
  )
}

function SectionHeader({ number, title, subtitle, isExpanded, isComplete, summary, onClick }: {
  number: number
  title: string
  subtitle: string
  isExpanded: boolean
  isComplete: boolean
  summary?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isExpanded}
      aria-controls={`section-${number}-panel`}
      className="w-full flex items-center gap-4 px-5 py-4 cursor-pointer group transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 hover:bg-surface-50"
    >
      <div className={`w-9 h-9 text-sm font-bold flex items-center justify-center flex-shrink-0 transition-colors duration-150 ${
        isExpanded
          ? 'bg-brand-orange text-white'
          : isComplete
            ? 'bg-green-500 text-white'
            : 'bg-surface-200 text-surface-500 group-hover:bg-surface-300'
      }`}>
        {isComplete && !isExpanded ? <Check className="w-4 h-4" /> : number}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <h2 className={`text-xl font-bold transition-colors duration-150 ${
            isExpanded ? 'text-surface-900' : 'text-surface-700 group-hover:text-surface-900'
          }`}>{title}</h2>
          {isComplete && !isExpanded && (
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5">Complete</span>
          )}
        </div>
        {isExpanded ? (
          <p className="text-sm text-surface-500 mt-0.5">{subtitle}</p>
        ) : summary ? (
          <p className="text-sm text-surface-400 mt-0.5 truncate">{summary}</p>
        ) : (
          <p className="text-sm text-surface-400 mt-0.5">Click to expand</p>
        )}
      </div>
      <ChevronRight className={`w-5 h-5 text-surface-400 flex-shrink-0 transition-transform duration-150 ${
        isExpanded ? 'rotate-90' : 'group-hover:text-surface-600'
      }`} />
    </button>
  )
}

function RequiredDot() {
  return <span className="text-brand-orange ml-0.5">*</span>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {message}
    </p>
  )
}

export default function SubmitProjectPage() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [story, setStory] = useState('')
  const [categorySlug, setCategorySlug] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [modelId, setModelId] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [tools, setTools] = useState('')
  const [tags, setTags] = useState('')
  const [promptContent, setPromptContent] = useState('')
  const [resultContent, setResultContent] = useState('')
  const [finalResult, setFinalResult] = useState('')

  // Multi-step state
  const [isChain, setIsChain] = useState(true) // Default to multi-step — it's the core feature
  const [steps, setSteps] = useState<Step[]>([{ title: '', content: '', result_content: '', description: '' }])
  const [expandedStep, setExpandedStep] = useState<number>(0)

  // Image state (preview only for now)
  const [resultImages, setResultImages] = useState<{ file: File; preview: string; caption: string }[]>([])
  const [stepImages, setStepImages] = useState<Record<number, { file: File; preview: string; caption: string }[]>>({})

  // Section accordion state — multi-open per Drew's preference (Q7)
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([1]))

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Client-side validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const modelsByProvider = getModelsByProvider()

  // Check auth
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setIsLoggedIn(false)
      return
    }
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        setIsLoggedIn(!!user)
      })
    })
  }, [])

  function computeErrors(): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Project title is required'
    if (!description.trim()) errors.description = 'Short description is required'
    if (!story.trim()) errors.story = 'Tell the story of your project'
    if (!categorySlug) errors.category = 'Pick a category'
    if (!difficulty) errors.difficulty = 'Select a difficulty level'
    if (!isChain && !promptContent.trim()) errors.promptContent = 'Enter the prompt you used'
    if (isChain) {
      const hasFilledStep = steps.some(s => s.title.trim() && s.content.trim())
      if (!hasFilledStep) errors.steps = 'Complete at least one step with a title and prompt'
    }
    if (modelId === 'other' && !customModel.trim()) errors.customModel = 'Enter the model name'
    return errors
  }

  // Clear individual field errors when user types (only after first submit attempt)
  useEffect(() => {
    if (!hasAttemptedSubmit) return
    setValidationErrors(computeErrors())
  }, [title, description, story, categorySlug, difficulty, promptContent, isChain, steps, modelId, customModel, hasAttemptedSubmit])

  function addStep() {
    const newIndex = steps.length
    setSteps([...steps, { title: '', content: '', result_content: '', description: '' }])
    setExpandedStep(newIndex)
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index))
    if (expandedStep >= steps.length - 1) setExpandedStep(Math.max(0, steps.length - 2))
  }

  function updateStep(index: number, field: keyof Step, value: string) {
    const updated = [...steps]
    updated[index] = { ...updated[index], [field]: value }
    setSteps(updated)
  }

  function moveStep(index: number, direction: -1 | 1) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= steps.length) return
    const updated = [...steps]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setSteps(updated)
    setExpandedStep(newIndex)
  }

  function validateForm(): Record<string, string> {
    const errors = computeErrors()
    setValidationErrors(errors)
    setHasAttemptedSubmit(true)
    return errors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      // Open the section containing the first error
      const firstErrorKey = Object.keys(errors)[0]
      const section1Fields = ['title', 'description', 'story', 'category', 'difficulty', 'customModel']
      const section2Fields = ['promptContent', 'steps']
      if (section1Fields.includes(firstErrorKey)) {
        setOpenSections(prev => new Set([...prev, 1]))
      } else if (section2Fields.includes(firstErrorKey)) {
        setOpenSections(prev => new Set([...prev, 2]))
      }
      // Scroll to first error after section expands
      setTimeout(() => {
        const el = document.querySelector(`[data-field="${firstErrorKey}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return
    }

    setSubmitting(true)
    setError('')

    const modelUsed = modelId === 'other' ? customModel : modelId
    const modelRec = modelId === 'other' ? customModel : (modelId ? getModelName(modelId) : '')

    const projectSteps = isChain
      ? steps.filter(s => s.title && s.content)
      : []

    const result = await submitProject({
      title,
      description,
      content: isChain ? story : `${story}\n\n---\n\n${promptContent}`,
      result_content: finalResult || resultContent,
      category_slug: categorySlug,
      difficulty,
      model_used: modelUsed,
      model_recommendation: modelRec,
      tools_used: tools.split(',').map(t => t.trim()).filter(Boolean),
      tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      steps: projectSteps,
    })

    setSubmitting(false)

    if (result.success) {
      setSubmitted(true)
    } else {
      setError(result.error ?? 'Something went wrong')
    }
  }

  // Not logged in
  if (isLoggedIn === false) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <LogIn className="w-10 h-10 text-surface-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-surface-900 mb-2">Log in to share a project</h1>
        <p className="text-surface-600 text-sm mb-6">
          You need an account to submit projects to PathForge.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/login" className="bg-brand-orange text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">
            Log in
          </Link>
          <Link href="/auth/signup" className="text-surface-500 hover:text-surface-900 text-sm font-medium transition-colors duration-150">
            Sign up
          </Link>
        </div>
      </div>
    )
  }

  // Loading auth state
  if (isLoggedIn === null) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-surface-400">Loading...</div>
  }

  // Success
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 bg-green-500 text-white flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-surface-900 mb-2">Project Submitted!</h1>
        <p className="text-surface-600 mb-6">
          Your project has been submitted for review. An admin will approve it shortly.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/browse"
            className="bg-brand-orange text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Browse Projects
          </Link>
          <button
            onClick={() => {
              setSubmitted(false)
              setTitle('')
              setDescription('')
              setStory('')
              setPromptContent('')
              setResultContent('')
              setFinalResult('')
              setSteps([{ title: '', content: '', result_content: '', description: '' }])
              setIsChain(true)
              setHasAttemptedSubmit(false)
              setValidationErrors({})
            }}
            className="text-surface-500 hover:text-surface-900 text-sm font-medium transition-colors duration-150"
          >
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  // Count filled steps for the summary
  const filledSteps = steps.filter(s => s.title || s.content).length
  const totalSteps = steps.length
  const progressPercent = totalSteps > 0 ? Math.round((filledSteps / totalSteps) * 100) : 0

  // Helper for validation-aware input borders
  const fieldBorder = (fieldKey: string) =>
    validationErrors[fieldKey]
      ? 'border-red-400 focus:border-red-500 focus:ring-red-200/50'
      : 'border-surface-200 focus:border-brand-orange focus:ring-brand-orange/20'

  // Section completion checks
  const section1Complete = !!(title.trim() && description.trim() && story.trim() && categorySlug && difficulty)
  const section2Complete = isChain
    ? steps.some(s => s.title.trim() && s.content.trim())
    : !!promptContent.trim()
  const section3Complete = false // Section 3 is all optional fields — never "complete" per se

  // Section summaries for collapsed state
  const section1Summary = title.trim()
    ? `${title.trim()}${categorySlug ? ` · ${categories.find(c => c.slug === categorySlug)?.name || ''}` : ''}`
    : undefined
  const section2Summary = isChain
    ? `${filledSteps} of ${totalSteps} step${totalSteps !== 1 ? 's' : ''} filled`
    : promptContent.trim() ? 'Prompt added' : undefined
  const section3Summary = [
    tools.trim() ? `Tools: ${tools.trim().split(',').slice(0, 2).join(', ')}` : '',
    tags.trim() ? `Tags: ${tags.trim().split(',').slice(0, 2).join(', ')}` : '',
  ].filter(Boolean).join(' · ') || undefined

  function toggleSection(section: number) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        // Don't allow closing all sections — keep at least one open
        if (next.size > 1) next.delete(section)
      } else {
        next.add(section)
        // Scroll the newly opened section into view
        setTimeout(() => {
          const el = document.querySelector(`[data-section="${section}"]`)
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 50)
      }
      return next
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/browse" className="text-sm text-surface-500 hover:text-surface-900 flex items-center gap-1 mb-6 transition-colors duration-150">
        <ArrowLeft className="w-4 h-4" />
        Back to browse
      </Link>

      {/* Page hero — the Build page had no H1, just stranded subtext. Gives the
          page a proper anchor and sets up the two-column layout below. */}
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-surface-900 mb-2">
          Build your project
        </h1>
        <p className="text-sm text-surface-500 leading-relaxed">
          Share what you built with AI — the prompts, the process, and the results. Fill in the form; the card on the right shows what it will look like on Browse.
        </p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6 max-w-2xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Two-pane builder on lg+: form on the left (kept at its original ~680px
          max so no field gets unwieldy), live preview rail on the right. Mobile
          stacks vertically (preview drops below the form so the first interaction
          is always the form). */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:gap-10 lg:items-start">
      <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-2xl">

        {/* ═══════ SECTION 1: PROJECT BASICS ═══════ */}
        <section data-section="1" className={`border transition-all duration-150 ${openSections.has(1) ? 'border-surface-200 shadow-sm bg-white' : 'border-surface-100 bg-surface-50/50'}`}>
          <SectionHeader
            number={1}
            title="Project Basics"
            subtitle="What did you build and in what domain?"
            isExpanded={openSections.has(1)}
            isComplete={section1Complete}
            summary={section1Summary}
            onClick={() => toggleSection(1)}
          />

          {openSections.has(1) && <div id="section-1-panel" className="px-5 pb-5 space-y-5">
            {/* Hero title — borderless, Notion-style */}
            <div data-field="title">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name your project..."
                aria-label="Project title"
                className={`w-full bg-transparent text-2xl sm:text-3xl font-bold text-surface-900 placeholder-surface-300 px-1 py-2 border-b-2 focus:outline-none transition-colors duration-150 ${
                  validationErrors.title
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-transparent focus:border-brand-orange'
                }`}
              />
              <FieldError message={validationErrors.title} />
            </div>

            {/* Description */}
            <div data-field="description">
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Short Description <RequiredDot />
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One or two sentences about what you built and the result"
                className={`w-full bg-white border text-surface-900 placeholder-surface-400 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors duration-150 ${fieldBorder('description')}`}
              />
              <FieldError message={validationErrors.description} />
            </div>

            {/* The Story */}
            <div data-field="story">
              <label className="block text-sm font-medium text-surface-700 mb-1">
                The Story <RequiredDot />
              </label>
              <p className="text-xs text-surface-500 mb-1.5 block">What did you build and why? What problem were you solving?</p>
              <textarea
                rows={4}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Tell the story of your project — what you needed, why you used AI, and how it went..."
                className={`w-full bg-white border text-surface-900 placeholder-surface-400 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors duration-150 ${fieldBorder('story')}`}
              />
              <FieldError message={validationErrors.story} />
            </div>

            {/* Category, Difficulty, Model */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div data-field="category">
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Category <RequiredDot />
                </label>
                <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className={`w-full bg-white border text-surface-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors duration-150 ${fieldBorder('category')}`}>
                  <option value="">Select</option>
                  {categories.map(cat => (
                    <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
                <FieldError message={validationErrors.category} />
              </div>
              <div data-field="difficulty">
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Difficulty <RequiredDot />
                </label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={`w-full bg-white border text-surface-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors duration-150 ${fieldBorder('difficulty')}`}>
                  <option value="">Select</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <FieldError message={validationErrors.difficulty} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Model Used</label>
                <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="w-full bg-white border border-surface-200 text-surface-900 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-colors duration-150">
                  <option value="">Select model</option>
                  {Object.entries(modelsByProvider).map(([provider, models]) => (
                    <optgroup key={provider} label={provider}>
                      {models.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {modelId === 'other' && (
              <div data-field="customModel">
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Model Name <RequiredDot />
                </label>
                <input type="text" value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="Enter the model name" className={`w-full bg-white border text-surface-900 placeholder-surface-400 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors duration-150 ${fieldBorder('customModel')}`} />
                <FieldError message={validationErrors.customModel} />
              </div>
            )}
          </div>}
        </section>

        {/* ═══════ SECTION 2: YOUR BUILD JOURNEY ═══════ */}
        <section data-section="2" className={`border transition-all duration-150 ${openSections.has(2) ? 'border-surface-200 shadow-sm bg-white' : 'border-surface-100 bg-surface-50/50'}`}>
          <SectionHeader
            number={2}
            title="Your Build Journey"
            subtitle="Show how you built it — the prompts and results at each step."
            isExpanded={openSections.has(2)}
            isComplete={section2Complete}
            summary={section2Summary}
            onClick={() => toggleSection(2)}
          />

          {openSections.has(2) && <div id="section-2-panel" className="px-5 pb-5">
          {/* Mode toggle — prominent visual choice */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setIsChain(true)}
              aria-pressed={isChain}
              className={`flex items-center gap-3 p-4 border-2 text-left cursor-pointer transition-all duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
                isChain
                  ? 'border-brand-orange bg-primary-50 shadow-[inset_4px_0_0_var(--color-brand-orange)]'
                  : 'border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50 hover:shadow-sm'
              }`}
            >
              <GitBranch className={`w-5 h-5 flex-shrink-0 transition-colors duration-150 ${isChain ? 'text-brand-orange' : 'text-surface-400'}`} />
              <div>
                <div className={`text-sm font-semibold flex items-center gap-2 ${isChain ? 'text-surface-900' : 'text-surface-600'}`}>
                  Multi-step
                  <span className="text-[10px] font-medium uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-1.5 py-0.5">Recommended</span>
                </div>
                <div className="text-xs text-surface-500">Show each prompt→result</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsChain(false)}
              aria-pressed={!isChain}
              className={`flex items-center gap-3 p-4 border-2 text-left cursor-pointer transition-all duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
                !isChain
                  ? 'border-brand-orange bg-primary-50 shadow-[inset_4px_0_0_var(--color-brand-orange)]'
                  : 'border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50 hover:shadow-sm'
              }`}
            >
              <FileText className={`w-5 h-5 flex-shrink-0 transition-colors duration-150 ${!isChain ? 'text-brand-orange' : 'text-surface-400'}`} />
              <div>
                <div className={`text-sm font-semibold ${!isChain ? 'text-surface-900' : 'text-surface-600'}`}>Single prompt</div>
                <div className="text-xs text-surface-500">One prompt, one result</div>
              </div>
            </button>
          </div>

          {/* Single prompt or multi-step */}
          {!isChain ? (
            <div className="space-y-5">
              <div data-field="promptContent">
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  The Prompt You Used <RequiredDot />
                </label>
                <textarea rows={8} value={promptContent} onChange={(e) => setPromptContent(e.target.value)} placeholder="Paste the prompt you used to create this project..." className={`w-full bg-white border text-surface-900 placeholder-surface-400 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 transition-colors duration-150 ${fieldBorder('promptContent')}`} />
                <FieldError message={validationErrors.promptContent} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">The Result <span className="text-surface-400 font-normal">(optional)</span></label>
                <p className="text-xs text-surface-500 mb-1.5 block">What did the AI produce? Share text, screenshots, or both.</p>
                <textarea rows={6} value={resultContent} onChange={(e) => setResultContent(e.target.value)} placeholder="Paste or describe what the AI generated..." className="w-full bg-white border border-surface-200 text-surface-900 placeholder-surface-400 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 mb-3 transition-colors duration-150" />
                <ImageUpload images={resultImages} onChange={setResultImages} label="Screenshots" />
              </div>
            </div>
          ) : (
            <div className="space-y-4" data-field="steps">
              {/* Step progress bar */}
              {totalSteps > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${progressPercent === 100 ? 'text-green-600' : 'text-surface-700'}`}>
                      {progressPercent === 100 ? 'All steps complete' : `${filledSteps} of ${totalSteps} step${totalSteps !== 1 ? 's' : ''} filled`}
                    </span>
                    <span className={`text-xs font-medium ${progressPercent === 100 ? 'text-green-500' : 'text-surface-400'}`}>{progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-surface-100 w-full overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Step completion progress">
                    <div
                      className={`h-full transition-all duration-300 ease-out ${progressPercent === 100 ? 'bg-green-500' : 'bg-brand-orange'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Validation error for steps */}
              <FieldError message={validationErrors.steps} />

              {/* Step cards */}
              {steps.map((step, idx) => {
                const isExpanded = expandedStep === idx
                const isFilled = !!(step.title.trim() && step.content.trim())
                const isPartial = !!(step.title.trim() || step.content.trim()) && !isFilled

                return (
                  <div key={idx} className={`border overflow-hidden transition-all duration-150 ${
                    isExpanded
                      ? 'border-brand-orange/40 shadow-md bg-white'
                      : 'border-surface-200 shadow-sm bg-surface-50 hover:shadow-md hover:border-surface-300'
                  }`}>
                    {/* Step header */}
                    <button
                      type="button"
                      onClick={() => setExpandedStep(isExpanded ? -1 : idx)}
                      aria-expanded={isExpanded}
                      className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors duration-150 cursor-pointer ${
                        isExpanded ? 'bg-primary-50' : 'hover:bg-surface-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 text-xs font-bold flex items-center justify-center transition-colors duration-150 ${
                          isExpanded
                            ? 'bg-brand-orange text-white'
                            : isFilled
                              ? 'bg-green-500 text-white'
                              : isPartial
                                ? 'bg-brand-orange/20 text-brand-orange'
                                : 'bg-surface-200 text-surface-500'
                        }`}>
                          {isFilled && !isExpanded ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </span>
                        <div className="text-left">
                          <span className="text-sm font-medium text-surface-900">
                            {step.title || `Step ${idx + 1}`}
                          </span>
                          {/* Completion badge on collapsed cards */}
                          {!isExpanded && (
                            <span className={`block text-xs mt-0.5 ${
                              isFilled ? 'text-green-600' : isPartial ? 'text-brand-orange' : 'text-surface-400'
                            }`}>
                              {isFilled ? 'Complete' : isPartial ? 'In progress' : 'Click to edit'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {/* Reorder controls */}
                        {steps.length > 1 && (
                          <>
                            <button type="button" onClick={(e) => { e.stopPropagation(); moveStep(idx, -1) }} disabled={idx === 0} className="text-surface-400 hover:text-brand-orange hover:bg-surface-100 p-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:text-surface-200 disabled:cursor-not-allowed disabled:hover:bg-transparent" title="Move up">
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); moveStep(idx, 1) }} disabled={idx === steps.length - 1} className="text-surface-400 hover:text-brand-orange hover:bg-surface-100 p-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:text-surface-200 disabled:cursor-not-allowed disabled:hover:bg-transparent" title="Move down">
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {steps.length > 1 && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeStep(idx) }} className="text-surface-400 hover:text-red-500 hover:bg-red-50 p-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500" title="Remove step">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-surface-500" /> : <ChevronDown className="w-5 h-5 text-surface-400" />}
                      </div>
                    </button>

                    {/* Expanded step form */}
                    {isExpanded && (
                      <div className="p-5 space-y-5 border-t border-surface-200 bg-white">
                        <div>
                          <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wide mb-1.5">
                            Step Title <RequiredDot />
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Brand Discovery, Initial Draft, Refinement..."
                            value={step.title}
                            onChange={(e) => updateStep(idx, 'title', e.target.value)}
                            className="w-full bg-white border border-surface-200 text-surface-900 placeholder-surface-400 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-colors duration-150"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1.5">
                            Brief Description <span className="text-surface-400 font-normal normal-case">(optional)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="What was the goal of this step?"
                            value={step.description}
                            onChange={(e) => updateStep(idx, 'description', e.target.value)}
                            className="w-full bg-white border border-surface-200 text-surface-900 placeholder-surface-400 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-colors duration-150"
                          />
                        </div>
                        {/* Prompt section — visually distinct */}
                        <div className="bg-surface-50 border border-surface-200 p-4">
                          <label className="text-xs font-semibold text-brand-orange uppercase tracking-wide mb-2 block">
                            Prompt <RequiredDot />
                          </label>
                          <textarea
                            rows={5}
                            placeholder="The prompt you used at this step..."
                            value={step.content}
                            onChange={(e) => updateStep(idx, 'content', e.target.value)}
                            className="w-full bg-white border border-surface-200 text-surface-900 placeholder-surface-400 px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-colors duration-150"
                          />
                        </div>
                        {/* Result section — visually distinct */}
                        <div className="bg-green-50/50 border border-green-100 p-4">
                          <label className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 block">
                            Result <span className="text-surface-400 font-normal normal-case">(optional — text, screenshots, or both)</span>
                          </label>
                          <textarea
                            rows={4}
                            placeholder="What did the AI produce at this step?"
                            value={step.result_content}
                            onChange={(e) => updateStep(idx, 'result_content', e.target.value)}
                            className="w-full bg-white border border-green-200 text-surface-900 placeholder-surface-400 px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-200/40 mb-3 transition-colors duration-150"
                          />
                          <ImageUpload images={stepImages[idx] ?? []} onChange={(imgs) => setStepImages({ ...stepImages, [idx]: imgs })} label="Screenshots" />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add Step button — solid, inviting */}
              <button
                type="button"
                onClick={addStep}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-brand-orange bg-primary-50 border-2 border-dashed border-brand-orange/50 px-4 py-3.5 hover:bg-primary-100 hover:border-brand-orange hover:border-solid active:bg-primary-200 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 cursor-pointer group"
              >
                <Plus className="w-4 h-4 transition-transform duration-150 group-hover:scale-110" /> Add Step {steps.length + 1}
              </button>
            </div>
          )}
          </div>}
        </section>

        {/* ═══════ SECTION 3: DETAILS & PUBLISH ═══════ */}
        <section data-section="3" className={`border transition-all duration-150 ${openSections.has(3) ? 'border-surface-200 shadow-sm bg-white' : 'border-surface-100 bg-surface-50/50'}`}>
          <SectionHeader
            number={3}
            title="Details & Publish"
            subtitle="Add tags, tools, and your overall result."
            isExpanded={openSections.has(3)}
            isComplete={section3Complete}
            summary={section3Summary}
            onClick={() => toggleSection(3)}
          />

          {openSections.has(3) && <div id="section-3-panel" className="px-5 pb-5 space-y-5">
            {/* Tools */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Tools & APIs Used <span className="text-surface-400 font-normal">(optional)</span></label>
              <input type="text" value={tools} onChange={(e) => setTools(e.target.value)} placeholder="e.g., Claude, Python, Google Sheets, Notion API" className="w-full bg-white border border-surface-200 text-surface-900 placeholder-surface-400 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-colors duration-150" />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Tags <span className="text-surface-400 font-normal">(optional)</span></label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., branding, small business, marketing" className="w-full bg-white border border-surface-200 text-surface-900 placeholder-surface-400 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-colors duration-150" />
            </div>

            {/* Final Result / Overall Outcome */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                {isChain ? 'Overall Outcome' : 'Final Result'} <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-surface-500 mb-1.5 block">
                {isChain
                  ? 'Summarize the final outcome after all steps. Leave blank if your step results tell the full story.'
                  : 'Summarize the outcome. What did you end up with? Any metrics?'
                }
              </p>
              <textarea rows={4} value={finalResult} onChange={(e) => setFinalResult(e.target.value)} placeholder={isChain ? 'After all the steps, the final outcome was...' : 'The final result was... We saw a 23% improvement in...'} className="w-full bg-white border border-surface-200 text-surface-900 placeholder-surface-400 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-colors duration-150" />
            </div>
          </div>}
        </section>

        {/* Submit */}
        <div className="pt-6">
          {/* Completion summary */}
          <div className="flex items-center justify-between mb-4 text-sm">
            <span className="text-surface-500">
              {isChain
                ? `${filledSteps} of ${totalSteps} step${totalSteps !== 1 ? 's' : ''} complete`
                : promptContent.trim() ? 'Prompt added' : 'Add your prompt'
              }
            </span>
            {Object.keys(computeErrors()).length === 0 && (
              <span className="text-surface-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-green-500" /> Ready to publish
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3.5 font-medium text-base transition-all duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 ${
              submitting
                ? 'bg-surface-300 text-surface-500 cursor-not-allowed'
                : title.trim() && (isChain ? filledSteps > 0 : promptContent.trim())
                  ? 'bg-brand-orange text-white hover:opacity-90 active:opacity-80'
                  : 'bg-surface-200 text-surface-500 border-2 border-surface-300 hover:border-surface-400 hover:text-surface-600'
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit Project'}
          </button>
          <p className="text-xs text-surface-400 text-center mt-2">
            Projects are reviewed before appearing publicly.
          </p>
        </div>
      </form>

        {/* Live preview rail — order-last on mobile so the form comes first; sticky
            on lg so the preview stays in view as you scroll the long form. */}
        <aside className="mt-10 lg:mt-0 order-last">
          <BuilderPreview
            title={title}
            description={description}
            categorySlug={categorySlug}
            difficulty={difficulty}
            filledSteps={filledSteps}
            totalSteps={totalSteps}
            modelId={modelId}
            customModel={customModel}
            finalResult={finalResult}
            resultContent={resultContent}
            isChain={isChain}
          />
        </aside>
      </div>
    </div>
  )
}
