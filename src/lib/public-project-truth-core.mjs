function positiveCount(value, fallback) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback
}

function countLabel(value, singular, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`
}

export function publicArtifactStatusPresentationCore({
  qualityStatus,
  knownIssueExplanation,
}) {
  const explanation = knownIssueExplanation?.trim() || null

  if (qualityStatus === 'known-issue' || explanation) {
    return {
      status: 'known-issue',
      label: 'Artifact has known issue',
      explanation,
    }
  }

  if (qualityStatus === 'verified') {
    return {
      status: 'verified',
      label: 'Artifact verified',
      explanation: null,
    }
  }

  return {
    status: 'recorded',
    label: 'Run recorded',
    explanation: null,
  }
}

export function derivePublicProjectPresentationCore({
  sourceEvidence,
  qualityStatus,
  knownIssueExplanation,
  selectedRunPromptCount: rawSelectedRunPromptCount,
  familyRunCount: rawFamilyRunCount,
  isCanonicalDefaultRun,
}) {
  const selectedRunPromptCount = positiveCount(rawSelectedRunPromptCount, 1)
  const familyRunCount = positiveCount(rawFamilyRunCount, 1)

  return {
    sourceEvidence,
    artifact: publicArtifactStatusPresentationCore({
      qualityStatus,
      knownIssueExplanation,
    }),
    selectedRunPromptCount,
    selectedRunPromptLabel: countLabel(selectedRunPromptCount, 'prompt'),
    familyRunCount,
    familyRunLabel: countLabel(familyRunCount, 'model run'),
    isCanonicalDefaultRun: Boolean(isCanonicalDefaultRun),
    runContextLabel: isCanonicalDefaultRun ? 'Default run' : 'Selected run',
  }
}
