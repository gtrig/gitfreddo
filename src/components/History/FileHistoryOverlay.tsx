import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ClockIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { LoadingRow } from '@/components/Ui/Spinner'
import { UnifiedDiffView } from '@/components/DiffViewer/UnifiedDiffView'
import { SplitDiffView } from '@/components/DiffViewer/SplitDiffView'
import { FullFileView } from '@/components/DiffViewer/FullFileView'
import { FileViewModeToggle } from '@/components/DiffViewer/FileViewModeToggle'
import { OpenInEditorButton } from '@/components/DiffViewer/OpenInEditorButton'
import { useDiffShow, useFileRead } from '@/hooks/useGit'
import { useAppSettings } from '@/hooks/useAppSettings'
import { useWorkspaceStore } from '@/stores/workspace'
import { defaultFileContentViewMode, type FileContentViewMode } from '@/lib/diff/fileViewMode'
import { parseUnifiedDiffRows, splitRowsForDisplay } from '@/lib/diff/unifiedDiff'
import type { GitCommit } from '@/lib/types'
import { useVirtualizer } from '@tanstack/react-virtual'
import { VIRTUAL_OVERSCAN, shouldVirtualize } from '@/lib/ui/virtualList'

interface FileHistoryOverlayProps {
  path: string
  onClose: () => void
}

type DiffViewMode = FileContentViewMode

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
  const [viewMode, setViewMode] = useState<DiffViewMode>(() =>
    defaultFileContentViewMode(settings?.diffViewMode)
  )

  const sidebarScrollRef = useRef<HTMLDivElement>(null)

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
    Boolean(selectedHash) && viewMode !== 'full'
  )

  const fileReadQuery = useFileRead(
    selectedHash,
    path,
    Boolean(selectedHash) && viewMode === 'full'
  )

  const commitList = commits ?? []
  const useVirtualization = shouldVirtualize(commitList.length)
  // CommitRow: 2px border + ~20px hash + ~20px subject + ~16px author = ~58px
  const COMMIT_ROW_HEIGHT = 58

  const sidebarVirtualizer = useVirtualizer({
    count: useVirtualization ? commitList.length : 0,
    getScrollElement: () => sidebarScrollRef.current,
    estimateSize: () => COMMIT_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  useEffect(() => {
    if (!useVirtualization || !selectedHash) return
    const idx = commitList.findIndex((c) => c.hash === selectedHash)
    if (idx >= 0) sidebarVirtualizer.scrollToIndex(idx, { align: 'auto' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHash])

  const rows = useMemo(
    () => (diffQuery.data?.unified ? parseUnifiedDiffRows(diffQuery.data.unified) : []),
    [diffQuery.data?.unified]
  )
  const splitRows = useMemo(() => splitRowsForDisplay(rows), [rows])

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
            <div ref={sidebarScrollRef} className="min-h-0 flex-1 overflow-y-auto">
              {commits.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gf-fg-subtle">{t('modals.fileHistory.noCommits')}</p>
              ) : useVirtualization ? (
                <div style={{ height: sidebarVirtualizer.getTotalSize(), position: 'relative' }}>
                  {sidebarVirtualizer.getVirtualItems().map((virtualItem) => {
                    const commit = commitList[virtualItem.index]!
                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute', top: 0, left: 0, width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`
                        }}
                      >
                        <CommitRow
                          commit={commit}
                          selected={commit.hash === selectedHash}
                          onSelect={() => setSelectedHash(commit.hash)}
                        />
                      </div>
                    )
                  })}
                </div>
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
            <OpenInEditorButton path={path} />
            <FileViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
          <div className="min-h-0 flex-1 flex flex-col">
            {!selectedHash ? (
              <p className="p-4 text-sm text-gf-fg-subtle">{t('modals.fileHistory.selectCommit')}</p>
            ) : viewMode === 'full' ? (
              fileReadQuery.isLoading ? (
                <FullFileView content="" loading />
              ) : fileReadQuery.error ? (
                <p className="p-4 text-sm text-red-400">
                  {fileReadQuery.error instanceof Error
                    ? fileReadQuery.error.message
                    : t('diff.failedToLoadFile')}
                </p>
              ) : (
                <FullFileView content={fileReadQuery.data ?? ''} className="min-h-0 flex-1" />
              )
            ) : diffQuery.isLoading ? (
              <p className="p-4 text-sm text-gf-fg-subtle">{t('diff.loadingDiff')}</p>
            ) : diffQuery.error ? (
              <p className="p-4 text-sm text-red-400">
                {diffQuery.error instanceof Error
                  ? diffQuery.error.message
                  : t('modals.fileHistory.diffFailed')}
              </p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-sm text-gf-fg-subtle">{t('diff.noChangesInRange')}</p>
            ) : viewMode === 'split' ? (
              <SplitDiffView rows={splitRows} loading={diffQuery.isLoading} className="min-h-0 flex-1" />
            ) : (
              <UnifiedDiffView rows={rows} loading={diffQuery.isLoading} className="min-h-0 flex-1" />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
