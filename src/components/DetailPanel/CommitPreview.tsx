import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline'
import { MinusIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/solid'
import { AiActionButton } from '@/components/Ui/AiActionButton'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useToastStore } from '@/stores/toast'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { RewordCommitModal } from '@/components/DetailPanel/RewordCommitModal'
import { ExplainCommitButton } from '@/components/DetailPanel/ExplainCommitWithAi'
import { CommitFileList } from '@/components/DetailPanel/CommitFileList'
import { commitMessageBody, countCommitFiles } from '@/lib/workspace/fileTree'
import { useCommitDisplayFiles } from '@/hooks/useCommitDisplayFiles'
import type { GitCommit } from '@/lib/types'

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}

function formatAuthoredDate(iso: string, t: (key: string, options?: Record<string, string>) => string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  return t('detail.authored', { date: day, time })
}

function ModifiedIcon({ className }: { className?: string }) {
  return <PencilSquareIcon aria-hidden className={className} />
}

function AddedIcon({ className }: { className?: string }) {
  return <PlusIcon aria-hidden className={className} />
}

function RemovedIcon({ className }: { className?: string }) {
  return <MinusIcon aria-hidden className={className} />
}

function FileChangeBadges({
  counts,
  t
}: {
  counts: ReturnType<typeof countCommitFiles>
  t: (key: string, options?: Record<string, number>) => string
}) {
  const items = [
    counts.changed > 0 ? (
      <span key="changed" className="inline-flex items-center gap-1 text-amber-400">
        <ModifiedIcon className="h-3.5 w-3.5" />
        {t('detail.modified', { count: counts.changed })}
      </span>
    ) : null,
    counts.added > 0 ? (
      <span key="added" className="inline-flex items-center gap-1 text-emerald-400">
        <AddedIcon className="h-3.5 w-3.5" />
        {t('detail.added', { count: counts.added })}
      </span>
    ) : null,
    counts.removed > 0 ? (
      <span key="removed" className="inline-flex items-center gap-1 text-rose-400">
        <RemovedIcon className="h-3.5 w-3.5" />
        {t('detail.deleted', { count: counts.removed })}
      </span>
    ) : null
  ].filter(Boolean)

  if (items.length === 0) return null
  return <span className="inline-flex flex-wrap items-center gap-3 text-xs">{items}</span>
}

function parseCommitMessage(text: string): { summary: string; description: string } {
  const trimmed = text.trim()
  const split = trimmed.split(/\n\n/)
  const summary = split[0]?.trim() ?? ''
  const description = split.slice(1).join('\n\n').trim()
  return { summary, description }
}

function CommitAiButton({
  commit,
  filePaths,
  fullMessage,
  onSuggestion
}: {
  commit: GitCommit
  filePaths: string[]
  fullMessage: string
  onSuggestion: (summary: string, description: string) => void
}) {
  const { t } = useTranslation()
  const aiEnabled = useAiEnabled()
  const aiFill = useAiFill()
  const pushToast = useToastStore((s) => s.show)

  if (!aiEnabled) return null

  const label = aiFill.isPending ? t('detail.recomposing') : t('detail.recomposeWithAi')

  return (
    <AiActionButton
      variant="detail"
      disabled={aiFill.isPending}
      loading={aiFill.isPending}
      title={label}
      onClick={() =>
        void aiFill
          .mutateAsync({
            purpose: 'recompose_commit',
            context: {
              commits: [
                {
                  hash: commit.hash,
                  shortHash: commit.shortHash,
                  subject: commit.subject,
                  message: fullMessage,
                  filePaths
                }
              ],
              currentText: fullMessage
            }
          })
          .then((text) => {
            if (text.trim()) {
              const parsed = parseCommitMessage(text)
              onSuggestion(parsed.summary, parsed.description)
            }
          })
          .catch((error) => {
            pushToast(error instanceof Error ? error.message : t('detail.aiSuggestionFailed'), 'error')
          })
      }
    >
      {label}
    </AiActionButton>
  )
}

export function CommitPreview({ commit }: { commit: GitCommit }) {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const selectedCommitFile = useSelectionStore((s) => s.selectedCommitFile)
  const setSelectedCommitFile = useSelectionStore((s) => s.setSelectedCommitFile)
  const openFileHistory = useSelectionStore((s) => s.openFileHistory)
  const openCommitDetail = useSelectionStore((s) => s.openCommitDetail)

  const [showAllFiles, setShowAllFiles] = useState(false)
  const [rewordOpen, setRewordOpen] = useState(false)
  const [rewordDraft, setRewordDraft] = useState<{ summary: string; description: string } | null>(
    null
  )

  const { files, loading, loadingAllFiles, error } = useCommitDisplayFiles(
    commit.hash,
    showAllFiles,
    connected && Boolean(repoPath)
  )

  const fullMessageQuery = useQuery({
    queryKey: ['repo', repoPath, 'log.message', commit.hash],
    queryFn: async () =>
      window.gitfreddo.invoke('log.message', { hash: commit.hash }) as Promise<string>,
    enabled: connected && Boolean(repoPath) && Boolean(commit.hash)
  })

  const fullMessage = fullMessageQuery.data ?? commit.message
  const changedOnly = useMemo(
    () => files.filter((file) => file.kind !== 'unchanged'),
    [files]
  )
  const counts = useMemo(() => countCommitFiles(changedOnly), [changedOnly])
  const body = useMemo(
    () => commitMessageBody(fullMessage, commit.subject),
    [fullMessage, commit.subject]
  )
  const parentHash = commit.parents[0]
  const parentShort = parentHash?.slice(0, 7) ?? null
  const totalChanges = counts.added + counts.changed + counts.removed

  const viewFirstChange = () => {
    const first = changedOnly[0]
    if (first) setSelectedCommitFile(first.path)
  }

  return (
    <div className="flex h-full flex-col border-l border-gf-border bg-gf-bg-deep">
      <div className="flex items-center justify-between border-b border-gf-border px-4 py-2.5">
        <p className="text-sm text-gf-fg-muted">
          {loading
            ? t('detail.loadingFileChanges')
            : error
              ? t('detail.couldNotLoadFileChanges')
              : t('detail.fileChangesInCommit', { count: totalChanges })}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={viewFirstChange}
            disabled={changedOnly.length === 0}
            className="rounded border border-gf-border-strong px-3 py-1 text-xs text-gf-fg-muted hover:bg-gf-surface disabled:opacity-40"
          >
            {t('detail.viewChanges')}
          </button>
          <button
            type="button"
            onClick={() => openCommitDetail(commit.hash)}
            className="rounded border border-gf-border-strong p-1 text-gf-fg-muted hover:bg-gf-surface"
            title={t('detail.openCommitDetail')}
            aria-label={t('detail.openCommitDetail')}
          >
            <ArrowsPointingOutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-gf-border px-4 py-2">
        <p className="font-mono text-xs text-gf-fg-subtle">
          {t('detail.commitLabel')}{' '}
          <span className="text-gf-fg-muted">{commit.shortHash}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRewordDraft(null)
              setRewordOpen(true)
            }}
            className="rounded border border-gf-border-strong px-3 py-1 text-xs text-gf-fg-muted hover:bg-gf-surface"
          >
            {t('detail.reword')}
          </button>
          <CommitAiButton
            commit={commit}
            filePaths={changedOnly.map((file) => file.path)}
            fullMessage={fullMessage}
            onSuggestion={(summary, description) => {
              setRewordDraft({ summary, description })
              setRewordOpen(true)
            }}
          />
          <ExplainCommitButton
            commits={[commit]}
            filePathsByHash={{ [commit.hash]: changedOnly.map((file) => file.path) }}
            variant="detail"
          />
        </div>
      </div>

      <RewordCommitModal
        commit={commit}
        fullMessage={fullMessage}
        initialDraft={rewordDraft}
        open={rewordOpen}
        onClose={() => {
          setRewordOpen(false)
          setRewordDraft(null)
        }}
      />

      <div className="border-b border-gf-border px-4 py-4">
        <h2 className="text-lg font-semibold leading-snug text-gf-fg">{commit.subject}</h2>
        {body && (
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gf-fg-subtle">{body}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-gf-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gf-surface text-xs font-semibold text-gf-fg-muted">
            {authorInitials(commit.author.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-gf-fg">{commit.author.name}</p>
            <p className="text-xs text-gf-fg-subtle">{formatAuthoredDate(commit.author.date, t)}</p>
          </div>
        </div>
        {parentShort && (
          <button
            type="button"
            onClick={() => parentHash && selectTimelineNode('commit', parentHash)}
            className="shrink-0 font-mono text-xs text-gf-fg-subtle hover:text-gf-accent-fg"
          >
            {t('detail.parent')}{' '}
            <span className="text-gf-fg-muted">{parentShort}</span>
          </button>
        )}
      </div>

      <div className="border-b border-gf-border px-4 py-2.5">
        <FileChangeBadges counts={counts} t={t} />
      </div>

      <CommitFileList
        files={files}
        loading={loading}
        error={error}
        selectedPath={selectedCommitFile}
        onSelectFile={setSelectedCommitFile}
        onFileHistory={openFileHistory}
        showAllFiles={showAllFiles}
        onShowAllFilesChange={setShowAllFiles}
        loadingAllFiles={loadingAllFiles}
        showBadges={false}
      />
    </div>
  )
}
