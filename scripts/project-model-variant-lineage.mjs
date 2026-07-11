function nonBlank(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function timestamp(value) {
  const parsed = Date.parse(value ?? '')
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function compareManifestRuns(left, right) {
  return (
    timestamp(left.capturedAt) - timestamp(right.capturedAt) ||
    String(left.sourceRunId).localeCompare(String(right.sourceRunId))
  )
}

function compareDatabaseRuns(left, right) {
  return (
    timestamp(right.created_at) - timestamp(left.created_at) ||
    timestamp(right.run_finished_at) - timestamp(left.run_finished_at) ||
    String(right.id).localeCompare(String(left.id))
  )
}

function fail(label, message) {
  throw new Error(`${label}: ${message}`)
}

export function preserveExistingReleaseDefault({
  rows,
  existingRows,
  label = 'model-variant release',
}) {
  const existingDefaults = existingRows.filter((row) => row.is_default)
  if (existingDefaults.length > 1) {
    fail(label, 'database has multiple default model variants')
  }
  const existingDefault = existingDefaults[0]
  if (!existingDefault) return rows

  const retainedDefault = rows.find((row) => (
    row.source_run_id === existingDefault.source_run_id &&
    row.is_current &&
    row.status === 'published' &&
    row.quality_status === 'verified'
  )) ?? rows.find((row) => (
    row.provider_key === existingDefault.provider_key &&
    row.is_current &&
    row.status === 'published' &&
    row.quality_status === 'verified'
  ))
  if (!retainedDefault) {
    fail(label, 'existing default has no current verified successor in the checked release')
  }

  return rows.map((row) => ({
    ...row,
    is_default: row.source_run_id === retainedDefault.source_run_id,
  }))
}

export function assertManifestAppendLineage({
  variants,
  launchSourceRunIds,
  label = 'model-variant manifest',
}) {
  if (!Array.isArray(variants)) fail(label, 'variants must be an array')
  const launchIds = new Set(launchSourceRunIds ?? [])
  const bySourceRunId = new Map()
  const byProvider = new Map()

  for (const variant of variants) {
    if (!nonBlank(variant?.sourceRunId)) fail(label, 'every run needs a sourceRunId')
    if (bySourceRunId.has(variant.sourceRunId)) {
      fail(label, `duplicate source run ${variant.sourceRunId}`)
    }
    bySourceRunId.set(variant.sourceRunId, variant)
    const providerRuns = byProvider.get(variant.providerKey) ?? []
    providerRuns.push(variant)
    byProvider.set(variant.providerKey, providerRuns)
  }

  for (const [providerKey, providerRuns] of byProvider) {
    const ordered = [...providerRuns].sort(compareManifestRuns)
    const launchRuns = ordered.filter((variant) => launchIds.has(variant.sourceRunId))
    if (launchRuns.length !== 1) {
      fail(
        label,
        `${providerKey} must preserve exactly one launch root; found ${launchRuns.length}`,
      )
    }
    if (ordered[0]?.sourceRunId !== launchRuns[0].sourceRunId) {
      fail(label, `${providerKey} launch root must remain the first provider release`)
    }
    if (nonBlank(launchRuns[0].supersedesSourceRunId)) {
      fail(label, `${providerKey} launch root cannot supersede another run`)
    }

    const childCounts = new Map()
    for (let index = 1; index < ordered.length; index += 1) {
      const current = ordered[index]
      const prior = ordered[index - 1]
      if (launchIds.has(current.sourceRunId)) {
        fail(label, `${providerKey} has more than one launch root`)
      }
      if (current.supersedesSourceRunId !== prior.sourceRunId) {
        fail(
          label,
          `${current.sourceRunId} must supersede immediately prior ${providerKey} run ${prior.sourceRunId}`,
        )
      }
      if (timestamp(current.capturedAt) <= timestamp(prior.capturedAt)) {
        fail(
          label,
          `${current.sourceRunId} must finish after superseded run ${prior.sourceRunId}`,
        )
      }
      childCounts.set(
        current.supersedesSourceRunId,
        (childCounts.get(current.supersedesSourceRunId) ?? 0) + 1,
      )
      if (current.runRole !== 'comparison-run') {
        fail(label, `${current.sourceRunId} append-history run must be a comparison run`)
      }
    }

    for (const [sourceRunId, count] of childCounts) {
      if (count > 1) fail(label, `${sourceRunId} cannot have multiple direct successors`)
    }

    if (ordered.length > 1) {
      for (const prior of ordered.slice(0, -1)) {
        if (prior.isCurrent !== false) {
          fail(label, `${prior.sourceRunId} must be demoted after a newer ${providerKey} run`)
        }
      }
      if (ordered.at(-1)?.isCurrent !== true) {
        fail(label, `${ordered.at(-1)?.sourceRunId} must be the current ${providerKey} run`)
      }
    } else if (
      ordered[0]?.runRole === 'comparison-run' &&
      ordered[0]?.isCurrent !== true
    ) {
      fail(label, `${ordered[0].sourceRunId} must remain the current ${providerKey} launch run`)
    }
  }

  for (const variant of variants) {
    if (!nonBlank(variant.supersedesSourceRunId)) continue
    const prior = bySourceRunId.get(variant.supersedesSourceRunId)
    if (!prior) {
      fail(label, `${variant.sourceRunId} supersedes a run absent from the manifest`)
    }
    if (prior.providerKey !== variant.providerKey) {
      fail(label, `${variant.sourceRunId} supersedes a different provider`)
    }
  }
}

export function resolveAppendReleaseLineage({
  rows,
  existingRows,
  label = 'model-variant release',
}) {
  const existingBySourceRunId = new Map(
    existingRows.map((row) => [row.source_run_id, row]),
  )
  const requestedBySourceRunId = new Map(
    rows.map((row) => [row.source_run_id, row]),
  )
  const newRows = rows.filter((row) => !existingBySourceRunId.has(row.source_run_id))
  const newProviderCounts = new Map()
  for (const row of newRows) {
    newProviderCounts.set(
      row.provider_key,
      (newProviderCounts.get(row.provider_key) ?? 0) + 1,
    )
  }
  for (const [providerKey, count] of newProviderCounts) {
    if (count > 1) {
      fail(label, `release at most one new ${providerKey} run per transaction`)
    }
  }

  const existingById = new Map(existingRows.map((row) => [row.id, row]))
  const currentByProvider = new Map()
  for (const row of existingRows) {
    if (!row.is_current) continue
    if (currentByProvider.has(row.provider_key)) {
      fail(label, `database has multiple current ${row.provider_key} runs`)
    }
    currentByProvider.set(row.provider_key, row)
  }

  return rows.map((row) => {
    const existing = existingBySourceRunId.get(row.source_run_id)
    if (existing) {
      if (!nonBlank(row._supersedesSourceRunId)) return row
      const actualPrior = existingById.get(existing.supersedes_variant_id)
      if (!actualPrior || actualPrior.source_run_id !== row._supersedesSourceRunId) {
        fail(label, `${row.source_run_id} immutable supersession differs from the database`)
      }
      return { ...row, supersedes_variant_id: actualPrior.id }
    }

    const providerHistory = existingRows
      .filter((candidate) => candidate.provider_key === row.provider_key)
      .sort(compareDatabaseRuns)
    const immediatePrior = providerHistory[0] ?? null
    if (!immediatePrior) {
      if (nonBlank(row._supersedesSourceRunId) || row.supersedes_variant_id) {
        fail(label, `${row.source_run_id} is a new-provider root and cannot supersede a run`)
      }
      return row
    }

    if (row._supersedesSourceRunId !== immediatePrior.source_run_id) {
      fail(
        label,
        `${row.source_run_id} must supersede immediately prior ${row.provider_key} run ${immediatePrior.source_run_id}`,
      )
    }
    if (row.is_current !== true) {
      fail(label, `${row.source_run_id} must become the current ${row.provider_key} run`)
    }
    const desiredPrior = requestedBySourceRunId.get(immediatePrior.source_run_id)
    if (!desiredPrior || desiredPrior.is_current !== false || desiredPrior.is_default !== false) {
      fail(
        label,
        `${immediatePrior.source_run_id} must be atomically demoted in the same release`,
      )
    }
    const databaseCurrent = currentByProvider.get(row.provider_key)
    if (databaseCurrent && databaseCurrent.id !== immediatePrior.id) {
      fail(
        label,
        `database current ${row.provider_key} run is not the immediately prior release`,
      )
    }
    if (
      timestamp(row.run_finished_at) <= timestamp(immediatePrior.run_finished_at)
    ) {
      fail(
        label,
        `${row.source_run_id} must finish after superseded run ${immediatePrior.source_run_id}`,
      )
    }
    return { ...row, supersedes_variant_id: immediatePrior.id }
  })
}
