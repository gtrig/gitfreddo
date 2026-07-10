import { useTranslation } from 'react-i18next'
import { LoadingRow } from '@/components/Ui/Spinner'
import { PullRequestDetail } from '@/components/DetailPanel/PullRequestDetail'
import { useGitHubPullRequest } from '@/hooks/useGitHubPullRequest'
import { useWorkspaceStore } from '@/stores/workspace'

export function PullRequestDetailScreen() {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const prNumber = useWorkspaceStore((s) => s.prDetailNumber)
  const prRepository = useWorkspaceStore((s) => s.prDetailRepository)
  const closePrDetail = useWorkspaceStore((s) => s.closePrDetail)

  const prQuery = useGitHubPullRequest(
    repoPath,
    prNumber,
    prRepository,
    connected && prNumber !== null
  )

  if (!connected || prNumber === null) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gf-bg-deep">
      {prQuery.isLoading ? (
        <div className="flex h-full items-center justify-center">
          <LoadingRow label={t('detail.pullRequest.loading', { number: prNumber })} />
        </div>
      ) : prQuery.error ? (
        <div className="flex h-full items-center justify-center p-4">
          <p className="text-sm text-red-400">
            {prQuery.error instanceof Error ? prQuery.error.message : String(prQuery.error)}
          </p>
        </div>
      ) : prQuery.data ? (
        <PullRequestDetail pr={prQuery.data} onClose={closePrDetail} />
      ) : null}
    </div>
  )
}
