import { useCallback, useMemo, useState } from 'react'
import type {
  DeleteCommitAction,
  ResetMode
} from '@/components/DetailPanel/DeleteCommitModal'
import { buildCommitContextMenuItems } from '@/lib/commitContextMenu'
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

interface DeleteModalState {
  action: DeleteCommitAction
  commits: GitCommit[]
  initialMode?: ResetMode
}

export type { DeleteModalState }

export interface CommitContextMenuOptions {
  head: string
  branch: string
  isDetached: boolean
  commits: GitCommit[]
}

function mutationError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function useCommitContextMenu(connected: boolean, options: CommitContextMenuOptions) {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [rewordCommit, setRewordCommit] = useState<GitCommit | null>(null)
  const [createBranchAt, setCreateBranchAt] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null)

  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const setPrimaryCommit = useSelectionStore((s) => s.setPrimaryCommit)
  const showCompareCommitRange = useSelectionStore((s) => s.showCompareCommitRange)
  const {
    checkout,
    cherryPick,
    squashCommits,
    rebaseStart,
    rebaseContinue,
    rebaseAbort,
    mergeContinue,
    mergeAbort,
    reset
  } = useGitMutations()
  const { data: working } = useWorkingStatus(connected)
  const showToast = useToastStore((s) => s.show)

  const runMutation = useCallback(
    (promise: Promise<unknown>, successMessage?: string) => {
      void promise
        .then(() => {
          if (successMessage) showToast(successMessage, 'success')
        })
        .catch((error) => {
          showToast(mutationError(error), 'error')
        })
    },
    [showToast]
  )

  const openMenu = useCallback(
    (commit: GitCommit, event: React.MouseEvent) => {
      event.preventDefault()
      const { selectedCommitHashes } = useSelectionStore.getState()
      if (!selectedCommitHashes.includes(commit.hash)) {
        selectTimelineNode('commit', commit.hash)
      } else {
        setPrimaryCommit(commit.hash)
      }
      setMenu({ commit, x: event.clientX, y: event.clientY })
    },
    [selectTimelineNode, setPrimaryCommit]
  )

  const closeMenu = useCallback(() => setMenu(null), [])

  const openDeleteModal = useCallback(
    (state: DeleteModalState) => {
      closeMenu()
      setDeleteModal(state)
    },
    [closeMenu]
  )

  const items = useMemo(() => {
    if (!menu) return []

    const { selectedCommitHashes } = useSelectionStore.getState()

    return buildCommitContextMenuItems({
      commit: menu.commit,
      head: options.head,
      branch: options.branch,
      isDetached: options.isDetached,
      commits: options.commits,
      working,
      selectedCommitId: menu.commit.hash,
      selectedCount: selectedCommitHashes.length,
      selectedHashes: selectedCommitHashes,
      actions: {
        selectCommit: (hash) => selectTimelineNode('commit', hash),
        copyHash: (hash) => {
          void navigator.clipboard.writeText(hash)
          showToast('Commit hash copied.', 'info')
        },
        copyShortHash: (shortHash) => {
          void navigator.clipboard.writeText(shortHash)
          showToast('Short hash copied.', 'info')
        },
        copyAllHashes: (hashes) => {
          void navigator.clipboard.writeText(hashes.join('\n'))
          showToast(`${hashes.length} commit hashes copied.`, 'info')
        },
        compareSelected: (oldestHash, newestHash, label) => {
          showCompareCommitRange(oldestHash, newestHash, label)
        },
        cherryPickAll: (hashes) =>
          runMutation(
            cherryPick.mutateAsync({ hashes }),
            `Cherry-picked ${hashes.length} commits.`
          ),
        squashSelected: (hashes) =>
          runMutation(
            squashCommits.mutateAsync({ hashes }),
            `Squashed ${hashes.length} commits.`
          ),
        dropSelected: (commits) =>
          openDeleteModal({ action: 'drop', commits }),
        checkout: (ref) => runMutation(checkout.mutateAsync({ name: ref }), 'Checked out.'),
        createBranch: (hash) => setCreateBranchAt(hash),
        reword: (commit) => setRewordCommit(commit),
        rebaseOnto: (hash) =>
          runMutation(rebaseStart.mutateAsync({ onto: hash }), 'Rebase started.'),
        cherryPick: (hash) =>
          runMutation(cherryPick.mutateAsync({ hash }), 'Cherry-pick complete.'),
        reset: (mode, hash) =>
          runMutation(reset.mutateAsync({ mode, ref: hash }), `Reset ${mode} complete.`),
        deleteHead: (mode) =>
          openDeleteModal({ action: 'deleteHead', commits: [menu.commit], initialMode: mode }),
        dropCommits: (commits) => openDeleteModal({ action: 'drop', commits }),
        revertCommit: (commit) => openDeleteModal({ action: 'revert', commits: [commit] }),
        rebaseContinue: () =>
          runMutation(rebaseContinue.mutateAsync(undefined), 'Rebase continued.'),
        rebaseAbort: () => runMutation(rebaseAbort.mutateAsync(undefined), 'Rebase aborted.'),
        mergeContinue: () =>
          runMutation(mergeContinue.mutateAsync(undefined), 'Merge continued.'),
        mergeAbort: () => runMutation(mergeAbort.mutateAsync(undefined), 'Merge aborted.')
      }
    })
  }, [
    menu,
    options.head,
    options.branch,
    options.isDetached,
    options.commits,
    working,
    selectTimelineNode,
    showCompareCommitRange,
    showToast,
    runMutation,
    openDeleteModal,
    checkout,
    rebaseStart,
    cherryPick,
    squashCommits,
    reset,
    rebaseContinue,
    rebaseAbort,
    mergeContinue,
    mergeAbort
  ])

  return {
    menu,
    items,
    openMenu,
    closeMenu,
    rewordCommit,
    setRewordCommit,
    createBranchAt,
    setCreateBranchAt,
    deleteModal,
    setDeleteModal
  }
}
