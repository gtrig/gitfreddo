import type { ContextMenuItem } from '@/components/ui/ContextMenu'
import { copyToClipboard } from '@/lib/clipboard'
import type { FileChangeStatus } from '@/lib/types'

function separator(id: string): ContextMenuItem {
  return { id, label: '', separator: true, onClick: () => {} }
}

export function workingTreeFolderContextMenuItems(
  path: string,
  open: boolean,
  handlers: {
    onToggle: () => void
    onDiscardFolder?: () => void
  }
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: 'toggle',
      label: open ? 'Collapse' : 'Expand',
      onClick: handlers.onToggle
    },
    {
      id: 'copy',
      label: 'Copy path',
      onClick: () => void copyToClipboard(path)
    }
  ]

  if (handlers.onDiscardFolder) {
    items.push(separator('sep-discard'))
    items.push({
      id: 'discard-folder',
      label: 'Discard changes in folder…',
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
    onDiscard?: () => void
    onRemove?: () => void
    onDelete?: () => void
  }
): ContextMenuItem[] {
  const canDiscard =
    status !== 'untracked' &&
    status !== 'conflicted' &&
    (status === 'modified' || status === 'deleted' || status === 'added' || mode === 'staged')

  const canRemove = status !== 'untracked' && status !== 'conflicted'

  const items: ContextMenuItem[] = [
    {
      id: 'view',
      label: 'View changes',
      onClick: handlers.onSelect
    },
    {
      id: 'stage',
      label: mode === 'working' ? 'Stage' : 'Unstage',
      onClick: handlers.onStageToggle
    }
  ]

  if (canDiscard && handlers.onDiscard) {
    items.push({
      id: 'discard',
      label: 'Discard changes…',
      danger: true,
      onClick: handlers.onDiscard
    })
  }

  if (canRemove && handlers.onRemove) {
    items.push({
      id: 'remove',
      label: 'Remove from repository…',
      danger: true,
      onClick: handlers.onRemove
    })
  }

  if (status === 'untracked' && handlers.onDelete) {
    items.push({
      id: 'delete',
      label: 'Delete file…',
      danger: true,
      onClick: handlers.onDelete
    })
  }

  items.push(
    separator('sep-editor'),
    {
      id: 'open',
      label: 'Open in editor',
      onClick: handlers.onOpenInEditor
    },
    {
      id: 'copy',
      label: 'Copy path',
      onClick: () => void copyToClipboard(path)
    }
  )

  return items
}

export function commitFolderContextMenuItems(
  path: string,
  open: boolean,
  onToggle: () => void
): ContextMenuItem[] {
  return [
    {
      id: 'toggle',
      label: open ? 'Collapse' : 'Expand',
      onClick: onToggle
    },
    {
      id: 'copy',
      label: 'Copy path',
      onClick: () => void copyToClipboard(path)
    }
  ]
}

export function commitFileContextMenuItems(
  path: string,
  fileName: string,
  onSelect: () => void
): ContextMenuItem[] {
  return [
    {
      id: 'view',
      label: 'View changes',
      onClick: onSelect
    },
    separator('sep-copy'),
    {
      id: 'copy-path',
      label: 'Copy path',
      onClick: () => void copyToClipboard(path)
    },
    {
      id: 'copy-name',
      label: 'Copy file name',
      onClick: () => void copyToClipboard(fileName)
    }
  ]
}
