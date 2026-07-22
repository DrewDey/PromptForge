import { getPreparedShowcaseProjectById } from './prepared-showcase-projects'
import {
  getProjectModelVariantKnownIssueExplanation,
  getProjectModelVariantSet,
} from './project-model-variants'
import { derivePublicProjectTruth } from './public-project-truth'
import type { PromptWithRelations } from './types'

/**
 * A prepared child project counts only its own continuation prompts. Inherited
 * parent prompts stay visible as lineage and are not silently folded into the
 * selected child run total. Model-family variants carry their own checked
 * prompt count and take precedence.
 */
export function getCanonicalPreparedSelectedRunPromptCount(
  preparedProject: { steps: readonly unknown[] },
  variantPromptCount?: number | null,
) {
  return variantPromptCount ?? preparedProject.steps.length
}

/**
 * Canonical truth for static prompt/card surfaces. Model-family projects use
 * their configured default run. A checked PathForge record is asserted only
 * when that exact prepared/default run has a package file in the registry.
 */
export function deriveCanonicalPromptPublicTruth(prompt: PromptWithRelations) {
  const preparedProject = getPreparedShowcaseProjectById(prompt.id)
  const variantSet = getProjectModelVariantSet(prompt.id)
  const defaultVariant = variantSet?.variants.find((variant) => (
    variant.sourceRunId === variantSet.defaultSourceRunId
  ))
  const sourceRunId = defaultVariant?.sourceRunId ?? preparedProject?.sourceRunId ?? null
  const hasCheckedPackage = defaultVariant
    ? Boolean(defaultVariant.packageFile)
    : Boolean(preparedProject?.sourceRunPackageFile)

  return derivePublicProjectTruth({
    sourceEvidenceLookup: sourceRunId && hasCheckedPackage
      ? { sourceRunId, pathforgeRecordChecked: true }
      : null,
    qualityStatus: defaultVariant?.qualityStatus ?? 'recorded',
    knownIssueExplanation: defaultVariant
      ? getProjectModelVariantKnownIssueExplanation(defaultVariant)
      : null,
    selectedRunPromptCount: preparedProject
      ? getCanonicalPreparedSelectedRunPromptCount(preparedProject, defaultVariant?.promptCount)
      : prompt.prompt_step_count
        ?? prompt.steps?.length
        ?? 0,
    familyRunCount: variantSet?.variants.length ?? 1,
    isCanonicalDefaultRun: true,
  })
}
