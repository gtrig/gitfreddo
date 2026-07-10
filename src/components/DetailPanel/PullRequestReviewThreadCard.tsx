import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionButton } from '@/components/Ui/Modal'
import { GitHubMarkdownBody } from '@/components/Ui/GitHubMarkdownBody'
import { GitHubMarkdownEditor } from '@/components/Ui/GitHubMarkdownEditor'
import { rootReviewCommentId } from '@/lib/github/prThreads'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import type { GitHubPullRequestRepository, GitHubPullRequestReviewThread } from '@shared/github'

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function UserAvatar({ user }: { user: string }) {
  return (
    <span
      aria-hidden
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gf-border bg-gf-surface text-[10px] font-medium uppercase text-gf-fg-muted"
    >
      {user.slice(0, 1)}
    </span>
  )
}

interface PullRequestReviewThreadCardProps {
  thread: GitHubPullRequestReviewThread
  prNumber: number
  repository: GitHubPullRequestRepository
  onUpdated?: () => void
  compact?: boolean
  showPath?: boolean
  onOpenFile?: (path: string) => void
}

export function PullRequestReviewThreadCard({
  thread,
  prNumber,
  repository,
  onUpdated,
  compact = false,
  showPath = false,
  onOpenFile
}: PullRequestReviewThreadCardProps) {
  const { t } = useTranslation()
  const showToast = useToastStore((s) => s.show)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleReply() {
    if (!replyBody.trim() || busy) return
    const repoPath = useWorkspaceStore.getState().activePath
    if (!repoPath) {
      showToast(t('detail.pullRequest.replyNoRepo'), 'error')
      return
    }

    setBusy(true)
    try {
      await window.gitfreddo.githubReplyPullRequestReviewComment(
        repoPath,
        prNumber,
        rootReviewCommentId(thread),
        replyBody.trim(),
        repository
      )
      setReplyBody('')
      setReplyOpen(false)
      onUpdated?.()
      showToast(t('detail.pullRequest.replySaved'), 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleResolve() {
    if (busy) return
    const repoPath = useWorkspaceStore.getState().activePath
    if (!repoPath) {
      showToast(t('detail.pullRequest.replyNoRepo'), 'error')
      return
    }

    setBusy(true)
    try {
      if (thread.isResolved) {
        await window.gitfreddo.githubUnresolvePullRequestReviewThread(repoPath, thread.id)
        showToast(t('detail.pullRequest.threadUnresolved'), 'success')
      } else {
        await window.gitfreddo.githubResolvePullRequestReviewThread(repoPath, thread.id)
        showToast(t('detail.pullRequest.threadResolved'), 'success')
      }
      onUpdated?.()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`rounded-lg border ${
        thread.isResolved
          ? 'border-gf-border/60 bg-gf-surface/20 opacity-80'
          : 'border-gf-accent/30 bg-gf-surface/50'
      } ${compact ? '' : 'p-4'}`}
    >
      {(showPath || thread.isResolved || thread.isOutdated) && (
        <div className={`flex flex-wrap items-center gap-2 ${compact ? 'px-4 pt-2' : 'mb-3'}`}>
          {showPath && thread.path ? (
            onOpenFile ? (
              <button
                type="button"
                onClick={() => onOpenFile(thread.path)}
                className="font-mono text-xs text-gf-accent hover:underline"
              >
                {thread.path}
                {thread.line != null ? `:${thread.line}` : ''}
              </button>
            ) : (
              <p className="font-mono text-xs text-gf-fg-muted">
                {thread.path}
                {thread.line != null ? `:${thread.line}` : ''}
              </p>
            )
          ) : null}
          {thread.isResolved ? (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              {t('detail.pullRequest.threadResolvedBadge')}
            </span>
          ) : null}
          {thread.isOutdated ? (
            <span className="rounded-full border border-gf-border px-2 py-0.5 text-[10px] text-gf-fg-subtle">
              {t('detail.pullRequest.threadOutdated')}
            </span>
          ) : null}
        </div>
      )}

      <div className={compact ? 'divide-y divide-gf-border/60' : 'space-y-3'}>
        {thread.comments.map((comment) => (
          <div key={comment.id} className={compact ? 'px-4 py-2' : 'flex gap-3'}>
            {!compact ? <UserAvatar user={comment.user} /> : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gf-fg-subtle">
                {compact ? (
                  <span className="font-medium text-gf-fg">{comment.user}</span>
                ) : (
                  <span className="text-xs font-medium text-gf-fg">{comment.user}</span>
                )}
                <span>{formatTimestamp(comment.createdAt)}</span>
              </div>
              <GitHubMarkdownBody
                content={comment.body}
                className={compact ? 'mt-1 text-[12px]' : 'mt-1'}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        className={`flex flex-wrap items-center gap-2 ${
          compact ? 'border-t border-gf-border/60 px-4 py-2' : 'mt-4'
        }`}
      >
        <ActionButton disabled={busy} onClick={() => setReplyOpen((open) => !open)}>
          {t('detail.pullRequest.reply')}
        </ActionButton>
        <ActionButton disabled={busy} onClick={() => void handleToggleResolve()}>
          {thread.isResolved
            ? t('detail.pullRequest.unresolveThread')
            : t('detail.pullRequest.resolveThread')}
        </ActionButton>
      </div>

      {replyOpen ? (
        <div className={compact ? 'border-t border-gf-border/60 px-4 py-3' : 'mt-3 space-y-2'}>
          <GitHubMarkdownEditor
            value={replyBody}
            onChange={setReplyBody}
            placeholder={t('detail.pullRequest.replyPlaceholder')}
            rows={compact ? 4 : 6}
            compact={compact}
          />
          <div className="mt-2 flex justify-end gap-2">
            <ActionButton onClick={() => setReplyOpen(false)}>{t('common.cancel')}</ActionButton>
            <ActionButton
              variant="primary"
              disabled={busy || !replyBody.trim()}
              onClick={() => void handleReply()}
            >
              {t('detail.pullRequest.postReply')}
            </ActionButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}
