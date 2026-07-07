import type { BranchCheckoutParams } from '@shared/git'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GitBranch, GitRemote, GitTag } from '@/lib/types'
import { useContextMenu } from '@/hooks/useContextMenu'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useGitHubRepoContext } from '@/hooks/useGitHubRepos'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'
import { useInvalidateGitHubPullRequests } from '@/hooks/useGitHubPullRequests'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { buildTimelineRefContextMenuItems } from '@/lib/timeline/timelineRefContextMenu'
import type { TimelineRef } from '@/lib/timeline/timelineRefs'

export interface TimelineRefContextMenuOptions {
  connected: boolean
  branches: GitBranch[] | undefined
  tags: GitTag[] | undefined
  remotes: GitRemote[] | undefined
  currentBranch: string
  onSelectCommit: (hash: string) => void
  onMerge: (branchName: string) => void
}

export function useTimelineRefContextMenu({
  connected,
  branches,
  tags,
  remotes,
  currentBranch,
  onSelectCommit,
  onMerge
}: TimelineRefContextMenuOptions) {
  const { t } = useTranslation()
  const { state: menuState, openMenu, closeMenu } = useContextMenu()
  const { checkout, pushTag, deleteBranch, deleteRemoteBranch, unsetUpstream } = useGitMutations()
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { data: ghStatus } = useGitHubStatus()
  const { data: ghCtx } = useGitHubRepoContext(repoPath, connected)
  const invalidatePrs = useInvalidateGitHubPullRequests()
  const show = useToastStore((s) => s.show)

  const [renameBranch, setRenameBranch] = useState<string | null>(null)
  const [pendingDeleteBranch, setPendingDeleteBranch] = useState<string | null>(null)
  const [prBranch, setPrBranch] = useState<string | null>(null)
  const [worktreeBranch, setWorktreeBranch] = useState<string | null>(null)
  const [upstreamBranch, setUpstreamBranch] = useState<string | null>(null)
  const [checkoutRemote, setCheckoutRemote] = useState<string | null>(null)
  const [pendingDeleteRemote, setPendingDeleteRemote] = useState<GitBranch | null>(null)
  const [renameTag, setRenameTag] = useState<GitTag | null>(null)
  const [pendingDeleteTag, setPendingDeleteTag] = useState<{ tag: GitTag; remote?: string } | null>(
    null
  )

  const localBranches = useMemo(
    () => (branches ?? []).filter((branch) => !branch.isRemote),
    [branches]
  )
  const defaultBase =
    localBranches.find((branch) => branch.name === 'main')?.name ??
    localBranches[0]?.name ??
    'main'
  const defaultRemote = remotes?.[0]?.name
  const canCreatePr = Boolean(ghStatus?.connected && ghCtx)

  const handlers = useMemo(
    () => ({
      onSelectCommit,
      onCheckout: (params: BranchCheckoutParams) => void checkout.mutateAsync(params),
      onMerge,
      onRenameBranch: setRenameBranch,
      onDeleteBranch: setPendingDeleteBranch,
      onCreatePr: canCreatePr ? setPrBranch : undefined,
      onCheckoutInWorktree: setWorktreeBranch,
      onSetUpstream: setUpstreamBranch,
      onUnsetUpstream: (name: string) => void unsetUpstream.mutateAsync({ branch: name }),
      onCheckoutRemote: setCheckoutRemote,
      onDeleteRemoteBranch: (remoteBranch: string) => {
        const branch = (branches ?? []).find((entry) => entry.name === remoteBranch)
        if (branch) setPendingDeleteRemote(branch)
      },
      onPushTag: (name: string, remote?: string) => void pushTag.mutateAsync({ name, remote }),
      onRenameTag: setRenameTag,
      onDeleteTag: (tag: GitTag, remote?: string) => setPendingDeleteTag({ tag, remote }),
      defaultRemote
    }),
    [
      branches,
      canCreatePr,
      checkout,
      defaultRemote,
      onMerge,
      onSelectCommit,
      pushTag,
      unsetUpstream
    ]
  )

  const openRefMenu = useCallback(
    (event: React.MouseEvent, timelineRef: TimelineRef, commitHash: string) => {
      const items = buildTimelineRefContextMenuItems(
        timelineRef,
        commitHash,
        branches ?? [],
        tags ?? [],
        currentBranch,
        handlers,
        t
      )
      if (!items) return
      openMenu(event, items)
    },
    [branches, currentBranch, handlers, openMenu, tags, t]
  )

  return {
    menuState,
    closeMenu,
    openRefMenu,
    renameBranch,
    setRenameBranch,
    pendingDeleteBranch,
    setPendingDeleteBranch,
    deleteBranch,
    prBranch,
    setPrBranch,
    defaultBase,
    repoPath,
    invalidatePrs,
    show,
    worktreeBranch,
    setWorktreeBranch,
    upstreamBranch,
    setUpstreamBranch,
    localBranches,
    checkoutRemote,
    setCheckoutRemote,
    pendingDeleteRemote,
    setPendingDeleteRemote,
    deleteRemoteBranch,
    renameTag,
    setRenameTag,
    pendingDeleteTag,
    setPendingDeleteTag,
    defaultRemote
  }
}
