'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

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

type Step = { title: string; content: string; description: string }

export default function SubmitPromptPage() {
  const router = useRouter()
  const [isChain, setIsChain] = useState(false)
  const [steps, setSteps] = useState<Step[]>([{ title: '', content: '', description: '' }])
  const [submitted, setSubmitted] = useState(false)

  function addStep() {
    setSteps([...steps, { title: '', content: '', description: '' }])
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index))
  }

  function updateStep(index: number, field: keyof Step, value: string) {
    const updated = [...steps]
    updated[index] = { ...updated[index], [field]: value }
    setSteps(updated)
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">Prompt Submitted!</h1>
        <p className="text-gray-600 mb-6">
          Your prompt has been submitted for review. An admin will approve it shortly.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/browse"
            className="bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Browse Prompts
          </Link>
          <button
            onClick={() => { setSubmitted(false) }}
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

      <h1 className="text-3xl font-bold mb-2">Submit a Prompt</h1>
      <p className="text-gray-600 mb-8">
        Share your prompt with the community. It will be reviewed before publishing.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSubmitted(true)
        }}
        className="space-y-6"
      >
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            required
            placeholder="e.g., Monthly Budget Analyzer"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            required
            rows={3}
            placeholder="What does this prompt do? Who is it for?"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Category & Difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat.slug} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value="">Select difficulty</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Model Recommendation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recommended AI Model <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Claude, ChatGPT-4, Any model"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags <span className="text-gray-400 font-normal">(comma-separated)</span>
          </label>
          <input
            type="text"
            placeholder="e.g., budget, finance, analysis"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Single vs Chain toggle */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isChain}
              onChange={(e) => setIsChain(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">
              This is a multi-step prompt chain
            </span>
          </label>
        </div>

        {/* Prompt Content */}
        {!isChain ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
            <textarea
              required
              rows={10}
              placeholder="Paste your prompt here. Use [BRACKETS] for placeholders the user should fill in."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Prompt Chain Steps</label>
            {steps.map((step, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary-600">Step {idx + 1}</span>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Step title (e.g., Research Phase)"
                  value={step.title}
                  onChange={(e) => updateStep(idx, 'title', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Brief description of this step (optional)"
                  value={step.description}
                  onChange={(e) => updateStep(idx, 'description', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <textarea
                  required
                  rows={6}
                  placeholder="The prompt for this step..."
                  value={step.content}
                  onChange={(e) => updateStep(idx, 'content', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addStep}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Step
            </button>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Submit for Review
        </button>
      </form>
    </div>
  )
}
