import { ForgeEditIssueModal } from '@/components/Forge/ForgeEditIssueModal'
import type { BitbucketIssue } from '@shared/bitbucket'

interface EditIssueModalProps {
  open: boolean
  issue: BitbucketIssue
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
      i18nPrefix="bitbucket"
      onClose={onClose}
      onUpdated={onUpdated}
      updateIssue={async ({ title, body }) => {
        await window.gitfreddo.bitbucketUpdateIssue(repoPath, issue.number, { title, body })
      }}
    />
  )
}
