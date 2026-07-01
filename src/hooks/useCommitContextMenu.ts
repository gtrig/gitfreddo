import { useCallback, useMemo, useState } from 'react'
import type { ContextMenuItem } from '@/components/ui/ContextMenu'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkingStatus } from '@/hooks/useGit'
import { useSelectionStore } from '@/stores/selection'
import { useToastStore } from '@/stores/toast'
import type { GitCommit } from '@/lib/types'

interface MenuState {
  commit: GitCommit
  x: number
  y: number
}

export function useCommitContextMenu(connected: boolean) {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [rewordCommit, setRewordCommit] = useState<GitCommit | null>(null)
  const [createBranchAt, setCreateBranchAt] = useState<string | null>(null)

  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const { checkout, cherryPick } = useGitMutations()
  const { data: working } = useWorkingStatus(connected)
  const showToast = useToastStore((s) => s.show)

  const openMenu = useCallback((commit: GitCommit, event: React.MouseEvent) => {
    event.preventDefault()
    setMenu({ commit, x: event.clientX, y: event.clientY })
  }, [])

  const closeMenu = useCallback(() => setMenu(null), [])

  const items = useMemo((): ContextMenuItem[] => {
    if (!menu) return []

    const { commit } = menu
    const isMerge = commit.parents.length > 1
    const workingTreeDirty = working ? !working.isClean : false
    const gitBusy = Boolean(
      working?.rebaseInProgress || working?.mergeInProgress || working?.cherryPickInProgress
    )
    const rewordBlocked = isMerge || workingTreeDirty || gitBusy

    return [
      {
        id: 'view',
        label: 'View commit',
        onClick: () => selectTimelineNode('commit', commit.hash)
      },
      {
        id: 'copy-hash',
        label: 'Copy commit hash',
        onClick: () => {
          void navigator.clipboard.writeText(commit.hash)
          showToast('Commit hash copied.', 'info')
        }
      },
      {
        id: 'copy-short',
        label: 'Copy short hash',
        onClick: () => {
          void navigator.clipboard.writeText(commit.shortHash)
          showToast('Short hash copied.', 'info')
        }
      },
      {
        id: 'checkout',
        label: 'Checkout commit',
        onClick: () => {
          void checkout
            .mutateAsync({ name: commit.hash })
            .catch((error) => {
              showToast(error instanceof Error ? error.message : String(error), 'error')
            })
        }
      },
      {
        id: 'branch',
        label: 'Create branch here…',
        onClick: () => setCreateBranchAt(commit.hash)
      },
      {
        id: 'reword',
        label: 'Reword commit…',
        disabled: rewordBlocked,
        onClick: () => setRewordCommit(commit)
      },
      {
        id: 'cherry-pick',
        label: 'Cherry-pick commit',
        disabled: gitBusy,
        onClick: () => {
          void cherryPick
            .mutateAsync({ hash: commit.hash })
            .catch((error) => {
              showToast(error instanceof Error ? error.message : String(error), 'error')
            })
        }
      }
    ]
  }, [menu, working, selectTimelineNode, checkout, cherryPick, showToast])

  return {
    menu,
    items,
    openMenu,
    closeMenu,
    rewordCommit,
    setRewordCommit,
    createBranchAt,
    setCreateBranchAt
  }
}
