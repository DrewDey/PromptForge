const PATHFORGE_RESERVED_PROFILE_HANDLES = new Set([
  'jordanwells',
  'rowanpierce',
])

export function isPathForgeReservedProfileHandle(value: string) {
  return PATHFORGE_RESERVED_PROFILE_HANDLES.has(value.trim().toLowerCase())
}
