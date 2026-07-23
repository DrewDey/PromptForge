import { redirect } from 'next/navigation'

export default async function LegacyProjectSubmissionRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item))
    else if (typeof value === 'string') params.set(key, value)
  }
  const query = params.toString()
  redirect(query ? `/build?${query}` : '/build')
}
