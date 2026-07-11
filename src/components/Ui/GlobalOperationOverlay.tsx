import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import { Spinner } from '@/components/Ui/Spinner'
import { useOperationStore } from '@/stores/operation'
import { useWorkspaceStore } from '@/stores/workspace'

export function GlobalOperationOverlay() {
  const { t } = useTranslation()
  const count = useOperationStore((s) => s.count)
  const message = useOperationStore((s) => s.message)
  const output = useOperationStore((s) => s.output)
  const connecting = useWorkspaceStore((s) => s.tabs.some((tab) => tab.connecting))
  const outputRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    const el = outputRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [output])

  if (count === 0 && !connecting) {
    return null
  }

  const label =
    message ?? (connecting && count === 0 ? t('workspace.overlay.opening') : t('workspace.overlay.working'))

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-gf-bg-deep/70 backdrop-blur-[2px]"
      aria-busy="true"
      aria-live="polite"
      role="alert"
    >
      <div className="flex max-h-[min(70vh,28rem)] w-[min(92vw,36rem)] flex-col items-center gap-4 rounded-lg border border-gf-border bg-gf-surface px-8 py-6 shadow-2xl">
        <Spinner size="xl" />
        <p className="text-sm font-medium text-gf-fg-muted">{label}</p>
        {output && (
          <pre
            ref={outputRef}
            className="max-h-56 w-full overflow-auto rounded border border-gf-border-strong bg-gf-bg px-3 py-2 font-mono text-[11px] leading-relaxed text-gf-fg-muted"
          >
            {output}
          </pre>
        )}
      </div>
    </div>
  )
}
