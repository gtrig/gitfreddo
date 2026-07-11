import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentDuplicateIcon, FolderIcon, FolderPlusIcon } from '@heroicons/react/24/outline'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { workspaceTabLabel } from '@/stores/workspace'
import { repoNameFromUrl } from '@/lib/git/git'
import { parseBitbucketRemote } from '@shared/bitbucket'
import { parseGitHubRemote } from '@shared/github'
import { RepoPicker as GitHubRepoPicker } from '@/components/GitHub/RepoPicker'
import { CreateGitHubRepoModal } from '@/components/GitHub/CreateGitHubRepoModal'
import { ForkGitHubRepoModal } from '@/components/GitHub/ForkGitHubRepoModal'
import { RepoPicker as BitbucketRepoPicker } from '@/components/Bitbucket/RepoPicker'
import { CreateBitbucketRepoModal } from '@/components/Bitbucket/CreateBitbucketRepoModal'
import { ForkBitbucketRepoModal } from '@/components/Bitbucket/ForkBitbucketRepoModal'
import { Spinner } from '@/components/Ui/Spinner'

type HubView = 'hub' | 'clone'
type CloneTab = 'url' | 'github' | 'bitbucket'

interface WorkspaceHubProps {
  variant: 'page' | 'modal'
  open?: boolean
  onClose?: () => void
  onOpen: (path: string) => Promise<void>
}

function FolderIconCard() {
  return <FolderIcon aria-hidden className="h-6 w-6" />
}

function CloneIcon() {
  return <DocumentDuplicateIcon aria-hidden className="h-6 w-6" />
}

function InitIcon() {
  return <FolderPlusIcon aria-hidden className="h-6 w-6" />
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
      className="flex w-full items-start gap-4 rounded-lg border border-gf-border bg-gf-bg/60 p-4 text-left transition hover:border-gf-border-strong hover:bg-gf-bg disabled:opacity-50"
    >
      <span className="rounded-md bg-gf-accent/15 p-2.5 text-gf-accent-fg">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-gf-fg">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-gf-fg-subtle">{description}</span>
      </span>
    </button>
  )
}

export function WorkspaceHub({ variant, open = true, onClose, onOpen }: WorkspaceHubProps) {
  const { t } = useTranslation()
  const [view, setView] = useState<HubView>('hub')
  const [recents, setRecents] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [cloneUrl, setCloneUrl] = useState('')
  const [cloneParent, setCloneParent] = useState('')
  const [cloneTab, setCloneTab] = useState<CloneTab>('url')
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [createRepoOpen, setCreateRepoOpen] = useState(false)
  const [createRepoProvider, setCreateRepoProvider] = useState<'github' | 'bitbucket'>('github')
  const [forkOpen, setForkOpen] = useState(false)

  const githubCloneTarget = useMemo(() => parseGitHubRemote(cloneUrl), [cloneUrl])
  const bitbucketCloneTarget = useMemo(() => parseBitbucketRemote(cloneUrl), [cloneUrl])

  const loadRecents = useCallback(() => {
    void window.gitfreddo.getRecentRepos().then(setRecents)
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

  const predictedCloneName = (cloneTab !== 'url' && selectedRepo
    ? selectedRepo.split('/').pop()
    : cloneUrl.trim()
      ? repoNameFromUrl(cloneUrl)
      : '') ?? ''

  async function handleOpenFolder() {
    setError(null)
    setBusy(true)
    try {
      const path = await window.gitfreddo.openWorkspace()
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

  async function handleInitRepository() {
    setError(null)
    setBusy(true)
    try {
      const path = await window.gitfreddo.initRepository()
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
    const path = await window.gitfreddo.pickDirectory(cloneParent || undefined)
    if (path) {
      setCloneParent(path)
    }
  }

  async function handleCreateRepoAndClone(repo: { cloneUrl: string }) {
    if (!cloneParent.trim()) {
      setError(t('workspace.hub.error.chooseFolder'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const path = await window.gitfreddo.cloneRepository(repo.cloneUrl, cloneParent)
      await onOpen(path)
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleClone() {
    setError(null)
    const url =
      cloneTab !== 'url' && selectedRepo
        ? cloneUrl
        : cloneUrl
    if (!url.trim()) {
      setError(
        cloneTab === 'url'
          ? t('workspace.hub.error.enterUrl')
          : t('workspace.hub.error.selectRepo')
      )
      return
    }
    if (!cloneParent.trim()) {
      setError(t('workspace.hub.error.chooseFolder'))
      return
    }

    setBusy(true)
    try {
      const path = await window.gitfreddo.cloneRepository(url, cloneParent)
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
      <div className="border-b border-gf-border px-6 py-5">
        <h1 className="text-xl font-semibold text-white">{t('workspace.hub.title')}</h1>
        <p className="mt-1 text-sm text-gf-fg-subtle">
          {t('workspace.hub.subtitle')}
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[300px_1fr]">
        <div className="space-y-3 border-b border-gf-border p-6 lg:border-b-0 lg:border-r">
          {view === 'hub' ? (
            <>
              <ActionCard
                title={t('workspace.hub.openFolder.title')}
                description={t('workspace.hub.openFolder.description')}
                icon={<FolderIconCard />}
                onClick={() => void handleOpenFolder()}
                disabled={busy}
              />
              <ActionCard
                title={t('workspace.hub.init.title')}
                description={t('workspace.hub.init.description')}
                icon={<InitIcon />}
                onClick={() => void handleInitRepository()}
                disabled={busy}
              />
              <ActionCard
                title={t('workspace.hub.clone.title')}
                description={t('workspace.hub.clone.description')}
                icon={<CloneIcon />}
                onClick={() => {
                  setView('clone')
                  setCloneTab('url')
                  setError(null)
                  if (!cloneParent && recents[0]) {
                    setCloneParent(recents[0].replace(/[/\\][^/\\]+$/, ''))
                  }
                }}
                disabled={busy}
              />
              <ActionCard
                title={t('workspace.hub.createGithub.title')}
                description={t('workspace.hub.createGithub.description')}
                icon={<CloneIcon />}
                onClick={() => {
                  setCreateRepoProvider('github')
                  setCreateRepoOpen(true)
                  setError(null)
                  if (!cloneParent && recents[0]) {
                    setCloneParent(recents[0].replace(/[/\\][^/\\]+$/, ''))
                  }
                }}
                disabled={busy}
              />
              <ActionCard
                title={t('workspace.hub.createBitbucket.title')}
                description={t('workspace.hub.createBitbucket.description')}
                icon={<CloneIcon />}
                onClick={() => {
                  setCreateRepoProvider('bitbucket')
                  setCreateRepoOpen(true)
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
                className="text-xs text-gf-fg-subtle hover:text-gf-fg-muted"
              >
                {t('workspace.hub.back')}
              </button>

              <div className="flex flex-wrap gap-2">
                {(['url', 'github', 'bitbucket'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setCloneTab(tab)
                      setSelectedRepo(null)
                      if (tab === 'url') setCloneUrl('')
                    }}
                    className={`rounded border px-3 py-1.5 text-xs capitalize ${
                      cloneTab === tab
                        ? 'border-gf-accent bg-gf-accent/10 text-gf-fg'
                        : 'border-gf-border-strong text-gf-fg-muted hover:bg-gf-bg'
                    }`}
                  >
                    {t(`workspace.hub.cloneTab.${tab}`)}
                  </button>
                ))}
              </div>

              {cloneTab === 'url' ? (
                <div className="space-y-2">
                  <div>
                    <label htmlFor="clone-url" className="mb-1 block text-xs font-medium text-gf-fg-muted">
                      {t('workspace.hub.repoUrl')}
                    </label>
                    <input
                      id="clone-url"
                      type="url"
                      value={cloneUrl}
                      onChange={(event) => setCloneUrl(event.target.value)}
                      placeholder={t('workspace.hub.repoUrlPlaceholder')}
                      className="w-full rounded border border-gf-border-strong bg-gf-bg-deep px-3 py-2 text-sm text-gf-fg placeholder:text-gf-fg-subtle focus:border-gf-accent focus:outline-none"
                    />
                  </div>
                  {githubCloneTarget && (
                    <button
                      type="button"
                      onClick={() => setForkOpen(true)}
                      className="text-xs text-gf-accent hover:underline"
                    >
                      {t('github.fork.forkToAccount')}
                    </button>
                  )}
                  {bitbucketCloneTarget && (
                    <button
                      type="button"
                      onClick={() => setForkOpen(true)}
                      className="text-xs text-gf-accent hover:underline"
                    >
                      {t('bitbucket.fork.forkToAccount')}
                    </button>
                  )}
                </div>
              ) : cloneTab === 'github' ? (
                <div className="space-y-3">
                  <GitHubRepoPicker
                    selectedFullName={selectedRepo}
                    onSelect={(repo) => {
                      setSelectedRepo(repo.fullName)
                      setCloneUrl(repo.cloneUrl)
                    }}
                    compact
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCreateRepoProvider('github')
                      setCreateRepoOpen(true)
                    }}
                    className="text-xs text-gf-accent hover:underline"
                  >
                    {t('workspace.hub.createNewRepo')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <BitbucketRepoPicker
                    selectedFullName={selectedRepo}
                    onSelect={(repo) => {
                      setSelectedRepo(repo.fullName)
                      setCloneUrl(repo.cloneUrl)
                    }}
                    compact
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCreateRepoProvider('bitbucket')
                      setCreateRepoOpen(true)
                    }}
                    className="text-xs text-gf-accent hover:underline"
                  >
                    {t('workspace.hub.createNewRepo')}
                  </button>
                </div>
              )}

              <div>
                <label
                  htmlFor="clone-parent"
                  className="mb-1 block text-xs font-medium text-gf-fg-muted"
                >
                  {t('workspace.hub.cloneInto')}
                </label>
                <div className="flex gap-2">
                  <input
                    id="clone-parent"
                    type="text"
                    readOnly
                    value={cloneParent}
                    placeholder={t('workspace.hub.cloneParentPlaceholder')}
                    className="min-w-0 flex-1 rounded border border-gf-border-strong bg-gf-bg-deep px-3 py-2 text-sm text-gf-fg-muted placeholder:text-gf-fg-subtle"
                  />
                  <button
                    type="button"
                    onClick={() => void handlePickCloneParent()}
                    className="shrink-0 rounded border border-gf-border-strong px-3 py-2 text-xs text-gf-fg-muted hover:bg-gf-bg"
                  >
                    {t('common.browse')}
                  </button>
                </div>
                {predictedCloneName && cloneParent && (
                  <p className="mt-2 text-xs text-gf-fg-subtle">
                    {t('workspace.hub.willCreate', { name: predictedCloneName })}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleClone()}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gf-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy && <Spinner size="sm" className="border-white/30 border-t-white" />}
                {busy ? t('workspace.hub.cloning') : t('workspace.hub.cloneButton')}
              </button>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gf-fg-subtle">{t('workspace.hub.recent')}</h2>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('workspace.hub.filter')}
              className="w-44 rounded border border-gf-border bg-gf-bg-deep px-2 py-1 text-xs text-gf-fg-muted placeholder:text-gf-fg-subtle focus:border-gf-border-strong focus:outline-none"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {filteredRecents.length === 0 ? (
              <p className="py-8 text-center text-sm text-gf-fg-subtle">
                {recents.length === 0 ? t('workspace.hub.noRecents') : t('workspace.hub.noMatches')}
              </p>
            ) : (
              <ul className="space-y-1">
                {filteredRecents.map((path) => (
                  <li key={path}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleOpenRecent(path)}
                      className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-gf-surface-hover/80 disabled:opacity-50"
                    >
                      <span className="block text-sm font-medium text-gf-fg">
                        {workspaceTabLabel(path)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-gf-fg-subtle">{path}</span>
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

  const createRepoDialog =
    createRepoProvider === 'bitbucket' ? (
      <CreateBitbucketRepoModal
        open={createRepoOpen}
        onClose={() => setCreateRepoOpen(false)}
        submitLabel={t('workspace.hub.createAndClone')}
        onCreated={handleCreateRepoAndClone}
      />
    ) : (
      <CreateGitHubRepoModal
        open={createRepoOpen}
        onClose={() => setCreateRepoOpen(false)}
        autoInit
        submitLabel={t('workspace.hub.createAndClone')}
        onCreated={handleCreateRepoAndClone}
      />
    )

  const forkDialog =
    bitbucketCloneTarget && !githubCloneTarget ? (
      <ForkBitbucketRepoModal
        open={forkOpen}
        initialUrl={cloneUrl}
        onClose={() => setForkOpen(false)}
        onForked={(repo) => {
          setCloneUrl(repo.cloneUrl)
        }}
      />
    ) : (
      <ForkGitHubRepoModal
        open={forkOpen}
        initialUrl={cloneUrl}
        onClose={() => setForkOpen(false)}
        onForked={(repo) => {
          setCloneUrl(repo.cloneUrl)
        }}
      />
    )

  if (variant === 'page') {
    return (
      <>
        <div className="flex h-full flex-col bg-gf-bg text-gf-fg">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col py-8">
            <div className="mb-6 px-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gf-accent-fg">
                GitFreddo
              </p>
            </div>
            <div className="mx-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gf-border bg-gf-bg-deep shadow-2xl">
              {content}
            </div>
          </div>
        </div>
        {createRepoDialog}
        {forkDialog}
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
        <div className="flex max-h-[min(720px,90vh)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-gf-border-strong bg-gf-bg-deep shadow-2xl">
          <div className="flex shrink-0 justify-end border-b border-gf-border px-4 py-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-2 py-1 text-sm text-gf-fg-subtle hover:bg-gf-bg hover:text-gf-fg-muted"
              aria-label={t('common.close')}
            >
              <XMarkIcon className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">{content}</div>
        </div>
      </div>
      {createRepoDialog}
      {forkDialog}
    </>
  )
}
