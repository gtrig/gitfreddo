import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AiActionButton } from '@/components/Ui/AiActionButton'
import { ActionButton, FieldLabel, Modal, TextArea, TextInput } from '@/components/Ui/Modal'
import { Spinner } from '@/components/Ui/Spinner'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useToastStore } from '@/stores/toast'
import {
  parseAnalyzeChangesResponse,
  type AiAnalyzeChangesResult,
  type AiAnalyzeCommitProposal
} from '@shared/ai'

const SUBJECT_MAX = 72

function buildCommitMessage(summary: string, description: string): string {
  const subject = summary.trim()
  const body = description.trim()
  if (!body) return subject
  return `${subject}\n\n${body}`
}

interface AnalyzeChangesWithAiProps {
  branch: string
  stagedPaths: string[]
  unstagedPaths: string[]
  disabled?: boolean
  variant?: 'toolbar' | 'pill'
}

function AnalysisSection({
  title,
  content
}: {
  title: string
  content: string
}) {
  if (!content.trim()) return null

  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold text-gf-fg-muted">{title}</h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gf-fg">{content}</p>
    </section>
  )
}

export function AnalyzeChangesWithAi({
  branch,
  stagedPaths,
  unstagedPaths,
  disabled = false,
  variant = 'toolbar'
}: AnalyzeChangesWithAiProps) {
  const { t } = useTranslation()
  const aiEnabled = useAiEnabled()
  const aiFill = useAiFill()
  const { commit, stageAdd, stageReset } = useGitMutations()
  const showToast = useToastStore((s) => s.show)
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<AiAnalyzeChangesResult | null>(null)
  const [proposals, setProposals] = useState<AiAnalyzeCommitProposal[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  const filePaths = [...stagedPaths, ...unstagedPaths]
  const hasChanges = filePaths.length > 0

  if (!aiEnabled || !hasChanges) {
    return null
  }

  async function runAnalysis() {
    setOpen(true)
    setResult(null)
    setProposals([])
    setSelectedIndices(new Set())

    try {
      const text = await aiFill.mutateAsync({
        purpose: 'analyze_changes',
        context: {
          branch,
          filePaths,
          stagedFilePaths: stagedPaths,
          unstagedFilePaths: unstagedPaths
        }
      })
      const parsed = parseAnalyzeChangesResponse(text, filePaths)
      setResult(parsed)
      setProposals(parsed.commits)
      setSelectedIndices(new Set(parsed.commits.map((_, index) => index)))
    } catch (error) {
      setOpen(false)
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  function updateProposal(index: number, patch: Partial<AiAnalyzeCommitProposal>) {
    setProposals((current) =>
      current.map((proposal, i) => (i === index ? { ...proposal, ...patch } : proposal))
    )
  }

  function toggleProposalSelected(index: number, selected: boolean) {
    setSelectedIndices((current) => {
      const next = new Set(current)
      if (selected) {
        next.add(index)
      } else {
        next.delete(index)
      }
      return next
    })
  }

  async function handleCreateSelected() {
    const selectedProposals = proposals.filter((_, index) => selectedIndices.has(index))

    if (selectedProposals.length === 0) {
      showToast(t('workingTree.noCommitsSelected'), 'error')
      return
    }

    const invalid = selectedProposals.find((proposal) => !proposal.summary.trim())
    if (invalid) {
      showToast(t('workingTree.everyCommitNeedsSummary'), 'error')
      return
    }

    try {
      await stageReset.mutateAsync({ paths: [] })

      for (const proposal of selectedProposals) {
        await stageAdd.mutateAsync({ paths: proposal.files })
        await commit.mutateAsync({ message: buildCommitMessage(proposal.summary, proposal.description) })
      }

      showToast(
        selectedProposals.length === 1
          ? t('workingTree.commitCreated')
          : t('workingTree.commitsCreated', { count: selectedProposals.length }),
        'success'
      )
      setOpen(false)
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  const aiBusy = aiFill.isPending
  const gitBusy = commit.isPending || stageAdd.isPending || stageReset.isPending
  const busy = aiBusy || gitBusy
  const selectedCount = selectedIndices.size

  const label = aiBusy ? t('workingTree.analyzing') : t('workingTree.analyzeWithAi')

  return (
    <>
      <AiActionButton
        variant={variant === 'pill' ? 'pill' : 'toolbar'}
        disabled={disabled || aiBusy}
        loading={aiBusy}
        onClick={(event) => {
          event.stopPropagation()
          void runAnalysis()
        }}
        title={label}
      >
        {label}
      </AiActionButton>

      <Modal
        open={open}
        title={t('workingTree.analyzeWithAiTitle')}
        onClose={() => setOpen(false)}
        size="lg"
      >
        {aiBusy && !result ? (
          <div className="flex items-center gap-2 py-8 text-sm text-gf-fg-muted">
            <Spinner size="sm" />
            {t('workingTree.analyzingChanges')}
          </div>
        ) : result ? (
          <div className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto pr-1">
            <div className="space-y-3 rounded border border-gf-border-strong bg-gf-bg-deep p-3">
              <AnalysisSection title={t('workingTree.analysisSummary')} content={result.summary} />
              <AnalysisSection title={t('workingTree.analysisKeyChanges')} content={result.keyChanges} />
              <AnalysisSection title={t('workingTree.analysisRisks')} content={result.risks} />
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold text-gf-fg-muted">
                {t('workingTree.proposedCommitPlan', { count: proposals.length })}
              </h3>
              <p className="mb-3 text-sm text-gf-fg-muted">{t('workingTree.proposedCommitPlanDescription')}</p>

              <div className="space-y-4">
                {proposals.map((proposal, index) => {
                  const subjectRemaining = SUBJECT_MAX - proposal.summary.length
                  const selected = selectedIndices.has(index)

                  return (
                    <div
                      key={`${index}-${proposal.files.join(',')}`}
                      className={`rounded border border-gf-border-strong bg-gf-bg-deep p-3 ${
                        selected ? '' : 'opacity-60'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-gf-fg-muted">
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={busy}
                            aria-label={t('workingTree.includeCommit')}
                            onChange={(event) => toggleProposalSelected(index, event.target.checked)}
                            className="rounded border-gf-border-strong bg-gf-bg"
                          />
                          <span className="truncate">
                            {t('workingTree.commitNumber', {
                              number: index + 1,
                              count: proposal.files.length
                            })}
                          </span>
                        </label>
                      </div>

                      {proposal.rationale && (
                        <p className="mb-2 text-[11px] leading-relaxed text-violet-300/90">
                          {proposal.rationale}
                        </p>
                      )}

                      <div className="space-y-2">
                        <div>
                          <FieldLabel>{t('workingTree.summary')}</FieldLabel>
                          <div className="relative">
                            <TextInput
                              value={proposal.summary}
                              onChange={(e) => updateProposal(index, { summary: e.target.value })}
                              placeholder={t('workingTree.commitSummary')}
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
                          <FieldLabel>{t('workingTree.description')}</FieldLabel>
                          <TextArea
                            value={proposal.description}
                            onChange={(e) => updateProposal(index, { description: e.target.value })}
                            placeholder={t('workingTree.optionalDescription')}
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
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          {result ? (
            <>
              <ActionButton variant="secondary" disabled={busy} onClick={() => void runAnalysis()}>
                {t('workingTree.analyzeAgain')}
              </ActionButton>
              <ActionButton variant="secondary" onClick={() => setOpen(false)} disabled={gitBusy}>
                {t('common.cancel')}
              </ActionButton>
              <ActionButton
                variant="primary"
                loading={gitBusy}
                disabled={selectedCount === 0}
                onClick={() => void handleCreateSelected()}
              >
                {t('workingTree.createCommitCount', { count: selectedCount })}
              </ActionButton>
            </>
          ) : (
            <ActionButton variant="primary" onClick={() => setOpen(false)}>
              {t('common.close')}
            </ActionButton>
          )}
        </div>
      </Modal>
    </>
  )
}
