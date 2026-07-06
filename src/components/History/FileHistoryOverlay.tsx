import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ClockIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { LoadingRow } from '@/components/Ui/Spinner'
import { UnifiedDiffView } from '@/components/DiffViewer/UnifiedDiffView'
import { SplitDiffView } from '@/components/DiffViewer/SplitDiffView'
import { useDiffShow } from '@/hooks/useGit'
import { useAppSettings } from '@/hooks/useAppSettings'
import { useWorkspaceStore } from '@/stores/workspace'
import { parseUnifiedDiffRows, splitRowsForDisplay } from '@/lib/diff/unifiedDiff'
import type { AppSettings } from '@/hooks/useAppSettings'
import type { GitCommit } from '@/lib/types'

interface FileHistoryOverlayProps {
  path: string
  onClose: () => void
}

type DiffViewMode = AppSettings['diffViewMode']

function CommitRow({
  commit,
  selected,
  onSelect
}: {
  commit: GitCommit
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={`flex w-full flex-col gap-0.5 border-b border-gf-border/60 px-3 py-2 text-left last:border-b-0 ${
        selected ? 'bg-gf-surface text-gf-fg' : 'text-gf-fg-muted hover:bg-gf-surface-hover'
      }`}
    >
      <span className="font-mono text-xs text-gf-fg-muted">{commit.shortHash}</span>
      <span className="text-sm">{commit.subject}</span>
      <span className="text-xs text-gf-fg-subtle">
        {commit.author.name} · {new Date(commit.author.date).toLocaleDateString()}
      </span>
    </button>
  )
}

export function FileHistoryOverlay({ path, onClose }: FileHistoryOverlayProps) {
  const { t } = useTranslation()
  const { data: settings } = useAppSettings()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const [selectedHash, setSelectedHash] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<DiffViewMode>(settings?.diffViewMode ?? 'unified')

  const { data: commits, isLoading, error } = useQuery({
    queryKey: ['repo', repoPath, 'log.file', path],
    queryFn: async () =>
      (await window.gitfreddo.invoke('log.file', { path, maxCount: 100 })) as GitCommit[],
    enabled: connected && Boolean(repoPath) && Boolean(path)
  })

  useEffect(() => {
    if (!commits?.length) {
      setSelectedHash(null)
      return
    }
    setSelectedHash((current) =>
      current && commits.some((commit) => commit.hash === current) ? current : commits[0]!.hash
    )
  }, [commits])

  const diffQuery = useDiffShow(
    selectedHash,
    path,
    Boolean(selectedHash)
  )

  const rows = useMemo(
    () => (diffQuery.data?.unified ? parseUnifiedDiffRows(diffQuery.data.unified) : []),
    [diffQuery.data?.unified]
  )
  const splitRows = useMemo(() => splitRowsForDisplay(rows), [rows])

  const viewModes: DiffViewMode[] = ['unified', 'split']

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gf-bg-deep">
      <header className="flex shrink-0 items-center gap-2 border-b border-gf-border px-3 py-2">
        <ClockIcon className="h-4 w-4 shrink-0 text-gf-fg-subtle" aria-hidden />
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-gf-fg">
          {t('modals.fileHistory.title', { path })}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-gf-fg-subtle hover:bg-gf-surface hover:text-gf-fg"
          aria-label={t('common.close')}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col border-r border-gf-border">
          {isLoading && (
            <div className="p-3">
              <LoadingRow label={t('modals.fileHistory.loading')} />
            </div>
          )}
          {error && (
            <p className="p-3 text-sm text-red-400">
              {error instanceof Error ? error.message : t('modals.fileHistory.loadFailed')}
            </p>
          )}
          {commits && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {commits.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gf-fg-subtle">{t('modals.fileHistory.noCommits')}</p>
              ) : (
                commits.map((commit) => (
                  <CommitRow
                    key={commit.hash}
                    commit={commit}
                    selected={commit.hash === selectedHash}
                    onSelect={() => setSelectedHash(commit.hash)}
                  />
                ))
              )}
            </div>
          )}
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-end gap-2 border-b border-gf-border px-3 py-1.5">
            <div className="flex rounded border border-gf-border-strong text-[10px]">
              {viewModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-2 py-0.5 capitalize ${
                    viewMode === mode
                      ? 'bg-gf-surface text-gf-fg'
                      : 'text-gf-fg-muted hover:bg-gf-bg'
                  }`}
                >
                  {mode === 'split' ? t('diff.sideBySide') : mode}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {!selectedHash ? (
              <p className="text-sm text-gf-fg-subtle">{t('modals.fileHistory.selectCommit')}</p>
            ) : diffQuery.isLoading ? (
              <p className="text-sm text-gf-fg-subtle">{t('diff.loadingDiff')}</p>
            ) : diffQuery.error ? (
              <p className="text-sm text-red-400">
                {diffQuery.error instanceof Error
                  ? diffQuery.error.message
                  : t('modals.fileHistory.diffFailed')}
              </p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-gf-fg-subtle">{t('diff.noChangesInRange')}</p>
            ) : viewMode === 'split' ? (
              <SplitDiffView rows={splitRows} loading={diffQuery.isLoading} />
            ) : (
              <UnifiedDiffView rows={rows} loading={diffQuery.isLoading} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
