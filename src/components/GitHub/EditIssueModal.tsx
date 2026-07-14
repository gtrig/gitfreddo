import { ForgeEditIssueModal } from '@/components/Forge/ForgeEditIssueModal'
import type { GitHubIssue } from '@shared/github'

interface EditIssueModalProps {
  open: boolean
  issue: GitHubIssue
  repoPath: string
  onClose: () => void
  onUpdated: () => void | Promise<void>
}

export function EditIssueModal({
  open,
  issue,
  repoPath,
  onClose,
  onUpdated
}: EditIssueModalProps) {
  return (
    <ForgeEditIssueModal
      open={open}
      issue={issue}
      i18nPrefix="github"
      onClose={onClose}
      onUpdated={onUpdated}
      updateIssue={async ({ title, body }) => {
        await window.gitfreddo.githubUpdateIssue(repoPath, issue.number, { title, body })
      }}
    />
  )
}
