import { ForgeEditIssueModal } from '@/components/Forge/ForgeEditIssueModal'
import type { GitlabIssue } from '@shared/gitlab'

interface EditIssueModalProps {
  open: boolean
  issue: GitlabIssue
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
      i18nPrefix="gitlab"
      onClose={onClose}
      onUpdated={onUpdated}
      updateIssue={async ({ title, body }) => {
        await window.gitfreddo.gitlabUpdateIssue(repoPath, issue.number, { title, body })
      }}
    />
  )
}
