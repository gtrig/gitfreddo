import { useRef, useState } from 'react'
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
  const reorderWorkspaceTabs = useWorkspaceStore((s) => s.reorderWorkspaceTabs)
  const openWorkspaceDialog = useWorkspaceStore((s) => s.openWorkspaceDialog)
  const showToast = useToastStore((s) => s.show)
  const [draggingPath, setDraggingPath] = useState<string | null>(null)
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null)
  const draggingPathRef = useRef<string | null>(null)

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

  function handleDragStart(path: string, event: React.DragEvent<HTMLButtonElement>) {
    if (tabs.length < 2) {
      event.preventDefault()
      return
    }
    event.dataTransfer.setData('text/plain', path)
    event.dataTransfer.effectAllowed = 'move'
    draggingPathRef.current = path
    setDraggingPath(path)
  }

  function handleDragEnd() {
    draggingPathRef.current = null
    setDraggingPath(null)
    setDropTargetPath(null)
  }

  function handleDragOver(path: string, event: React.DragEvent<HTMLDivElement>) {
    const draggedPath = draggingPathRef.current
    if (!draggedPath || draggedPath === path) {
      return
    }
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    if (dropTargetPath !== path) {
      setDropTargetPath(path)
    }
  }

  function handleDrop(path: string, event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const draggedPath = event.dataTransfer.getData('text/plain') || draggingPathRef.current
    const fromIndex = tabs.findIndex((tab) => tab.path === draggedPath)
    const toIndex = tabs.findIndex((tab) => tab.path === path)
    draggingPathRef.current = null
    setDraggingPath(null)
    setDropTargetPath(null)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return
    }
    reorderWorkspaceTabs(fromIndex, toIndex)
  }

  if (tabs.length === 0) {
    return null
  }

  const reorderable = tabs.length > 1

  return (
    <div className="flex min-w-0 items-end gap-1 border-b border-gf-border bg-gf-bg-deep px-2 pt-2">
      <button
        type="button"
        aria-label={t('workspace.tabs.openWorkspace')}
        title={t('workspace.tabs.openWorkspace')}
        onClick={() => void openWorkspaceDialog()}
        className="mb-1 shrink-0 rounded border border-gf-border px-2.5 py-1.5 text-sm text-gf-fg-muted hover:border-gf-border-strong hover:bg-gf-bg hover:text-gf-fg"
      >
        <PlusIcon className="h-4 w-4" aria-hidden />
      </button>
      <div className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.path === activePath
          const label = workspaceTabLabel(tab.path)
          const statusClass = tab.connecting
            ? 'text-gf-fg-subtle'
            : tab.connected
              ? 'text-gf-fg-muted'
              : 'text-gf-fg-subtle'
          const isDragging = draggingPath === tab.path
          const isDropTarget = dropTargetPath === tab.path && draggingPath !== tab.path

          return (
            <div
              key={tab.path}
              onDragOver={(event) => handleDragOver(tab.path, event)}
              onDragLeave={() => {
                if (dropTargetPath === tab.path) {
                  setDropTargetPath(null)
                }
              }}
              onDrop={(event) => handleDrop(tab.path, event)}
              className={`group flex max-w-[220px] shrink-0 items-stretch rounded-t border border-b-0 ${
                active
                  ? 'border-gf-border-strong bg-gf-bg'
                  : 'border-transparent bg-gf-bg-deep hover:bg-gf-bg/60'
              } ${isDragging ? 'opacity-50' : ''} ${
                isDropTarget ? 'ring-1 ring-inset ring-gf-accent' : ''
              }`}
            >
              <button
                type="button"
                draggable={reorderable}
                title={
                  reorderable
                    ? `${tab.path} — ${t('workspace.tabs.dragToReorder')}`
                    : tab.path
                }
                aria-label={label}
                onDragStart={(event) => handleDragStart(tab.path, event)}
                onDragEnd={handleDragEnd}
                onClick={() => handleSwitch(tab.path)}
                className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-xs ${
                  reorderable ? 'cursor-grab active:cursor-grabbing' : ''
                } ${statusClass} ${active ? 'font-medium text-gf-fg' : ''}`}
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
    </div>
  )
}
