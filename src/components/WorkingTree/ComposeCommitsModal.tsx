import { useEffect, useState } from 'react'
import { ActionButton, FieldLabel, Modal, TextArea, TextInput } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useToastStore } from '@/stores/toast'
import type { AiComposeCommitProposal } from '../../../shared/ai'

const SUBJECT_MAX = 72

function buildCommitMessage(summary: string, description: string): string {
  const subject = summary.trim()
  const body = description.trim()
  if (!body) return subject
  return `${subject}\n\n${body}`
}

interface ComposeCommitsModalProps {
  open: boolean
  proposals: AiComposeCommitProposal[]
  onClose: () => void
  onUseInPanel: (proposal: AiComposeCommitProposal) => void
}

export function ComposeCommitsModal({
  open,
  proposals: initialProposals,
  onClose,
  onUseInPanel
}: ComposeCommitsModalProps) {
  const { commit, stageAdd, stageReset } = useGitMutations()
  const showToast = useToastStore((s) => s.show)
  const [proposals, setProposals] = useState(initialProposals)

  useEffect(() => {
    if (open) {
      setProposals(initialProposals)
    }
  }, [open, initialProposals])

  const busy = commit.isPending || stageAdd.isPending || stageReset.isPending

  function updateProposal(index: number, patch: Partial<AiComposeCommitProposal>) {
    setProposals((current) =>
      current.map((proposal, i) => (i === index ? { ...proposal, ...patch } : proposal))
    )
  }

  async function handleCreateAll() {
    const invalid = proposals.find((proposal) => !proposal.summary.trim())
    if (invalid) {
      showToast('Every commit needs a summary.', 'error')
      return
    }

    try {
      await stageReset.mutateAsync({ paths: [] })

      for (const proposal of proposals) {
        await stageAdd.mutateAsync({ paths: proposal.files })
        await commit.mutateAsync({ message: buildCommitMessage(proposal.summary, proposal.description) })
      }

      showToast(
        proposals.length === 1 ? 'Commit created.' : `${proposals.length} commits created.`,
        'success'
      )
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  async function handleUseInPanel(index: number) {
    const proposal = proposals[index]
    if (!proposal?.summary.trim()) {
      showToast('Enter a commit summary.', 'error')
      return
    }

    try {
      await stageReset.mutateAsync({ paths: [] })
      await stageAdd.mutateAsync({ paths: proposal.files })
      onUseInPanel(proposal)
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  return (
    <Modal open={open} title="Proposed commits" onClose={onClose} size="lg">
      <p className="mb-4 text-sm text-gf-fg-muted">
        AI grouped your staged changes into {proposals.length} commit
        {proposals.length === 1 ? '' : 's'}. Review the messages below, then create them all or
        stage one group in the commit panel.
      </p>

      <div className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto pr-1">
        {proposals.map((proposal, index) => {
          const subjectRemaining = SUBJECT_MAX - proposal.summary.length

          return (
            <div
              key={`${index}-${proposal.files.join(',')}`}
              className="rounded border border-gf-border-strong bg-gf-bg-deep p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gf-fg-muted">
                  Commit {index + 1} · {proposal.files.length} file
                  {proposal.files.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleUseInPanel(index)}
                  className="text-[11px] text-gf-accent hover:underline disabled:opacity-50"
                >
                  Use in commit panel
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <FieldLabel>Summary</FieldLabel>
                  <div className="relative">
                    <TextInput
                      value={proposal.summary}
                      onChange={(e) => updateProposal(index, { summary: e.target.value })}
                      placeholder="Commit summary"
                      disabled={busy}
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
                    value={proposal.description}
                    onChange={(e) => updateProposal(index, { description: e.target.value })}
                    placeholder="Optional description"
                    rows={2}
                    disabled={busy}
                    className="resize-y"
                  />
                </div>

                <ul className="flex flex-wrap gap-1.5">
                  {proposal.files.map((file) => (
                    <li
                      key={file}
                      className="rounded bg-gf-surface-hover/60 px-2 py-0.5 font-mono text-[10px] text-gf-fg-subtle"
                    >
                      {file}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <ActionButton variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </ActionButton>
        <ActionButton variant="primary" loading={busy} onClick={() => void handleCreateAll()}>
          Create {proposals.length} commit{proposals.length === 1 ? '' : 's'}
        </ActionButton>
      </div>
    </Modal>
  )
}
