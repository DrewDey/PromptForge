import fs from 'node:fs'
import path from 'node:path'

export type SourceRunPackageStep = {
  step_number: number
  prompt_exact: string
  response_exact: string
  artifact_version_path?: string | null
  generated_files?: string[]
}

export type SourceRunPackage = {
  title?: string
  model?: string
  model_settings?: string | Record<string, unknown>
  provider?: string
  source_url?: string
  verification_notes?: string | string[]
  final_artifact_path?: string
  pathforge_submission_url?: string
  pathforge_pending_id?: string
  source_run_submission_id?: string
  steps: SourceRunPackageStep[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(source: Record<string, unknown>, key: string) {
  const value = source[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new Error(`Source-run package field "${key}" must be a string.`)
  return value
}

function optionalStringList(source: Record<string, unknown>, key: string) {
  const value = source[key]
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Source-run package field "${key}" must be an array of strings.`)
  }
  return value
}

function optionalStringOrStringList(source: Record<string, unknown>, key: string) {
  const value = source[key]
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) return value
  throw new Error(`Source-run package field "${key}" must be a string or array of strings.`)
}

function optionalModelSettings(source: Record<string, unknown>) {
  const value = source.model_settings
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string' || isRecord(value)) return value
  throw new Error('Source-run package field "model_settings" must be a string or object.')
}

function parseStep(value: unknown, index: number): SourceRunPackageStep {
  if (!isRecord(value)) throw new Error(`Source-run package step ${index + 1} must be an object.`)

  const stepNumber = value.step_number
  if (typeof stepNumber !== 'number' || !Number.isFinite(stepNumber)) {
    throw new Error(`Source-run package step ${index + 1} is missing numeric "step_number".`)
  }

  const promptExact = value.prompt_exact
  if (typeof promptExact !== 'string') {
    throw new Error(`Source-run package step ${index + 1} is missing string "prompt_exact".`)
  }

  const responseExact = value.response_exact
  if (typeof responseExact !== 'string') {
    throw new Error(`Source-run package step ${index + 1} is missing string "response_exact".`)
  }

  return {
    step_number: stepNumber,
    prompt_exact: promptExact,
    response_exact: responseExact,
    artifact_version_path: optionalString(value, 'artifact_version_path') ?? null,
    generated_files: optionalStringList(value, 'generated_files'),
  }
}

function parseSourceRunPackage(value: unknown, fileName: string): SourceRunPackage {
  if (!isRecord(value)) throw new Error(`Source-run package "${fileName}" must contain a JSON object.`)

  const steps = value.steps
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error(`Source-run package "${fileName}" must contain at least one step.`)
  }

  return {
    title: optionalString(value, 'title'),
    model: optionalString(value, 'model'),
    model_settings: optionalModelSettings(value),
    provider: optionalString(value, 'provider'),
    source_url: optionalString(value, 'source_url'),
    verification_notes: optionalStringOrStringList(value, 'verification_notes'),
    final_artifact_path: optionalString(value, 'final_artifact_path'),
    pathforge_submission_url: optionalString(value, 'pathforge_submission_url'),
    pathforge_pending_id: optionalString(value, 'pathforge_pending_id'),
    source_run_submission_id: optionalString(value, 'source_run_submission_id'),
    steps: steps.map(parseStep),
  }
}

export function loadSourceRunPackage(fileName: string): SourceRunPackage {
  const rawPackage = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'seed-runs', fileName), 'utf8')
  ) as unknown

  return parseSourceRunPackage(rawPackage, fileName)
}
