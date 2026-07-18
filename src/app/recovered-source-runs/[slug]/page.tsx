import { notFound } from 'next/navigation'
import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import {
  getRecoveredSourceRunShowcaseBySlug,
  RECOVERED_SOURCE_RUN_SHOWCASES,
} from '@/lib/recovered-source-run-showcases'
import { preparedProjectIsPublic } from '@/lib/prepared-release-gates'
import { loadSourceRunPackage } from '@/lib/source-run-package'

type RecoveredSourceRunPageProps = {
  params: Promise<{ slug: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return RECOVERED_SOURCE_RUN_SHOWCASES.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: RecoveredSourceRunPageProps) {
  const { slug } = await params
  const showcase = getRecoveredSourceRunShowcaseBySlug(slug)
  if (!showcase) return {}
  return buildPreparedSourceRunDetailMetadata(showcase.project)
}

export default async function RecoveredSourceRunPage({ params }: RecoveredSourceRunPageProps) {
  const { slug } = await params
  const showcase = getRecoveredSourceRunShowcaseBySlug(slug)
  if (!showcase) notFound()
  if (!await preparedProjectIsPublic(showcase.project.id)) notFound()

  return (
    <PreparedSourceRunPage
      project={showcase.project}
      sourceRunPackage={loadSourceRunPackage(showcase.sourceRunPackageFile)}
      route={showcase.project.href}
      capturedAt={showcase.capturedAt}
    />
  )
}
