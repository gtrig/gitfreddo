import { create } from 'zustand'

interface CommitSearchState {
  open: boolean
  query: string
  setOpen: (open: boolean) => void
  toggleOpen: () => void
  setQuery: (query: string) => void
}

export const useCommitSearchStore = create<CommitSearchState>((set, get) => ({
  open: false,
  query: '',

  setOpen: (open) => set({ open }),
  toggleOpen: () => set({ open: !get().open }),
  setQuery: (query) => set({ query })
}))
