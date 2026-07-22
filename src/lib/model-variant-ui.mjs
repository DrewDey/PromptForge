const MODEL_LABEL_COLLATOR = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
})

/**
 * Keep the selector independent from selection state. Same-label history uses
 * a deterministic newest-first tie-breaker without moving the active run.
 *
 * @param {{ modelLabel: string, serviceLabel: string, capturedAt: string, sourceRunId: string }} left
 * @param {{ modelLabel: string, serviceLabel: string, capturedAt: string, sourceRunId: string }} right
 */
export function compareModelVariantRecords(left, right) {
  return (
    MODEL_LABEL_COLLATOR.compare(left.modelLabel, right.modelLabel) ||
    MODEL_LABEL_COLLATOR.compare(left.serviceLabel, right.serviceLabel) ||
    Date.parse(right.capturedAt) - Date.parse(left.capturedAt) ||
    left.sourceRunId.localeCompare(right.sourceRunId)
  )
}

/**
 * Comparison cards resolve public evidence from the exact package-backed run
 * they render. Keeping this lookup independent from selection state prevents
 * either card from inheriting the active header's evidence.
 *
 * @param {{ sourceRunId: string }} variant
 * @returns {{ sourceRunId: string, pathforgeRecordChecked: true }}
 */
export function comparisonRunEvidenceLookup(variant) {
  return {
    sourceRunId: variant.sourceRunId,
    pathforgeRecordChecked: true,
  }
}

/**
 * @template {{ packageId: string, artifactPath: string }} T
 * @param {string} selectedPackageId
 * @param {string} selectedArtifactPath
 * @param {T | null} loadedArtifact
 * @returns {T | null}
 */
export function currentArtifactLoad(selectedPackageId, selectedArtifactPath, loadedArtifact) {
  return (
    loadedArtifact?.packageId === selectedPackageId &&
    loadedArtifact.artifactPath === selectedArtifactPath
  ) ? loadedArtifact : null
}

/**
 * @param {string} selectedPackageId
 * @param {string} artifactPath
 */
export function artifactDocumentKey(selectedPackageId, artifactPath) {
  return `${selectedPackageId}:${artifactPath}:document`
}
