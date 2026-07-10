import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowsUpDownIcon } from '@heroicons/react/24/solid'
import { commitFileKindColor } from '@/lib/git/commitFiles'
import { prFileStatusToKind } from '@/lib/github/prFiles'
import type { GitHubPullRequestFile } from '@shared/github'

interface PullRequestFileListProps {
  files: GitHubPullRequestFile[]
  selectedPath: string | null
  onSelectFile: (path: string | null) => void
  loading?: boolean
  error?: Error | null
}

export function PullRequestFileList({
  files,
  selectedPath,
  onSelectFile,
  loading = false,
  error = null
}: PullRequestFileListProps) {
  const { t } = useTranslation()
  const [sortAscending, setSortAscending] = useState(true)

  const sortedFiles = useMemo(() => {
    const next = [...files]
    next.sort((a, b) => {
      const cmp = a.path.localeCompare(b.path)
      return sortAscending ? cmp : -cmp
    })
    return next
  }, [files, sortAscending])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-gf-border px-3 py-2">
        <p className="text-xs font-medium text-gf-fg-muted">{t('detail.files')}</p>
        <button
          type="button"
          onClick={() => setSortAscending((value) => !value)}
          className="rounded p-1 text-gf-fg-subtle hover:bg-gf-surface-hover hover:text-gf-fg-muted"
          title={sortAscending ? t('detail.sortedAsc') : t('detail.sortedDesc')}
        >
          <ArrowsUpDownIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        <button
          type="button"
          onClick={() => onSelectFile(null)}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${
            selectedPath === null
              ? 'bg-gf-sidebar-item-selected text-gf-fg'
              : 'text-gf-fg-muted hover:bg-gf-surface-hover/60 hover:text-gf-fg'
          }`}
        >
          <span className="font-medium">{t('detail.pullRequest.overview')}</span>
        </button>

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

        {sortedFiles.map((file) => {
          const kind = prFileStatusToKind(file.status)
          const selected = selectedPath === file.path
          return (
            <button
              key={file.path}
              type="button"
              onClick={() => onSelectFile(file.path)}
              className={`flex w-full items-start gap-2 px-3 py-1.5 text-left text-xs ${
                selected
                  ? 'bg-gf-sidebar-item-selected text-gf-fg'
                  : 'text-gf-fg-muted hover:bg-gf-surface-hover/60 hover:text-gf-fg'
              }`}
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
          )
        })}
      </div>
    </div>
  )
}
