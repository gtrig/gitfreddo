import { useEffect, useMemo, useState } from 'react'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useLogGraph } from '@/hooks/useGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { commitMessageBody } from '@/lib/fileTree'
import type { GitWorkingStatus } from '@/lib/types'
import { Spinner } from '@/components/ui/Spinner'

const SUBJECT_MAX = 72

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={`h-3 w-3 shrink-0 text-gf-fg-subtle transition-transform ${open ? 'rotate-90' : ''}`}
      fill="currentColor"
    >
      <path d="M6 4l4 4-4 4V4z" />
    </svg>
  )
}

function FourRayStarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <line x1="8" y1="1.5" x2="8" y2="14.5" />
      <line x1="1.5" y1="8" x2="14.5" y2="8" />
      <line x1="3.1" y1="3.1" x2="12.9" y2="12.9" />
      <line x1="12.9" y1="3.1" x2="3.1" y2="12.9" />
    </svg>
  )
}

function DoubleChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M5.5 3 10 8l-4.5 5V3zm4 0L14 8l-4.5 5V3z" />
    </svg>
  )
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
    setSummary('')
    setDescription('')
    await handleAiFillSummary()
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
      amend
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
                  <FourRayStarIcon className={`h-3 w-3 ${aiFill.isPending ? 'animate-pulse' : ''}`} />
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
            <p className="pl-4 text-[11px] text-gf-fg-subtle">No additional options yet.</p>
          )}

          {aiEnabled && (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={aiFill.isPending}
                onClick={() => void handleComposeWithAi()}
                className="inline-flex items-center gap-1.5 rounded-md border border-transparent bg-gf-bg px-3 py-1 text-xs text-gf-fg-muted [background-image:linear-gradient(var(--gf-bg),var(--gf-bg)),linear-gradient(90deg,#a78bfa,#38bdf8)] [background-origin:border-box] [background-clip:padding-box,border-box] hover:text-gf-fg disabled:opacity-50"
              >
                <FourRayStarIcon className="h-3 w-3 text-violet-400" />
                {aiFill.isPending ? 'Composing…' : 'Compose commits with AI'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-gf-border px-3 py-2">
        <button
          type="button"
          disabled={primaryDisabled}
          onClick={() => void handlePrimaryAction()}
          className="inline-flex w-full items-center justify-center gap-2 rounded border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-950/70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Spinner size="sm" className="border-emerald-400/30 border-t-emerald-300" /> : <DoubleChevronIcon className="h-4 w-4" />}
          {busy ? 'Working…' : primaryLabel}
        </button>
      </div>
    </div>
  )
}
