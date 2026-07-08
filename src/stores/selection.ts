import { create } from 'zustand'
import { commitRangeInTimeline, toggleHashInList } from '@/lib/git/commitSelection'
import type { GitCommit, TimelineNodeKind, TimelineSelection } from '@/lib/types'
import type { AiConflictResolutionProposal } from '@shared/ai'

interface SelectionState {
  timelineSelection: TimelineSelection | null
  selectedCommitHashes: string[]
  selectionAnchorHash: string | null
  selectedCommitHash: string | null
  selectedCommitFile: string | null
  selectedWorkingFile: string | null
  selectedConflictFile: string | null
  selectedStashIndex: number | null
  selectedStashFile: string | null
  fileHistoryPath: string | null
  commitDetailHash: string | null
  diffMode: 'working' | 'staged' | 'commit' | 'commit-range' | 'stash' | 'conflict' | null
  compareCommitRange: { oldestHash: string; newestHash: string; label: string } | null
  pendingAiProposals: Record<string, AiConflictResolutionProposal[]>
  selectTimelineNode: (kind: TimelineNodeKind, id: string) => void
  toggleCommitSelection: (hash: string) => void
  selectCommitRange: (toHash: string, commits: GitCommit[]) => void
  setPrimaryCommit: (hash: string) => void
  showCompareCommitRange: (oldestHash: string, newestHash: string, label: string) => void
  setSelectedWorkingFile: (path: string | null, mode?: 'working' | 'staged') => void
  setSelectedConflictFile: (path: string | null) => void
  setSelectedCommitFile: (path: string | null) => void
  selectStash: (index: number | null, hash?: string | null) => void
  setSelectedStashFile: (path: string | null) => void
  setPendingAiProposals: (path: string, proposals: AiConflictResolutionProposal[]) => void
  clearPendingAiProposals: (path: string) => void
  openFileHistory: (path: string) => void
  closeFileHistory: () => void
  openCommitDetail: (hash: string) => void
  closeCommitDetail: () => void
  closeDiffOverlay: () => void
}

function clearNonTimelineSelection(): Pick<
  SelectionState,
  | 'selectedCommitFile'
  | 'selectedWorkingFile'
  | 'selectedConflictFile'
  | 'selectedStashIndex'
  | 'selectedStashFile'
  | 'diffMode'
  | 'compareCommitRange'
> {
  return {
    selectedCommitFile: null,
    selectedWorkingFile: null,
    selectedConflictFile: null,
    selectedStashIndex: null,
    selectedStashFile: null,
    diffMode: null,
    compareCommitRange: null
  }
}

export const useSelectionStore = create<SelectionState>((set) => ({
  timelineSelection: null,
  selectedCommitHashes: [],
  selectionAnchorHash: null,
  selectedCommitHash: null,
  selectedCommitFile: null,
  selectedWorkingFile: null,
  selectedConflictFile: null,
  selectedStashIndex: null,
  selectedStashFile: null,
  fileHistoryPath: null,
  commitDetailHash: null,
  diffMode: null,
  compareCommitRange: null,
  pendingAiProposals: {},
  selectTimelineNode: (kind, id) =>
    set((state) => ({
      timelineSelection: { kind, id },
      selectedCommitHashes: kind === 'commit' ? [id] : [],
      selectionAnchorHash: kind === 'commit' ? id : null,
      selectedCommitHash: kind === 'commit' ? id : null,
      commitDetailHash:
        kind === 'commit' && state.commitDetailHash === id ? state.commitDetailHash : null,
      ...clearNonTimelineSelection()
    })),
  toggleCommitSelection: (hash) =>
    set((state) => {
      const nextHashes = toggleHashInList(state.selectedCommitHashes, hash)
      if (nextHashes.length === 0) {
        return {
          timelineSelection: null,
          selectedCommitHashes: [],
          selectionAnchorHash: null,
          selectedCommitHash: null,
          ...clearNonTimelineSelection()
        }
      }

      return {
        timelineSelection: { kind: 'commit', id: hash },
        selectedCommitHashes: nextHashes,
        selectionAnchorHash: hash,
        selectedCommitHash: hash,
        ...clearNonTimelineSelection()
      }
    }),
  selectCommitRange: (toHash, commits) =>
    set((state) => {
      const anchor =
        state.selectionAnchorHash ??
        (state.timelineSelection?.kind === 'commit' ? state.timelineSelection.id : null) ??
        toHash
      const nextHashes = commitRangeInTimeline(commits, anchor, toHash)

      return {
        timelineSelection: { kind: 'commit', id: toHash },
        selectedCommitHashes: nextHashes,
        selectionAnchorHash: anchor,
        selectedCommitHash: toHash,
        ...clearNonTimelineSelection()
      }
    }),
  setPrimaryCommit: (hash) =>
    set((state) => {
      if (!state.selectedCommitHashes.includes(hash)) {
        return state
      }

      return {
        timelineSelection: { kind: 'commit', id: hash },
        selectedCommitHash: hash,
        selectedCommitFile: null,
        diffMode: null
      }
    }),
  showCompareCommitRange: (oldestHash, newestHash, label) =>
    set({
      compareCommitRange: { oldestHash, newestHash, label },
      diffMode: 'commit-range',
      selectedWorkingFile: null,
      selectedCommitFile: null,
      selectedStashFile: null,
      selectedStashIndex: null
    }),
  setSelectedWorkingFile: (path, mode = 'working') =>
    set({
      selectedWorkingFile: path,
      diffMode: path ? mode : null,
      selectedConflictFile: null,
      selectedCommitHash: null,
      selectedCommitFile: null,
      selectedStashIndex: null,
      selectedStashFile: null
    }),
  setSelectedConflictFile: (path) =>
    set({
      selectedConflictFile: path,
      diffMode: path ? 'conflict' : null,
      selectedWorkingFile: null,
      selectedCommitHash: null,
      selectedCommitFile: null,
      selectedStashIndex: null,
      selectedStashFile: null,
      compareCommitRange: null
    }),
  setSelectedCommitFile: (path) =>
    set({
      selectedCommitFile: path,
      diffMode: path ? 'commit' : null
    }),
  selectStash: (index, hash) =>
    set({
      selectedStashIndex: index,
      selectedStashFile: null,
      selectedWorkingFile: null,
      selectedCommitFile: null,
      diffMode: index !== null ? 'stash' : null,
      compareCommitRange: null,
      ...(index !== null && hash
        ? {
            timelineSelection: { kind: 'commit' as const, id: hash },
            selectedCommitHashes: [hash],
            selectionAnchorHash: hash,
            selectedCommitHash: hash
          }
        : {
            timelineSelection: null,
            selectedCommitHashes: [],
            selectionAnchorHash: null,
            selectedCommitHash: null
          })
    }),
  setSelectedStashFile: (path) =>
    set({
      selectedStashFile: path,
      diffMode: path ? 'stash' : null,
      selectedCommitFile: null
    }),
  setPendingAiProposals: (path, proposals) =>
    set((state) => ({
      pendingAiProposals: { ...state.pendingAiProposals, [path]: proposals }
    })),
  clearPendingAiProposals: (path) =>
    set((state) => {
      const next = { ...state.pendingAiProposals }
      delete next[path]
      return { pendingAiProposals: next }
    }),
  openFileHistory: (path) =>
    set({
      fileHistoryPath: path,
      commitDetailHash: null,
      selectedWorkingFile: null,
      selectedConflictFile: null,
      selectedCommitFile: null,
      selectedStashFile: null,
      selectedStashIndex: null,
      compareCommitRange: null,
      diffMode: null
    }),
  closeFileHistory: () => set({ fileHistoryPath: null }),
  openCommitDetail: (hash) =>
    set({
      commitDetailHash: hash,
      fileHistoryPath: null,
      selectedWorkingFile: null,
      selectedConflictFile: null,
      selectedStashFile: null,
      selectedStashIndex: null,
      compareCommitRange: null,
      selectedCommitFile: null,
      diffMode: null,
      timelineSelection: { kind: 'commit', id: hash },
      selectedCommitHashes: [hash],
      selectionAnchorHash: hash,
      selectedCommitHash: hash
    }),
  closeCommitDetail: () =>
    set({
      commitDetailHash: null,
      selectedCommitFile: null,
      diffMode: null
    }),
  closeDiffOverlay: () =>
    set({
      selectedWorkingFile: null,
      selectedConflictFile: null,
      selectedStashFile: null,
      selectedCommitFile: null,
      compareCommitRange: null,
      diffMode: null
    })
}))

// Session persistence for workspace tab switches
interface SelectionSnapshot {
  timelineSelection: TimelineSelection | null
  selectedCommitHashes: string[]
  selectionAnchorHash: string | null
  selectedCommitHash: string | null
  selectedCommitFile: string | null
  selectedWorkingFile: string | null
  selectedConflictFile: string | null
  selectedStashIndex: number | null
  selectedStashFile: string | null
  fileHistoryPath: string | null
  commitDetailHash: string | null
  diffMode: SelectionState['diffMode']
  compareCommitRange: SelectionState['compareCommitRange']
}

const EMPTY_SNAPSHOT: SelectionSnapshot = {
  timelineSelection: null,
  selectedCommitHashes: [],
  selectionAnchorHash: null,
  selectedCommitHash: null,
  selectedCommitFile: null,
  selectedWorkingFile: null,
  selectedConflictFile: null,
  selectedStashIndex: null,
  selectedStashFile: null,
  fileHistoryPath: null,
  commitDetailHash: null,
  diffMode: null,
  compareCommitRange: null
}

const snapshots = new Map<string, SelectionSnapshot>()

function snapshotFromState(state: SelectionState): SelectionSnapshot {
  return {
    timelineSelection: state.timelineSelection,
    selectedCommitHashes: state.selectedCommitHashes,
    selectionAnchorHash: state.selectionAnchorHash,
    selectedCommitHash: state.selectedCommitHash,
    selectedCommitFile: state.selectedCommitFile,
    selectedWorkingFile: state.selectedWorkingFile,
    selectedConflictFile: state.selectedConflictFile,
    selectedStashIndex: state.selectedStashIndex,
    selectedStashFile: state.selectedStashFile,
    fileHistoryPath: state.fileHistoryPath,
    commitDetailHash: state.commitDetailHash,
    diffMode: state.diffMode,
    compareCommitRange: state.compareCommitRange
  }
}

export function captureSelectionForWorkspace(path: string): void {
  snapshots.set(path, snapshotFromState(useSelectionStore.getState()))
}

export function restoreSelectionForWorkspace(path: string): void {
  useSelectionStore.setState(snapshots.get(path) ?? EMPTY_SNAPSHOT)
}
export function clearSelectionSnapshot(path: string): void {
  snapshots.delete(path)
}
export function migrateSelectionSnapshot(from: string, to: string): void {
  const snap = snapshots.get(from)
  if (snap) {
    snapshots.set(to, snap)
    snapshots.delete(from)
  }
}
