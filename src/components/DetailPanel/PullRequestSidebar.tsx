import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowsUpDownIcon } from '@heroicons/react/24/solid'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Checkbox } from '@/components/Ui/Modal'
import { commitFileKindColor } from '@/lib/git/commitFiles'
import { prFileStatusToKind } from '@/lib/github/prFiles'
import type { PullRequestDetailPane } from '@/lib/github/prDetailSelection'
import { isPullRequestFilesPane } from '@/lib/github/prDetailSelection'
import type { GitHubPullRequestFile } from '@shared/github'
import { FILE_ROW_HEIGHT, VIRTUAL_OVERSCAN, shouldVirtualize } from '@/lib/ui/virtualList'

interface PullRequestSidebarProps {
  pane: PullRequestDetailPane
  onSelectPane: (pane: PullRequestDetailPane) => void
  files: GitHubPullRequestFile[]
  commitCount?: number
  loading?: boolean
  error?: Error | null
  analysisSelectedPaths?: string[]
  onToggleAnalysisFile?: (path: string, selected: boolean) => void
  onSelectAllAnalysisFiles?: () => void
  onClearAnalysisFiles?: () => void
}

export function PullRequestSidebar({
  pane,
  onSelectPane,
  files,
  commitCount,
  loading = false,
  error = null,
  analysisSelectedPaths = [],
  onToggleAnalysisFile,
  onSelectAllAnalysisFiles,
  onClearAnalysisFiles
}: PullRequestSidebarProps) {
  const { t } = useTranslation()
  const [sortAscending, setSortAscending] = useState(true)
  const analysisSelection = new Set(analysisSelectedPaths)
  const scrollRef = useRef<HTMLDivElement>(null)

  const sortedFiles = useMemo(() => {
    const next = [...files]
    next.sort((a, b) => {
      const cmp = a.path.localeCompare(b.path)
      return sortAscending ? cmp : -cmp
    })
    return next
  }, [files, sortAscending])

  const useVirtualization = shouldVirtualize(sortedFiles.length)

  const virtualizer = useVirtualizer({
    count: useVirtualization ? sortedFiles.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => FILE_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-gf-border px-3 py-2">
        <div className="flex rounded-md border border-gf-border-strong p-0.5 text-xs">
          <SidebarTab
            active={pane.kind === 'overview'}
            label={t('detail.pullRequest.overview')}
            onClick={() => onSelectPane({ kind: 'overview' })}
          />
          <SidebarTab
            active={pane.kind === 'commits'}
            label={t('detail.pullRequest.commits')}
            count={commitCount}
            onClick={() => onSelectPane({ kind: 'commits' })}
          />
          <SidebarTab
            active={isPullRequestFilesPane(pane)}
            label={t('detail.files')}
            count={files.length}
            onClick={() => onSelectPane({ kind: 'files' })}
          />
        </div>
      </div>

      {isPullRequestFilesPane(pane) ? (
        <>
          <div className="flex items-center justify-between gap-2 border-b border-gf-border px-3 py-2">
            <div className="flex items-center gap-2 text-[10px] text-gf-fg-subtle">
              {onSelectAllAnalysisFiles ? (
                <button
                  type="button"
                  onClick={onSelectAllAnalysisFiles}
                  className="hover:text-gf-fg-muted"
                >
                  {t('detail.pullRequest.aiSelectAll')}
                </button>
              ) : null}
              {onClearAnalysisFiles ? (
                <button
                  type="button"
                  onClick={onClearAnalysisFiles}
                  className="hover:text-gf-fg-muted"
                >
                  {t('detail.pullRequest.aiSelectNone')}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setSortAscending((value) => !value)}
              className="rounded p-1 text-gf-fg-subtle hover:bg-gf-surface-hover hover:text-gf-fg-muted"
              title={sortAscending ? t('detail.sortedAsc') : t('detail.sortedDesc')}
            >
              <ArrowsUpDownIcon className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <p className="border-b border-gf-border px-3 py-2 text-[10px] leading-relaxed text-gf-fg-subtle">
            {t('detail.pullRequest.aiFileSelectionHint')}
          </p>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-1">
            {loading ? (
              <p className="px-3 py-2 text-xs text-gf-fg-subtle">{t('detail.loadingFiles')}</p>
            ) : null}
            {error ? (
              <p className="px-3 py-2 text-xs text-red-400">
                {error instanceof Error ? error.message : t('detail.pullRequest.filesFailed')}
              </p>
            ) : null}
            {!loading && !error && sortedFiles.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gf-fg-subtle">{t('detail.noFileChanges')}</p>
            ) : null}
            {!loading && !error && sortedFiles.length > 0 && (
              useVirtualization ? (
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const file = sortedFiles[virtualItem.index]!
                    const kind = prFileStatusToKind(file.status)
                    const selected = pane.kind === 'file' && pane.path === file.path
                    const checked = analysisSelection.has(file.path)
                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute', top: 0, left: 0, width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`
                        }}
                        className={`flex w-full items-start gap-2 px-3 py-1.5 text-xs ${
                          selected
                            ? 'bg-gf-sidebar-item-selected text-gf-fg'
                            : 'text-gf-fg-muted hover:bg-gf-surface-hover/60 hover:text-gf-fg'
                        }`}
                      >
                        {onToggleAnalysisFile ? (
                          <Checkbox
                            checked={checked}
                            aria-label={t('detail.pullRequest.aiIncludeFile', { path: file.path })}
                            onChange={(event) => onToggleAnalysisFile(file.path, event.target.checked)}
                            onClick={(event) => event.stopPropagation()}
                            className="mt-0.5"
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onSelectPane({ kind: 'file', path: file.path })}
                          className="flex min-w-0 flex-1 items-start gap-2 text-left"
                        >
                          <span className={`mt-0.5 shrink-0 ${commitFileKindColor(kind)}`}>●</span>
                          <span className="min-w-0 flex-1 truncate font-mono">{file.path}</span>
                          <span className="shrink-0 tabular-nums text-[10px] text-gf-fg-subtle">
                            {file.additions > 0 ? (
                              <span className="text-emerald-400">+{file.additions}</span>
                            ) : null}
                            {file.additions > 0 && file.deletions > 0 ? ' ' : null}
                            {file.deletions > 0 ? (
                              <span className="text-rose-400">−{file.deletions}</span>
                            ) : null}
                          </span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                sortedFiles.map((file) => {
                  const kind = prFileStatusToKind(file.status)
                  const selected = pane.kind === 'file' && pane.path === file.path
                  const checked = analysisSelection.has(file.path)
                  return (
                    <div
                      key={file.path}
                      className={`flex w-full items-start gap-2 px-3 py-1.5 text-xs ${
                        selected
                          ? 'bg-gf-sidebar-item-selected text-gf-fg'
                          : 'text-gf-fg-muted hover:bg-gf-surface-hover/60 hover:text-gf-fg'
                      }`}
                    >
                      {onToggleAnalysisFile ? (
                        <Checkbox
                          checked={checked}
                          aria-label={t('detail.pullRequest.aiIncludeFile', { path: file.path })}
                          onChange={(event) => onToggleAnalysisFile(file.path, event.target.checked)}
                          onClick={(event) => event.stopPropagation()}
                          className="mt-0.5"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onSelectPane({ kind: 'file', path: file.path })}
                        className="flex min-w-0 flex-1 items-start gap-2 text-left"
                      >
                        <span className={`mt-0.5 shrink-0 ${commitFileKindColor(kind)}`}>●</span>
                        <span className="min-w-0 flex-1 truncate font-mono">{file.path}</span>
                        <span className="shrink-0 tabular-nums text-[10px] text-gf-fg-subtle">
                          {file.additions > 0 ? (
                            <span className="text-emerald-400">+{file.additions}</span>
                          ) : null}
                          {file.additions > 0 && file.deletions > 0 ? ' ' : null}
                          {file.deletions > 0 ? (
                            <span className="text-rose-400">−{file.deletions}</span>
                          ) : null}
                        </span>
                      </button>
                    </div>
                  )
                })
              )
            )}
          </div>
        </>
      ) : (
        <div className="px-3 py-3 text-xs text-gf-fg-subtle">
          {pane.kind === 'overview'
            ? t('detail.pullRequest.overviewSidebarHint')
            : t('detail.pullRequest.commitsSidebarHint')}
        </div>
      )}
    </div>
  )
}

function SidebarTab({
  active,
  label,
  count,
  onClick
}: {
  active: boolean
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 flex-1 rounded px-2 py-1 ${
        active ? 'bg-gf-accent text-white' : 'text-gf-fg-subtle hover:text-gf-fg-muted'
      }`}
    >
      <span className="truncate">{label}</span>
      {count != null ? <span className="ml-1 opacity-80">({count})</span> : null}
    </button>
  )
}
