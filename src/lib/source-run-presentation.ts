import type {
  SourceRunPackage,
  SourceRunPackageStep,
} from './source-run-package'

export function sourceRunDefaultStepNumber(sourceRun: SourceRunPackage) {
  const finalPath = sourceRun.final_artifact_path
  const defaultStep = sourceRun.steps.find((step) => (
    step.artifact_version_path === finalPath ||
    step.generated_files?.includes(finalPath ?? '')
  ))

  return defaultStep?.step_number ?? sourceRun.steps[sourceRun.steps.length - 1]?.step_number
}

export function sourceRunDisplayArtifactFiles(
  sourceRun: SourceRunPackage,
  step: SourceRunPackageStep,
) {
  const files = new Set<string>()
  const artifactVersionPath = step.artifact_version_path

  if (artifactVersionPath?.startsWith('public/artifacts/')) {
    files.add(artifactVersionPath)
  } else {
    for (const filePath of step.generated_files ?? []) {
      if (filePath.startsWith('public/artifacts/')) files.add(filePath)
    }
  }

  if (
    step.step_number === sourceRunDefaultStepNumber(sourceRun) &&
    sourceRun.final_artifact_path?.startsWith('public/artifacts/')
  ) {
    files.add(sourceRun.final_artifact_path)
  }

  return [...files]
}

export function sourceRunResponseCapturePresentation(
  sourceRun: SourceRunPackage,
  step: SourceRunPackageStep,
) {
  const normalization = sourceRun.response_capture_normalization ?? {}
  const scope = step.response_capture_kind ?? (
    typeof normalization.scope === 'string' ? normalization.scope : ''
  )
  const disclosure: string[] = []
  let label = 'Model response'

  if (scope === 'generated_html_code_payload' || scope === 'generated_html_code_payloads') {
    label = 'Captured generated HTML payload'
  } else if (
    scope === 'assistant_text' ||
    scope === 'assistant_text_messages_and_separate_generated_html_files'
  ) {
    label = 'Captured assistant text'
  }

  if (sourceRun.evidence_scope === 'selected_published_path') {
    disclosure.push('Only the selected published path is represented.')
  } else if (sourceRun.evidence_scope === 'curated_four_step_generated_html_payload_path') {
    disclosure.push('These four steps are a curated generated-code path.')
  } else if (
    sourceRun.evidence_scope ===
      'selected_branch_shared_steps_1_through_3_and_child_step_4'
  ) {
    disclosure.push(
      'This is the selected child branch: shared steps 1–3 plus child step 4.',
    )
  }

  if (normalization.assistant_prose_preserved === false) {
    disclosure.push('Assistant prose outside the generated HTML was not preserved.')
  }
  if (normalization.generated_html_stored_separately === true) {
    disclosure.push('Generated HTML is stored separately from this assistant text.')
  }
  if (normalization.provider_serialization_envelope_preserved === false) {
    disclosure.push('The full provider serialization envelope was not preserved.')
  }

  for (const omittedTurn of sourceRun.omitted_provider_turns ?? []) {
    if (
      omittedTurn &&
      typeof omittedTurn === 'object' &&
      'notes' in omittedTurn &&
      typeof omittedTurn.notes === 'string' &&
      omittedTurn.notes.trim()
    ) {
      disclosure.push(omittedTurn.notes.trim())
    }
  }

  return {
    label,
    disclosure: disclosure.join(' '),
  }
}
