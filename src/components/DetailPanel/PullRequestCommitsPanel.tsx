import { useTranslation } from 'react-i18next'
import { LoadingRow } from '@/components/Ui/Spinner'
import type { GitHubPullRequestCommit } from '@shared/github'

interface PullRequestCommitsPanelProps {
  commits: GitHubPullRequestCommit[]
  loading?: boolean
  error?: Error | null
}

function formatCommittedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function PullRequestCommitsPanel({
  commits,
  loading = false,
  error = null
}: PullRequestCommitsPanelProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <LoadingRow label={t('detail.pullRequest.loadingCommits')} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : t('detail.pullRequest.commitsFailed')}
        </p>
      </div>
    )
  }

  if (commits.length === 0) {
    return (
      <div className="p-6">
        <p className="text-sm text-gf-fg-subtle">{t('detail.pullRequest.noCommits')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-sm font-medium text-gf-fg">{t('detail.pullRequest.commits')}</h2>
        <p className="mt-1 text-sm text-gf-fg-subtle">
          {t('detail.pullRequest.commitCount', { count: commits.length })}
        </p>
        <ol className="mt-4 space-y-3">
          {commits.map((commit, index) => (
            <li
              key={commit.sha}
              className="rounded-lg border border-gf-border bg-gf-surface/30 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gf-border bg-gf-bg text-[11px] text-gf-fg-subtle">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gf-fg">{commit.subject}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gf-fg-subtle">
                    <span className="font-mono">{commit.sha.slice(0, 7)}</span>
                    <span>
                      {commit.authorLogin ?? commit.authorName}
                    </span>
                    <span>{formatCommittedAt(commit.committedAt)}</span>
                  </div>
                  {commit.message.trim() !== commit.subject ? (
                    <pre className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-gf-fg-muted">
                      {commit.message}
                    </pre>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
