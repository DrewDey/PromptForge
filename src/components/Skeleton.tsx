/**
 * Reusable skeleton placeholder components for loading states.
 * Uses shimmer animation with sharp edges matching PathForge's design language.
 * All dimensions are structure-matched to real content to prevent layout shift.
 */

export function SkeletonBox({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return <div className={`skeleton-shimmer ${className}`} style={style} />
}

export function SkeletonText({
  lines = 1,
  className = '',
  widths,
}: {
  lines?: number
  className?: string
  /** Width for each line (e.g. ['100%', '80%', '60%']). Defaults to alternating full/partial. */
  widths?: string[]
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-shimmer h-3.5"
          style={{ width: widths?.[i] ?? (i === lines - 1 && lines > 1 ? '65%' : '100%') }}
        />
      ))}
    </div>
  )
}

/** Skeleton matching PromptCard structure — outcome hero on top, then title, description, footer */
export function SkeletonCard() {
  return (
    <div className="bg-white border border-surface-200 overflow-hidden">
      <div className="p-5">
        {/* Outcome hero placeholder — matches the gradient-frame block */}
        <div className="bg-surface-100 p-[1.5px] mb-4">
          <div className="bg-white px-4 py-3.5 min-h-[120px] flex flex-col gap-2">
            <SkeletonBox className="h-3 w-24" />
            <SkeletonText lines={3} widths={['100%', '92%', '60%']} />
          </div>
        </div>

        {/* Category eyebrow */}
        <SkeletonBox className="h-3 w-24 mb-1.5" />

        {/* Title */}
        <SkeletonBox className="h-4 w-[78%] mb-1" />

        {/* Description */}
        <div className="mb-3.5">
          <SkeletonText lines={2} widths={['100%', '65%']} />
        </div>

        {/* Footer: difficulty + model · author + stats */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-100">
          <div className="flex items-center gap-2">
            <SkeletonBox className="h-4 w-16" />
            <SkeletonBox className="h-3.5 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBox className="h-3.5 w-8" />
            <SkeletonBox className="h-3.5 w-8" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Grid of skeleton cards — matches the browse page and popular paths layouts */
export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
