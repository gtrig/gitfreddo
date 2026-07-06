import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { ActionButton, Modal } from '@/components/Ui/Modal'
import { Spinner } from '@/components/Ui/Spinner'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useToastStore } from '@/stores/toast'
import { buildExplainCommitInputs } from '@/lib/ai/explainCommit'
import type { GitCommit } from '@/lib/types'
import {
  parseExplainCommitResponse,
  type AiExplainCommitEntry,
  type AiExplainCommitResult
} from '@shared/ai'

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

interface ExplainCommitModalProps {
  commits: GitCommit[]
  filePathsByHash?: Record<string, string[]>
  open: boolean
  onClose: () => void
}

export function ExplainCommitModal({
  commits,
  filePathsByHash,
  open,
  onClose
}: ExplainCommitModalProps) {
  const { t } = useTranslation()
  const aiFill = useAiFill()
  const showToast = useToastStore((s) => s.show)
  const [result, setResult] = useState<AiExplainCommitResult | null>(null)
  const [entries, setEntries] = useState<AiExplainCommitEntry[]>([])
  const commitKey = useMemo(() => commits.map((commit) => commit.hash).join(','), [commits])

  async function runExplain() {
    setResult(null)
    setEntries([])

    const inputs = buildExplainCommitInputs(commits, filePathsByHash)

    try {
      const text = await aiFill.mutateAsync({
        purpose: 'explain_commit',
        context: {
          commits: inputs
        }
      })
      const parsed = parseExplainCommitResponse(
        text,
        inputs.map((commit) => ({ hash: commit.hash, shortHash: commit.shortHash }))
      )
      setResult(parsed)
      setEntries(parsed.commits)
    } catch (error) {
      onClose()
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  useEffect(() => {
    if (!open || commits.length === 0) return
    void runExplain()
  }, [open, commitKey])

  const aiBusy = aiFill.isPending
  const title =
    commits.length === 1
      ? t('detail.explainCommitTitle')
      : t('detail.explainCommitsTitle', { count: commits.length })

  const subjectByHash = new Map(commits.map((commit) => [commit.hash, commit.subject]))

  return (
    <Modal open={open} title={title} onClose={onClose} size="lg">
      {aiBusy && !result ? (
        <div className="flex items-center gap-2 py-8 text-sm text-gf-fg-muted">
          <Spinner size="sm" />
          {t('detail.explainingCommits')}
        </div>
      ) : result ? (
        <div className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto pr-1">
          {result.summary && (
            <div className="rounded border border-gf-border-strong bg-gf-bg-deep p-3">
              <AnalysisSection title={t('detail.explainSummary')} content={result.summary} />
            </div>
          )}

          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.hash}
                className="space-y-3 rounded border border-gf-border-strong bg-gf-bg-deep p-3"
              >
                <div>
                  <p className="font-mono text-[11px] text-gf-fg-subtle">{entry.shortHash}</p>
                  <p className="text-sm font-medium text-gf-fg">
                    {subjectByHash.get(entry.hash) ?? entry.summary}
                  </p>
                </div>
                <AnalysisSection title={t('detail.explainCommitOverview')} content={entry.summary} />
                <AnalysisSection title={t('detail.explainKeyChanges')} content={entry.keyChanges} />
                <AnalysisSection title={t('detail.explainRationale')} content={entry.rationale} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        {result ? (
          <>
            <ActionButton variant="secondary" disabled={aiBusy} onClick={() => void runExplain()}>
              {t('detail.explainAgain')}
            </ActionButton>
            <ActionButton variant="primary" onClick={onClose}>
              {t('common.close')}
            </ActionButton>
          </>
        ) : (
          <ActionButton variant="primary" onClick={onClose}>
            {t('common.close')}
          </ActionButton>
        )}
      </div>
    </Modal>
  )
}

interface ExplainCommitButtonProps {
  commits: GitCommit[]
  filePathsByHash?: Record<string, string[]>
  disabled?: boolean
  variant?: 'toolbar' | 'pill' | 'detail'
}

export function ExplainCommitButton({
  commits,
  filePathsByHash,
  disabled = false,
  variant = 'toolbar'
}: ExplainCommitButtonProps) {
  const { t } = useTranslation()
  const aiEnabled = useAiEnabled()
  const aiFill = useAiFill()
  const [open, setOpen] = useState(false)

  if (!aiEnabled || commits.length === 0) {
    return null
  }

  const buttonClassName =
    variant === 'pill'
      ? 'inline-flex shrink-0 items-center gap-1 rounded border border-violet-500/40 px-1.5 py-0.5 text-[10px] text-violet-300 hover:bg-violet-500/10 disabled:opacity-50'
      : variant === 'detail'
        ? 'rounded-md border border-transparent bg-gf-bg-deep px-3 py-1 text-xs text-gf-fg-muted [background-image:linear-gradient(var(--gf-bg-deep),var(--gf-bg-deep)),linear-gradient(90deg,#a78bfa,#38bdf8)] [background-origin:border-box] [background-clip:padding-box,border-box] hover:text-gf-fg disabled:opacity-50'
        : 'inline-flex items-center gap-1.5 rounded-md border border-transparent bg-gf-bg px-2.5 py-1 text-[11px] text-gf-fg-muted [background-image:linear-gradient(var(--gf-bg),var(--gf-bg)),linear-gradient(90deg,#a78bfa,#38bdf8)] [background-origin:border-box] [background-clip:padding-box,border-box] hover:text-gf-fg disabled:opacity-50'

  const label =
    commits.length === 1
      ? aiFill.isPending
        ? t('detail.explaining')
        : t('detail.explainWithAi')
      : aiFill.isPending
        ? t('detail.explaining')
        : t('detail.explainCommitsWithAi', { count: commits.length })

  return (
    <>
      <button
        type="button"
        disabled={disabled || aiFill.isPending}
        onClick={() => setOpen(true)}
        className={buttonClassName}
        title={label}
      >
        {aiFill.isPending ? (
          <Spinner size="sm" />
        ) : (
          <SparklesIcon className="h-3 w-3 text-violet-400" aria-hidden />
        )}
        {variant !== 'pill' && label}
      </button>

      <ExplainCommitModal
        commits={commits}
        filePathsByHash={filePathsByHash}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
