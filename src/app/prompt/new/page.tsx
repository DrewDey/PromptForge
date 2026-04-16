'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, LogIn, FileText, GitBranch, Check, AlertCircle } from 'lucide-react'
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

function SectionHeader({ number, title, subtitle }: { number: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="w-9 h-9 bg-brand-blue text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

function RequiredDot() {
  return <span className="text-brand-orange ml-0.5">*</span>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
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
      // Scroll to first error using the freshly computed errors (not stale state)
      const firstErrorKey = Object.keys(errors)[0]
      const el = document.querySelector(`[data-field="${firstErrorKey}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
        <LogIn className="w-10 h-10 text-gray-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Log in to share a project</h1>
        <p className="text-gray-600 text-sm mb-6">
          You need an account to submit projects to PathForge.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/login" className="bg-brand-orange text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">
            Log in
          </Link>
          <Link href="/auth/signup" className="text-gray-500 hover:text-gray-900 text-sm font-medium">
            Sign up
          </Link>
        </div>
      </div>
    )
  }

  // Loading auth state
  if (isLoggedIn === null) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Loading...</div>
  }

  // Success
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔥</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Submitted!</h1>
        <p className="text-gray-600 mb-6">
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
            className="text-gray-500 hover:text-gray-900 text-sm font-medium"
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
      : 'border-gray-300 focus:border-brand-orange focus:ring-brand-orange/20'

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/browse" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-6 transition-colors duration-200">
        <ArrowLeft className="w-4 h-4" />
        Back to browse
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Share a Project</h1>
      <p className="text-gray-600 mb-3">
        Share what you built with AI — the prompts, the process, and the results.
      </p>
      <p className="text-xs text-gray-400 mb-8">
        Fields marked with <span className="text-brand-orange">*</span> are required.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-8">

        {/* ═══════ SECTION 1: PROJECT BASICS ═══════ */}
        <section>
          <SectionHeader number={1} title="Project Basics" subtitle="What did you build and in what domain?" />

          <div className="space-y-5">
            {/* Title */}
            <div data-field="title">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Title <RequiredDot />
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Complete Brand Identity Package for My Bakery"
                className={`w-full bg-white border text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors duration-200 ${fieldBorder('title')}`}
              />
              <FieldError message={validationErrors.title} />
            </div>

            {/* Description */}
            <div data-field="description">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short Description <RequiredDot />
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One or two sentences about what you built and the result"
                className={`w-full bg-white border text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors duration-200 ${fieldBorder('description')}`}
              />
              <FieldError message={validationErrors.description} />
            </div>

            {/* The Story */}
            <div data-field="story">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                The Story <RequiredDot />
              </label>
              <p className="text-xs text-gray-500 mb-1.5 block">What did you build and why? What problem were you solving?</p>
              <textarea
                rows={4}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Tell the story of your project — what you needed, why you used AI, and how it went..."
                className={`w-full bg-white border text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors duration-200 ${fieldBorder('story')}`}
              />
              <FieldError message={validationErrors.story} />
            </div>

            {/* Category, Difficulty, Model */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div data-field="category">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <RequiredDot />
                </label>
                <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className={`w-full bg-white border text-gray-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors duration-200 ${fieldBorder('category')}`}>
                  <option value="">Select</option>
                  {categories.map(cat => (
                    <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
                <FieldError message={validationErrors.category} />
              </div>
              <div data-field="difficulty">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty <RequiredDot />
                </label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={`w-full bg-white border text-gray-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors duration-200 ${fieldBorder('difficulty')}`}>
                  <option value="">Select</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <FieldError message={validationErrors.difficulty} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model Used</label>
                <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="w-full bg-white border border-gray-300 text-gray-900 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors duration-200">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Name <RequiredDot />
                </label>
                <input type="text" value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="Enter the model name" className={`w-full bg-white border text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors duration-200 ${fieldBorder('customModel')}`} />
                <FieldError message={validationErrors.customModel} />
              </div>
            )}
          </div>
        </section>

        {/* Section divider */}
        <div className="border-t-2 border-gray-200" />

        {/* ═══════ SECTION 2: YOUR BUILD JOURNEY ═══════ */}
        <section>
          <SectionHeader number={2} title="Your Build Journey" subtitle="Show how you built it — the prompts and results at each step." />

          {/* Mode toggle — prominent visual choice */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setIsChain(true)}
              aria-pressed={isChain}
              className={`flex items-center gap-3 p-4 border-2 text-left transition-all duration-200 ${
                isChain
                  ? 'border-brand-orange bg-primary-50 shadow-[inset_4px_0_0_var(--color-brand-orange)]'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
              }`}
            >
              <GitBranch className={`w-5 h-5 flex-shrink-0 ${isChain ? 'text-brand-orange' : 'text-gray-400'}`} />
              <div>
                <div className={`text-sm font-semibold ${isChain ? 'text-gray-900' : 'text-gray-600'}`}>Multi-step</div>
                <div className="text-xs text-gray-500">Show each prompt→result</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsChain(false)}
              aria-pressed={!isChain}
              className={`flex items-center gap-3 p-4 border-2 text-left transition-all duration-200 ${
                !isChain
                  ? 'border-brand-orange bg-primary-50 shadow-[inset_4px_0_0_var(--color-brand-orange)]'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
              }`}
            >
              <FileText className={`w-5 h-5 flex-shrink-0 ${!isChain ? 'text-brand-orange' : 'text-gray-400'}`} />
              <div>
                <div className={`text-sm font-semibold ${!isChain ? 'text-gray-900' : 'text-gray-600'}`}>Single prompt</div>
                <div className="text-xs text-gray-500">One prompt, one result</div>
              </div>
            </button>
          </div>

          {/* Single prompt or multi-step */}
          {!isChain ? (
            <div className="space-y-5">
              <div data-field="promptContent">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  The Prompt You Used <RequiredDot />
                </label>
                <textarea rows={8} value={promptContent} onChange={(e) => setPromptContent(e.target.value)} placeholder="Paste the prompt you used to create this project..." className={`w-full bg-white border text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 transition-colors duration-200 ${fieldBorder('promptContent')}`} />
                <FieldError message={validationErrors.promptContent} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">The Result <span className="text-gray-400 font-normal">(optional)</span></label>
                <p className="text-xs text-gray-500 mb-1.5 block">What did the AI produce? Share text, screenshots, or both.</p>
                <textarea rows={6} value={resultContent} onChange={(e) => setResultContent(e.target.value)} placeholder="Paste or describe what the AI generated..." className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 mb-3 transition-colors duration-200" />
                <ImageUpload images={resultImages} onChange={setResultImages} label="Screenshots" />
              </div>
            </div>
          ) : (
            <div className="space-y-3" data-field="steps">
              {/* Step progress bar */}
              {totalSteps > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-600">
                      {filledSteps} of {totalSteps} step{totalSteps !== 1 ? 's' : ''} filled
                    </span>
                    <span className="text-xs text-gray-400">{progressPercent}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 w-full overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Step completion progress">
                    <div
                      className="h-full bg-brand-orange transition-all duration-300 ease-out"
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
                  <div key={idx} className={`bg-white border overflow-hidden transition-all duration-200 ${isExpanded ? 'border-brand-orange/40 shadow-sm' : 'border-gray-200'}`}>
                    {/* Step header */}
                    <button
                      type="button"
                      onClick={() => setExpandedStep(isExpanded ? -1 : idx)}
                      aria-expanded={isExpanded}
                      className={`w-full flex items-center justify-between px-4 py-3 transition-colors duration-200 cursor-pointer ${
                        isExpanded ? 'bg-primary-50' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 text-xs font-bold flex items-center justify-center transition-colors duration-200 ${
                          isExpanded
                            ? 'bg-brand-orange text-white'
                            : isFilled
                              ? 'bg-green-500 text-white'
                              : isPartial
                                ? 'bg-brand-orange/20 text-brand-orange'
                                : 'bg-gray-200 text-gray-500'
                        }`}>
                          {isFilled && !isExpanded ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </span>
                        <div className="text-left">
                          <span className="text-sm font-medium text-gray-900">
                            {step.title || `Step ${idx + 1}`}
                          </span>
                          {/* Completion badge on collapsed cards */}
                          {!isExpanded && (
                            <span className={`block text-xs mt-0.5 ${
                              isFilled ? 'text-green-600' : isPartial ? 'text-brand-orange' : 'text-gray-400'
                            }`}>
                              {isFilled ? 'Complete' : isPartial ? 'In progress' : 'Click to edit'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {steps.length > 1 && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeStep(idx) }} className="text-gray-400 hover:text-red-500 p-1 transition-colors duration-200" title="Remove step">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </button>

                    {/* Expanded step form */}
                    {isExpanded && (
                      <div className="p-4 space-y-4 border-t border-gray-200">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                            Step Title <RequiredDot />
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Brand Discovery, Initial Draft, Refinement..."
                            value={step.title}
                            onChange={(e) => updateStep(idx, 'title', e.target.value)}
                            className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Brief Description <span className="text-gray-400 font-normal normal-case">(optional)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="What was the goal of this step?"
                            value={step.description}
                            onChange={(e) => updateStep(idx, 'description', e.target.value)}
                            className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors duration-200"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-brand-orange uppercase tracking-wide mb-1 block">
                            Prompt <RequiredDot />
                          </label>
                          <textarea
                            rows={5}
                            placeholder="The prompt you used at this step..."
                            value={step.content}
                            onChange={(e) => updateStep(idx, 'content', e.target.value)}
                            className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors duration-200"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1 block">
                            Result <span className="text-gray-400 font-normal normal-case">(optional — text, screenshots, or both)</span>
                          </label>
                          <textarea
                            rows={4}
                            placeholder="What did the AI produce at this step?"
                            value={step.result_content}
                            onChange={(e) => updateStep(idx, 'result_content', e.target.value)}
                            className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 mb-3 transition-colors duration-200"
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
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-brand-orange bg-primary-50 border-2 border-brand-orange/40 px-4 py-3.5 hover:bg-primary-100 hover:border-brand-orange/60 active:bg-primary-200 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2"
              >
                <Plus className="w-4 h-4" /> Add Step {steps.length + 1}
              </button>
            </div>
          )}
        </section>

        {/* Section divider */}
        <div className="border-t-2 border-gray-200" />

        {/* ═══════ SECTION 3: DETAILS & PUBLISH ═══════ */}
        <section>
          <SectionHeader number={3} title="Details & Publish" subtitle="Add tags, tools, and your overall result." />

          <div className="space-y-5">
            {/* Tools */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tools & APIs Used <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" value={tools} onChange={(e) => setTools(e.target.value)} placeholder="e.g., Claude, Python, Google Sheets, Notion API" className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors duration-200" />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., branding, small business, marketing" className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors duration-200" />
            </div>

            {/* Final Result / Overall Outcome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isChain ? 'Overall Outcome' : 'Final Result'} <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-500 mb-1.5 block">
                {isChain
                  ? 'Summarize the final outcome after all steps. Leave blank if your step results tell the full story.'
                  : 'Summarize the outcome. What did you end up with? Any metrics?'
                }
              </p>
              <textarea rows={4} value={finalResult} onChange={(e) => setFinalResult(e.target.value)} placeholder={isChain ? 'After all the steps, the final outcome was...' : 'The final result was... We saw a 23% improvement in...'} className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors duration-200" />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="border-t-2 border-gray-200 pt-6">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-orange text-white py-3.5 font-medium text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2"
          >
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Your project will be reviewed by an admin before appearing publicly.
          </p>
        </div>
      </form>
    </div>
  )
}
