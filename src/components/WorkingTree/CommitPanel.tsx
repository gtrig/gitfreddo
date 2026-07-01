import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { ChevronDoubleRightIcon } from '@heroicons/react/24/solid'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useLogGraph } from '@/hooks/useGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { commitMessageBody } from '@/lib/fileTree'
import type { GitWorkingStatus } from '@/lib/types'
import { Spinner } from '@/components/ui/Spinner'
import { SidebarIconChevron } from '@/components/layout/sidebar/SidebarIcons'
import { ComposeCommitsModal } from '@/components/WorkingTree/ComposeCommitsModal'
import { parseComposeCommitsResponse, type AiComposeCommitProposal } from '../../../shared/ai'

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
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { data: graph } = useLogGraph(connected)
  const { commit, stageAdd } = useGitMutations()
  const aiEnabled = useAiEnabled()
  const aiFill = useAiFill()
  const showToast = useToastStore((s) => s.show)

  const [expanded, setExpanded] = useState(true)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [amend, setAmend] = useState(false)
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeProposals, setComposeProposals] = useState<AiComposeCommitProposal[]>([])
  const [sign, setSign] = useState(false)

  const gpgSignQuery = useQuery({
    queryKey: ['repo', repoPath, 'config.get', 'commit.gpgsign'],
    queryFn: async () =>
      (await window.gitfredo.invoke('config.get', {
        key: 'commit.gpgsign',
        scope: 'local'
      })) as string | null,
    enabled: connected && Boolean(repoPath)
  })

  useEffect(() => {
    const value = gpgSignQuery.data?.trim().toLowerCase()
    if (value === 'true' || value === '1' || value === 'yes' || value === 'on') {
      setSign(true)
    }
  }, [gpgSignQuery.data])

  const unstagedFiles = useMemo(
    () => [...working.unstaged, ...working.untracked, ...working.conflicted],
    [working.unstaged, working.untracked, working.conflicted]
  )
  const hasUnstaged = unstagedFiles.length > 0
  const hasStaged = working.staged.length > 0
  const headCommit = graph?.commits[0]

  const stagedPaths = useMemo(() => working.staged.map((file) => file.path), [working.staged])
  const allChangedPaths = useMemo(
    () => [...unstagedFiles, ...working.staged].map((file) => file.path),
    [unstagedFiles, working.staged]
  )

  useEffect(() => {
    if (!amend || !headCommit) return
    setSummary(headCommit.subject)
    setDescription(commitMessageBody(headCommit.message, headCommit.subject))
  }, [amend, headCommit])

  const busy = commit.isPending || stageAdd.isPending
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
      showToast('Stage files before composing commits with AI.', 'error')
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
      showToast('Enter a commit summary.', 'error')
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
  }

  const wantsStage = !hasStaged && hasUnstaged
  const wantsCommit = hasStaged || amend

  const primaryLabel = wantsStage
    ? 'Stage Changes to Commit'
    : hasStaged
      ? `Commit ${working.staged.length} file${working.staged.length === 1 ? '' : 's'}`
      : amend
        ? 'Amend previous commit'
        : 'Commit'

  const primaryDisabled = busy || (!wantsStage && !wantsCommit) || (wantsCommit && !wantsStage && !summary.trim())

  return (
    <div className="shrink-0 border-t border-gf-border bg-gf-bg-deep">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gf-fg-muted hover:bg-gf-surface-hover/50"
      >
        <Chevron open={expanded} />
        <span>Commit</span>
      </button>

      {expanded && (
        <div className="space-y-2 px-3 pb-2">
          <label className="flex items-center gap-2 text-xs text-gf-fg-muted">
            <input
              type="checkbox"
              checked={amend}
              onChange={(e) => setAmend(e.target.checked)}
              className="rounded border-gf-border-strong bg-gf-bg"
            />
            Amend previous commit
          </label>

          <div className="relative">
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Commit summary"
              className="w-full rounded border border-gf-border-strong bg-gf-bg px-2.5 py-1.5 pr-16 text-sm text-gf-fg outline-none placeholder:text-gf-fg-subtle focus:border-gf-accent"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              <span
                className={`text-[10px] tabular-nums ${subjectRemaining < 0 ? 'text-red-400' : 'text-gf-fg-subtle'}`}
              >
                {subjectRemaining}
              </span>
              {aiEnabled && (
                <button
                  type="button"
                  onClick={() => void handleAiFillSummary()}
                  disabled={aiFill.isPending}
                  aria-label="Fill summary with AI"
                  title="Fill with AI"
                  className="flex h-5 w-5 items-center justify-center rounded text-violet-400 hover:bg-gf-surface-hover disabled:opacity-40"
                >
                  <SparklesIcon className={`h-3 w-3 ${aiFill.isPending ? 'animate-pulse' : ''}`} aria-hidden />
                </button>
              )}
            </div>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            className="w-full resize-none rounded border border-gf-border-strong bg-gf-bg px-2.5 py-1.5 text-sm text-gf-fg outline-none placeholder:text-gf-fg-subtle focus:border-gf-accent"
          />

          <button
            type="button"
            onClick={() => setOptionsOpen((open) => !open)}
            className="flex items-center gap-1 text-[11px] text-gf-fg-subtle hover:text-gf-fg-muted"
          >
            <Chevron open={optionsOpen} />
            Commit options
          </button>

          {optionsOpen && (
            <label className="flex items-center gap-2 pl-4 text-[11px] text-gf-fg-muted">
              <input
                type="checkbox"
                checked={sign}
                onChange={(event) => setSign(event.target.checked)}
                className="rounded border-gf-border-strong bg-gf-bg"
              />
              Sign commit (GPG)
            </label>
          )}

          {aiEnabled && hasStaged && (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={aiFill.isPending}
                onClick={() => void handleComposeWithAi()}
                className="inline-flex items-center gap-1.5 rounded-md border border-transparent bg-gf-bg px-3 py-1 text-xs text-gf-fg-muted [background-image:linear-gradient(var(--gf-bg),var(--gf-bg)),linear-gradient(90deg,#a78bfa,#38bdf8)] [background-origin:border-box] [background-clip:padding-box,border-box] hover:text-gf-fg disabled:opacity-50"
              >
                <SparklesIcon className="h-3 w-3 text-violet-400" aria-hidden />
                {aiFill.isPending ? 'Composing…' : 'Compose commits with AI'}
              </button>
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

      <div className="border-t border-gf-border px-3 py-2">
        <button
          type="button"
          disabled={primaryDisabled}
          onClick={() => void handlePrimaryAction()}
          className="inline-flex w-full items-center justify-center gap-2 rounded border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-950/70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Spinner size="sm" className="border-emerald-400/30 border-t-emerald-300" /> : <ChevronDoubleRightIcon className="h-4 w-4" aria-hidden />}
          {busy ? 'Working…' : primaryLabel}
        </button>
      </div>
    </div>
  )
}
