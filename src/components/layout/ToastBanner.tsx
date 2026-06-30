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
        : 'border-sky-500/30 bg-sky-500/10 text-sky-200'

  return (
    <div className={`flex items-center justify-between border-b px-4 py-2 text-sm ${styles}`}>
      <span>{message}</span>
      <button type="button" onClick={clear} className="text-xs opacity-80 hover:opacity-100">
        Dismiss
      </button>
    </div>
  )
}
