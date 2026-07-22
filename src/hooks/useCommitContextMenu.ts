import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  DeleteCommitAction,
  ResetMode
} from '@/components/DetailPanel/DeleteCommitModal'
import { buildCommitContextMenuItems } from '@/lib/context-menus/commitContextMenu'
import { timelineRefs } from '@/lib/timeline/timelineRefs'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkingStatus } from '@/hooks/useGit'
import { useSelectionStore } from '@/stores/selection'
import { useToastStore } from '@/stores/toast'
import type { GitCommit } from '@/lib/types'
import type { MergeParentAction } from '@/components/History/PickMergeParentModal'

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

interface MergeParentPickState {
  commit: GitCommit
  action: MergeParentAction
}

export function useCommitContextMenu(connected: boolean, options: CommitContextMenuOptions) {
  const { t } = useTranslation()
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [rewordCommit, setRewordCommit] = useState<GitCommit | null>(null)
  const [createBranchAt, setCreateBranchAt] = useState<string | null>(null)
  const [createTagAt, setCreateTagAt] = useState<string | null>(null)
  const [noteCommit, setNoteCommit] = useState<GitCommit | null>(null)
  const [mergeParentPick, setMergeParentPick] = useState<MergeParentPickState | null>(null)
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null)
  const [removeStaleModal, setRemoveStaleModal] = useState<RemoveStaleModalState | null>(null)
  const [interactiveRebaseModal, setInteractiveRebaseModal] =
    useState<InteractiveRebaseModalState | null>(null)
  const [mergeSource, setMergeSource] = useState<string | null>(null)
  const [worktreeFromCommit, setWorktreeFromCommit] = useState<WorktreeFromCommitState | null>(null)
  const [explainCommits, setExplainCommits] = useState<GitCommit[] | null>(null)

  const aiEnabled = useAiEnabled()
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
    merge,
    mergeContinue,
    mergeAbort,
    cherryPickContinue,
    cherryPickAbort,
    cherryPickSkip,
    revertCommit,
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

  const openMergeParentPick = useCallback(
    (commit: GitCommit, action: MergeParentAction) => {
      closeMenu()
      setMergeParentPick({ commit, action })
    },
    [closeMenu]
  )

  const confirmMergeParentPick = useCallback(
    (mainline: number) => {
      if (!mergeParentPick) return
      const { commit, action } = mergeParentPick
      if (action === 'revert') {
        runMutation(
          revertCommit.mutateAsync({ hash: commit.hash, mainline }),
          t('contextMenu.revertComplete')
        )
      } else if (action === 'cherry-pick') {
        runMutation(
          cherryPick.mutateAsync({ hash: commit.hash, mainline }),
          t('contextMenu.cherryPickComplete')
        )
      } else {
        runMutation(
          cherryPick.mutateAsync({ hash: commit.hash, noCommit: true, mainline }),
          t('contextMenu.cherryPickAppliedNoCommit')
        )
      }
      setMergeParentPick(null)
    },
    [mergeParentPick, revertCommit, cherryPick, runMutation, t]
  )

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

  const selectedCommitHashes = useSelectionStore((s) => s.selectedCommitHashes)

  const items = useMemo(() => {
    if (!menu) return []

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
      aiEnabled,
      actions: {
        selectCommit: (hash) => selectTimelineNode('commit', hash),
        explainCommits: (commits) => {
          closeMenu()
          setExplainCommits(commits)
        },
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
        checkout: (params) => runMutation(checkout.mutateAsync(params), t('contextMenu.checkedOut')),
        mergeBranch: (branchName) => {
          closeMenu()
          setMergeSource(branchName)
        },
        fastForwardBranch: (branchName) =>
          runMutation(
            merge.mutateAsync({ branch: branchName, ffOnly: true }),
            t('contextMenu.sidebar.fastForwardCompleted')
          ),
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
        addNote: (commit) => {
          closeMenu()
          setNoteCommit(commit)
        },
        reword: (commit) => setRewordCommit(commit),
        rebaseOnto: (hash) =>
          runMutation(rebaseStart.mutateAsync({ onto: hash }), t('contextMenu.rebaseStarted')),
        cherryPick: (hash) => {
          const target = options.commits.find((entry) => entry.hash === hash)
          if (target && target.parents.length > 1) {
            openMergeParentPick(target, 'cherry-pick')
            return
          }
          runMutation(cherryPick.mutateAsync({ hash }), t('contextMenu.cherryPickComplete'))
        },
        cherryPickNoCommit: (hash) => {
          const target = options.commits.find((entry) => entry.hash === hash)
          if (target && target.parents.length > 1) {
            openMergeParentPick(target, 'cherry-pick-no-commit')
            return
          }
          runMutation(
            cherryPick.mutateAsync({ hash, noCommit: true }),
            t('contextMenu.cherryPickAppliedNoCommit')
          )
        },
        reset: (mode, hash) =>
          runMutation(reset.mutateAsync({ mode, ref: hash }), t('contextMenu.resetComplete', { mode })),
        deleteHead: (mode) =>
          openDeleteModal({ action: 'deleteHead', commits: [menu.commit], initialMode: mode }),
        dropCommits: (commits) => openDeleteModal({ action: 'drop', commits }),
        revertCommit: (commit) => {
          if (commit.parents.length > 1) {
            openMergeParentPick(commit, 'revert')
            return
          }
          openDeleteModal({ action: 'revert', commits: [commit] })
        },
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
    selectedCommitHashes,
    selectTimelineNode,
    showCompareCommitRange,
    showToast,
    runMutation,
    openDeleteModal,
    openRemoveStaleModal,
    openMergeParentPick,
    checkout,
    rebaseStart,
    cherryPick,
    squashCommits,
    reset,
    merge,
    rebaseContinue,
    rebaseAbort,
    rebaseSkip,
    mergeContinue,
    mergeAbort,
    cherryPickContinue,
    cherryPickAbort,
    cherryPickSkip,
    revertCommit,
    t,
    aiEnabled
  ])

  return {
    menu,
    items,
    openMenu,
    closeMenu,
    explainCommits,
    setExplainCommits,
    rewordCommit,
    setRewordCommit,
    createBranchAt,
    setCreateBranchAt,
    createTagAt,
    setCreateTagAt,
    noteCommit,
    setNoteCommit,
    mergeParentPick,
    setMergeParentPick,
    confirmMergeParentPick,
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
