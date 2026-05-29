'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createDraftFromSourceRun, type SourceRunDraftState } from '@/lib/actions'
import type { Category } from '@/lib/types'

type DraftDefaults = {
  title: string
  description: string
  content: string
  result_content: string
  category_slug: string
  difficulty: string
  model_used: string
  model_recommendation: string
  tools_used: string
  tags: string
  step_title: string
  step_content: string
  step_result_content: string
  step_description: string
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand-orange px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Creating draft...' : 'Create pending draft'}
    </button>
  )
}

export default function CreateDraftFromSourceRunForm({
  sourceRunId,
  categories,
  defaults,
}: {
  sourceRunId: string
  categories: Category[]
  defaults: DraftDefaults
}) {
  const initialState: SourceRunDraftState = { error: null }
  const [state, formAction] = useActionState(createDraftFromSourceRun, initialState)

  return (
    <form action={formAction} className="border border-brand-orange/25 bg-brand-orange/5 p-4">
      <input type="hidden" name="source_run_id" value={sourceRunId} />

      <div className="mb-4 flex flex-col gap-2 border-b border-brand-orange/20 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-orange">Create project draft</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-surface-700">
            This creates a pending project owned by the original source-run submitter, then links it back to this intake.
          </p>
        </div>
        <SubmitButton />
      </div>

      {state.error && (
        <div className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.promptUrl && (
        <div className="mb-4 border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Draft created. <Link href={state.promptUrl} className="font-semibold underline">Open pending project</Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
          Title
          <input
            name="title"
            defaultValue={defaults.title}
            className="border border-surface-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-surface-900 outline-none focus:border-brand-orange"
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
          Category
          <select
            name="category_slug"
            defaultValue={defaults.category_slug}
            className="border border-surface-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-surface-900 outline-none focus:border-brand-orange"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
          Difficulty
          <select
            name="difficulty"
            defaultValue={defaults.difficulty}
            className="border border-surface-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-surface-900 outline-none focus:border-brand-orange"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
          Model used
          <input
            name="model_used"
            defaultValue={defaults.model_used}
            className="border border-surface-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-surface-900 outline-none focus:border-brand-orange"
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500 sm:col-span-2">
          Description
          <textarea
            name="description"
            rows={2}
            defaultValue={defaults.description}
            className="resize-y border border-surface-200 bg-white px-3 py-2 text-sm font-normal leading-6 normal-case tracking-normal text-surface-900 outline-none focus:border-brand-orange"
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500 sm:col-span-2">
          Project story
          <textarea
            name="content"
            rows={4}
            defaultValue={defaults.content}
            className="resize-y border border-surface-200 bg-white px-3 py-2 text-sm font-normal leading-6 normal-case tracking-normal text-surface-900 outline-none focus:border-brand-orange"
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500 sm:col-span-2">
          Final result
          <textarea
            name="result_content"
            rows={3}
            defaultValue={defaults.result_content}
            className="resize-y border border-surface-200 bg-white px-3 py-2 text-sm font-normal leading-6 normal-case tracking-normal text-surface-900 outline-none focus:border-brand-orange"
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
          Tools
          <input
            name="tools_used"
            defaultValue={defaults.tools_used}
            placeholder="Gemini, Chrome"
            className="border border-surface-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-surface-900 outline-none focus:border-brand-orange"
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
          Tags
          <input
            name="tags"
            defaultValue={defaults.tags}
            placeholder="one-shot, productivity"
            className="border border-surface-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-surface-900 outline-none focus:border-brand-orange"
          />
        </label>
      </div>

      <div className="mt-5 border-t border-brand-orange/20 pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-orange">Prompt/response step</h3>
        <div className="mt-3 grid gap-4">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
            Step title
            <input
              name="step_title"
              defaultValue={defaults.step_title}
              className="border border-surface-200 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-surface-900 outline-none focus:border-brand-orange"
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
            Exact prompt
            <textarea
              name="step_content"
              rows={4}
              defaultValue={defaults.step_content}
              className="resize-y border border-surface-200 bg-white px-3 py-2 text-sm font-normal leading-6 normal-case tracking-normal text-surface-900 outline-none focus:border-brand-orange"
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
            Exact response / result package
            <textarea
              name="step_result_content"
              rows={6}
              defaultValue={defaults.step_result_content}
              className="resize-y border border-surface-200 bg-white px-3 py-2 text-sm font-normal leading-6 normal-case tracking-normal text-surface-900 outline-none focus:border-brand-orange"
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
            Step notes
            <textarea
              name="step_description"
              rows={2}
              defaultValue={defaults.step_description}
              className="resize-y border border-surface-200 bg-white px-3 py-2 text-sm font-normal leading-6 normal-case tracking-normal text-surface-900 outline-none focus:border-brand-orange"
            />
          </label>
        </div>
      </div>
    </form>
  )
}
