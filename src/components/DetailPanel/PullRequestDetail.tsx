import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftEllipsisIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { SidebarIconPullRequest } from '@/components/Layout/sidebar/SidebarIcons'
import { AddPrCommentModal } from '@/components/DetailPanel/AddPrCommentModal'
import { PullRequestFileList } from '@/components/DetailPanel/PullRequestFileList'
import { UnifiedDiffView } from '@/components/DiffViewer/UnifiedDiffView'
import { SplitDiffView } from '@/components/DiffViewer/SplitDiffView'
import { FileViewModeToggle } from '@/components/DiffViewer/FileViewModeToggle'
import { ActionButton } from '@/components/Ui/Modal'
import { LoadingRow } from '@/components/Ui/Spinner'
import { useDiffCommits } from '@/hooks/useGit'
import { useAppSettings } from '@/hooks/useAppSettings'
import {
  useGitHubPullRequestFiles,
  useInvalidateGitHubPullRequestDetail
} from '@/hooks/useGitHubPullRequest'
import { useInvalidateGitHubPullRequests } from '@/hooks/useGitHubPullRequests'
import { defaultFileContentViewMode, type FileContentViewMode } from '@/lib/diff/fileViewMode'
import { parseUnifiedDiffRows, splitRowsForDisplay } from '@/lib/diff/unifiedDiff'
import {
  pullRequestStatusClassName,
  pullRequestStatusMeta,
  sumPullRequestFileStats
} from '@/lib/github/prFiles'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import type { GitHubPullRequest } from '@shared/github'

interface PullRequestDetailProps {
  pr: GitHubPullRequest
  onClose: () => void
}

export function PullRequestDetail({ pr, onClose }: PullRequestDetailProps) {
  const { t } = useTranslation()
  const { data: settings } = useAppSettings()
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const connected = useWorkspaceStore((s) => s.connected)
  const showToast = useToastStore((s) => s.show)
  const invalidateDetail = useInvalidateGitHubPullRequestDetail()
  const invalidateList = useInvalidateGitHubPullRequests()
  const [commentOpen, setCommentOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<FileContentViewMode>(() =>
    defaultFileContentViewMode(settings?.diffViewMode)
  )

  const filesQuery = useGitHubPullRequestFiles(repoPath, pr.number, Boolean(repoPath))
  const files = filesQuery.data ?? []
  const totals = useMemo(() => sumPullRequestFileStats(files), [files])
  const status = pullRequestStatusMeta(pr)

  const diffQuery = useDiffCommits(
    pr.base.sha,
    pr.head.sha,
    selectedPath ?? undefined,
    connected && Boolean(selectedPath)
  )

  const rows = useMemo(
    () => (diffQuery.data?.unified ? parseUnifiedDiffRows(diffQuery.data.unified) : []),
    [diffQuery.data?.unified]
  )
  const splitRows = useMemo(() => splitRowsForDisplay(rows), [rows])

  async function refreshAfterAction(successMessage: string) {
    if (!repoPath) return
    invalidateDetail(repoPath, pr.number)
    await invalidateList(repoPath)
    showToast(successMessage, 'success')
  }

  async function handleMerge() {
    if (!repoPath || busy) return
    setBusy(true)
    try {
      await window.gitfreddo.githubMergePullRequest(repoPath, pr.number, 'merge')
      await refreshAfterAction(t('sidebar.prMerged', { number: pr.number }))
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleReopen() {
    if (!repoPath || busy) return
    setBusy(true)
    try {
      await window.gitfreddo.githubReopenPullRequest(repoPath, pr.number)
      await refreshAfterAction(t('detail.pullRequest.reopened', { number: pr.number }))
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col bg-gf-bg-deep">
        <header className="shrink-0 border-b border-gf-border">
          <div className="flex items-start gap-3 px-4 py-3">
            <SidebarIconPullRequest className="mt-0.5 h-5 w-5 shrink-0 text-gf-fg-subtle" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-gf-fg-subtle">#{pr.number}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${pullRequestStatusClassName(status.tone)}`}
                >
                  {t(status.labelKey)}
                </span>
              </div>
              <h1 className="mt-1 text-base font-semibold text-gf-fg">{pr.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gf-fg-subtle">
                <span className="rounded-md border border-gf-border bg-gf-surface px-2 py-0.5 font-mono text-gf-fg">
                  {pr.head.ref}
                </span>
                <span aria-hidden>→</span>
                <span className="rounded-md border border-gf-border bg-gf-surface px-2 py-0.5 font-mono text-gf-fg">
                  {pr.base.ref}
                </span>
                <span className="text-gf-fg-muted">
                  {t('detail.pullRequest.byAuthor', { author: pr.user })}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="rounded p-1 text-gf-fg-subtle hover:bg-gf-surface hover:text-gf-fg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gf-border/70 px-4 py-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gf-fg-subtle">
              {filesQuery.isLoading ? (
                <span>{t('detail.loadingFiles')}</span>
              ) : files.length > 0 ? (
                <span>
                  {t('detail.pullRequest.fileSummary', {
                    count: totals.fileCount,
                    additions: totals.additions,
                    deletions: totals.deletions
                  })}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton onClick={() => setCommentOpen(true)}>
                <span className="inline-flex items-center gap-1.5">
                  <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                  {t('detail.pullRequest.addComment')}
                </span>
              </ActionButton>
              <ActionButton
                onClick={() => window.open(pr.htmlUrl, '_blank', 'noopener,noreferrer')}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  {t('detail.pullRequest.openInBrowser')}
                </span>
              </ActionButton>
              {pr.state === 'open' && pr.mergeable === true && !pr.draft ? (
                <ActionButton variant="primary" disabled={busy} onClick={() => void handleMerge()}>
                  {t('detail.pullRequest.merge')}
                </ActionButton>
              ) : null}
              {pr.state === 'closed' ? (
                <ActionButton variant="primary" disabled={busy} onClick={() => void handleReopen()}>
                  {t('detail.pullRequest.reopen')}
                </ActionButton>
              ) : null}
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-80 shrink-0 flex-col border-r border-gf-border bg-gf-bg">
            <PullRequestFileList
              files={files}
              selectedPath={selectedPath}
              onSelectFile={setSelectedPath}
              loading={filesQuery.isLoading}
              error={filesQuery.error as Error | null}
            />
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {selectedPath ? (
              <>
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gf-border px-4 py-2">
                  <p className="min-w-0 truncate font-mono text-xs text-gf-fg-muted">{selectedPath}</p>
                  <FileViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-4">
                  {diffQuery.isLoading ? (
                    <LoadingRow label={t('diff.loadingDiff')} />
                  ) : diffQuery.error ? (
                    <div className="max-w-lg space-y-3">
                      <p className="text-sm text-gf-fg-muted">
                        {t('detail.pullRequest.diffUnavailable')}
                      </p>
                      <ActionButton
                        onClick={() => window.open(pr.htmlUrl, '_blank', 'noopener,noreferrer')}
                      >
                        {t('detail.pullRequest.openInBrowser')}
                      </ActionButton>
                    </div>
                  ) : rows.length === 0 ? (
                    <p className="text-sm text-gf-fg-subtle">{t('diff.noChangesInRange')}</p>
                  ) : viewMode === 'split' ? (
                    <SplitDiffView rows={splitRows} loading={diffQuery.isLoading} />
                  ) : (
                    <UnifiedDiffView rows={rows} loading={diffQuery.isLoading} />
                  )}
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-3xl space-y-6">
                  <section>
                    <h2 className="text-sm font-medium text-gf-fg">{t('detail.pullRequest.overview')}</h2>
                    {pr.body.trim() ? (
                      <div className="mt-3 rounded-lg border border-gf-border bg-gf-surface/40 p-4 text-sm leading-relaxed text-gf-fg-muted whitespace-pre-wrap">
                        {pr.body}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-gf-fg-subtle">
                        {t('detail.pullRequest.noDescription')}
                      </p>
                    )}
                  </section>

                  <section className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-gf-border bg-gf-surface/30 p-4">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gf-fg-subtle">
                        {t('detail.pullRequest.headBranch')}
                      </p>
                      <p className="mt-1 font-mono text-sm text-gf-fg">{pr.head.ref}</p>
                      <p className="mt-1 font-mono text-xs text-gf-fg-subtle">{pr.head.sha.slice(0, 7)}</p>
                    </div>
                    <div className="rounded-lg border border-gf-border bg-gf-surface/30 p-4">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gf-fg-subtle">
                        {t('detail.pullRequest.baseBranch')}
                      </p>
                      <p className="mt-1 font-mono text-sm text-gf-fg">{pr.base.ref}</p>
                      <p className="mt-1 font-mono text-xs text-gf-fg-subtle">{pr.base.sha.slice(0, 7)}</p>
                    </div>
                  </section>

                  {files.length > 0 ? (
                    <section>
                      <h3 className="text-sm font-medium text-gf-fg">{t('detail.pullRequest.changedFiles')}</h3>
                      <p className="mt-2 text-sm text-gf-fg-subtle">
                        {t('detail.pullRequest.selectFileHint')}
                      </p>
                    </section>
                  ) : null}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <AddPrCommentModal
        prNumber={pr.number}
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
      />
    </>
  )
}
