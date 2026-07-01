import { create } from 'zustand'
import type { CommitSearchFilters } from '@/lib/commitSearch'

interface CommitSearchState {
  open: boolean
  filtersOpen: boolean
  query: string
  author: string
  hashPrefix: string
  dateFrom: string
  dateTo: string
  setOpen: (open: boolean) => void
  toggleOpen: () => void
  setFiltersOpen: (open: boolean) => void
  setQuery: (query: string) => void
  setAuthor: (author: string) => void
  setHashPrefix: (hashPrefix: string) => void
  setDateFrom: (dateFrom: string) => void
  setDateTo: (dateTo: string) => void
  filters: () => CommitSearchFilters
}

export const useCommitSearchStore = create<CommitSearchState>((set, get) => ({
  open: false,
  filtersOpen: false,
  query: '',
  author: '',
  hashPrefix: '',
  dateFrom: '',
  dateTo: '',

  setOpen: (open) => set({ open }),
  toggleOpen: () => set({ open: !get().open }),
  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),
  setQuery: (query) => set({ query }),
  setAuthor: (author) => set({ author }),
  setHashPrefix: (hashPrefix) => set({ hashPrefix }),
  setDateFrom: (dateFrom) => set({ dateFrom }),
  setDateTo: (dateTo) => set({ dateTo }),
  filters: () => {
    const { query, author, hashPrefix, dateFrom, dateTo } = get()
    return { query, author, hashPrefix, dateFrom, dateTo }
  }
}))
