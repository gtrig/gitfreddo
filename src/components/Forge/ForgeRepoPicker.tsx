import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import { shouldVirtualize, VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'

export interface ForgeRepoListItem {
  fullName: string
  cloneUrl: string
  description: string | null
  private: boolean
  key: string
}

export interface ForgeRepoPickerProps {
  i18nPrefix: string
  selectedFullName: string | null
  onSelect: (repo: { fullName: string; cloneUrl: string }) => void
  compact?: boolean
  connected: boolean
  repos: ForgeRepoListItem[] | undefined
  isLoading: boolean
  error: Error | null
  search: string
  onSearchChange: (value: string) => void
}

export function ForgeRepoPicker({
  i18nPrefix,
  selectedFullName,
  onSelect,
  compact = false,
  connected,
  repos,
  isLoading,
  error,
  search,
  onSearchChange
}: ForgeRepoPickerProps) {
  const { t } = useTranslation()

  const sortedRepos = useMemo(
    () => [...(repos ?? [])].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [repos]
  )

  const listHeight = compact ? 192 : 256
  const scrollRef = useRef<HTMLDivElement>(null)
  const useVirtualization = shouldVirtualize(sortedRepos.length)

  const virtualizer = useVirtualizer({
    count: useVirtualization ? sortedRepos.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 52,
    overscan: VIRTUAL_OVERSCAN
  })

  if (!connected) {
    return (
      <p className="text-xs text-gf-fg-subtle">{t(`${i18nPrefix}.repoPicker.connectFirst`)}</p>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={t(`${i18nPrefix}.repoPicker.searchPlaceholder`)}
        className="w-full rounded border border-gf-border-strong bg-gf-bg-deep px-3 py-2 text-sm text-gf-fg placeholder:text-gf-fg-subtle focus:border-gf-accent focus:outline-none"
      />
      {isLoading && (
        <p className="text-xs text-gf-fg-subtle">{t(`${i18nPrefix}.repoPicker.loading`)}</p>
      )}
      {error && <p className="text-xs text-red-400">{error.message}</p>}
      <div
        ref={scrollRef}
        className="overflow-auto rounded border border-gf-border"
        style={{ maxHeight: listHeight }}
      >
        {sortedRepos.length === 0 && !isLoading ? (
          <p className="px-3 py-4 text-center text-xs text-gf-fg-subtle">
            {t(`${i18nPrefix}.repoPicker.empty`)}
          </p>
        ) : useVirtualization ? (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const repo = sortedRepos[virtualItem.index]!
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`
                  }}
                >
                  <RepoButton
                    repo={repo}
                    selected={selectedFullName === repo.fullName}
                    i18nPrefix={i18nPrefix}
                    onSelect={onSelect}
                    fullHeight
                  />
                </div>
              )
            })}
          </div>
        ) : (
          sortedRepos.map((repo) => (
            <RepoButton
              key={repo.key}
              repo={repo}
              selected={selectedFullName === repo.fullName}
              i18nPrefix={i18nPrefix}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}

function RepoButton({
  repo,
  selected,
  i18nPrefix,
  onSelect,
  fullHeight
}: {
  repo: ForgeRepoListItem
  selected: boolean
  i18nPrefix: string
  onSelect: (repo: { fullName: string; cloneUrl: string }) => void
  fullHeight?: boolean
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => onSelect({ fullName: repo.fullName, cloneUrl: repo.cloneUrl })}
      className={`flex ${fullHeight ? 'h-full' : ''} w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gf-surface-hover ${
        selected ? 'bg-gf-accent/10' : ''
      }`}
    >
      <span className="min-w-0">
        <span className="block font-medium text-gf-fg">{repo.fullName}</span>
        {repo.description && (
          <span className="mt-0.5 block truncate text-xs text-gf-fg-subtle">{repo.description}</span>
        )}
      </span>
      <span className="shrink-0 text-[10px] uppercase text-gf-fg-subtle">
        {repo.private
          ? t(`${i18nPrefix}.repoPicker.private`)
          : t(`${i18nPrefix}.repoPicker.public`)}
      </span>
    </button>
  )
}

export function useDebouncedSearch(delayMs = 250) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), delayMs)
    return () => window.clearTimeout(timer)
  }, [search, delayMs])

  return { search, setSearch, debouncedSearch }
}
