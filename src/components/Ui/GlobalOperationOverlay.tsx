import { useTranslation } from 'react-i18next'
import { Spinner } from '@/components/Ui/Spinner'
import { useOperationStore } from '@/stores/operation'
import { useWorkspaceStore } from '@/stores/workspace'

export function GlobalOperationOverlay() {
  const { t } = useTranslation()
  const count = useOperationStore((s) => s.count)
  const message = useOperationStore((s) => s.message)
  const connecting = useWorkspaceStore((s) => s.tabs.some((tab) => tab.connecting))

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
      <div className="flex flex-col items-center gap-4 rounded-lg border border-gf-border bg-gf-surface px-10 py-8 shadow-2xl">
        <Spinner size="xl" />
        <p className="text-sm font-medium text-gf-fg-muted">{label}</p>
      </div>
    </div>
  )
}
