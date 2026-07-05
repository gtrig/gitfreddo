import type { TFunction } from 'i18next'
import type { ContextMenuItem } from '@/components/Ui/ContextMenu'
import { copyToClipboard } from '@/lib/clipboard'
import type { FileChangeStatus } from '@/lib/types'

function separator(id: string): ContextMenuItem {
  return { id, label: '', separator: true, onClick: () => {} }
}

function toggleLabel(t: TFunction | undefined, open: boolean): string {
  if (open) {
    return t ? t('contextMenu.detailPanel.collapse') : 'Collapse'
  }
  return t ? t('contextMenu.detailPanel.expand') : 'Expand'
}

export function workingTreeFolderContextMenuItems(
  path: string,
  open: boolean,
  mode: 'working' | 'staged',
  handlers: {
    onToggle: () => void
    onStageFolder?: () => void
    onDiscardFolder?: () => void
    onAddToGitignore?: () => void
  },
  t?: TFunction
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: 'toggle',
      label: toggleLabel(t, open),
      onClick: handlers.onToggle
    },
    {
      id: 'copy',
      label: t ? t('contextMenu.detailPanel.copyPath') : 'Copy path',
      onClick: () => void copyToClipboard(path)
    }
  ]

  if (handlers.onStageFolder) {
    items.push({
      id: 'stage-folder',
      label:
        mode === 'staged'
          ? t
            ? t('contextMenu.detailPanel.unstageFolderContents')
            : 'Unstage folder contents'
          : t
            ? t('contextMenu.detailPanel.stageFolderContents')
            : 'Stage folder contents',
      onClick: handlers.onStageFolder
    })
  }

  if (handlers.onAddToGitignore) {
    items.push({
      id: 'gitignore',
      label: t ? t('contextMenu.detailPanel.addPathToGitignore') : 'Add path to .gitignore',
      onClick: handlers.onAddToGitignore
    })
  }

  if (handlers.onDiscardFolder) {
    items.push(separator('sep-discard'))
    items.push({
      id: 'discard-folder',
      label: t ? t('contextMenu.detailPanel.discardChangesInFolder') : 'Discard changes in folder…',
      danger: true,
      onClick: handlers.onDiscardFolder
    })
  }

  return items
}

export function workingTreeFileContextMenuItems(
  path: string,
  mode: 'working' | 'staged',
  status: FileChangeStatus,
  handlers: {
    onSelect: () => void
    onStageToggle: () => void
    onOpenInEditor: () => void
    onFileHistory?: () => void
    onRename?: () => void
    onDiscard?: () => void
    onRemove?: () => void
    onDelete?: () => void
    onAddToGitignore?: () => void
    onOpenSubmodule?: () => void
    onUpdateSubmodule?: () => void
    onSyncSubmodule?: () => void
  },
  options?: { isSubmodule?: boolean },
  t?: TFunction
): ContextMenuItem[] {
  const isSubmodule = Boolean(options?.isSubmodule)
  const canDiscard =
    !isSubmodule &&
    status !== 'untracked' &&
    status !== 'conflicted' &&
    (status === 'modified' || status === 'deleted' || status === 'added' || mode === 'staged')

  const canRemove = !isSubmodule && status !== 'untracked' && status !== 'conflicted'

  const items: ContextMenuItem[] = [
    {
      id: 'view',
      label: t ? t('detail.viewChanges') : 'View changes',
      onClick: handlers.onSelect
    },
    {
      id: 'stage',
      label:
        mode === 'working'
          ? t
            ? t('workingTree.stage')
            : 'Stage'
          : t
            ? t('workingTree.unstage')
            : 'Unstage',
      onClick: handlers.onStageToggle
    }
  ]

  if (canDiscard && handlers.onDiscard) {
    items.push({
      id: 'discard',
      label: t ? t('contextMenu.detailPanel.discardChanges') : 'Discard changes…',
      danger: true,
      onClick: handlers.onDiscard
    })
  }

  if (canRemove && handlers.onRemove) {
    items.push({
      id: 'remove',
      label: t ? t('contextMenu.detailPanel.removeFromRepository') : 'Remove from repository…',
      danger: true,
      onClick: handlers.onRemove
    })
  }

  if (status === 'untracked' && handlers.onDelete) {
    items.push({
      id: 'delete',
      label: t ? t('contextMenu.detailPanel.deleteFile') : 'Delete file…',
      danger: true,
      onClick: handlers.onDelete
    })
  }

  if (handlers.onRename && status !== 'deleted' && !isSubmodule) {
    items.push({
      id: 'rename',
      label: t ? t('contextMenu.detailPanel.rename') : 'Rename…',
      onClick: handlers.onRename
    })
  }

  if (
    handlers.onAddToGitignore &&
    !isSubmodule &&
    path !== '.gitignore' &&
    status !== 'deleted' &&
    status !== 'conflicted'
  ) {
    items.push({
      id: 'gitignore',
      label: t ? t('contextMenu.detailPanel.addToGitignore') : 'Add to .gitignore',
      onClick: handlers.onAddToGitignore
    })
  }

  if (handlers.onFileHistory) {
    items.push({
      id: 'history',
      label: t ? t('contextMenu.detailPanel.fileHistory') : 'File history…',
      onClick: handlers.onFileHistory
    })
  }

  if (handlers.onUpdateSubmodule) {
    items.push({
      id: 'submodule-update',
      label: t ? t('contextMenu.submodule.update') : 'Update submodule',
      onClick: handlers.onUpdateSubmodule
    })
  }

  if (handlers.onSyncSubmodule) {
    items.push({
      id: 'submodule-sync',
      label: t ? t('contextMenu.submodule.sync') : 'Sync submodule',
      onClick: handlers.onSyncSubmodule
    })
  }

  items.push(separator('sep-editor'))
  if (isSubmodule && handlers.onOpenSubmodule) {
    items.push({
      id: 'open-submodule',
      label: t ? t('contextMenu.submodule.open') : 'Open submodule',
      onClick: handlers.onOpenSubmodule
    })
  } else {
    items.push({
      id: 'open',
      label: t ? t('diff.openInEditor') : 'Open in editor',
      onClick: handlers.onOpenInEditor
    })
  }
  items.push({
    id: 'copy',
    label: t ? t('contextMenu.detailPanel.copyPath') : 'Copy path',
    onClick: () => void copyToClipboard(path)
  })

  return items
}

export function commitFolderContextMenuItems(
  path: string,
  open: boolean,
  onToggle: () => void,
  t?: TFunction
): ContextMenuItem[] {
  return [
    {
      id: 'toggle',
      label: toggleLabel(t, open),
      onClick: onToggle
    },
    {
      id: 'copy',
      label: t ? t('contextMenu.detailPanel.copyPath') : 'Copy path',
      onClick: () => void copyToClipboard(path)
    }
  ]
}

export function commitFileContextMenuItems(
  path: string,
  fileName: string,
  onSelect: () => void,
  onFileHistory?: () => void,
  t?: TFunction
): ContextMenuItem[] {
  return [
    {
      id: 'view',
      label: t ? t('detail.viewChanges') : 'View changes',
      onClick: onSelect
    },
    ...(onFileHistory
      ? [
          {
            id: 'history',
            label: t ? t('contextMenu.detailPanel.fileHistory') : 'File history…',
            onClick: onFileHistory
          } as ContextMenuItem
        ]
      : []),
    separator('sep-copy'),
    {
      id: 'copy-path',
      label: t ? t('contextMenu.detailPanel.copyPath') : 'Copy path',
      onClick: () => void copyToClipboard(path)
    },
    {
      id: 'copy-name',
      label: t ? t('contextMenu.detailPanel.copyFileName') : 'Copy file name',
      onClick: () => void copyToClipboard(fileName)
    }
  ]
}
