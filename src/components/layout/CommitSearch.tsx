import { useEffect, useRef } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useCommitSearchStore } from '@/stores/commitSearch'

export function CommitSearch() {
  const open = useCommitSearchStore((s) => s.open)
  const query = useCommitSearchStore((s) => s.query)
  const toggleOpen = useCommitSearchStore((s) => s.toggleOpen)
  const setOpen = useCommitSearchStore((s) => s.setOpen)
  const setQuery = useCommitSearchStore((s) => s.setQuery)
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

  const active = open || query.trim().length > 0

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
          open ? 'ml-2 w-48 opacity-100' : 'ml-0 w-0 opacity-0'
        }`}
      >
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search commit messages…"
          aria-label="Search commit messages"
          className="h-7 w-full rounded border border-gf-border-strong bg-gf-bg px-2 text-xs text-gf-fg placeholder:text-gf-fg-subtle focus:border-gf-accent focus:outline-none"
        />
      </div>
    </div>
  )
}
