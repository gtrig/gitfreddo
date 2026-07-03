import { useTranslation } from 'react-i18next'
import { useWorkspaceStore, workspaceTabLabel } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid'

export function WorkspaceTabs() {
  const { t } = useTranslation()
  const tabs = useWorkspaceStore((s) => s.tabs)
  const activePath = useWorkspaceStore((s) => s.activePath)
  const switchWorkspace = useWorkspaceStore((s) => s.switchWorkspace)
  const closeWorkspace = useWorkspaceStore((s) => s.closeWorkspace)
  const openWorkspaceDialog = useWorkspaceStore((s) => s.openWorkspaceDialog)
  const showToast = useToastStore((s) => s.show)

  function handleSwitch(path: string) {
    void switchWorkspace(path).catch((error) => {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    })
  }

  function handleClose(path: string) {
    void closeWorkspace(path).catch((error) => {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    })
  }

  if (tabs.length === 0) {
    return null
  }

  return (
    <div className="flex min-w-0 items-end gap-0 border-b border-gf-border bg-gf-bg-deep px-2 pt-2">
      <div className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.path === activePath
          const label = workspaceTabLabel(tab.path)
          const statusClass = tab.processExited
            ? 'text-red-400'
            : tab.connecting
              ? 'text-gf-fg-subtle'
              : tab.connected
                ? 'text-gf-fg-muted'
                : 'text-gf-fg-subtle'

          return (
            <div
              key={tab.path}
              className={`group flex max-w-[220px] shrink-0 items-stretch rounded-t border border-b-0 ${
                active
                  ? 'border-gf-border-strong bg-gf-bg'
                  : 'border-transparent bg-gf-bg-deep hover:bg-gf-bg/60'
              }`}
            >
              <button
                type="button"
                title={tab.path}
                onClick={() => handleSwitch(tab.path)}
                className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-xs ${statusClass} ${
                  active ? 'font-medium text-gf-fg' : ''
                }`}
              >
                {label}
                {tab.connecting && <span className="ml-1 text-gf-fg-subtle">…</span>}
              </button>
              <button
                type="button"
                aria-label={t('workspace.tabs.close', { label })}
                onClick={(event) => {
                  event.stopPropagation()
                  handleClose(tab.path)
                }}
                className={`shrink-0 px-2 text-gf-fg-subtle hover:text-gf-fg-muted ${
                  active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <XMarkIcon className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
      <button
        type="button"
        aria-label={t('workspace.tabs.openWorkspace')}
        title={t('workspace.tabs.openWorkspace')}
        onClick={() => void openWorkspaceDialog()}
        className="mb-1 shrink-0 rounded border border-gf-border px-2.5 py-1.5 text-sm text-gf-fg-muted hover:border-gf-border-strong hover:bg-gf-bg hover:text-gf-fg"
      >
        <PlusIcon className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
