function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stable(value[key])]),
    )
  }
  return value
}

function normalizedArtifactEvidence(row) {
  return stable({
    model_variant_id: row.model_variant_id,
    source_run_id: row.source_run_id,
    source_step_id: row.source_step_id,
    source_step_number: row.source_step_number,
    artifact_path: row.artifact_path,
    artifact_sha256: row.artifact_sha256,
  })
}

export function attachSourceRunIdentityToArtifactEvidence(
  storedEvidence,
  releasedModelRows,
) {
  const sourceRunIdByVariantId = new Map(
    releasedModelRows.map((row) => [row.id, row.source_run_id]),
  )
  const enriched = storedEvidence.map((row) => ({
    ...row,
    source_run_id: sourceRunIdByVariantId.get(row.model_variant_id) ?? null,
  }))

  if (enriched.some((row) => !row.source_run_id)) {
    throw new Error(
      'Stored artifact evidence referenced an unknown model-variant row.',
    )
  }
  return enriched
}

export function artifactEvidenceMatches(actualRows, expectedRows) {
  const serialize = (rows) => rows
    .map(normalizedArtifactEvidence)
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
    .map((row) => JSON.stringify(row))

  return JSON.stringify(serialize(actualRows)) === JSON.stringify(serialize(expectedRows))
}
