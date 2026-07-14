import type { TFunction } from 'i18next'
import type { BranchCheckoutParams } from '@shared/git'
import type { ContextMenuItem } from '@/components/Ui/ContextMenu'
import type { GitBranch, GitTag } from '@/lib/types'
import {
  localBranchContextMenuItems,
  remoteBranchContextMenuItems,
  tagContextMenuItems
} from '@/lib/context-menus/sidebarContextMenus'
import { localTagName } from '@/lib/format/tagNames'
import { branchVisibilityKey } from '@/lib/timeline/branchVisibility'
import type { TimelineRef } from '@/lib/timeline/timelineRefs'

export interface TimelineRefContextMenuHandlers {
  onSelectCommit: (hash: string) => void
  onCheckout: (params: BranchCheckoutParams) => void
  onMerge: (name: string) => void
  onMergeCurrentInto?: (name: string) => void
  onRenameBranch: (name: string) => void
  onDeleteBranch: (name: string) => void
  onSetUpstream?: (name: string) => void
  onUnsetUpstream?: (name: string) => void
  onCreatePr?: (name: string) => void
  onCheckoutInWorktree?: (name: string) => void
  onCheckoutRemote?: (remoteBranch: string) => void
  onDeleteRemoteBranch?: (remoteBranch: string) => void
  onPushTag?: (name: string, remote?: string) => void
  onRenameTag?: (tag: GitTag) => void
  onDeleteTag?: (tag: GitTag, remote?: string) => void
  defaultRemote?: string
  onToggleGraphVisibility?: (branchKey: string) => void
  isBranchHiddenInGraph?: (branchKey: string) => boolean
}

export function findBranchForTimelineRef(
  branches: GitBranch[],
  timelineRef: TimelineRef,
  commitHash: string,
  currentBranch: string
): GitBranch | null {
  if (timelineRef.kind === 'branch') {
    return (
      branches.find((branch) => !branch.isRemote && branch.name === timelineRef.label) ?? {
        name: timelineRef.label,
        head: commitHash,
        ahead: 0,
        behind: 0,
        isCurrent: timelineRef.label === currentBranch,
        isRemote: false
      }
    )
  }

  if (timelineRef.kind === 'remote') {
    const fullName = `remotes/${timelineRef.label}`
    return (
      branches.find((branch) => branch.isRemote && branch.name === fullName) ?? {
        name: fullName,
        head: commitHash,
        ahead: 0,
        behind: 0,
        isCurrent: false,
        isRemote: true
      }
    )
  }

  return null
}

export function findTagForTimelineRef(
  tags: GitTag[],
  timelineRef: TimelineRef,
  commitHash: string
): GitTag | null {
  if (timelineRef.kind !== 'tag') return null

  return (
    tags.find(
      (tag) =>
        tag.name === timelineRef.label ||
        localTagName(tag.name) === timelineRef.label ||
        tag.name.endsWith(`/${timelineRef.label}`)
    ) ?? {
      name: timelineRef.label,
      target: commitHash,
      isAnnotated: false,
      isRemote: false
    }
  )
}

export function buildTimelineRefContextMenuItems(
  timelineRef: TimelineRef,
  commitHash: string,
  branches: GitBranch[],
  tags: GitTag[],
  currentBranch: string,
  handlers: TimelineRefContextMenuHandlers,
  t?: TFunction
): ContextMenuItem[] | null {
  if (timelineRef.kind === 'tag') {
    const tag = findTagForTimelineRef(tags, timelineRef, commitHash)
    if (!tag) return null

    return tagContextMenuItems(
      tag,
      {
        defaultRemote: handlers.defaultRemote,
        onSelectCommit: handlers.onSelectCommit,
        onCheckout: handlers.onCheckout,
        onPush: (name, remote) => handlers.onPushTag?.(name, remote),
        onRename: handlers.onRenameTag,
        onDelete: (tag, remote) => handlers.onDeleteTag?.(tag, remote)
      },
      t
    )
  }

  const branch = findBranchForTimelineRef(branches, timelineRef, commitHash, currentBranch)
  if (!branch) return null

  if (timelineRef.kind === 'remote') {
    return remoteBranchContextMenuItems(
      branch,
      {
        onSelectCommit: handlers.onSelectCommit,
        onCheckout: handlers.onCheckoutRemote,
        onDeleteRemote: handlers.onDeleteRemoteBranch,
        onToggleGraphVisibility: handlers.onToggleGraphVisibility,
        isHiddenInGraph: handlers.isBranchHiddenInGraph?.(branchVisibilityKey(branch))
      },
      t
    )
  }

  return localBranchContextMenuItems(
    branch,
    {
      onCheckout: handlers.onCheckout,
      onSelectCommit: handlers.onSelectCommit,
      onMerge: handlers.onMerge,
      onMergeCurrentInto: handlers.onMergeCurrentInto,
      currentBranch: currentBranch || undefined,
      onRename: handlers.onRenameBranch,
      onDelete: handlers.onDeleteBranch,
      onCreatePr: handlers.onCreatePr,
      onCheckoutInWorktree: handlers.onCheckoutInWorktree,
      onSetUpstream: handlers.onSetUpstream,
      onUnsetUpstream: handlers.onUnsetUpstream,
      onToggleGraphVisibility: handlers.onToggleGraphVisibility,
      isHiddenInGraph: handlers.isBranchHiddenInGraph?.(branchVisibilityKey(branch))
    },
    t
  )
}
