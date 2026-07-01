import { useEffect, useRef } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useCommitSearchStore } from '@/stores/commitSearch'

export function CommitSearch() {
  const open = useCommitSearchStore((s) => s.open)
  const filtersOpen = useCommitSearchStore((s) => s.filtersOpen)
  const query = useCommitSearchStore((s) => s.query)
  const author = useCommitSearchStore((s) => s.author)
  const hashPrefix = useCommitSearchStore((s) => s.hashPrefix)
  const dateFrom = useCommitSearchStore((s) => s.dateFrom)
  const dateTo = useCommitSearchStore((s) => s.dateTo)
  const toggleOpen = useCommitSearchStore((s) => s.toggleOpen)
  const setOpen = useCommitSearchStore((s) => s.setOpen)
  const setFiltersOpen = useCommitSearchStore((s) => s.setFiltersOpen)
  const setQuery = useCommitSearchStore((s) => s.setQuery)
  const setAuthor = useCommitSearchStore((s) => s.setAuthor)
  const setHashPrefix = useCommitSearchStore((s) => s.setHashPrefix)
  const setDateFrom = useCommitSearchStore((s) => s.setDateFrom)
  const setDateTo = useCommitSearchStore((s) => s.setDateTo)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  const active =
    open ||
    query.trim().length > 0 ||
    author.trim().length > 0 ||
    hashPrefix.trim().length > 0 ||
    dateFrom.trim().length > 0 ||
    dateTo.trim().length > 0

  const filterInputClass =
    'h-7 w-full rounded border border-gf-border-strong bg-gf-bg px-2 text-xs text-gf-fg placeholder:text-gf-fg-subtle focus:border-gf-accent focus:outline-none'

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={toggleOpen}
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border text-xs ${
          active
            ? 'border-gf-border-strong bg-gf-surface text-gf-fg'
            : 'border-gf-border-strong text-gf-fg-muted hover:bg-gf-bg'
        }`}
        title="Search commits"
        aria-label="Search commits"
        aria-expanded={open}
      >
        <MagnifyingGlassIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
      </button>
      <div
        className={`overflow-hidden transition-[width,opacity,margin] duration-200 ease-out ${
          open ? 'ml-2 w-56 opacity-100' : 'ml-0 w-0 opacity-0'
        }`}
      >
        <div className="space-y-1.5">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commit messages…"
            aria-label="Search commit messages"
            className={filterInputClass}
          />
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="text-[10px] text-gf-fg-subtle hover:text-gf-fg-muted"
          >
            {filtersOpen ? 'Hide filters' : 'More filters…'}
          </button>
          {filtersOpen && (
            <div className="space-y-1.5">
              <input
                type="search"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="Author"
                aria-label="Filter by author"
                className={filterInputClass}
              />
              <input
                type="search"
                value={hashPrefix}
                onChange={(event) => setHashPrefix(event.target.value)}
                placeholder="Hash prefix"
                aria-label="Filter by hash prefix"
                className={filterInputClass}
              />
              <div className="flex gap-1">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  aria-label="From date"
                  className={filterInputClass}
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  aria-label="To date"
                  className={filterInputClass}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
