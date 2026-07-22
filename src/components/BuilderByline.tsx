import Link from 'next/link'
import {
  publicBuilderProvenanceLabel,
  type PublicBuilderProvenanceKind,
} from '@/lib/builder-provenance'

type BuilderBylineProps = {
  name: string
  username?: string | null
  provenanceKind?: PublicBuilderProvenanceKind | null
  prefix?: string
  href?: string
  showUsername?: boolean
  className?: string
  provenanceClassName?: string
}

export function BuilderByline({
  name,
  username,
  provenanceKind,
  prefix = 'by',
  href,
  showUsername = false,
  className,
  provenanceClassName,
}: BuilderBylineProps) {
  const provenanceLabel = publicBuilderProvenanceLabel(provenanceKind)
  const content = (
    <>
      {prefix && (
        <>
          <span>{prefix}</span>{' '}
        </>
      )}
      <strong>{name}</strong>
      {showUsername && username && (
        <>
          {' '}<span>@{username}</span>
        </>
      )}
      {provenanceLabel && (
        <>
          {' '}
          <span
            className={`whitespace-nowrap ${provenanceClassName ?? ''}`.trim()}
            data-builder-provenance={provenanceKind}
          >
            · {provenanceLabel}
          </span>
        </>
      )}
    </>
  )

  return href ? (
    <Link href={href} className={className} data-builder-byline>
      {content}
    </Link>
  ) : (
    <span className={className} data-builder-byline>
      {content}
    </span>
  )
}
