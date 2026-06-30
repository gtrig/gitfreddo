import { create } from 'zustand'
import type { TimelineNodeKind, TimelineSelection } from '@/lib/types'

interface SelectionState {
  timelineSelection: TimelineSelection | null
  selectedCommitHash: string | null
  selectedCommitFile: string | null
  selectedWorkingFile: string | null
  selectedStashIndex: number | null
  selectedStashFile: string | null
  diffMode: 'working' | 'staged' | 'commit' | 'stash' | null
  selectTimelineNode: (kind: TimelineNodeKind, id: string) => void
  setSelectedWorkingFile: (path: string | null, mode?: 'working' | 'staged') => void
  setSelectedCommitFile: (path: string | null) => void
  selectStash: (index: number | null) => void
  setSelectedStashFile: (path: string | null) => void
  closeDiffOverlay: () => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  timelineSelection: null,
  selectedCommitHash: null,
  selectedCommitFile: null,
  selectedWorkingFile: null,
  selectedStashIndex: null,
  selectedStashFile: null,
  diffMode: null,
  selectTimelineNode: (kind, id) =>
    set({
      timelineSelection: { kind, id },
      selectedCommitHash: kind === 'commit' ? id : null,
      selectedCommitFile: null,
      selectedWorkingFile: null,
      selectedStashIndex: null,
      selectedStashFile: null,
      diffMode: null
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
  selectStash: (index) =>
    set({
      selectedStashIndex: index,
      selectedStashFile: null,
      selectedWorkingFile: null,
      selectedCommitFile: null,
      selectedCommitHash: null,
      diffMode: null,
      timelineSelection: null
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
