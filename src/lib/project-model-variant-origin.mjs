export const PROJECT_MODEL_VARIANT_ORIGIN_MODES = [
  'existing-project',
  'model-cohort',
]

/**
 * Older checked manifests predate the explicit origin field and describe an
 * existing community project by definition. New manifests must record their
 * origin explicitly at the registry boundary.
 *
 * @param {unknown} value
 * @returns {'existing-project' | 'model-cohort'}
 */
export function resolveProjectModelVariantOriginMode(value) {
  if (value === undefined) return 'existing-project'
  if (PROJECT_MODEL_VARIANT_ORIGIN_MODES.includes(value)) return value
  throw new Error(`Invalid model-variant origin mode: ${String(value)}.`)
}

/**
 * A comparison attached to an existing project preserves one real historical
 * author run. A simultaneous Labs cohort has no such history: every run is a
 * developer-operated comparison, so inventing an original-author baseline is
 * both unnecessary and invalid.
 *
 * @param {{
 *   canonicalProjectId: string,
 *   originMode: 'existing-project' | 'model-cohort',
 *   variants: Array<{
 *     sourceRunId: string,
 *     runRole: string,
 *     operatorKind: string,
 *     qualityStatus: string,
 *   }>,
 * }} input
 */
export function assertProjectModelVariantOrigin(input) {
  const { canonicalProjectId, originMode, variants } = input
  const historicalBaselines = variants.filter(
    (variant) => variant.runRole === 'historical-baseline',
  )
  const originalAuthorRuns = variants.filter(
    (variant) => variant.operatorKind === 'original-author',
  )

  if (originMode === 'existing-project') {
    if (
      historicalBaselines.length !== 1 ||
      historicalBaselines[0].operatorKind !== 'original-author' ||
      originalAuthorRuns.length !== 1 ||
      originalAuthorRuns[0].sourceRunId !== historicalBaselines[0].sourceRunId
    ) {
      throw new Error(
        `Model-variant set ${canonicalProjectId} must have one original-author historical baseline.`,
      )
    }
    return
  }

  if (originMode === 'model-cohort') {
    if (historicalBaselines.length !== 0 || originalAuthorRuns.length !== 0) {
      throw new Error(
        `Model-cohort set ${canonicalProjectId} cannot claim an original-author historical baseline.`,
      )
    }
    const invalidRun = variants.find(
      (variant) =>
        variant.runRole !== 'comparison-run' ||
        !['pathforge-labs-manual', 'pathforge-labs-automation'].includes(
          variant.operatorKind,
        ) ||
        variant.qualityStatus !== 'verified',
    )
    if (invalidRun) {
      throw new Error(
        `Model-cohort run ${invalidRun.sourceRunId} must be a verified developer-operated comparison run.`,
      )
    }
    return
  }

  throw new Error(`Invalid model-variant origin mode: ${String(originMode)}.`)
}
