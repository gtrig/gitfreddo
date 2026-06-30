import { useWorkspaceStore, workspaceTabLabel } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'

export function WorkspaceTabs() {
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
    <div className="flex min-w-0 items-end gap-0 border-b border-zinc-800 bg-zinc-950 px-2 pt-2">
      <div className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.path === activePath
          const label = workspaceTabLabel(tab.path)
          const statusClass = tab.processExited
            ? 'text-red-400'
            : tab.connecting
              ? 'text-zinc-500'
              : tab.connected
                ? 'text-zinc-300'
                : 'text-zinc-500'

          return (
            <div
              key={tab.path}
              className={`group flex max-w-[220px] shrink-0 items-stretch rounded-t border border-b-0 ${
                active
                  ? 'border-zinc-700 bg-zinc-900'
                  : 'border-transparent bg-zinc-950 hover:bg-zinc-900/60'
              }`}
            >
              <button
                type="button"
                title={tab.path}
                onClick={() => handleSwitch(tab.path)}
                className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-xs ${statusClass} ${
                  active ? 'font-medium text-zinc-100' : ''
                }`}
              >
                {label}
                {tab.connecting && <span className="ml-1 text-zinc-600">…</span>}
              </button>
              <button
                type="button"
                aria-label={`Close ${label}`}
                onClick={(event) => {
                  event.stopPropagation()
                  handleClose(tab.path)
                }}
                className={`shrink-0 px-2 text-zinc-600 hover:text-zinc-300 ${
                  active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
      <button
        type="button"
        aria-label="Open workspace"
        title="Open workspace"
        onClick={() => void openWorkspaceDialog()}
        className="mb-1 shrink-0 rounded border border-zinc-800 px-2.5 py-1.5 text-sm text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200"
      >
        +
      </button>
    </div>
  )
}
