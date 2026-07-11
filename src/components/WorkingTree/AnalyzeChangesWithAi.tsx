import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AiActionButton } from '@/components/Ui/AiActionButton'
import { ActionButton, Checkbox, FieldLabel, Modal, TextArea, TextInput } from '@/components/Ui/Modal'
import { Spinner } from '@/components/Ui/Spinner'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useToastStore } from '@/stores/toast'
import {
  parseAnalyzeChangesResponse,
  parseRefineCommitPlanResponse,
  type AiAnalyzeChangesResult,
  type AiAnalyzeCommitProposal,
  type AiAnalyzeFeatureGroup,
  type AiChatMessage
} from '@shared/ai'
import {
  groupCommitsByFeatures,
  isFeatureFullySelected,
  isFeaturePartiallySelected,
  toggleFeatureCommitSelection
} from '@/lib/ai/analyzeFeatures'

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

function FeatureGroupChips({
  features,
  selectedIndices,
  busy,
  onToggleFeature
}: {
  features: AiAnalyzeFeatureGroup[]
  selectedIndices: Set<number>
  busy: boolean
  onToggleFeature: (featureIndex: number) => void
}) {
  const { t } = useTranslation()

  if (features.length === 0) {
    return null
  }

  return (
    <div className="mb-3">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gf-fg-subtle">
        {t('workingTree.analysisFeatureGroups')}
      </h4>
      <div className="flex flex-wrap gap-2">
        {features.map((feature, featureIndex) => {
          const fullySelected = isFeatureFullySelected(feature, selectedIndices)
          const partiallySelected = isFeaturePartiallySelected(feature, selectedIndices)

          return (
            <button
              key={`${featureIndex}-${feature.title}`}
              type="button"
              disabled={busy}
              aria-pressed={fullySelected}
              aria-label={t('workingTree.toggleFeatureGroup', {
                title: feature.title,
                count: feature.commitIndices.length
              })}
              onClick={() => onToggleFeature(featureIndex)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                fullySelected
                  ? 'border-violet-400/60 bg-violet-500/20 text-violet-100'
                  : partiallySelected
                    ? 'border-violet-400/40 bg-violet-500/10 text-violet-200/90'
                    : 'border-gf-border-strong bg-gf-bg text-gf-fg-muted hover:border-gf-border-strong hover:bg-gf-surface-hover/60'
              }`}
            >
              <span>{feature.title}</span>
              <span className="ml-1.5 tabular-nums text-[10px] text-gf-fg-subtle">
                {t('workingTree.featureCommitCount', { count: feature.commitIndices.length })}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CommitProposalCard({
  proposal,
  index,
  selected,
  busy,
  onToggleSelected,
  onUpdate
}: {
  proposal: AiAnalyzeCommitProposal
  index: number
  selected: boolean
  busy: boolean
  onToggleSelected: (selected: boolean) => void
  onUpdate: (patch: Partial<AiAnalyzeCommitProposal>) => void
}) {
  const { t } = useTranslation()
  const subjectRemaining = SUBJECT_MAX - proposal.summary.length

  return (
    <div
      className={`rounded border border-gf-border-strong bg-gf-bg-deep p-3 ${
        selected ? '' : 'opacity-60'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-gf-fg-muted">
          <Checkbox
            checked={selected}
            disabled={busy}
            aria-label={t('workingTree.includeCommit')}
            onChange={(event) => onToggleSelected(event.target.checked)}
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
        <p className="mb-2 text-[11px] leading-relaxed text-violet-300/90">{proposal.rationale}</p>
      )}

      <div className="space-y-2">
        <div>
          <FieldLabel>{t('workingTree.summary')}</FieldLabel>
          <div className="relative">
            <TextInput
              value={proposal.summary}
              onChange={(e) => onUpdate({ summary: e.target.value })}
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
            onChange={(e) => onUpdate({ description: e.target.value })}
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

function CommitPlanChat({
  messages,
  input,
  busy,
  onInputChange,
  onSend
}: {
  messages: AiChatMessage[]
  input: string
  busy: boolean
  onInputChange: (value: string) => void
  onSend: () => void
}) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const canSend = input.trim().length > 0 && !busy

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages, busy])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) {
        onSend()
      }
    }
  }

  return (
    <section className="rounded border border-gf-border-strong bg-gf-bg-deep">
      <div className="border-b border-gf-border-strong px-3 py-2">
        <h3 className="text-xs font-semibold text-gf-fg-muted">{t('workingTree.refineCommitPlanChat')}</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-gf-fg-subtle">
          {t('workingTree.refineCommitPlanChatHint')}
        </p>
      </div>

      <div
        ref={scrollRef}
        className="max-h-40 space-y-2 overflow-y-auto px-3 py-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-gf-fg-subtle">{t('workingTree.refineCommitPlanChatEmpty')}</p>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${index}-${message.role}`}
              className={`rounded px-2.5 py-1.5 text-xs leading-relaxed ${
                message.role === 'user'
                  ? 'ml-6 bg-gf-surface-hover/70 text-gf-fg'
                  : 'mr-6 bg-violet-950/40 text-gf-fg'
              }`}
            >
              <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-gf-fg-subtle">
                {message.role === 'user'
                  ? t('workingTree.refineCommitPlanChatYou')
                  : t('workingTree.refineCommitPlanChatAssistant')}
              </span>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))
        )}
        {busy && messages.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gf-fg-muted">
            <Spinner size="sm" />
            {t('workingTree.refineCommitPlanChatThinking')}
          </div>
        )}
      </div>

      <div className="border-t border-gf-border-strong p-3">
        <TextArea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('workingTree.refineCommitPlanChatPlaceholder')}
          rows={2}
          disabled={busy}
          className="resize-y"
          aria-label={t('workingTree.refineCommitPlanChatPlaceholder')}
        />
        <div className="mt-2 flex justify-end">
          <ActionButton variant="secondary" disabled={!canSend} onClick={onSend}>
            {t('workingTree.refineCommitPlanChatSend')}
          </ActionButton>
        </div>
      </div>
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
  const { commit, stageAdd, stageReset, undoLast } = useGitMutations()
  const showToast = useToastStore((s) => s.show)
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<AiAnalyzeChangesResult | null>(null)
  const [proposals, setProposals] = useState<AiAnalyzeCommitProposal[]>([])
  const [features, setFeatures] = useState<AiAnalyzeFeatureGroup[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [chatMessages, setChatMessages] = useState<AiChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [refining, setRefining] = useState(false)

  const filePaths = [...stagedPaths, ...unstagedPaths]
  const hasChanges = filePaths.length > 0

  if (!aiEnabled || !hasChanges) {
    return null
  }

  async function runAnalysis() {
    setOpen(true)
    setResult(null)
    setProposals([])
    setFeatures([])
    setSelectedIndices(new Set())
    setChatMessages([])
    setChatInput('')
    setRefining(false)

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
      setFeatures(parsed.features)
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

  function toggleFeatureGroup(featureIndex: number) {
    const feature = features[featureIndex]
    if (!feature) return
    setSelectedIndices((current) => toggleFeatureCommitSelection(current, feature))
  }

  async function handleSendChat() {
    const message = chatInput.trim()
    if (!message || aiFill.isPending || refining) {
      return
    }

    const history = chatMessages
    const selected = [...selectedIndices].sort((a, b) => a - b)

    setChatInput('')
    setChatMessages((current) => [...current, { role: 'user', content: message }])
    setRefining(true)

    try {
      const text = await aiFill.mutateAsync({
        purpose: 'refine_commit_plan',
        context: {
          branch,
          filePaths,
          commitPlan: proposals,
          selectedCommitIndices: selected,
          chatHistory: history,
          userMessage: message
        }
      })
      const refined = parseRefineCommitPlanResponse(text, filePaths)
      setProposals(refined.commits)
      setFeatures(refined.features)
      setSelectedIndices(new Set(refined.commits.map((_, index) => index)))
      setChatMessages((current) => [...current, { role: 'assistant', content: refined.message }])
    } catch (error) {
      setChatMessages(history)
      setChatInput(message)
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setRefining(false)
    }
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

    let createdCount = 0
    try {
      await stageReset.mutateAsync({ paths: [] })

      for (const proposal of selectedProposals) {
        await stageAdd.mutateAsync({ paths: proposal.files })
        await commit.mutateAsync({ message: buildCommitMessage(proposal.summary, proposal.description) })
        createdCount++
      }

      showToast(
        selectedProposals.length === 1
          ? t('workingTree.commitCreated')
          : t('workingTree.commitsCreated', { count: selectedProposals.length }),
        'success'
      )
      setOpen(false)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      // Roll back any commits already created so the repo is not left half-committed.
      if (createdCount > 0) {
        try {
          for (let i = 0; i < createdCount; i++) {
            await undoLast.mutateAsync({})
          }
        } catch {
          // If rollback fails, inform the user so they can manually reset.
          showToast(
            `${msg} — ${createdCount} commit(s) were created before the failure. Run "git reset --soft HEAD~${createdCount}" to undo them.`,
            'error'
          )
          return
        }
      }
      showToast(msg, 'error')
    }
  }

  const aiBusy = aiFill.isPending
  const gitBusy = commit.isPending || stageAdd.isPending || stageReset.isPending
  const busy = aiBusy || gitBusy || refining
  const selectedCount = selectedIndices.size
  const commitSections = groupCommitsByFeatures(proposals.length, features)

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
        size="xl"
      >
        {aiBusy && !result && !refining ? (
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

              <FeatureGroupChips
                features={features}
                selectedIndices={selectedIndices}
                busy={busy}
                onToggleFeature={toggleFeatureGroup}
              />

              <div className="space-y-4">
                {commitSections.map((section, sectionIndex) => (
                  <div key={`${sectionIndex}-${section.featureTitle ?? 'other'}`} className="space-y-3">
                    {section.featureTitle ? (
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gf-fg-subtle">
                        {section.featureTitle}
                      </h4>
                    ) : features.length > 0 ? (
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gf-fg-subtle">
                        {t('workingTree.analysisOtherCommits')}
                      </h4>
                    ) : null}

                    {section.commitIndices.map((index) => {
                      const proposal = proposals[index]
                      if (!proposal) return null

                      return (
                        <CommitProposalCard
                          key={`${index}-${proposal.files.join(',')}`}
                          proposal={proposal}
                          index={index}
                          selected={selectedIndices.has(index)}
                          busy={busy}
                          onToggleSelected={(selected) => toggleProposalSelected(index, selected)}
                          onUpdate={(patch) => updateProposal(index, patch)}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            <CommitPlanChat
              messages={chatMessages}
              input={chatInput}
              busy={refining}
              onInputChange={setChatInput}
              onSend={() => void handleSendChat()}
            />
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
