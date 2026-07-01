import { useEffect, useState } from 'react'
import { ActionButton, FieldLabel, Modal, TextArea, TextInput } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkingStatus } from '@/hooks/useGit'
import { buildCommitMessage, commitMessageBody } from '@/lib/fileTree'
import { useToastStore } from '@/stores/toast'
import type { GitCommit } from '@/lib/types'

const SUBJECT_MAX = 72

interface RewordCommitModalProps {
  commit: GitCommit
  fullMessage?: string
  open: boolean
  onClose: () => void
}

export function RewordCommitModal({ commit, fullMessage, open, onClose }: RewordCommitModalProps) {
  const { rewordCommit } = useGitMutations()
  const { data: working } = useWorkingStatus(open)
  const showToast = useToastStore((s) => s.show)

  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) return
    const message = fullMessage ?? commit.message
    setSummary(commit.subject)
    setDescription(commitMessageBody(message, commit.subject))
  }, [open, commit, fullMessage])

  const isMergeCommit = commit.parents.length > 1
  const workingTreeDirty = working ? !working.isClean : false
  const gitBusy = Boolean(
    working?.rebaseInProgress || working?.mergeInProgress || working?.cherryPickInProgress
  )
  const blocked = isMergeCommit || workingTreeDirty || gitBusy

  const subjectRemaining = SUBJECT_MAX - summary.length
  const busy = rewordCommit.isPending

  async function handleSubmit() {
    if (!summary.trim()) {
      showToast('Enter a commit summary.', 'error')
      return
    }

    try {
      await rewordCommit.mutateAsync({
        hash: commit.hash,
        message: buildCommitMessage(summary, description)
      })
      showToast('Commit message updated.', 'success')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  return (
    <Modal open={open} title="Reword commit" onClose={onClose} size="lg">
      <p className="mb-4 text-sm text-gf-fg-muted">
        Rewrites the message for{' '}
        <span className="font-mono text-gf-fg">{commit.shortHash}</span> and replays later commits
        on this branch. Requires a clean working tree.
      </p>

      {isMergeCommit && (
        <p className="mb-4 rounded border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          Merge commits cannot be reworded from here.
        </p>
      )}
      {workingTreeDirty && (
        <p className="mb-4 rounded border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          Commit or stash your changes before rewording.
        </p>
      )}
      {gitBusy && (
        <p className="mb-4 rounded border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          Finish or abort the current merge, rebase, or cherry-pick first.
        </p>
      )}

      <div className="space-y-3">
        <div>
          <FieldLabel>Summary</FieldLabel>
          <div className="relative">
            <TextInput
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Commit summary"
              disabled={blocked || busy}
            />
            <span
              className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums ${
                subjectRemaining < 0 ? 'text-red-400' : 'text-gf-fg-subtle'
              }`}
            >
              {subjectRemaining}
            </span>
          </div>
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={4}
            disabled={blocked || busy}
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <ActionButton onClick={onClose} disabled={busy}>
          Cancel
        </ActionButton>
        <ActionButton
          variant="primary"
          loading={busy}
          disabled={blocked || !summary.trim()}
          onClick={() => void handleSubmit()}
        >
          Reword commit
        </ActionButton>
      </div>
    </Modal>
  )
}
