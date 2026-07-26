export function preparedReleaseGateIsEnforced(vercelEnvironment) {
  return vercelEnvironment === 'production'
}

export function inspectablePreparedForkFallbacks(
  fallbacks,
  preparedProjectIds,
  vercelEnvironment,
) {
  // Registry membership supports local review; only persisted approval can
  // make a prepared child discoverable in production.
  if (preparedReleaseGateIsEnforced(vercelEnvironment)) {
    return fallbacks.filter((fallback) => !preparedProjectIds.has(fallback.id))
  }
  return [...fallbacks]
}
