import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  DeleteCommitAction,
  ResetMode
} from '@/components/DetailPanel/DeleteCommitModal'
import { buildCommitContextMenuItems } from '@/lib/context-menus/commitContextMenu'
import { timelineRefs } from '@/lib/timeline/timelineRefs'
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

interface RemoveStaleModalState {
  seedHash?: string
  seedHashes?: string[]
}

interface InteractiveRebaseModalState {
  commits: GitCommit[]
}

interface WorktreeFromCommitState {
  hash: string
  shortHash: string
  branchName?: string
}

export type { RemoveStaleModalState }

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
  const { t } = useTranslation()
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [rewordCommit, setRewordCommit] = useState<GitCommit | null>(null)
  const [createBranchAt, setCreateBranchAt] = useState<string | null>(null)
  const [createTagAt, setCreateTagAt] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null)
  const [removeStaleModal, setRemoveStaleModal] = useState<RemoveStaleModalState | null>(null)
  const [interactiveRebaseModal, setInteractiveRebaseModal] =
    useState<InteractiveRebaseModalState | null>(null)
  const [mergeSource, setMergeSource] = useState<string | null>(null)
  const [worktreeFromCommit, setWorktreeFromCommit] = useState<WorktreeFromCommitState | null>(null)

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
    rebaseSkip,
    mergeContinue,
    mergeAbort,
    cherryPickContinue,
    cherryPickAbort,
    cherryPickSkip,
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

  const openRemoveStaleModal = useCallback(
    (state: RemoveStaleModalState) => {
      closeMenu()
      setRemoveStaleModal(state)
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
      t,
      actions: {
        selectCommit: (hash) => selectTimelineNode('commit', hash),
        copyHash: (hash) => {
          void navigator.clipboard.writeText(hash)
          showToast(t('contextMenu.hashCopied'), 'info')
        },
        copyShortHash: (shortHash) => {
          void navigator.clipboard.writeText(shortHash)
          showToast(t('contextMenu.shortHashCopied'), 'info')
        },
        copyAllHashes: (hashes) => {
          void navigator.clipboard.writeText(hashes.join('\n'))
          showToast(t('contextMenu.hashesCopied', { count: hashes.length }), 'info')
        },
        compareSelected: (oldestHash, newestHash, label) => {
          showCompareCommitRange(oldestHash, newestHash, label)
        },
        cherryPickAll: (hashes) =>
          runMutation(
            cherryPick.mutateAsync({ hashes }),
            t('contextMenu.cherryPicked', { count: hashes.length })
          ),
        cherryPickAllNoCommit: (hashes) =>
          runMutation(
            cherryPick.mutateAsync({ hashes, noCommit: true }),
            t('contextMenu.cherryPickedNoCommit', { count: hashes.length })
          ),
        interactiveRebase: (commits) => {
          closeMenu()
          setInteractiveRebaseModal({ commits })
        },
        squashSelected: (hashes) =>
          runMutation(
            squashCommits.mutateAsync({ hashes }),
            t('contextMenu.squashed', { count: hashes.length })
          ),
        dropSelected: (commits) =>
          openDeleteModal({ action: 'drop', commits }),
        removeStaleSelected: (commits) =>
          openRemoveStaleModal({ seedHashes: commits.map((commit) => commit.hash) }),
        checkout: (ref) => runMutation(checkout.mutateAsync({ name: ref }), t('contextMenu.checkedOut')),
        mergeBranch: (branchName) => {
          closeMenu()
          setMergeSource(branchName)
        },
        createWorktreeFromCommit: (commit) => {
          closeMenu()
          const branchName = timelineRefs(commit.refs).find((ref) => ref.kind === 'branch')?.label
          setWorktreeFromCommit({
            hash: commit.hash,
            shortHash: commit.shortHash,
            branchName
          })
        },
        createBranch: (hash) => setCreateBranchAt(hash),
        createTag: (hash) => setCreateTagAt(hash),
        reword: (commit) => setRewordCommit(commit),
        rebaseOnto: (hash) =>
          runMutation(rebaseStart.mutateAsync({ onto: hash }), t('contextMenu.rebaseStarted')),
        cherryPick: (hash) =>
          runMutation(cherryPick.mutateAsync({ hash }), t('contextMenu.cherryPickComplete')),
        cherryPickNoCommit: (hash) =>
          runMutation(
            cherryPick.mutateAsync({ hash, noCommit: true }),
            t('contextMenu.cherryPickAppliedNoCommit')
          ),
        reset: (mode, hash) =>
          runMutation(reset.mutateAsync({ mode, ref: hash }), t('contextMenu.resetComplete', { mode })),
        deleteHead: (mode) =>
          openDeleteModal({ action: 'deleteHead', commits: [menu.commit], initialMode: mode }),
        dropCommits: (commits) => openDeleteModal({ action: 'drop', commits }),
        revertCommit: (commit) => openDeleteModal({ action: 'revert', commits: [commit] }),
        removeStaleHistory: (commit) => openRemoveStaleModal({ seedHash: commit.hash }),
        rebaseContinue: () =>
          runMutation(rebaseContinue.mutateAsync(undefined), t('contextMenu.rebaseContinued')),
        rebaseAbort: () => runMutation(rebaseAbort.mutateAsync(undefined), t('contextMenu.rebaseAborted')),
        rebaseSkip: () => runMutation(rebaseSkip.mutateAsync(undefined), t('contextMenu.rebaseSkipped')),
        mergeContinue: () =>
          runMutation(mergeContinue.mutateAsync(undefined), t('contextMenu.mergeContinued')),
        mergeAbort: () => runMutation(mergeAbort.mutateAsync(undefined), t('contextMenu.mergeAborted')),
        cherryPickContinue: () =>
          runMutation(cherryPickContinue.mutateAsync(undefined), t('contextMenu.cherryPickContinued')),
        cherryPickAbort: () =>
          runMutation(cherryPickAbort.mutateAsync(undefined), t('contextMenu.cherryPickAborted')),
        cherryPickSkip: () =>
          runMutation(cherryPickSkip.mutateAsync(undefined), t('contextMenu.cherryPickSkipped'))
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
    openRemoveStaleModal,
    checkout,
    rebaseStart,
    cherryPick,
    squashCommits,
    reset,
    rebaseContinue,
    rebaseAbort,
    rebaseSkip,
    mergeContinue,
    mergeAbort,
    cherryPickContinue,
    cherryPickAbort,
    cherryPickSkip
  , t])

  return {
    menu,
    items,
    openMenu,
    closeMenu,
    rewordCommit,
    setRewordCommit,
    createBranchAt,
    setCreateBranchAt,
    createTagAt,
    setCreateTagAt,
    deleteModal,
    setDeleteModal,
    removeStaleModal,
    setRemoveStaleModal,
    interactiveRebaseModal,
    setInteractiveRebaseModal,
    mergeSource,
    setMergeSource,
    worktreeFromCommit,
    setWorktreeFromCommit
  }
}
