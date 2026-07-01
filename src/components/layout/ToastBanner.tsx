import { useToastStore } from '@/stores/toast'

export function ToastBanner() {
  const message = useToastStore((s) => s.message)
  const tone = useToastStore((s) => s.tone)
  const clear = useToastStore((s) => s.clear)

  if (!message) {
    return null
  }

  const styles =
    tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : tone === 'error'
        ? 'border-red-500/30 bg-red-500/10 text-red-200'
        : 'border-gf-accent/30 bg-gf-accent/10 text-gf-accent-fg'

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        className={`pointer-events-auto flex max-w-lg items-center justify-between gap-4 rounded-lg border px-4 py-2 text-sm shadow-xl ${styles}`}
      >
        <span>{message}</span>
        <button type="button" onClick={clear} className="shrink-0 text-xs opacity-80 hover:opacity-100">
          Dismiss
        </button>
      </div>
    </div>
  )
}
