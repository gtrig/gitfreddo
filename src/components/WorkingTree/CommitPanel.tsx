import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArchiveBoxIcon } from '@heroicons/react/24/outline'
import { Checkbox } from '@/components/Ui/Modal'
import { AiActionButton } from '@/components/Ui/AiActionButton'
import { ChevronDoubleRightIcon } from '@heroicons/react/24/solid'
import { useAiEnabled, useResolvedRemote } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useGitMutations } from '@/hooks/useGitMutations'
import { usePushRemote } from '@/hooks/usePushRemote'
import { useLogGraph } from '@/hooks/useGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useLayoutStore } from '@/stores/layout'
import { useToastStore } from '@/stores/toast'
import { commitMessageBody } from '@/lib/workspace/fileTree'
import type { GitWorkingStatus } from '@/lib/types'
import { Spinner } from '@/components/Ui/Spinner'
import { RowResizeHandle } from '@/components/Ui/RowResizeHandle'
import { SidebarIconChevron } from '@/components/Layout/sidebar/SidebarIcons'
import { PushForceConfirm } from '@/components/Layout/PushForceConfirm'
import { ComposeCommitsModal } from '@/components/WorkingTree/ComposeCommitsModal'
import { StashPushModal } from '@/components/Stash/StashPushModal'
import { parseComposeCommitsResponse, type AiComposeCommitProposal } from '@shared/ai'

const SUBJECT_MAX = 72

function Chevron({ open }: { open: boolean }) {
  return <SidebarIconChevron open={open} className="h-3 w-3 shrink-0 text-gf-fg-subtle" />
}

function buildCommitMessage(summary: string, description: string): string {
  const subject = summary.trim()
  const body = description.trim()
  if (!body) return subject
  return `${subject}\n\n${body}`
}

function parseCommitMessage(text: string): { summary: string; description: string } {
  const trimmed = text.trim()
  const split = trimmed.split(/\n\n/)
  const summary = split[0]?.trim() ?? ''
  const description = split.slice(1).join('\n\n').trim()
  return { summary, description }
}

interface CommitPanelProps {
  working: GitWorkingStatus
}

export function CommitPanel({ working }: CommitPanelProps) {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { data: graph } = useLogGraph(connected)
  const { commit, stageAdd, stashPush } = useGitMutations()
  const { pushRemote, isPushPending, forceConfirm, confirmForcePush, cancelForcePush } =
    usePushRemote()
  const defaultRemote = useResolvedRemote()
  const aiEnabled = useAiEnabled()
  const aiFill = useAiFill()
  const showToast = useToastStore((s) => s.show)
  const commitPanelHeight = useLayoutStore((s) => s.commitPanelHeight)
  const adjustCommitPanelHeight = useLayoutStore((s) => s.adjustCommitPanelHeight)

  const [expanded, setExpanded] = useState(true)
  const [resizing, setResizing] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [amend, setAmend] = useState(false)
  const [pushAfterCommit, setPushAfterCommit] = useState(false)
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeProposals, setComposeProposals] = useState<AiComposeCommitProposal[]>([])
  const [stashOpen, setStashOpen] = useState(false)
  const [sign, setSign] = useState(false)

  const gpgSignQuery = useQuery({
    queryKey: ['repo', repoPath, 'config.get', 'commit.gpgsign'],
    queryFn: async () =>
      (await window.gitfreddo.invoke('config.get', {
        key: 'commit.gpgsign',
        scope: 'local'
      })) as string | null,
    enabled: connected && Boolean(repoPath)
  })

  useEffect(() => {
    if (gpgSignQuery.data === undefined) return
    const value = gpgSignQuery.data?.trim().toLowerCase()
    setSign(value === 'true' || value === '1' || value === 'yes' || value === 'on')
  }, [gpgSignQuery.data])

  const unstagedFiles = useMemo(
    () => [...working.unstaged, ...working.untracked, ...working.conflicted],
    [working.unstaged, working.untracked, working.conflicted]
  )
  const hasUnstaged = unstagedFiles.length > 0
  const hasStaged = working.staged.length > 0
  const hasChanges = hasStaged || hasUnstaged
  const headCommit = graph?.commits[0]

  const stagedPaths = useMemo(() => working.staged.map((file) => file.path), [working.staged])
  const allChangedPaths = useMemo(
    () => [...unstagedFiles, ...working.staged].map((file) => file.path),
    [unstagedFiles, working.staged]
  )

  // Track which commit hash we've already seeded so that graph refetches
  // (which produce a new headCommit object but the same hash) do not
  // overwrite the user's in-progress amend text.
  const seededAmendHashRef = useRef<string | null>(null)
  useEffect(() => {
    if (!amend || !headCommit) {
      seededAmendHashRef.current = null
      return
    }
    if (seededAmendHashRef.current === headCommit.hash) return
    seededAmendHashRef.current = headCommit.hash
    setSummary(headCommit.subject)
    setDescription(commitMessageBody(headCommit.message, headCommit.subject))
  }, [amend, headCommit])

  const busy = commit.isPending || stageAdd.isPending || stashPush.isPending || isPushPending
  const subjectRemaining = SUBJECT_MAX - summary.length

  async function handleAiFillSummary() {
    try {
      const text = await aiFill.mutateAsync({
        purpose: 'commit_message',
        context: {
          filePaths: hasStaged ? stagedPaths : allChangedPaths,
          branch: working.branch,
          currentText: buildCommitMessage(summary, description)
        }
      })
      const parsed = parseCommitMessage(text)
      setSummary(parsed.summary)
      setDescription(parsed.description)
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  async function handleComposeWithAi() {
    if (!hasStaged) {
      showToast(t('workingTree.stageBeforeCompose'), 'error')
      return
    }

    try {
      const text = await aiFill.mutateAsync({
        purpose: 'compose_commits',
        context: {
          filePaths: stagedPaths,
          branch: working.branch
        }
      })
      const proposals = parseComposeCommitsResponse(text, stagedPaths)
      setComposeProposals(proposals)
      setComposeOpen(true)
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  function handleUseProposalInPanel(proposal: AiComposeCommitProposal) {
    setSummary(proposal.summary)
    setDescription(proposal.description)
    setAmend(false)
  }

  async function handlePrimaryAction() {
    if (!hasStaged && hasUnstaged) {
      await stageAdd.mutateAsync({ paths: [] })
      return
    }

    if (!summary.trim()) {
      showToast(t('workingTree.enterCommitSummary'), 'error')
      return
    }

    await commit.mutateAsync({
      message: buildCommitMessage(summary, description),
      amend,
      ...(sign ? { sign: true } : {})
    })
    setSummary('')
    setDescription('')
    setAmend(false)

    if (pushAfterCommit) {
      pushRemote({ remote: defaultRemote })
    }
  }

  function handleCreateStash() {
    if (!hasChanges) {
      showToast(t('workingTree.noChangesToStash'), 'error')
      return
    }
    setStashOpen(true)
  }

  const wantsStage = !hasStaged && hasUnstaged
  const wantsCommit = hasStaged || amend

  const primaryLabel = wantsStage
    ? t('workingTree.stageChangesToCommit')
    : hasStaged
      ? t('workingTree.commitFiles', { count: working.staged.length })
      : amend
        ? t('workingTree.amendPreviousCommit')
        : t('workingTree.commitAction')

  const primaryDisabled = busy || (!wantsStage && !wantsCommit) || (wantsCommit && !wantsStage && !summary.trim())

  const onCommitPanelResize = useCallback(
    (delta: number) => {
      adjustCommitPanelHeight(delta)
    },
    [adjustCommitPanelHeight]
  )

  return (
    <div
      data-testid="commit-panel"
      className={`flex shrink-0 flex-col border-t border-gf-border bg-gf-bg-deep ${
        resizing ? 'select-none' : ''
      }`}
      style={expanded ? { height: commitPanelHeight } : undefined}
    >
      {expanded && (
        <RowResizeHandle
          onDrag={onCommitPanelResize}
          onResizeStart={() => setResizing(true)}
          onResizeEnd={() => setResizing(false)}
        />
      )}
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full shrink-0 items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gf-fg-muted hover:bg-gf-surface-hover/50"
      >
        <Chevron open={expanded} />
        <span>{t('workingTree.commit')}</span>
      </button>

      {expanded && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-2">
          <label className="flex shrink-0 items-center gap-2 text-xs text-gf-fg-muted">
            <Checkbox checked={amend} onChange={(e) => setAmend(e.target.checked)} />
            {t('workingTree.amendPrevious')}
          </label>

          <div className="relative shrink-0">
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t('workingTree.commitSummary')}
              className="w-full rounded border border-gf-border-strong bg-gf-bg px-2.5 py-1.5 pr-16 text-sm text-gf-fg outline-none placeholder:text-gf-fg-subtle focus:border-gf-accent"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              <span
                className={`text-[10px] tabular-nums ${subjectRemaining < 0 ? 'text-red-400' : 'text-gf-fg-subtle'}`}
              >
                {subjectRemaining}
              </span>
              {aiEnabled && (
                <AiActionButton
                  variant="icon"
                  onClick={() => void handleAiFillSummary()}
                  disabled={aiFill.isPending}
                  loading={aiFill.isPending}
                  aria-label={t('workingTree.fillSummaryWithAi')}
                  title={t('workingTree.fillWithAi')}
                />
              )}
            </div>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('workingTree.description')}
            className="min-h-16 w-full flex-1 resize-none rounded border border-gf-border-strong bg-gf-bg px-2.5 py-1.5 text-sm text-gf-fg outline-none placeholder:text-gf-fg-subtle focus:border-gf-accent"
          />

          <button
            type="button"
            onClick={() => setOptionsOpen((open) => !open)}
            className="flex shrink-0 items-center gap-1 text-[11px] text-gf-fg-subtle hover:text-gf-fg-muted"
          >
            <Chevron open={optionsOpen} />
            {t('workingTree.commitOptions')}
          </button>

          {optionsOpen && (
            <div className="shrink-0 space-y-1.5 pl-4">
              <label className="flex items-center gap-2 text-[11px] text-gf-fg-muted">
                <Checkbox checked={sign} onChange={(event) => setSign(event.target.checked)} />
                {t('workingTree.signCommit')}
              </label>
              <label className="flex items-center gap-2 text-[11px] text-gf-fg-muted">
                <Checkbox
                  checked={pushAfterCommit}
                  onChange={(event) => setPushAfterCommit(event.target.checked)}
                />
                {t('workingTree.pushAfterCommit')}
              </label>
            </div>
          )}

          {aiEnabled && hasStaged && (
            <div className="flex shrink-0 justify-end">
              <AiActionButton
                variant="detail"
                disabled={aiFill.isPending}
                loading={aiFill.isPending}
                onClick={() => void handleComposeWithAi()}
              >
                {aiFill.isPending ? t('workingTree.composing') : t('workingTree.composeCommitsWithAi')}
              </AiActionButton>
            </div>
          )}
        </div>
      )}

      <ComposeCommitsModal
        open={composeOpen}
        proposals={composeProposals}
        onClose={() => setComposeOpen(false)}
        onUseInPanel={handleUseProposalInPanel}
      />

      <PushForceConfirm
        params={forceConfirm}
        busy={isPushPending}
        onConfirm={confirmForcePush}
        onCancel={cancelForcePush}
      />

      <StashPushModal
        open={stashOpen}
        initialMessage={summary.trim()}
        onClose={() => {
          setStashOpen(false)
          if (summary.trim()) {
            setSummary('')
            setDescription('')
          }
        }}
      />

      <div className="shrink-0 space-y-2 border-t border-gf-border px-3 py-2">
        <button
          type="button"
          disabled={primaryDisabled}
          onClick={() => void handlePrimaryAction()}
          className="inline-flex w-full items-center justify-center gap-2 rounded border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-950/70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && (commit.isPending || stageAdd.isPending) ? (
            <Spinner size="sm" className="border-emerald-400/30 border-t-emerald-300" />
          ) : (
            <ChevronDoubleRightIcon className="h-4 w-4" aria-hidden />
          )}
          {commit.isPending || stageAdd.isPending ? t('workingTree.working') : primaryLabel}
        </button>
        <button
          type="button"
          disabled={busy || !hasChanges}
          onClick={() => handleCreateStash()}
          className="inline-flex w-full items-center justify-center gap-2 rounded border border-gf-border-strong bg-gf-bg px-3 py-1.5 text-xs font-medium text-gf-fg-muted hover:bg-gf-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {stashPush.isPending ? (
            <Spinner size="sm" />
          ) : (
            <ArchiveBoxIcon className="h-3.5 w-3.5" aria-hidden />
          )}
          {stashPush.isPending ? t('workingTree.stashing') : t('workingTree.createStash')}
        </button>
      </div>
    </div>
  )
}
