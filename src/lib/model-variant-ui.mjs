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
 * @template {{ packageId: string }} T
 * @param {string} selectedPackageId
 * @param {T | null} loadedArtifact
 * @returns {T | null}
 */
export function currentArtifactLoad(selectedPackageId, loadedArtifact) {
  return loadedArtifact?.packageId === selectedPackageId ? loadedArtifact : null
}

/** @param {string} selectedPackageId */
export function artifactDocumentKey(selectedPackageId) {
  return `${selectedPackageId}:document`
}
