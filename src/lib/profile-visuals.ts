type ProfileIdentity = {
  display_name?: string | null
  username?: string | null
}

export function profileMonogram(profile: ProfileIdentity) {
  const identity = profile.display_name?.trim() || profile.username?.trim() || ''
  const parts = identity.split(/\s+/).filter(Boolean)

  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ''}`.toUpperCase()
}

export function profileAvatarClasses(username?: string | null) {
  const palettes = [
    'bg-brand-orange text-white',
    'bg-brand-blue text-white',
    'bg-surface-900 text-white',
    'bg-[#07551f] text-white',
    'bg-[#7c3aed] text-white',
    'bg-[#9a3412] text-white',
  ]
  const identity = username?.trim().toLowerCase() || 'pathforge-builder'
  const hash = [...identity].reduce(
    (value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0,
    7,
  )

  return palettes[hash % palettes.length]
}
