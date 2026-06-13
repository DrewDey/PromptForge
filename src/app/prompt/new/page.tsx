'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, LogIn, FileText, GitBranch, Check, AlertCircle, ArrowUp, ArrowDown, ChevronRight, Layers, Cpu, Eye, Keyboard, CheckCircle2, Link2, Paperclip } from 'lucide-react'
import { getModelsByProvider, getModelName } from '@/lib/models'
import { submitProject, submitSourceRun } from '@/lib/actions'
import { detectSourceRunProvider } from '@/lib/source-run-review'
import {
  PROJECT_FORK_MAX_DEPTH,
  PROJECT_FORK_MAX_WIDTH,
  parseProjectForkSearchParams,
  serializeProjectForkSourceForNotes,
  type ProjectForkSource,
} from '@/lib/project-forks'
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

type IntakeMode = 'source-run' | 'manual'

type SourceRunImport = {
  id: string
  label: string
  source: string
  attachmentPath?: string
  attachmentName?: string
  forkSource?: ProjectForkSource
  provider?: string
  modelUsed?: string
  modelSettings?: string
  notes?: string
  createdAt: string
  status: 'queued' | 'failed'
}

const sourceRunProviderOptions = ['ChatGPT', 'Claude', 'Gemini', 'OpenRouter', 'Other']

const sourceRunModelSuggestions: Record<string, string[]> = {
  ChatGPT: ['GPT-5.5', 'GPT-5.5 Thinking', 'GPT-5', 'GPT-5 mini'],
  Claude: ['Claude Sonnet 4.6', 'Claude Opus 4.8', 'Claude Haiku'],
  Gemini: ['Gemini 3.1 Pro', 'Gemini 3.1 Flash', 'Gemini 2.5 Pro'],
  OpenRouter: [
    'anthropic/claude-sonnet-4.6',
    'openai/gpt-5.5',
    'google/gemini-3.1-pro',
  ],
}

const sourceRunAttachmentBucket = 'source-run-attachments'
const sourceRunAttachmentMaxBytes = 10 * 1024 * 1024
const sourceRunAttachmentAccept = [
  'image/*',
  '.html',
  '.htm',
  '.txt',
  '.md',
  '.json',
  '.pdf',
  '.zip',
].join(',')
const sourceRunAttachmentTypes = new Set([
  'text/html',
  'text/plain',
  'text/markdown',
  'application/json',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
])
const sourceRunAttachmentExtensions = new Set([
  'html',
  'htm',
  'txt',
  'md',
  'json',
  'pdf',
  'zip',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
])

function sourceRunAttachmentErrorFor(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const isAllowedType = file.type.startsWith('image/')
    || sourceRunAttachmentTypes.has(file.type)
    || sourceRunAttachmentExtensions.has(extension)

  if (!isAllowedType) {
    return 'Use an image, HTML, text, PDF, JSON, Markdown, or zip file.'
  }

  if (file.size > sourceRunAttachmentMaxBytes) {
    return 'Attachment must be 10MB or smaller.'
  }

  return ''
}

function safeSourceRunAttachmentName(file: File) {
  const cleaned = file.name
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || 'source-run-attachment'
}

// Mirrors PromptCard's difficulty chip palette so the preview card reads the same
// as the Build Paths grid's real cards.
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
          How it appears on Build Paths
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
          Fill in the form and your card preview will come to life here — exactly how it will look on the Build Paths grid.
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

function makeSourceRunImportId() {
  return `project-source-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function intakeCardClass(active: boolean) {
  return `border p-4 text-left transition ${
    active
      ? 'border-brand-orange bg-brand-orange/5 shadow-[0_12px_34px_rgba(247,127,0,0.12)]'
      : 'border-surface-200 bg-white hover:border-surface-400'
  }`
}

function ForkCapacityDots({
  value,
  max,
}: {
  value: number
  max: number
}) {
  return (
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: max }).map((_, index) => (
        <span
          key={index}
          className={[
            'h-2 border',
            index < value ? 'border-[#07551f] bg-[#2bd15f]' : 'border-surface-200 bg-white',
          ].join(' ')}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function ForkSourcePanel({ forkSource }: { forkSource: ProjectForkSource }) {
  const depthValue = Math.min(forkSource.depth + 1, PROJECT_FORK_MAX_DEPTH)
  const branchValue = Math.min(forkSource.branchIndex + 1, PROJECT_FORK_MAX_WIDTH)

  return (
    <div className="mb-8 overflow-hidden border border-[#07551f] bg-white shadow-[0_18px_44px_rgba(7,85,31,0.08)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative p-5 sm:p-6">
          <div className="absolute left-0 top-0 h-full w-3 border-x-2 border-[#07551f] bg-[#2bd15f] shadow-[inset_3px_0_0_rgba(255,255,255,0.24),inset_-3px_0_0_rgba(0,0,0,0.18)]" aria-hidden="true" />
          <div className="pl-5">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
              <GitBranch className="h-4 w-4" aria-hidden="true" />
              Fork source attached
            </div>
            <h2 className="mt-2 text-2xl font-black text-surface-900">
              {forkSource.sourceProjectTitle
                ? `Forking from ${forkSource.sourceProjectTitle}`
                : 'Forking from an existing PathForge project'}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-600">
              {forkSource.sourceStepNumber && (
                <span className="border border-[#07551f]/30 bg-[#effdf3] px-2 py-1 text-[#07551f]">
                  Response {String(forkSource.sourceStepNumber).padStart(2, '0')}
                </span>
              )}
              {forkSource.sourceStepId && (
                <span className="border border-surface-200 bg-surface-50 px-2 py-1">
                  Step id locked
                </span>
              )}
              {forkSource.promptFamilyId && (
                <span className="border border-surface-200 bg-surface-50 px-2 py-1">
                  Prompt family attached
                </span>
              )}
              {forkSource.parentForkId && (
                <span className="border border-surface-200 bg-surface-50 px-2 py-1">
                  Parent fork attached
                </span>
              )}
            </div>
          </div>
        </div>

        <aside className="border-t border-[#07551f] bg-[#effdf3] p-5 lg:border-l lg:border-t-0">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
            Branch coordinates
          </div>
          <div className="mt-3 grid gap-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-surface-700">
                <span>Depth</span>
                <span>{depthValue} / {PROJECT_FORK_MAX_DEPTH}</span>
              </div>
              <ForkCapacityDots value={depthValue} max={PROJECT_FORK_MAX_DEPTH} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-surface-700">
                <span>Branch</span>
                <span>{branchValue} / {PROJECT_FORK_MAX_WIDTH}</span>
              </div>
              <ForkCapacityDots value={branchValue} max={PROJECT_FORK_MAX_WIDTH} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function BuildLoggedOutLanding({
  forkSource,
  loginHref,
  signupHref,
  isCheckingAccount = false,
}: {
  forkSource: ProjectForkSource | null
  loginHref: string
  signupHref: string
  isCheckingAccount?: boolean
}) {
  return (
    <div className="bg-surface-50">
      <section className="border-b border-surface-200 bg-white text-surface-900">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8 lg:py-16">
          <div>
            <Link href="/paths" className="mb-7 inline-flex items-center gap-2 text-sm text-surface-500 transition-colors hover:text-brand-orange">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Build Paths
            </Link>
            <div className="mb-4 inline-flex items-center gap-2 border border-brand-orange/35 bg-brand-orange/10 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              Build intake
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.03em] sm:text-5xl">
              Turn a real AI session into a review-ready Build Path.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-surface-600">
              Build is where PathForge collects the original ChatGPT, Claude, Gemini, or OpenRouter run behind a project. Signed-in builders paste the source link, add model details, and send it to review before anything becomes public.
            </p>
            {isCheckingAccount && (
              <div className="mt-5 inline-flex items-center gap-2 border border-primary-200 bg-primary-50 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-orange">
                <span className="h-2 w-2 animate-pulse bg-brand-orange" aria-hidden="true" />
                Checking account
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/paths" className="inline-flex items-center gap-2 border border-surface-300 bg-white px-5 py-3 text-sm font-bold text-surface-900 transition hover:border-brand-orange">
                Browse paths
              </Link>
              <Link href={loginHref} className="inline-flex items-center gap-2 bg-brand-orange px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-orange-dark">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in to build
              </Link>
              <Link href={signupHref} className="inline-flex items-center gap-2 border border-surface-300 bg-white px-5 py-3 text-sm font-bold text-surface-900 transition hover:border-brand-orange">
                Create account
              </Link>
              <Link href="/guide" className="inline-flex items-center gap-2 border border-surface-300 bg-white px-5 py-3 text-sm font-bold text-surface-900 transition hover:border-brand-orange">
                <FileText className="h-4 w-4 text-brand-orange" aria-hidden="true" />
                See the walkthrough
              </Link>
            </div>
          </div>

          <div className="border border-surface-200 bg-primary-50 p-5 shadow-[10px_10px_0_rgba(232,122,44,0.10)]">
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
              What Build does
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['01', 'Start with the source run', 'Paste the original AI session link instead of rebuilding the project by hand.'],
                ['02', 'Keep model details attached', 'Provider, exact model, settings, and review notes stay with the submission.'],
                ['03', 'Queue it for review', 'The entry waits for admin review and never publishes itself automatically.'],
              ].map(([number, title, body]) => (
                <div key={number} className="grid grid-cols-[42px_1fr] gap-3 border border-primary-200 bg-white px-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center bg-brand-orange font-mono text-xs font-black text-white">
                    {number}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-surface-900">{title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-surface-600">{body}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {forkSource && <ForkSourcePanel forkSource={forkSource} />}
        <div className="max-w-2xl border border-surface-200 bg-white p-5">
          <h2 className="text-xl font-black text-surface-900">Sign in when you are ready to build</h2>
          <p className="mt-2 text-sm leading-6 text-surface-600">
            Browse existing paths without an account. To submit a run, PathForge needs a profile so review can keep source links, notes, and publish decisions attached to the right builder.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SubmitProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const forkSource = useMemo(() => parseProjectForkSearchParams(searchParams), [searchParams])
  const [authReturnPath, setAuthReturnPath] = useState('/build')

  // Form state
  const [intakeMode, setIntakeMode] = useState<IntakeMode>('source-run')
  const [sourceRunTitle, setSourceRunTitle] = useState('')
  const [sourceRunUrl, setSourceRunUrl] = useState('')
  const [sourceRunProvider, setSourceRunProvider] = useState('')
  const [sourceRunCustomProvider, setSourceRunCustomProvider] = useState('')
  const [sourceRunProviderTouched, setSourceRunProviderTouched] = useState(false)
  const [sourceRunModel, setSourceRunModel] = useState('')
  const [sourceRunModelSettings, setSourceRunModelSettings] = useState('')
  const [sourceRunNotes, setSourceRunNotes] = useState('')
  const [sourceRunAttachment, setSourceRunAttachment] = useState<File | null>(null)
  const [sourceRunAttachmentError, setSourceRunAttachmentError] = useState('')
  const [sourceRunImports, setSourceRunImports] = useState<SourceRunImport[]>([])
  const [sourceRunSubmitting, setSourceRunSubmitting] = useState(false)
  const [sourceRunError, setSourceRunError] = useState('')
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

  useEffect(() => {
    setAuthReturnPath(`${window.location.pathname}${window.location.search}`)
    if (!forkSource) return

    setSourceRunTitle(current => (
      current.trim() ? current : `${forkSource.sourceProjectTitle || 'Forked Path'} fork`
    ))
    setSourceRunNotes(current => (
      current.trim() ? current : serializeProjectForkSourceForNotes(forkSource)
    ))
  }, [forkSource])

  useEffect(() => {
    if (sourceRunProviderTouched) return
    setSourceRunProvider(detectSourceRunProvider(sourceRunUrl))
  }, [sourceRunUrl, sourceRunProviderTouched])

  const modelsByProvider = getModelsByProvider()

  // Check auth
  useEffect(() => {
    let active = true
    const finishAuthCheck = (value: boolean) => {
      if (!active) return
      setIsLoggedIn(value)
    }
    const authTimeout = window.setTimeout(() => finishAuthCheck(false), 3000)

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      finishAuthCheck(false)
      window.clearTimeout(authTimeout)
      return () => {
        active = false
      }
    }
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        window.clearTimeout(authTimeout)
        finishAuthCheck(!!user)
      }).catch(() => {
        window.clearTimeout(authTimeout)
        finishAuthCheck(false)
      })
    }).catch(() => {
      window.clearTimeout(authTimeout)
      finishAuthCheck(false)
    })

    return () => {
      active = false
      window.clearTimeout(authTimeout)
    }
  }, [])

  function computeErrors(): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Project title is required'
    if (!description.trim()) errors.description = 'Short description is required'
    if (!story.trim()) errors.story = 'Tell the story of your project'
    if (!categorySlug) errors.category = 'Pick a category'
    if (!difficulty) errors.difficulty = 'Select a difficulty level'
    if (!isChain && !promptContent.trim()) errors.promptContent = 'Enter the ask you used'
    if (isChain) {
      const hasFilledStep = steps.some(s => s.title.trim() && s.content.trim())
      if (!hasFilledStep) errors.steps = 'Complete at least one step with a title and ask'
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

  function handleSourceRunAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setSourceRunAttachmentError('')

    if (!file) {
      setSourceRunAttachment(null)
      return
    }

    const fileError = sourceRunAttachmentErrorFor(file)
    if (fileError) {
      setSourceRunAttachment(null)
      setSourceRunAttachmentError(fileError)
      event.target.value = ''
      return
    }

    setSourceRunAttachment(file)
  }

  async function uploadSourceRunAttachment(file: File) {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Log in again before uploading an attachment.')
    }

    const path = `${user.id}/${crypto.randomUUID()}-${safeSourceRunAttachmentName(file)}`
    const { error: uploadError } = await supabase.storage
      .from(sourceRunAttachmentBucket)
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || undefined,
        upsert: false,
      })

    if (uploadError) {
      throw new Error(uploadError.message || 'Attachment upload failed.')
    }

    return path
  }

  async function prepareSourceRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = sourceRunTitle.trim()
    const url = sourceRunUrl.trim()
    if (!title || !url) return
    const providerSelection = sourceRunProvider.trim() || detectSourceRunProvider(url)
    const provider = providerSelection === 'Other'
      ? sourceRunCustomProvider.trim()
      : providerSelection
    const modelUsed = sourceRunModel.trim()
    const modelSettings = sourceRunModelSettings.trim()

    if (!provider) {
      setSourceRunError('Pick the AI service for this source run.')
      return
    }

    if (!modelUsed) {
      setSourceRunError('Add the exact model shown for this source run, or type Not sure.')
      return
    }

    if (sourceRunAttachment) {
      const fileError = sourceRunAttachmentErrorFor(sourceRunAttachment)
      if (fileError) {
        setSourceRunAttachmentError(fileError)
        return
      }
    }

    setSourceRunSubmitting(true)
    setSourceRunError('')
    setSourceRunAttachmentError('')

    let attachmentPath: string | undefined

    try {
      if (sourceRunAttachment) {
        attachmentPath = await uploadSourceRunAttachment(sourceRunAttachment)
      }
    } catch (err) {
      setSourceRunSubmitting(false)
      setSourceRunAttachmentError(err instanceof Error ? err.message : 'Attachment upload failed.')
      return
    }

    const result = await submitSourceRun({
      title,
      source_url: url,
      file_name: attachmentPath,
      provider,
      model_used: modelUsed,
      model_settings: modelSettings,
      notes: sourceRunNotes,
      fork_source: forkSource,
    })

    setSourceRunSubmitting(false)

    if (!result.success) {
      if (attachmentPath) {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        await supabase.storage.from(sourceRunAttachmentBucket).remove([attachmentPath])
      }
      setSourceRunError(result.error ?? 'Failed to submit entry')
      return
    }

    setSourceRunImports((current) => [{
      id: result.id ?? makeSourceRunImportId(),
      label: title,
      source: url,
      attachmentPath,
      attachmentName: sourceRunAttachment?.name,
      forkSource: forkSource ?? undefined,
      provider: provider || undefined,
      modelUsed: modelUsed || undefined,
      modelSettings: modelSettings || undefined,
      notes: sourceRunNotes.trim() || undefined,
      createdAt: 'Queued for extraction',
      status: 'queued',
    }, ...current])
    setSourceRunTitle(forkSource ? `${forkSource.sourceProjectTitle || 'Forked Path'} fork` : '')
    setSourceRunUrl('')
    setSourceRunProvider('')
    setSourceRunCustomProvider('')
    setSourceRunProviderTouched(false)
    setSourceRunModel('')
    setSourceRunModelSettings('')
    setSourceRunAttachment(null)
    setSourceRunNotes(forkSource ? serializeProjectForkSourceForNotes(forkSource) : '')
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
      fork_source: forkSource,
    })

    setSubmitting(false)

    if (result.success) {
      setSubmitted(true)
    } else {
      setError(result.error ?? 'Something went wrong')
    }
  }

  const loginHref = `/auth/login?next=${encodeURIComponent(authReturnPath)}`
  const signupHref = `/auth/signup?next=${encodeURIComponent(authReturnPath)}`

  // Not logged in
  if (isLoggedIn === false) {
    return <BuildLoggedOutLanding forkSource={forkSource} loginHref={loginHref} signupHref={signupHref} />
  }

  // Loading auth state
  if (isLoggedIn === null) {
    return <BuildLoggedOutLanding forkSource={forkSource} loginHref={loginHref} signupHref={signupHref} isCheckingAccount />
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
            href="/paths"
            className="bg-brand-orange text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Build Paths
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
    : promptContent.trim() ? 'Ask added' : undefined
  const section3Summary = [
    tools.trim() ? `Tools: ${tools.trim().split(',').slice(0, 2).join(', ')}` : '',
    tags.trim() ? `Tags: ${tags.trim().split(',').slice(0, 2).join(', ')}` : '',
  ].filter(Boolean).join(' · ') || undefined
  const detectedSourceRunProvider = detectSourceRunProvider(sourceRunUrl)
  const selectedSourceRunProvider = sourceRunProvider.trim() || detectedSourceRunProvider
  const resolvedSourceRunProvider = selectedSourceRunProvider === 'Other'
    ? sourceRunCustomProvider.trim()
    : selectedSourceRunProvider
  const modelSuggestions = sourceRunModelSuggestions[selectedSourceRunProvider] ?? []
  const modelPlaceholder = selectedSourceRunProvider === 'OpenRouter'
    ? 'Paste the exact routed model, e.g. anthropic/claude-sonnet-4.6'
    : 'Exact model shown, or Not sure'
  const canSubmitSourceRun = Boolean(
    sourceRunTitle.trim() &&
    sourceRunUrl.trim() &&
    resolvedSourceRunProvider &&
    sourceRunModel.trim()
  )

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
    <div className="bg-surface-50">
      <section className="relative overflow-hidden border-b border-surface-200 bg-white text-surface-900">
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(var(--color-surface-100)_1px,transparent_1px),linear-gradient(90deg,var(--color-surface-100)_1px,transparent_1px)] [background-size:54px_54px]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-8 lg:py-16">
          <div>
            <Link href="/paths" className="mb-7 inline-flex items-center gap-2 text-sm text-surface-500 transition-colors hover:text-brand-orange">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Build Paths
            </Link>
            <div className="mb-4 inline-flex items-center gap-2 border border-brand-orange/35 bg-brand-orange/10 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              Build intake
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              Submit the run. Let PathForge structure the project.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-surface-600">
              This page is for real AI sessions: a source link, exact model details, and notes for review. It is not the suggestion box, and it does not publish anything by itself.
            </p>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              <div className="border border-surface-200 bg-white p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-orange">Input</div>
                <div className="mt-1 text-sm font-bold">AI session link</div>
              </div>
              <div className="border border-surface-200 bg-white p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-orange">Queue</div>
                <div className="mt-1 text-sm font-bold">Normal review</div>
              </div>
              <div className="border border-surface-200 bg-white p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-orange">Publish</div>
                <div className="mt-1 text-sm font-bold">Admin decision</div>
              </div>
            </div>
            <Link href="/guide" className="mt-5 inline-flex items-center gap-2 border border-surface-300 bg-white px-4 py-2.5 text-sm font-bold text-surface-900 transition hover:border-brand-orange">
              <FileText className="h-4 w-4 text-brand-orange" aria-hidden="true" />
              See exactly what to click
            </Link>
          </div>

          <aside className="border border-surface-200 bg-primary-50 p-5 shadow-[16px_16px_0_rgba(232,122,44,0.12)]">
            <div className="flex items-center justify-between border-b border-primary-200 pb-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-surface-500">Source package</div>
                <div className="mt-1 text-lg font-black">Review-ready intake</div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center bg-brand-orange text-white">
                <Link2 className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['01', 'Session URL', 'The original conversation stays attached.'],
                ['02', 'Model evidence', 'Provider, exact model, and settings stay separate.'],
                ['03', 'Review notes', 'Point review toward the final artifact and caveats.'],
                ['04', 'No auto-publish', 'The entry waits for an explicit admin step.'],
              ].map(([number, title, body]) => (
                <div key={number} className="grid grid-cols-[42px_1fr] gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-primary-200 bg-white font-mono text-xs font-black text-brand-orange">
                    {number}
                  </div>
                  <div className="border-l border-primary-200 pl-3">
                    <div className="text-sm font-bold text-surface-900">{title}</div>
                    <p className="mt-0.5 text-xs leading-5 text-surface-600">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">

      {forkSource && <ForkSourcePanel forkSource={forkSource} />}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6 max-w-2xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <section className="mb-8 overflow-hidden border border-surface-200 bg-white shadow-[10px_10px_0_rgba(24,24,27,0.06)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div>
            <div className="border-b border-surface-200 bg-white px-5 py-5 sm:px-6">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange">
                Preferred intake
              </div>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.02em] text-surface-900">
                Start from the actual AI session
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-600">
                Paste the share link and the model info. The agent structures it after review, keeping this separate from product feedback and build requests.
              </p>
            </div>

            <div className="grid gap-3 border-b border-surface-200 bg-surface-50 p-5 sm:p-6 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setIntakeMode('source-run')}
              className={intakeCardClass(intakeMode === 'source-run')}
              aria-pressed={intakeMode === 'source-run'}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center border border-brand-orange/35 bg-brand-orange/10 text-brand-orange">
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                </div>
                {intakeMode === 'source-run' && <CheckCircle2 className="h-4 w-4 text-brand-orange" aria-hidden="true" />}
              </div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                AI session
              </div>
              <div className="mt-1 text-base font-black text-surface-900">Let the agent structure it</div>
              <p className="mt-2 text-xs leading-5 text-surface-600">
                Paste the ChatGPT, Gemini, Claude, or OpenRouter run. It enters the normal review queue with the
                source link, model info, notes, and optional attachment.
              </p>
            </button>

            <button
              type="button"
              disabled
              className="relative cursor-not-allowed overflow-hidden border border-red-200 bg-red-50/30 p-4 text-left opacity-85"
              aria-disabled="true"
            >
              <div className="relative opacity-45">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center border border-brand-blue/35 bg-brand-blue/10 text-brand-blue">
                    <Keyboard className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-surface-300" aria-hidden="true" />
                </div>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                  Manual entry
                </div>
                <div className="mt-1 text-base font-black text-surface-900">Fallback: build it by hand</div>
                <p className="mt-2 text-xs leading-5 text-surface-600">
                  Manually add project basics, prompts, responses, screenshots, and final result when no usable source
                  link is available.
                </p>
              </div>
              <div className="pointer-events-none absolute left-[-12%] top-1/2 flex h-9 w-[124%] -translate-y-1/2 -rotate-6 items-center justify-center bg-red-600 text-white shadow-sm" aria-hidden="true">
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em]">
                  Not available for now
                </span>
              </div>
            </button>
            </div>

        {intakeMode === 'source-run' && (
          <div>
            <form onSubmit={prepareSourceRun} className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-3 border border-brand-orange/25 bg-brand-orange/[0.04] p-3 text-xs text-surface-700 sm:grid-cols-4">
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">1 · Source</div>
                  <p className="mt-1 leading-5">Paste the real AI session link.</p>
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">2 · Extract</div>
                  <p className="mt-1 leading-5">Agent reads prompts, responses, code, files, and screenshots.</p>
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">3 · Review</div>
                  <p className="mt-1 leading-5">Admin reviews the source run and notes.</p>
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">4 · Decide</div>
                  <p className="mt-1 leading-5">Nothing is public until an explicit publish step.</p>
                </div>
              </div>

              <div>
                <label htmlFor="project-source-run-title" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                  Title
                </label>
                <input
                  id="project-source-run-title"
                  name="title"
                  value={sourceRunTitle}
                  onChange={(event) => setSourceRunTitle(event.target.value)}
                  placeholder="Decision matrix from Gemini Flash"
                  className="mt-2 w-full border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="project-source-run-url" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                  AI session link
                </label>
                <div className="mt-2 flex items-center border border-surface-200 bg-surface-50 focus-within:border-brand-orange focus-within:bg-white">
                  <Link2 className="ml-3 h-4 w-4 shrink-0 text-surface-400" aria-hidden="true" />
                  <input
                    id="project-source-run-url"
                    name="source_url"
                    value={sourceRunUrl}
                    onChange={(event) => setSourceRunUrl(event.target.value)}
                    placeholder="https://chatgpt.com/c/... or another supported session link"
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-surface-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="project-source-run-provider" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                    AI service<RequiredDot />
                  </label>
                  <select
                    id="project-source-run-provider"
                    name="provider"
                    value={sourceRunProvider}
                    onChange={(event) => {
                      setSourceRunProvider(event.target.value)
                      setSourceRunProviderTouched(Boolean(event.target.value))
                    }}
                    className="mt-2 w-full border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                  >
                    <option value="">Auto-detect from link</option>
                    {sourceRunProviderOptions.map((provider) => (
                      <option key={provider} value={provider}>{provider}</option>
                    ))}
                  </select>
                  {detectedSourceRunProvider && (
                    <p className="mt-1 text-xs text-surface-500">
                      Detected from link: {detectedSourceRunProvider}
                    </p>
                  )}
                  {selectedSourceRunProvider === 'OpenRouter' && (
                    <p className="mt-1 text-xs text-surface-500">
                      OpenRouter is the service/router. Put the actual model in the model field.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="project-source-run-model" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                    Exact model<RequiredDot />
                  </label>
                  <input
                    id="project-source-run-model"
                    name="model_used"
                    list="project-source-run-model-suggestions"
                    value={sourceRunModel}
                    onChange={(event) => setSourceRunModel(event.target.value)}
                    placeholder={modelPlaceholder}
                    className="mt-2 w-full border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                  />
                  {modelSuggestions.length > 0 && (
                    <datalist id="project-source-run-model-suggestions">
                      {modelSuggestions.map((model) => (
                        <option key={model} value={model} />
                      ))}
                    </datalist>
                  )}
                  <p className="mt-1 text-xs text-surface-500">
                    Type Not sure if the session does not show the exact model.
                  </p>
                </div>
              </div>

              {selectedSourceRunProvider === 'Other' && (
                <div>
                  <label htmlFor="project-source-run-custom-provider" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                    Service name<RequiredDot />
                  </label>
                  <input
                    id="project-source-run-custom-provider"
                    name="custom_provider"
                    value={sourceRunCustomProvider}
                    onChange={(event) => setSourceRunCustomProvider(event.target.value)}
                    placeholder="Name the app or site used"
                    className="mt-2 w-full border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label htmlFor="project-source-run-model-settings" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                  Model settings <span className="font-sans normal-case tracking-normal text-surface-400">(optional)</span>
                </label>
                <textarea
                  id="project-source-run-model-settings"
                  name="model_settings"
                  value={sourceRunModelSettings}
                  onChange={(event) => setSourceRunModelSettings(event.target.value)}
                  rows={2}
                  placeholder="Thinking mode, reasoning level, temperature, tools, or any other setting visible in the session."
                  className="mt-2 w-full resize-y border border-surface-200 bg-surface-50 px-3 py-2 text-sm leading-6 text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="project-source-run-notes" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                  Notes for review
                </label>
                <textarea
                  id="project-source-run-notes"
                  name="notes"
                  value={sourceRunNotes}
                  onChange={(event) => setSourceRunNotes(event.target.value)}
                  rows={3}
                  placeholder="Optional: tell review which response is the final artifact, what should stay private, or what screenshots/files matter."
                  className="mt-2 w-full resize-y border border-surface-200 bg-surface-50 px-3 py-2 text-sm leading-6 text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="project-source-run-attachment" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                  Evidence attachment <span className="font-sans normal-case tracking-normal text-surface-400">(optional)</span>
                </label>
                <div className="mt-2 border border-dashed border-surface-300 bg-surface-50 p-3">
                  {sourceRunAttachment ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2 text-sm text-surface-700">
                        <Paperclip className="h-4 w-4 shrink-0 text-brand-orange" aria-hidden="true" />
                        <span className="truncate font-semibold">{sourceRunAttachment.name}</span>
                        <span className="shrink-0 text-xs text-surface-400">
                          {(sourceRunAttachment.size / 1024 / 1024).toFixed(2)}MB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSourceRunAttachment(null)
                          setSourceRunAttachmentError('')
                        }}
                        className="inline-flex items-center justify-center gap-1 border border-surface-200 bg-white px-2 py-1 text-xs font-semibold text-surface-600 transition hover:border-red-300 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <input
                      key="source-run-attachment-empty"
                      id="project-source-run-attachment"
                      type="file"
                      accept={sourceRunAttachmentAccept}
                      onChange={handleSourceRunAttachmentChange}
                      className="block w-full text-sm text-surface-600 file:mr-3 file:border-0 file:bg-brand-orange file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wider file:text-white hover:file:bg-brand-orange-dark"
                    />
                  )}
                  <p className="mt-2 text-xs leading-5 text-surface-500">
                    Upload one screenshot or artifact file for review. Images, HTML, text, PDF, JSON, Markdown, and zip files are allowed up to 10MB.
                  </p>
                </div>
                {sourceRunAttachmentError && (
                  <p className="mt-2 text-sm text-red-700">{sourceRunAttachmentError}</p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-surface-500">
                  This enters the normal review queue as source link, model info, notes, and optional attachment. It does not create a public project page.
                </p>
                <button
                  type="submit"
                  disabled={sourceRunSubmitting || !canSubmitSourceRun}
                  className="inline-flex items-center justify-center gap-2 border border-brand-orange bg-brand-orange px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {sourceRunSubmitting ? 'Submitting...' : 'Submit to queue'}
                </button>
              </div>
            </form>

            {sourceRunError && (
              <div className="mx-5 mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {sourceRunError}
              </div>
            )}

            {sourceRunImports.length > 0 && (
              <div className="border-t border-surface-200 p-5">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                  Entry queued
                </div>
                <div className="space-y-3">
                  {sourceRunImports.map((item) => (
                    <article key={item.id} className="border border-brand-orange/25 bg-brand-orange/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-surface-900">{item.label}</div>
                          <div className="mt-1 truncate text-xs text-surface-500">{item.source}</div>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-surface-600">
                            {item.forkSource && (
                              <span className="border border-[#07551f]/25 bg-[#effdf3] px-2 py-1 text-[#07551f]">
                                {item.forkSource.sourceStepNumber
                                  ? `Fork: response ${String(item.forkSource.sourceStepNumber).padStart(2, '0')}`
                                  : 'Fork source attached'}
                              </span>
                            )}
                            <span className="border border-white/80 bg-white px-2 py-1">
                              Provider: {item.provider || 'Not specified'}
                            </span>
                            <span className="border border-white/80 bg-white px-2 py-1">
                              Model: {item.modelUsed || 'Not specified'}
                            </span>
                            {item.attachmentPath && (
                              <span className="border border-white/80 bg-white px-2 py-1">
                                Attachment: {item.attachmentName || item.attachmentPath}
                              </span>
                            )}
                            {item.modelSettings && (
                              <span className="border border-white/80 bg-white px-2 py-1">
                                Settings: {item.modelSettings}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-brand-orange">
                          {item.status === 'queued' ? item.createdAt : 'Needs retry'}
                        </div>
                      </div>
                      {item.notes && <p className="mt-3 text-sm leading-6 text-surface-700">{item.notes}</p>}
                      <div className="mt-3 grid gap-2 text-xs text-surface-600 sm:grid-cols-4">
                        <div className="border border-white/80 bg-white px-3 py-2">Open session</div>
                        <div className="border border-white/80 bg-white px-3 py-2">Extract exact chain</div>
                        <div className="border border-white/80 bg-white px-3 py-2">Review notes</div>
                        <div className="border border-white/80 bg-white px-3 py-2">Decide next step</div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
          </div>

          <aside className="border-t border-surface-200 bg-primary-50 p-5 text-surface-900 lg:border-l lg:border-t-0">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange">
              This page is for
            </div>
            <div className="mt-4 space-y-4">
              <div className="border border-primary-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Link2 className="h-4 w-4 text-brand-orange" aria-hidden="true" />
                  Captured AI runs
                </div>
                <p className="mt-2 text-xs leading-5 text-surface-600">
                  Submit the actual session so review can preserve the prompt and response chain.
                </p>
              </div>
              <div className="border border-primary-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <FileText className="h-4 w-4 text-brand-orange" aria-hidden="true" />
                  Evidence for review
                </div>
                <p className="mt-2 text-xs leading-5 text-surface-600">
                  Model, settings, source link, and notes stay attached before anything is public.
                </p>
              </div>
              <div className="border border-brand-blue/35 bg-brand-blue/10 p-4">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-blue-light">
                  Not the suggestion box
                </div>
                <p className="mt-2 text-xs leading-5 text-surface-600">
                  Website feedback, feature ideas, and moderation concerns belong in Suggestion Box.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Two-pane builder on lg+: form on the left (kept at its original ~680px
          max so no field gets unwieldy), live preview rail on the right. Mobile
          stacks vertically (preview drops below the form so the first interaction
          is always the form). */}
      {intakeMode === 'manual' ? (
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
            subtitle="Show how you built it — the asks and responses at each step."
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
                <div className="text-xs text-surface-500">Show each ask→response</div>
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
                <div className={`text-sm font-semibold ${!isChain ? 'text-surface-900' : 'text-surface-600'}`}>Single ask</div>
                <div className="text-xs text-surface-500">One ask, one response</div>
              </div>
            </button>
          </div>

          {/* Single prompt or multi-step */}
          {!isChain ? (
            <div className="space-y-5">
              <div data-field="promptContent">
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Your Ask <RequiredDot />
                </label>
                <p className="text-xs text-surface-500 mb-1.5 block">Paste what you said to the model.</p>
                <textarea rows={8} value={promptContent} onChange={(e) => setPromptContent(e.target.value)} placeholder="Paste the ask you sent to the model..." className={`w-full bg-white border text-surface-900 placeholder-surface-400 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 transition-colors duration-150 ${fieldBorder('promptContent')}`} />
                <FieldError message={validationErrors.promptContent} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">The Response <span className="text-surface-400 font-normal">(optional)</span></label>
                <p className="text-xs text-surface-500 mb-1.5 block">What did the model send back? Share text, screenshots, or both.</p>
                <textarea rows={6} value={resultContent} onChange={(e) => setResultContent(e.target.value)} placeholder="Paste or describe what the model responded with..." className="w-full bg-white border border-surface-200 text-surface-900 placeholder-surface-400 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 mb-3 transition-colors duration-150" />
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
                        {/* Ask section — visually distinct */}
                        <div className="bg-surface-50 border border-surface-200 p-4">
                          <label className="text-xs font-semibold text-brand-orange uppercase tracking-wide mb-2 block">
                            Your Ask <RequiredDot />
                          </label>
                          <textarea
                            rows={5}
                            placeholder="Paste what you said to the model at this step..."
                            value={step.content}
                            onChange={(e) => updateStep(idx, 'content', e.target.value)}
                            className="w-full bg-white border border-surface-200 text-surface-900 placeholder-surface-400 px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-colors duration-150"
                          />
                        </div>
                        {/* Response section — visually distinct */}
                        <div className="bg-green-50/50 border border-green-100 p-4">
                          <label className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 block">
                            The Response <span className="text-surface-400 font-normal normal-case">(optional — text, screenshots, or both)</span>
                          </label>
                          <textarea
                            rows={4}
                            placeholder="What did the model send back at this step?"
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
                : promptContent.trim() ? 'Ask added' : 'Add your ask'
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
      ) : (
        <div className="border border-dashed border-surface-300 bg-white px-5 py-8">
          <div className="max-w-2xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
              Session first
            </div>
            <h2 className="mt-2 text-2xl font-black text-surface-900">Paste the run and send it to review.</h2>
            <p className="mt-3 text-sm leading-6 text-surface-600">
              This path is for captured sessions, not manual reconstruction. The entry stays as source link plus notes
              until an explicit admin action decides what to do next.
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
