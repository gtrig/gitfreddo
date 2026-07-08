import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBitbucketRepos } from '@/hooks/useBitbucketRepos'
import { useBitbucketStatus } from '@/hooks/useBitbucketStatus'

interface RepoPickerProps {
  selectedFullName: string | null
  onSelect: (repo: { fullName: string; cloneUrl: string }) => void
  compact?: boolean
}

export function RepoPicker({ selectedFullName, onSelect, compact = false }: RepoPickerProps) {
  const { t } = useTranslation()
  const { data: status } = useBitbucketStatus()
  const connected = status?.connected ?? false
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data: repos, isLoading, error } = useBitbucketRepos(
    { search: debouncedSearch || undefined },
    connected
  )

  const sortedRepos = useMemo(
    () => [...(repos ?? [])].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [repos]
  )

  if (!connected) {
    return <p className="text-xs text-gf-fg-subtle">{t('bitbucket.repoPicker.connectFirst')}</p>
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('bitbucket.repoPicker.searchPlaceholder')}
        className="w-full rounded border border-gf-border-strong bg-gf-bg-deep px-3 py-2 text-sm text-gf-fg placeholder:text-gf-fg-subtle focus:border-gf-accent focus:outline-none"
      />
      {isLoading && <p className="text-xs text-gf-fg-subtle">{t('bitbucket.repoPicker.loading')}</p>}
      {error && <p className="text-xs text-red-400">{(error as Error).message}</p>}
      <ul
        className={`overflow-auto rounded border border-gf-border ${compact ? 'max-h-48' : 'max-h-64'}`}
      >
        {sortedRepos.length === 0 && !isLoading ? (
          <li className="px-3 py-4 text-center text-xs text-gf-fg-subtle">
            {t('bitbucket.repoPicker.empty')}
          </li>
        ) : (
          sortedRepos.map((repo) => (
            <li key={repo.uuid}>
              <button
                type="button"
                onClick={() => onSelect({ fullName: repo.fullName, cloneUrl: repo.cloneUrl })}
                className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gf-surface-hover ${
                  selectedFullName === repo.fullName ? 'bg-gf-accent/10' : ''
                }`}
              >
                <span className="min-w-0">
                  <span className="block font-medium text-gf-fg">{repo.fullName}</span>
                  {repo.description && (
                    <span className="mt-0.5 block truncate text-xs text-gf-fg-subtle">
                      {repo.description}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[10px] uppercase text-gf-fg-subtle">
                  {repo.private ? t('bitbucket.repoPicker.private') : t('bitbucket.repoPicker.public')}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
