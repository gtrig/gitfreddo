import type { TFunction } from 'i18next'
import type { ContextMenuItem } from '@/components/Ui/ContextMenu'
import { copyToClipboard } from '@/lib/clipboard'
import type { GitSubmoduleEntry } from '@/lib/types'

function separator(id: string): ContextMenuItem {
  return { id, label: '', separator: true, onClick: () => {} }
}

export function submoduleContextMenuItems(
  entry: GitSubmoduleEntry,
  handlers: {
    onOpenInTab: (path: string) => void
    onInit?: () => void
    onUpdate?: () => void
    onSync?: () => void
    onSetUrl?: () => void
    onStage?: () => void
    onDeinit?: () => void
    onRemove?: () => void
  },
  t?: TFunction
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: 'open',
      label: t ? t('contextMenu.submodule.open') : 'Open submodule',
      onClick: () => handlers.onOpenInTab(entry.path)
    },
    {
      id: 'copy',
      label: t ? t('contextMenu.submodule.copyPath') : 'Copy path',
      onClick: () => void copyToClipboard(entry.path)
    }
  ]

  if (handlers.onInit && entry.status === 'uninitialized') {
    items.push({
      id: 'init',
      label: t ? t('contextMenu.submodule.init') : 'Initialize',
      onClick: handlers.onInit
    })
  }

  if (handlers.onUpdate) {
    items.push({
      id: 'update',
      label: t ? t('contextMenu.submodule.update') : 'Update',
      onClick: handlers.onUpdate
    })
  }

  if (handlers.onSync) {
    items.push({
      id: 'sync',
      label: t ? t('contextMenu.submodule.sync') : 'Sync',
      onClick: handlers.onSync
    })
  }

  if (handlers.onSetUrl) {
    items.push({
      id: 'set-url',
      label: t ? t('contextMenu.submodule.setUrl') : 'Set URL…',
      onClick: handlers.onSetUrl
    })
  }

  if (handlers.onStage) {
    items.push({
      id: 'stage',
      label: t ? t('contextMenu.submodule.stage') : 'Stage pointer',
      onClick: handlers.onStage
    })
  }

  if (handlers.onDeinit || handlers.onRemove) {
    items.push(separator('sep-danger'))
  }

  if (handlers.onDeinit) {
    items.push({
      id: 'deinit',
      label: t ? t('contextMenu.submodule.deinit') : 'Deinitialize…',
      danger: true,
      onClick: handlers.onDeinit
    })
  }

  if (handlers.onRemove) {
    items.push({
      id: 'remove',
      label: t ? t('contextMenu.submodule.remove') : 'Remove…',
      danger: true,
      onClick: handlers.onRemove
    })
  }

  return items
}

export function submodulesSectionContextMenuItems(
  handlers: {
    onUpdateAll?: () => void
    onSyncAll?: () => void
  },
  t?: TFunction
): ContextMenuItem[] {
  const items: ContextMenuItem[] = []
  if (handlers.onUpdateAll) {
    items.push({
      id: 'update-all',
      label: t ? t('contextMenu.submodule.updateAll') : 'Update all',
      onClick: handlers.onUpdateAll
    })
  }
  if (handlers.onSyncAll) {
    items.push({
      id: 'sync-all',
      label: t ? t('contextMenu.submodule.syncAll') : 'Sync all',
      onClick: handlers.onSyncAll
    })
  }
  return items
}
