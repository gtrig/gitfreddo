import { create } from 'zustand'

const STORAGE_KEY = 'gitfreddo.hiddenBranches'

interface BranchVisibilityState {
  hiddenBranches: Set<string>
  toggleBranchVisibility: (branchKey: string) => void
  setBranchVisibility: (branchKey: string, hidden: boolean) => void
  isBranchHidden: (branchKey: string) => boolean
}

let activeRepoPath: string | null = null
const snapshots = new Map<string, Set<string>>()

function loadAllFromStorage(): Record<string, string[]> {
  if (typeof localStorage === 'undefined') return {}

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}
    const parsed = JSON.parse(stored) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, string[]>
  } catch {
    return {}
  }
}

function saveRepoToStorage(path: string, hidden: ReadonlySet<string>): void {
  if (typeof localStorage === 'undefined' || !path) return

  try {
    const all = loadAllFromStorage()
    if (hidden.size === 0) {
      delete all[path]
    } else {
      all[path] = [...hidden].sort()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // ignore storage errors
  }
}

function hiddenForRepo(path: string): Set<string> {
  const snap = snapshots.get(path)
  if (snap) return new Set(snap)

  const stored = loadAllFromStorage()[path]
  return new Set(stored ?? [])
}

function persistActiveRepo(hidden: ReadonlySet<string>): void {
  if (!activeRepoPath) return
  snapshots.set(activeRepoPath, new Set(hidden))
  saveRepoToStorage(activeRepoPath, hidden)
}

export const useBranchVisibilityStore = create<BranchVisibilityState>((set, get) => ({
  hiddenBranches: new Set<string>(),

  toggleBranchVisibility: (branchKey) => {
    const next = new Set(get().hiddenBranches)
    if (next.has(branchKey)) next.delete(branchKey)
    else next.add(branchKey)
    set({ hiddenBranches: next })
    persistActiveRepo(next)
  },

  setBranchVisibility: (branchKey, hidden) => {
    const next = new Set(get().hiddenBranches)
    if (hidden) next.add(branchKey)
    else next.delete(branchKey)
    set({ hiddenBranches: next })
    persistActiveRepo(next)
  },

  isBranchHidden: (branchKey) => get().hiddenBranches.has(branchKey)
}))

export function captureBranchVisibilityForWorkspace(path: string): void {
  const { hiddenBranches } = useBranchVisibilityStore.getState()
  snapshots.set(path, new Set(hiddenBranches))
  saveRepoToStorage(path, hiddenBranches)
}

export function restoreBranchVisibilityForWorkspace(path: string): void {
  activeRepoPath = path
  useBranchVisibilityStore.setState({ hiddenBranches: hiddenForRepo(path) })
}

export function clearBranchVisibilitySnapshot(path: string): void {
  snapshots.delete(path)
  if (typeof localStorage === 'undefined') return

  try {
    const all = loadAllFromStorage()
    delete all[path]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // ignore storage errors
  }
}

export function migrateBranchVisibilitySnapshot(from: string, to: string): void {
  const snap = snapshots.get(from)
  if (snap) {
    snapshots.set(to, snap)
    snapshots.delete(from)
  }

  if (typeof localStorage === 'undefined') return

  try {
    const all = loadAllFromStorage()
    if (all[from]) {
      all[to] = all[from]
      delete all[from]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    }
  } catch {
    // ignore storage errors
  }
}
