import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { workspaceTabLabel } from '@/stores/workspace'
import { repoNameFromUrl } from '@/lib/git'

type HubView = 'hub' | 'clone'

interface WorkspaceHubProps {
  variant: 'page' | 'modal'
  open?: boolean
  onClose?: () => void
  onOpen: (path: string) => Promise<void>
}

function FolderIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M10 4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h6z" />
    </svg>
  )
}

function CloneIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 8h8a3 3 0 013 3v7a3 3 0 01-3 3H8a3 3 0 01-3-3v-7a3 3 0 013-3z" />
      <path d="M16 8V6a3 3 0 00-3-3H6a3 3 0 00-3 3v7a3 3 0 003 3h2" />
    </svg>
  )
}

function ActionCard({
  title,
  description,
  icon,
  onClick,
  disabled
}: {
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-left transition hover:border-zinc-600 hover:bg-zinc-900 disabled:opacity-50"
    >
      <span className="rounded-md bg-sky-600/15 p-2.5 text-sky-400">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-zinc-100">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{description}</span>
      </span>
    </button>
  )
}

export function WorkspaceHub({ variant, open = true, onClose, onOpen }: WorkspaceHubProps) {
  const [view, setView] = useState<HubView>('hub')
  const [recents, setRecents] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [cloneUrl, setCloneUrl] = useState('')
  const [cloneParent, setCloneParent] = useState('')

  const loadRecents = useCallback(() => {
    void window.gitfredo.getRecentRepos().then(setRecents)
  }, [])

  useEffect(() => {
    if (variant === 'page' || open) {
      loadRecents()
      setView('hub')
      setError(null)
      setSearch('')
    }
  }, [loadRecents, open, variant])

  useEffect(() => {
    if (variant !== 'modal' || !open || !onClose) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open, variant])

  const filteredRecents = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return recents
    }
    return recents.filter(
      (path) =>
        path.toLowerCase().includes(query) || workspaceTabLabel(path).toLowerCase().includes(query)
    )
  }, [recents, search])

  const predictedCloneName = cloneUrl.trim() ? repoNameFromUrl(cloneUrl) : ''

  async function handleOpenFolder() {
    setError(null)
    setBusy(true)
    try {
      const path = await window.gitfredo.openWorkspace()
      if (path) {
        await onOpen(path)
        onClose?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleOpenRecent(path: string) {
    setError(null)
    setBusy(true)
    try {
      await onOpen(path)
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handlePickCloneParent() {
    const path = await window.gitfredo.pickDirectory(cloneParent || undefined)
    if (path) {
      setCloneParent(path)
    }
  }

  async function handleClone() {
    setError(null)
    if (!cloneUrl.trim()) {
      setError('Enter a repository URL')
      return
    }
    if (!cloneParent.trim()) {
      setError('Choose a folder to clone into')
      return
    }

    setBusy(true)
    try {
      const path = await window.gitfredo.cloneRepository(cloneUrl, cloneParent)
      await onOpen(path)
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (variant === 'modal' && !open) {
    return null
  }

  const content = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-zinc-800 px-6 py-5">
        <h1 className="text-xl font-semibold text-white">Open a repository</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Open an existing git repository or clone from a URL to get started.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[300px_1fr]">
        <div className="space-y-3 border-b border-zinc-800 p-6 lg:border-b-0 lg:border-r">
          {view === 'hub' ? (
            <>
              <ActionCard
                title="Open a folder"
                description="Browse for a local folder containing a .git directory."
                icon={<FolderIcon />}
                onClick={() => void handleOpenFolder()}
                disabled={busy}
              />
              <ActionCard
                title="Clone a repository"
                description="Clone from GitHub, GitLab, or any git remote."
                icon={<CloneIcon />}
                onClick={() => {
                  setView('clone')
                  setError(null)
                  if (!cloneParent && recents[0]) {
                    setCloneParent(recents[0].replace(/[/\\][^/\\]+$/, ''))
                  }
                }}
                disabled={busy}
              />
            </>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setView('hub')
                  setError(null)
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                ← Back
              </button>

              <div>
                <label htmlFor="clone-url" className="mb-1 block text-xs font-medium text-zinc-400">
                  Repository URL
                </label>
                <input
                  id="clone-url"
                  type="url"
                  value={cloneUrl}
                  onChange={(event) => setCloneUrl(event.target.value)}
                  placeholder="https://github.com/org/repo.git"
                  className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-600 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="clone-parent"
                  className="mb-1 block text-xs font-medium text-zinc-400"
                >
                  Clone into
                </label>
                <div className="flex gap-2">
                  <input
                    id="clone-parent"
                    type="text"
                    readOnly
                    value={cloneParent}
                    placeholder="Choose a parent folder…"
                    className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => void handlePickCloneParent()}
                    className="shrink-0 rounded border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
                  >
                    Browse
                  </button>
                </div>
                {predictedCloneName && cloneParent && (
                  <p className="mt-2 text-xs text-zinc-600">
                    Will create <span className="text-zinc-400">{predictedCloneName}</span> inside the
                    selected folder.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleClone()}
                disabled={busy}
                className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {busy ? 'Cloning…' : 'Clone repository'}
              </button>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Recent</h2>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter…"
              className="w-44 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {filteredRecents.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-600">
                {recents.length === 0 ? 'No recent workspaces yet.' : 'No matches for your search.'}
              </p>
            ) : (
              <ul className="space-y-1">
                {filteredRecents.map((path) => (
                  <li key={path}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleOpenRecent(path)}
                      className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-zinc-800/80 disabled:opacity-50"
                    >
                      <span className="block text-sm font-medium text-zinc-200">
                        {workspaceTabLabel(path)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-500">{path}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="border-t border-red-500/20 bg-red-500/10 px-6 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  )

  if (variant === 'page') {
    return (
      <div className="flex h-screen flex-col bg-zinc-900 text-zinc-100">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col py-8">
          <div className="mb-6 px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500">GitFredo</p>
          </div>
          <div className="mx-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            {content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="flex max-h-[min(720px,90vh)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
        <div className="flex shrink-0 justify-end border-b border-zinc-800 px-4 py-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{content}</div>
      </div>
    </div>
  )
}
