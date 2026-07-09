import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { LoadingRow } from '@/components/Ui/Spinner'
import { UnifiedDiffView } from '@/components/DiffViewer/UnifiedDiffView'
import { SplitDiffView } from '@/components/DiffViewer/SplitDiffView'
import { FullFileView } from '@/components/DiffViewer/FullFileView'
import { FileViewModeToggle } from '@/components/DiffViewer/FileViewModeToggle'
import { OpenInEditorButton } from '@/components/DiffViewer/OpenInEditorButton'
import { CommitFileList } from '@/components/DetailPanel/CommitFileList'
import { useDiffShow, useFileRead } from '@/hooks/useGit'
import { useCommitDisplayFiles } from '@/hooks/useCommitDisplayFiles'
import { useAppSettings } from '@/hooks/useAppSettings'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { commitMessageBody } from '@/lib/workspace/fileTree'
import { defaultFileContentViewMode, type FileContentViewMode } from '@/lib/diff/fileViewMode'
import { parseUnifiedDiffRows, splitRowsForDisplay } from '@/lib/diff/unifiedDiff'
import type { GitCommit } from '@/lib/types'

interface CommitDetailOverlayProps {
  commit: GitCommit
  onClose: () => void
}

type DiffViewMode = FileContentViewMode

export function CommitDetailOverlay({ commit, onClose }: CommitDetailOverlayProps) {
  const { t } = useTranslation()
  const { data: settings } = useAppSettings()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const selectedCommitFile = useSelectionStore((s) => s.selectedCommitFile)
  const setSelectedCommitFile = useSelectionStore((s) => s.setSelectedCommitFile)
  const openFileHistory = useSelectionStore((s) => s.openFileHistory)

  const [showAllFiles, setShowAllFiles] = useState(false)
  const [viewMode, setViewMode] = useState<DiffViewMode>(() =>
    defaultFileContentViewMode(settings?.diffViewMode)
  )

  const { files, loading, loadingAllFiles, error } = useCommitDisplayFiles(
    commit.hash,
    showAllFiles,
    connected && Boolean(repoPath)
  )

  const fullMessageQuery = useQuery({
    queryKey: ['repo', repoPath, 'log.message', commit.hash],
    queryFn: async () =>
      window.gitfreddo.invoke('log.message', { hash: commit.hash }) as Promise<string>,
    enabled: connected && Boolean(repoPath) && Boolean(commit.hash)
  })

  const fullMessage = fullMessageQuery.data ?? commit.message
  const body = useMemo(
    () => commitMessageBody(fullMessage, commit.subject),
    [fullMessage, commit.subject]
  )

  useEffect(() => {
    if (files.length === 0) return
    const current = useSelectionStore.getState().selectedCommitFile
    if (current && files.some((file) => file.path === current)) return
    setSelectedCommitFile(files[0]!.path)
  }, [files, setSelectedCommitFile])

  const diffQuery = useDiffShow(
    commit.hash,
    selectedCommitFile ?? undefined,
    Boolean(selectedCommitFile) && viewMode !== 'full'
  )

  const fileReadQuery = useFileRead(
    commit.hash,
    selectedCommitFile ?? undefined,
    Boolean(selectedCommitFile) && viewMode === 'full'
  )

  const rows = useMemo(
    () => (diffQuery.data?.unified ? parseUnifiedDiffRows(diffQuery.data.unified) : []),
    [diffQuery.data?.unified]
  )
  const splitRows = useMemo(() => splitRowsForDisplay(rows), [rows])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gf-bg-deep">
      <header className="flex shrink-0 items-center gap-2 border-b border-gf-border px-3 py-2">
        <DocumentTextIcon className="h-4 w-4 shrink-0 text-gf-fg-subtle" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-medium text-gf-fg">{commit.subject}</h2>
          <p className="truncate font-mono text-xs text-gf-fg-subtle">
            {commit.shortHash} · {commit.author.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-gf-fg-subtle hover:bg-gf-surface hover:text-gf-fg"
          aria-label={t('common.close')}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </header>

      {body && (
        <div className="shrink-0 border-b border-gf-border px-4 py-2">
          <p className="line-clamp-2 whitespace-pre-wrap text-sm text-gf-fg-subtle">{body}</p>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col border-r border-gf-border">
          {loading && files.length === 0 ? (
            <div className="p-3">
              <LoadingRow label={t('detail.loadingFiles')} />
            </div>
          ) : (
            <CommitFileList
              files={files}
              loading={loading}
              error={error}
              selectedPath={selectedCommitFile}
              onSelectFile={setSelectedCommitFile}
              onFileHistory={openFileHistory}
              showAllFiles={showAllFiles}
              onShowAllFilesChange={setShowAllFiles}
              loadingAllFiles={loadingAllFiles}
              showBadges={false}
            />
          )}
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gf-border px-3 py-1.5">
            <p className="min-w-0 truncate font-mono text-xs text-gf-fg-muted">
              {selectedCommitFile ?? t('detail.selectFileForDiff')}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <OpenInEditorButton path={selectedCommitFile} />
              <FileViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {!selectedCommitFile ? (
              <p className="text-sm text-gf-fg-subtle">{t('detail.selectFileForDiff')}</p>
            ) : viewMode === 'full' ? (
              fileReadQuery.isLoading ? (
                <FullFileView content="" loading />
              ) : fileReadQuery.error ? (
                <p className="text-sm text-red-400">
                  {fileReadQuery.error instanceof Error
                    ? fileReadQuery.error.message
                    : t('diff.failedToLoadFile')}
                </p>
              ) : (
                <FullFileView content={fileReadQuery.data ?? ''} />
              )
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
