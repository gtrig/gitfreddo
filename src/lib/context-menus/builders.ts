import type { TFunction } from 'i18next'
import type { ContextMenuItem } from '@/components/Ui/ContextMenu'
import { copyToClipboard } from '@/lib/clipboard'

export function separator(id: string): ContextMenuItem {
  return { id, label: '', separator: true, onClick: () => {} }
}

export function menuLabel(t: TFunction | undefined, key: string, fallback: string): string {
  return t ? t(key) : fallback
}

export function toggleLabel(
  t: TFunction | undefined,
  open: boolean,
  options?: { collapseKey?: string; expandKey?: string; collapseFallback?: string; expandFallback?: string }
): string {
  if (open) {
    return menuLabel(
      t,
      options?.collapseKey ?? 'contextMenu.sidebar.collapse',
      options?.collapseFallback ?? 'Collapse'
    )
  }
  return menuLabel(
    t,
    options?.expandKey ?? 'contextMenu.sidebar.expand',
    options?.expandFallback ?? 'Expand'
  )
}

export function branchLabelText(t: TFunction | undefined, isDetached: boolean, branch: string): string {
  if (isDetached) {
    return menuLabel(t, 'contextMenu.detachedHead', 'detached HEAD')
  }
  return branch || menuLabel(t, 'contextMenu.currentBranch', 'current branch')
}

export function copyItem(
  id: string,
  label: string,
  value: string,
  options?: { disabled?: boolean }
): ContextMenuItem {
  return {
    id,
    label,
    disabled: options?.disabled,
    onClick: () => void copyToClipboard(value)
  }
}

export type InProgressKind = 'rebase' | 'merge' | 'cherry-pick'

export function inProgressMenuGroup(
  kind: InProgressKind,
  actions: {
    continue: () => void
    abort: () => void
    skip?: () => void
  },
  t?: TFunction
): ContextMenuItem[] {
  const items: ContextMenuItem[] = []

  if (kind === 'rebase') {
    items.push(
      {
        id: 'rebase-continue',
        label: menuLabel(t, 'contextMenu.continueRebase', 'Continue rebase'),
        onClick: actions.continue
      },
      {
        id: 'rebase-skip',
        label: menuLabel(t, 'contextMenu.skipCommit', 'Skip commit'),
        onClick: actions.skip ?? (() => {})
      },
      {
        id: 'rebase-abort',
        label: menuLabel(t, 'contextMenu.abortRebase', 'Abort rebase'),
        danger: true,
        onClick: actions.abort
      },
      separator('sep-rebase')
    )
  } else if (kind === 'cherry-pick') {
    items.push(
      {
        id: 'cherry-pick-continue',
        label: menuLabel(t, 'contextMenu.continueCherryPick', 'Continue cherry-pick'),
        onClick: actions.continue
      },
      {
        id: 'cherry-pick-skip',
        label: menuLabel(t, 'contextMenu.skipCommit', 'Skip commit'),
        onClick: actions.skip ?? (() => {})
      },
      {
        id: 'cherry-pick-abort',
        label: menuLabel(t, 'contextMenu.abortCherryPick', 'Abort cherry-pick'),
        danger: true,
        onClick: actions.abort
      },
      separator('sep-cherry-pick')
    )
  } else {
    items.push(
      {
        id: 'merge-continue',
        label: menuLabel(t, 'contextMenu.continueMerge', 'Continue merge'),
        onClick: actions.continue
      },
      {
        id: 'merge-abort',
        label: menuLabel(t, 'contextMenu.abortMerge', 'Abort merge'),
        danger: true,
        onClick: actions.abort
      },
      separator('sep-merge')
    )
  }

  return items
}
