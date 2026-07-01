import { create } from 'zustand'
import { commitRangeInTimeline, toggleHashInList } from '@/lib/commitSelection'
import type { GitCommit, TimelineNodeKind, TimelineSelection } from '@/lib/types'

interface SelectionState {
  timelineSelection: TimelineSelection | null
  selectedCommitHashes: string[]
  selectionAnchorHash: string | null
  selectedCommitHash: string | null
  selectedCommitFile: string | null
  selectedWorkingFile: string | null
  selectedStashIndex: number | null
  selectedStashFile: string | null
  diffMode: 'working' | 'staged' | 'commit' | 'commit-range' | 'stash' | null
  compareCommitRange: { oldestHash: string; newestHash: string; label: string } | null
  selectTimelineNode: (kind: TimelineNodeKind, id: string) => void
  toggleCommitSelection: (hash: string) => void
  selectCommitRange: (toHash: string, commits: GitCommit[]) => void
  setPrimaryCommit: (hash: string) => void
  showCompareCommitRange: (oldestHash: string, newestHash: string, label: string) => void
  setSelectedWorkingFile: (path: string | null, mode?: 'working' | 'staged') => void
  setSelectedCommitFile: (path: string | null) => void
  selectStash: (index: number | null, hash?: string | null) => void
  setSelectedStashFile: (path: string | null) => void
  closeDiffOverlay: () => void
}

function clearNonTimelineSelection(): Pick<
  SelectionState,
  | 'selectedCommitFile'
  | 'selectedWorkingFile'
  | 'selectedStashIndex'
  | 'selectedStashFile'
  | 'diffMode'
  | 'compareCommitRange'
> {
  return {
    selectedCommitFile: null,
    selectedWorkingFile: null,
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
  selectedStashIndex: null,
  selectedStashFile: null,
  diffMode: null,
  compareCommitRange: null,
  selectTimelineNode: (kind, id) =>
    set({
      timelineSelection: { kind, id },
      selectedCommitHashes: kind === 'commit' ? [id] : [],
      selectionAnchorHash: kind === 'commit' ? id : null,
      selectedCommitHash: kind === 'commit' ? id : null,
      ...clearNonTimelineSelection()
    }),
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
        selectedCommitHash: hash
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
      selectedCommitHash: null,
      selectedCommitFile: null,
      selectedStashIndex: null,
      selectedStashFile: null
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
      diffMode: null,
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
  closeDiffOverlay: () =>
    set({
      selectedWorkingFile: null,
      selectedStashFile: null,
      selectedCommitFile: null,
      compareCommitRange: null,
      diffMode: null
    })
}))

// Session persistence stubs for workspace store compatibility
const snapshots = new Map<string, unknown>()

export function captureSelectionForWorkspace(_path: string): void {}
export function restoreSelectionForWorkspace(_path: string): void {}
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
