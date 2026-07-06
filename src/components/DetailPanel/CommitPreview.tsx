import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowsUpDownIcon, MinusIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/solid'
import { AiActionButton } from '@/components/Ui/AiActionButton'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useToastStore } from '@/stores/toast'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { RewordCommitModal } from '@/components/DetailPanel/RewordCommitModal'
import { ExplainCommitButton } from '@/components/DetailPanel/ExplainCommitWithAi'
import {
  buildFileTree,
  collectFolderPaths,
  commitMessageBody,
  countCommitFiles,
  sortCommitFiles,
  type CommitFileCounts,
  type FileTreeFolder,
  type FileTreeNode
} from '@/lib/workspace/fileTree'
import { commitFileKindColor } from '@/lib/git/commitFiles'
import type { CommitFileItem, GitCommit } from '@/lib/types'
import { ContextMenu } from '@/components/Ui/ContextMenu'
import { SidebarIconChevron } from '@/components/Layout/sidebar/SidebarIcons'
import { useContextMenu, type OpenContextMenu } from '@/hooks/useContextMenu'
import { commitFileContextMenuItems, commitFolderContextMenuItems } from '@/lib/context-menus/detailPanelContextMenus'

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
  compact = false,
  t
}: {
  counts: CommitFileCounts
  compact?: boolean
  t: (key: string, options?: Record<string, number>) => string
}) {
  const items = [
    counts.changed > 0 ? (
      <span key="changed" className="inline-flex items-center gap-1 text-amber-400">
        <ModifiedIcon className="h-3.5 w-3.5" />
        {compact ? counts.changed : t('detail.modified', { count: counts.changed })}
      </span>
    ) : null,
    counts.added > 0 ? (
      <span key="added" className="inline-flex items-center gap-1 text-emerald-400">
        <AddedIcon className="h-3.5 w-3.5" />
        {compact ? counts.added : t('detail.added', { count: counts.added })}
      </span>
    ) : null,
    counts.removed > 0 ? (
      <span key="removed" className="inline-flex items-center gap-1 text-rose-400">
        <RemovedIcon className="h-3.5 w-3.5" />
        {compact ? counts.removed : t('detail.deleted', { count: counts.removed })}
      </span>
    ) : null
  ].filter(Boolean)

  if (items.length === 0) return null
  return <span className="inline-flex flex-wrap items-center gap-3 text-xs">{items}</span>
}

function Chevron({ open }: { open: boolean }) {
  return <SidebarIconChevron open={open} className="h-3 w-3 shrink-0 text-gf-fg-subtle" />
}

function parseCommitMessage(text: string): { summary: string; description: string } {
  const trimmed = text.trim()
  const split = trimmed.split(/\n\n/)
  const summary = split[0]?.trim() ?? ''
  const description = split.slice(1).join('\n\n').trim()
  return { summary, description }
}

function CommitAiButton({
  filePaths,
  fullMessage,
  onSuggestion
}: {
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
            purpose: 'commit_message',
            context: {
              filePaths,
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

function PathFileRow({
  file,
  selected,
  onSelect,
  openMenu,
  onFileHistory,
  t
}: {
  file: CommitFileItem
  selected: boolean
  onSelect: () => void
  openMenu: OpenContextMenu
  onFileHistory: (path: string) => void
  t: TFunction
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onContextMenu={(event) =>
        openMenu(
          event,
          commitFileContextMenuItems(
            file.path,
            file.path.split('/').pop() ?? file.path,
            onSelect,
            () => onFileHistory(file.path),
            t
          )
        )
      }
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gf-surface-hover ${
        selected ? 'bg-gf-surface text-gf-fg' : 'text-gf-fg-muted'
      }`}
    >
      <span className={`shrink-0 ${commitFileKindColor(file.kind)}`}>
        {file.kind === 'added' ? <AddedIcon className="h-3.5 w-3.5" /> : null}
        {file.kind === 'changed' ? <ModifiedIcon className="h-3.5 w-3.5" /> : null}
        {file.kind === 'removed' ? <RemovedIcon className="h-3.5 w-3.5" /> : null}
      </span>
      <span className="min-w-0 truncate font-mono text-xs">{file.path}</span>
    </button>
  )
}

function TreeNodeRow({
  node,
  depth,
  expandedPaths,
  selectedPath,
  onSelectFile,
  onToggleFolder,
  isExpanded,
  openMenu,
  onFileHistory,
  t
}: {
  node: FileTreeNode
  depth: number
  expandedPaths: Set<string>
  selectedPath: string | null
  onSelectFile: (path: string) => void
  onToggleFolder: (path: string) => void
  isExpanded: (path: string) => boolean
  openMenu: OpenContextMenu
  onFileHistory: (path: string) => void
  t: TFunction
}) {
  if (node.type === 'folder') {
    const open = isExpanded(node.path)
    return (
      <>
        <button
          type="button"
          onClick={() => onToggleFolder(node.path)}
          onContextMenu={(event) =>
            openMenu(
              event,
              commitFolderContextMenuItems(node.path, open, () => onToggleFolder(node.path), t)
            )
          }
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gf-fg-muted hover:bg-gf-surface-hover"
          style={{ paddingLeft: 12 + depth * 14 }}
        >
          <Chevron open={open} />
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
          <FileChangeBadges counts={node.counts} compact t={t} />
        </button>
        {open &&
          node.children.map((child) => (
            <TreeNodeRow
              key={child.type === 'folder' ? child.path : child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              onToggleFolder={onToggleFolder}
              isExpanded={isExpanded}
              openMenu={openMenu}
              onFileHistory={onFileHistory}
              t={t}
            />
          ))}
      </>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelectFile(node.path)}
      onContextMenu={(event) =>
        openMenu(
          event,
          commitFileContextMenuItems(
            node.path,
            node.name,
            () => onSelectFile(node.path),
            () => onFileHistory(node.path),
            t
          )
        )
      }
      className={`flex w-full items-center gap-2 py-1.5 text-left text-sm hover:bg-gf-surface-hover ${
        selectedPath === node.path ? 'bg-gf-surface text-gf-fg' : 'text-gf-fg-muted'
      }`}
      style={{ paddingLeft: 28 + depth * 14 }}
    >
      <span className={`shrink-0 ${commitFileKindColor(node.kind)}`}>
        {node.kind === 'added' ? <AddedIcon className="h-3.5 w-3.5" /> : null}
        {node.kind === 'changed' ? <ModifiedIcon className="h-3.5 w-3.5" /> : null}
        {node.kind === 'removed' ? <RemovedIcon className="h-3.5 w-3.5" /> : null}
      </span>
      <span className="min-w-0 truncate font-mono text-xs">{node.name}</span>
    </button>
  )
}

function FileTreeList({
  root,
  selectedPath,
  onSelectFile,
  expandedPaths,
  onToggleFolder,
  openMenu,
  onFileHistory,
  t
}: {
  root: FileTreeFolder
  selectedPath: string | null
  onSelectFile: (path: string) => void
  expandedPaths: Set<string>
  onToggleFolder: (path: string) => void
  openMenu: OpenContextMenu
  onFileHistory: (path: string) => void
  t: TFunction
}) {
  const isExpanded = (path: string) => expandedPaths.has(path)

  return (
    <div className="py-1">
      {root.children.map((child) => (
        <TreeNodeRow
          key={child.type === 'folder' ? child.path : child.path}
          node={child}
          depth={0}
          expandedPaths={expandedPaths}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          onToggleFolder={onToggleFolder}
          isExpanded={isExpanded}
          openMenu={openMenu}
          onFileHistory={onFileHistory}
          t={t}
        />
      ))}
    </div>
  )
}

export function CommitPreview({
  commit,
  changedFiles,
  loadingFiles,
  filesError
}: {
  commit: GitCommit
  changedFiles: CommitFileItem[]
  loadingFiles: boolean
  filesError?: Error | null
}) {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const selectedCommitFile = useSelectionStore((s) => s.selectedCommitFile)
  const setSelectedCommitFile = useSelectionStore((s) => s.setSelectedCommitFile)
  const openFileHistory = useSelectionStore((s) => s.openFileHistory)

  const [viewMode, setViewMode] = useState<'path' | 'tree'>('tree')
  const [sortAscending, setSortAscending] = useState(true)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set())
  const [rewordOpen, setRewordOpen] = useState(false)
  const [rewordDraft, setRewordDraft] = useState<{ summary: string; description: string } | null>(
    null
  )
  const { state: menuState, openMenu, closeMenu } = useContextMenu()

  const fullMessageQuery = useQuery({
    queryKey: ['repo', repoPath, 'log.message', commit.hash],
    queryFn: async () =>
      window.gitfreddo.invoke('log.message', { hash: commit.hash }) as Promise<string>,
    enabled: connected && Boolean(repoPath) && Boolean(commit.hash)
  })

  const fullMessage = fullMessageQuery.data ?? commit.message
  const counts = useMemo(() => countCommitFiles(changedFiles), [changedFiles])
  const sortedFiles = useMemo(
    () => sortCommitFiles(changedFiles, sortAscending),
    [changedFiles, sortAscending]
  )
  const fileTree = useMemo(
    () => buildFileTree(changedFiles, sortAscending),
    [changedFiles, sortAscending]
  )
  const body = useMemo(
    () => commitMessageBody(fullMessage, commit.subject),
    [fullMessage, commit.subject]
  )
  const parentHash = commit.parents[0]
  const parentShort = parentHash?.slice(0, 7) ?? null
  const totalChanges = counts.added + counts.changed + counts.removed

  const toggleFolder = (path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const expandAll = () => {
    setExpandedPaths(new Set(collectFolderPaths(fileTree)))
  }

  const viewFirstChange = () => {
    const first = sortedFiles[0]
    if (first) setSelectedCommitFile(first.path)
  }

  return (
    <div className="flex h-full flex-col border-l border-gf-border bg-gf-bg-deep">
      <div className="flex items-center justify-between border-b border-gf-border px-4 py-2.5">
        <p className="text-sm text-gf-fg-muted">
          {loadingFiles
            ? t('detail.loadingFileChanges')
            : filesError
              ? t('detail.couldNotLoadFileChanges')
              : t('detail.fileChangesInCommit', { count: totalChanges })}
        </p>
        <button
          type="button"
          onClick={viewFirstChange}
          disabled={sortedFiles.length === 0}
          className="rounded border border-gf-border-strong px-3 py-1 text-xs text-gf-fg-muted hover:bg-gf-surface disabled:opacity-40"
        >
          {t('detail.viewChanges')}
        </button>
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
            filePaths={changedFiles.map((file) => file.path)}
            fullMessage={fullMessage}
            onSuggestion={(summary, description) => {
              setRewordDraft({ summary, description })
              setRewordOpen(true)
            }}
          />
          <ExplainCommitButton
            commits={[commit]}
            filePathsByHash={{ [commit.hash]: changedFiles.map((file) => file.path) }}
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

      <div className="flex items-center justify-between gap-2 border-b border-gf-border px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortAscending((value) => !value)}
            className="rounded p-1 text-gf-fg-subtle hover:bg-gf-surface-hover hover:text-gf-fg-muted"
            title={sortAscending ? t('detail.sortedAsc') : t('detail.sortedDesc')}
          >
            <ArrowsUpDownIcon className="h-4 w-4" aria-hidden />
          </button>
          <div className="flex rounded-md border border-gf-border-strong p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('path')}
              className={`rounded px-2 py-0.5 ${
                viewMode === 'path' ? 'bg-gf-accent text-white' : 'text-gf-fg-subtle hover:text-gf-fg-muted'
              }`}
            >
              {t('detail.path')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`rounded px-2 py-0.5 ${
                viewMode === 'tree' ? 'bg-gf-accent text-white' : 'text-gf-fg-subtle hover:text-gf-fg-muted'
              }`}
            >
              {t('detail.tree')}
            </button>
          </div>
        </div>
        {viewMode === 'tree' && (
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-gf-accent-fg hover:text-gf-fg"
          >
            {t('detail.expandAll')}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loadingFiles && <p className="px-4 py-3 text-sm text-gf-fg-subtle">{t('detail.loadingFiles')}</p>}
        {!loadingFiles && filesError && (
          <p className="px-4 py-3 text-sm text-red-400">
            {filesError instanceof Error ? filesError.message : t('detail.failedToLoadCommitFiles')}
          </p>
        )}
        {!loadingFiles && !filesError && changedFiles.length === 0 && (
          <p className="px-4 py-3 text-sm text-gf-fg-subtle">{t('detail.noFileChanges')}</p>
        )}
        {!loadingFiles && !filesError && viewMode === 'path' && (
          <div className="py-1">
            {sortedFiles.map((file) => (
              <PathFileRow
                key={file.path}
                file={file}
                selected={selectedCommitFile === file.path}
                onSelect={() => setSelectedCommitFile(file.path)}
                openMenu={openMenu}
                onFileHistory={openFileHistory}
                t={t}
              />
            ))}
          </div>
        )}
        {!loadingFiles && !filesError && viewMode === 'tree' && (
          <FileTreeList
            root={fileTree}
            selectedPath={selectedCommitFile}
            onSelectFile={setSelectedCommitFile}
            expandedPaths={expandedPaths}
            onToggleFolder={toggleFolder}
            openMenu={openMenu}
            onFileHistory={openFileHistory}
            t={t}
          />
        )}
      </div>

      {menuState && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={menuState.items}
          onClose={closeMenu}
        />
      )}
    </div>
  )
}
