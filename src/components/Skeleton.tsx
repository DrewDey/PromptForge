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

/** Skeleton matching PromptCard structure — step flow bar, badges, title, description, footer */
export function SkeletonCard() {
  return (
    <div className="bg-white border border-surface-200 overflow-hidden">
      {/* Step flow mini-visualization placeholder */}
      <div className="bg-surface-50 border-b border-surface-200 px-5 py-3 flex items-center gap-1.5">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <SkeletonBox className="w-6 h-6" />
            {i < 3 && <SkeletonBox className="w-3 h-3" />}
          </div>
        ))}
      </div>

      <div className="p-5">
        {/* Category + Difficulty badges */}
        <div className="flex items-center gap-2 mb-3">
          <SkeletonBox className="h-5 w-20" />
          <SkeletonBox className="h-5 w-16" />
        </div>

        {/* Title */}
        <SkeletonBox className="h-5 w-[85%] mb-2" />

        {/* Description */}
        <div className="mb-4">
          <SkeletonText lines={2} widths={['100%', '70%']} />
        </div>

        {/* Model + Tools row */}
        <div className="flex items-center gap-3 mb-4">
          <SkeletonBox className="h-5 w-24" />
          <SkeletonBox className="h-5 w-20" />
        </div>

        {/* Tags */}
        <div className="flex gap-1.5 mb-4">
          <SkeletonBox className="h-5 w-14" />
          <SkeletonBox className="h-5 w-16" />
          <SkeletonBox className="h-5 w-12" />
        </div>

        {/* Footer: author + stats */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-100">
          <div className="flex items-center gap-1.5">
            <SkeletonBox className="w-5 h-5" />
            <SkeletonBox className="h-3.5 w-20" />
          </div>
          <div className="flex items-center gap-3">
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
