export function preparedReleaseGateIsEnforced(
  vercelEnvironment: string | undefined,
): boolean

export function inspectablePreparedForkFallbacks<T extends { id: string }>(
  fallbacks: readonly T[],
  preparedProjectIds: ReadonlySet<string>,
  vercelEnvironment: string | undefined,
): T[]
