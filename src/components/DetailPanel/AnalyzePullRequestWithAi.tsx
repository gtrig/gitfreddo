import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AiActionButton } from '@/components/Ui/AiActionButton'
import { AiPromptChat } from '@/components/Ui/AiPromptChat'
import { ActionButton, Modal } from '@/components/Ui/Modal'
import { Spinner } from '@/components/Ui/Spinner'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import {
  buildPullRequestAnalysisContext,
  pullRequestAnalysisScopeKey,
  resolvePullRequestAnalysisScope
} from '@/lib/ai/analyzePullRequest'
import { useToastStore } from '@/stores/toast'
import type {
  AiAnalyzePullRequestResult,
  AiChatMessage,
  AiFillContext
} from '@shared/ai'
import {
  parseAnalyzePullRequestResponse,
  parseRefinePullRequestAnalysisResponse
} from '@shared/ai'
import type { GitHubPullRequest, GitHubPullRequestCommit, GitHubPullRequestFile } from '@shared/github'

function AnalysisSection({ title, content }: { title: string; content: string }) {
  if (!content.trim()) return null

  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold text-gf-fg-muted">{title}</h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gf-fg">{content}</p>
    </section>
  )
}

interface AnalyzePullRequestWithAiProps {
  pr: GitHubPullRequest
  files: GitHubPullRequestFile[]
  commits: GitHubPullRequestCommit[]
  selectedFilePaths: string[]
  disabled?: boolean
}

export function AnalyzePullRequestWithAi({
  pr,
  files,
  commits,
  selectedFilePaths,
  disabled = false
}: AnalyzePullRequestWithAiProps) {
  const { t } = useTranslation()
  const aiEnabled = useAiEnabled()
  const aiFill = useAiFill()
  const showToast = useToastStore((s) => s.show)
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<AiAnalyzePullRequestResult | null>(null)
  const [chatMessages, setChatMessages] = useState<AiChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [refining, setRefining] = useState(false)
  const [activeScopeKey, setActiveScopeKey] = useState<string | null>(null)

  const allFilePaths = useMemo(() => files.map((file) => file.path), [files])
  const hasFiles = allFilePaths.length > 0

  const selectedScope = useMemo(
    () => resolvePullRequestAnalysisScope(allFilePaths, selectedFilePaths),
    [allFilePaths, selectedFilePaths]
  )

  const scopeLabel = useMemo(() => {
    if (selectedScope.scope === 'full') {
      return t('detail.pullRequest.aiScopeFull', { count: selectedScope.filePaths.length })
    }
    return t('detail.pullRequest.aiScopePartial', {
      count: selectedScope.filePaths.length,
      total: allFilePaths.length
    })
  }, [allFilePaths.length, selectedScope, t])

  const baseContext = useMemo(
    () =>
      buildPullRequestAnalysisContext(
        pr,
        files,
        commits,
        selectedScope.scope,
        selectedScope.filePaths
      ),
    [commits, files, pr, selectedScope]
  )

  if (!aiEnabled || !hasFiles) {
    return null
  }

  function buildScopeKey(scope = selectedScope) {
    return pullRequestAnalysisScopeKey(pr.number, scope.scope, scope.filePaths)
  }

  async function runAnalysis(scope = selectedScope) {
    const scopeKey = buildScopeKey(scope)
    setOpen(true)
    setResult(null)
    setChatMessages([])
    setChatInput('')
    setActiveScopeKey(scopeKey)

    try {
      const text = await aiFill.mutateAsync({
        purpose: 'analyze_pull_request',
        context: buildPullRequestAnalysisContext(pr, files, commits, scope.scope, scope.filePaths)
      })
      setResult(parseAnalyzePullRequestResponse(text))
    } catch (error) {
      setOpen(false)
      setActiveScopeKey(null)
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  async function handleAnalyzeSelected() {
    if (selectedFilePaths.length === 0) {
      showToast(t('detail.pullRequest.aiSelectFiles'), 'error')
      return
    }
    await runAnalysis(selectedScope)
  }

  async function handleSendChat() {
    const message = chatInput.trim()
    if (!message || !result || aiFill.isPending || refining) {
      return
    }

    const history = chatMessages
    setChatInput('')
    setChatMessages((current) => [...current, { role: 'user', content: message }])
    setRefining(true)

    try {
      const context: AiFillContext = {
        ...baseContext,
        pullRequestAnalysis: result,
        chatHistory: history,
        userMessage: message
      }
      const text = await aiFill.mutateAsync({
        purpose: 'refine_pull_request_analysis',
        context
      })
      const refined = parseRefinePullRequestAnalysisResponse(text)
      setResult(refined.analysis)
      setChatMessages((current) => [...current, { role: 'assistant', content: refined.message }])
    } catch (error) {
      setChatMessages(history)
      setChatInput(message)
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setRefining(false)
    }
  }

  const aiBusy = aiFill.isPending
  const busy = aiBusy || refining
  const currentScopeKey = buildScopeKey()
  const scopeChanged = activeScopeKey != null && activeScopeKey !== currentScopeKey

  return (
    <>
      <AiActionButton
        variant="toolbar"
        disabled={disabled || aiBusy}
        loading={aiBusy && !open}
        onClick={() => void runAnalysis()}
        title={aiBusy ? t('detail.pullRequest.aiAnalyzing') : t('detail.pullRequest.analyzeWithAi')}
      >
        {aiBusy && !open ? t('detail.pullRequest.aiAnalyzing') : t('detail.pullRequest.analyzeWithAi')}
      </AiActionButton>

      {selectedFilePaths.length > 0 && selectedScope.scope === 'partial' ? (
        <AiActionButton
          variant="toolbar"
          disabled={disabled || aiBusy}
          loading={aiBusy && open}
          onClick={() => void handleAnalyzeSelected()}
          title={t('detail.pullRequest.analyzeSelectedWithAi', { count: selectedFilePaths.length })}
        >
          {t('detail.pullRequest.analyzeSelectedWithAi', { count: selectedFilePaths.length })}
        </AiActionButton>
      ) : null}

      <Modal
        open={open}
        title={t('detail.pullRequest.analyzeWithAiTitle')}
        onClose={() => setOpen(false)}
        size="xl"
      >
        <p className="mb-4 text-sm text-gf-fg-muted">{scopeLabel}</p>

        {scopeChanged ? (
          <p className="mb-4 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {t('detail.pullRequest.aiScopeChanged')}
          </p>
        ) : null}

        {aiBusy && !result && !refining ? (
          <div className="flex items-center gap-2 py-8 text-sm text-gf-fg-muted">
            <Spinner size="sm" />
            {t('detail.pullRequest.aiAnalyzingPullRequest')}
          </div>
        ) : result ? (
          <div className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto pr-1">
            <div className="space-y-3 rounded border border-gf-border-strong bg-gf-bg-deep p-3">
              <AnalysisSection title={t('detail.pullRequest.aiSummary')} content={result.summary} />
              <AnalysisSection title={t('detail.pullRequest.aiKeyChanges')} content={result.keyChanges} />
              <AnalysisSection title={t('detail.pullRequest.aiRisks')} content={result.risks} />
              <AnalysisSection title={t('detail.pullRequest.aiReviewFocus')} content={result.reviewFocus} />
              <AnalysisSection title={t('detail.pullRequest.aiTestingNotes')} content={result.testingNotes} />
            </div>

            <AiPromptChat
              labels={{
                title: t('detail.pullRequest.aiChatTitle'),
                hint: t('detail.pullRequest.aiChatHint'),
                emptyMessage: t('detail.pullRequest.aiChatEmpty'),
                placeholder: t('detail.pullRequest.aiChatPlaceholder'),
                sendLabel: t('detail.pullRequest.aiChatSend'),
                youLabel: t('detail.pullRequest.aiChatYou'),
                assistantLabel: t('detail.pullRequest.aiChatAssistant'),
                thinkingLabel: t('detail.pullRequest.aiChatThinking')
              }}
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
                {t('detail.pullRequest.aiAnalyzeAgain')}
              </ActionButton>
              <ActionButton variant="primary" onClick={() => setOpen(false)}>
                {t('common.close')}
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
