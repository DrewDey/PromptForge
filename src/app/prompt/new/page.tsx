'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, LogIn } from 'lucide-react'
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
  const [isChain, setIsChain] = useState(false)
  const [steps, setSteps] = useState<Step[]>([{ title: '', content: '', result_content: '', description: '' }])
  const [expandedStep, setExpandedStep] = useState<number>(0)

  // Image state (preview only for now)
  const [resultImages, setResultImages] = useState<{ file: File; preview: string; caption: string }[]>([])
  const [stepImages, setStepImages] = useState<Record<number, { file: File; preview: string; caption: string }[]>>({})

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
        <h1 className="text-xl font-bold mb-2">Log in to share a project</h1>
        <p className="text-gray-600 text-sm mb-6">
          You need an account to submit projects to PromptForge.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/login" className="bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700">
            Log in
          </Link>
          <Link href="/auth/signup" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            Sign up
          </Link>
        </div>
      </div>
    )
  }

  // Loading auth state
  if (isLoggedIn === null) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-500">Loading...</div>
  }

  // Success
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔥</div>
        <h1 className="text-2xl font-bold mb-2">Project Submitted!</h1>
        <p className="text-gray-600 mb-6">
          Your project has been submitted for review. An admin will approve it shortly.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/browse"
            className="bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
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
              setIsChain(false)
            }}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/browse" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to browse
      </Link>

      <h1 className="text-3xl font-bold mb-2">Share a Project</h1>
      <p className="text-gray-600 mb-8">
        Share what you built with AI — the prompts, the process, and the results.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Complete Brand Identity Package for My Bakery"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
          <textarea
            required
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One or two sentences about what you built and the result"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* The Story */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">The Story</label>
          <p className="text-xs text-gray-500 mb-1.5">What did you build and why? What problem were you solving?</p>
          <textarea
            required
            rows={4}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Tell the story of your project — what you needed, why you used AI, and how it went..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Category, Difficulty, Model */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select required value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select</option>
              {categories.map(cat => (
                <option key={cat.slug} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select required value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model Used</label>
            <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
            <input type="text" required value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="Enter the model name" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
        )}

        {/* Tools */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tools & APIs Used <span className="text-gray-400 font-normal">(comma-separated)</span></label>
          <input type="text" value={tools} onChange={(e) => setTools(e.target.value)} placeholder="e.g., Claude, Python, Google Sheets, Notion API" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></label>
          <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., branding, small business, marketing" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
        </div>

        {/* Multi-step toggle */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isChain} onChange={(e) => setIsChain(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm font-medium text-gray-700">This project has multiple steps</span>
          </label>
          <span className="text-xs text-gray-500">Show the prompt and result at each step</span>
        </div>

        {/* Single prompt or steps */}
        {!isChain ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">The Prompt You Used</label>
              <textarea required rows={8} value={promptContent} onChange={(e) => setPromptContent(e.target.value)} placeholder="Paste the prompt you used to create this project..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">The Result <span className="text-gray-400 font-normal">(optional)</span></label>
              <p className="text-xs text-gray-500 mb-1.5">What did the AI produce? Share text, screenshots, or both.</p>
              <textarea rows={6} value={resultContent} onChange={(e) => setResultContent(e.target.value)} placeholder="Paste or describe what the AI generated..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-3" />
              <ImageUpload images={resultImages} onChange={setResultImages} label="Screenshots" />
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Steps</label>
            {steps.map((step, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setExpandedStep(expandedStep === idx ? -1 : idx)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                    <span className="text-sm font-medium text-gray-900">{step.title || `Step ${idx + 1}`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {steps.length > 1 && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeStep(idx) }} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {expandedStep === idx ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                {expandedStep === idx && (
                  <div className="p-4 space-y-3 border-t border-gray-200">
                    <input type="text" required placeholder="Step title (e.g., Brand Discovery)" value={step.title} onChange={(e) => updateStep(idx, 'title', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                    <input type="text" placeholder="Brief description of this step (optional)" value={step.description} onChange={(e) => updateStep(idx, 'description', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                    <div>
                      <label className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-1 block">Prompt</label>
                      <textarea required rows={5} placeholder="The prompt you used at this step..." value={step.content} onChange={(e) => updateStep(idx, 'content', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1 block">Result <span className="text-gray-400 font-normal normal-case">(optional — text, screenshots, or both)</span></label>
                      <textarea rows={4} placeholder="What did the AI produce at this step?" value={step.result_content} onChange={(e) => updateStep(idx, 'result_content', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-3" />
                      <ImageUpload images={stepImages[idx] ?? []} onChange={(imgs) => setStepImages({ ...stepImages, [idx]: imgs })} label="Screenshots" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={addStep} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium mt-2">
              <Plus className="w-4 h-4" /> Add Step
            </button>
          </div>
        )}

        {/* Final Result */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Final Result <span className="text-gray-400 font-normal">(optional)</span></label>
          <p className="text-xs text-gray-500 mb-1.5">Summarize the outcome. What did you end up with? Any metrics?</p>
          <textarea rows={4} value={finalResult} onChange={(e) => setFinalResult(e.target.value)} placeholder="The final result was... We saw a 23% improvement in..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit for Review'}
        </button>
      </form>
    </div>
  )
}
