'use client'

export function ModelVariantMenuCloseButton() {
  return (
    <button
      type="button"
      className="inline-flex border border-surface-300 bg-white px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-surface-700 sm:hidden"
      onClick={(event) => {
        const details = event.currentTarget.closest('details')
        if (!details) return

        details.open = false
        details.querySelector('summary')?.focus()
      }}
      data-model-variant-menu-close
    >
      Close
    </button>
  )
}
