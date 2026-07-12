import { redirect } from 'next/navigation'

export default async function LegacyBrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const forwarded = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((entry) => forwarded.append(key, entry))
    else if (value) forwarded.set(key, value)
  }

  const query = forwarded.toString()
  redirect(`/paths${query ? `?${query}` : ''}`)
}
