import { useMemo, useState } from 'react'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useToastStore } from '@/stores/toast'
import { useSelectionStore } from '@/stores/selection'
import {
  buildFileTree,
  collectFolderPaths,
  commitMessageBody,
  countCommitFiles,
  sortCommitFiles,
  type CommitFileCounts,
  type FileTreeFolder,
  type FileTreeNode
} from '@/lib/fileTree'
import { commitFileKindColor } from '@/lib/commitFiles'
import type { CommitFileItem, GitCommit } from '@/lib/types'

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}

function formatAuthoredDate(iso: string): string {
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
  return `authored ${day} @ ${time}`
}

function ModifiedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M11.5 1.5 14.5 4.5 5.5 13.5 2.5 13.5 2.5 10.5 11.5 1.5zm1 1-1 1 2 2 1-1-2-2zM3.5 11l1.8 1.8H3.5V11z" />
    </svg>
  )
}

function AddedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M8 2.5a.75.75 0 0 1 .75.75V7h3.75a.75.75 0 0 1 0 1.5H8.75v3.75a.75.75 0 0 1-1.5 0V8.5H3.5a.75.75 0 0 1 0-1.5h3.75V3.25A.75.75 0 0 1 8 2.5z" />
    </svg>
  )
}

function RemovedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M3.5 7.75a.75.75 0 0 0 0 1.5h9a.75.75 0 0 0 0-1.5h-9z" />
    </svg>
  )
}

function FileChangeBadges({ counts, compact = false }: { counts: CommitFileCounts; compact?: boolean }) {
  const items = [
    counts.changed > 0 ? (
      <span key="changed" className="inline-flex items-center gap-1 text-amber-400">
        <ModifiedIcon className="h-3.5 w-3.5" />
        {compact ? counts.changed : `${counts.changed} modified`}
      </span>
    ) : null,
    counts.added > 0 ? (
      <span key="added" className="inline-flex items-center gap-1 text-emerald-400">
        <AddedIcon className="h-3.5 w-3.5" />
        {compact ? `+${counts.added}` : `+ ${counts.added} added`}
      </span>
    ) : null,
    counts.removed > 0 ? (
      <span key="removed" className="inline-flex items-center gap-1 text-rose-400">
        <RemovedIcon className="h-3.5 w-3.5" />
        {compact ? `-${counts.removed}` : `${counts.removed} deleted`}
      </span>
    ) : null
  ].filter(Boolean)

  if (items.length === 0) return null
  return <span className="inline-flex flex-wrap items-center gap-3 text-xs">{items}</span>
}

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

function CommitAiButton({
  commit,
  filePaths
}: {
  commit: GitCommit
  filePaths: string[]
}) {
  const aiEnabled = useAiEnabled()
  const aiFill = useAiFill()
  const pushToast = useToastStore((s) => s.show)

  if (!aiEnabled) return null

  return (
    <button
      type="button"
      disabled={aiFill.isPending}
      onClick={() =>
        void aiFill
          .mutateAsync({
            purpose: 'commit_message',
            context: {
              filePaths,
              currentText: commit.message
            }
          })
          .then((text) => {
            if (text.trim()) {
              pushToast('AI suggestion copied to clipboard.', 'info')
              void navigator.clipboard.writeText(text.trim())
            }
          })
          .catch((error) => {
            pushToast(error instanceof Error ? error.message : 'AI suggestion failed.', 'error')
          })
      }
      className="rounded-md border border-transparent bg-gf-bg-deep px-3 py-1 text-xs text-gf-fg-muted [background-image:linear-gradient(var(--gf-bg-deep),var(--gf-bg-deep)),linear-gradient(90deg,#a78bfa,#38bdf8)] [background-origin:border-box] [background-clip:padding-box,border-box] hover:text-gf-fg disabled:opacity-50"
    >
      {aiFill.isPending ? 'Recomposing…' : 'Recompose commit with AI'}
    </button>
  )
}

function PathFileRow({
  file,
  selected,
  onSelect
}: {
  file: CommitFileItem
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
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
  isExpanded
}: {
  node: FileTreeNode
  depth: number
  expandedPaths: Set<string>
  selectedPath: string | null
  onSelectFile: (path: string) => void
  onToggleFolder: (path: string) => void
  isExpanded: (path: string) => boolean
}) {
  if (node.type === 'folder') {
    const open = isExpanded(node.path)
    return (
      <>
        <button
          type="button"
          onClick={() => onToggleFolder(node.path)}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gf-fg-muted hover:bg-gf-surface-hover"
          style={{ paddingLeft: 12 + depth * 14 }}
        >
          <Chevron open={open} />
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
          <FileChangeBadges counts={node.counts} compact />
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
            />
          ))}
      </>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelectFile(node.path)}
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
  onToggleFolder
}: {
  root: FileTreeFolder
  selectedPath: string | null
  onSelectFile: (path: string) => void
  expandedPaths: Set<string>
  onToggleFolder: (path: string) => void
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
        />
      ))}
    </div>
  )
}

export function CommitPreview({
  commit,
  changedFiles,
  loadingFiles
}: {
  commit: GitCommit
  changedFiles: CommitFileItem[]
  loadingFiles: boolean
}) {
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const selectedCommitFile = useSelectionStore((s) => s.selectedCommitFile)
  const setSelectedCommitFile = useSelectionStore((s) => s.setSelectedCommitFile)

  const [viewMode, setViewMode] = useState<'path' | 'tree'>('tree')
  const [sortAscending, setSortAscending] = useState(true)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set())

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
    () => commitMessageBody(commit.message, commit.subject),
    [commit.message, commit.subject]
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
            ? 'Loading file changes…'
            : `${totalChanges} file change${totalChanges === 1 ? '' : 's'} in commit`}
        </p>
        <button
          type="button"
          onClick={viewFirstChange}
          disabled={sortedFiles.length === 0}
          className="rounded border border-gf-border-strong px-3 py-1 text-xs text-gf-fg-muted hover:bg-gf-surface disabled:opacity-40"
        >
          View changes
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-gf-border px-4 py-2">
        <p className="font-mono text-xs text-gf-fg-subtle">
          commit: <span className="text-gf-fg-muted">{commit.shortHash}</span>
        </p>
        <CommitAiButton commit={commit} filePaths={changedFiles.map((file) => file.path)} />
      </div>

      <div className="border-b border-gf-border px-4 py-4">
        <h2 className="text-lg font-semibold leading-snug text-gf-fg">{commit.subject}</h2>
        {body && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gf-fg-subtle">{body}</p>}
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-gf-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gf-surface text-xs font-semibold text-gf-fg-muted">
            {authorInitials(commit.author.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-gf-fg">{commit.author.name}</p>
            <p className="text-xs text-gf-fg-subtle">{formatAuthoredDate(commit.author.date)}</p>
          </div>
        </div>
        {parentShort && (
          <button
            type="button"
            onClick={() => parentHash && selectTimelineNode('commit', parentHash)}
            className="shrink-0 font-mono text-xs text-gf-fg-subtle hover:text-gf-accent-fg"
          >
            parent: <span className="text-gf-fg-muted">{parentShort}</span>
          </button>
        )}
      </div>

      <div className="border-b border-gf-border px-4 py-2.5">
        <FileChangeBadges counts={counts} />
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-gf-border px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortAscending((value) => !value)}
            className="rounded p-1 text-gf-fg-subtle hover:bg-gf-surface-hover hover:text-gf-fg-muted"
            title={sortAscending ? 'Sorted A–Z' : 'Sorted Z–A'}
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M8 2.5 5.5 5h5L8 2.5zm0 11 2.5-2.5h-5L8 13.5z" />
            </svg>
          </button>
          <div className="flex rounded-md border border-gf-border-strong p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('path')}
              className={`rounded px-2 py-0.5 ${
                viewMode === 'path' ? 'bg-gf-accent text-white' : 'text-gf-fg-subtle hover:text-gf-fg-muted'
              }`}
            >
              Path
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`rounded px-2 py-0.5 ${
                viewMode === 'tree' ? 'bg-gf-accent text-white' : 'text-gf-fg-subtle hover:text-gf-fg-muted'
              }`}
            >
              Tree
            </button>
          </div>
        </div>
        {viewMode === 'tree' && (
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-gf-accent-fg hover:text-gf-fg"
          >
            Expand all
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loadingFiles && <p className="px-4 py-3 text-sm text-gf-fg-subtle">Loading files…</p>}
        {!loadingFiles && changedFiles.length === 0 && (
          <p className="px-4 py-3 text-sm text-gf-fg-subtle">No file changes.</p>
        )}
        {!loadingFiles && viewMode === 'path' && (
          <div className="py-1">
            {sortedFiles.map((file) => (
              <PathFileRow
                key={file.path}
                file={file}
                selected={selectedCommitFile === file.path}
                onSelect={() => setSelectedCommitFile(file.path)}
              />
            ))}
          </div>
        )}
        {!loadingFiles && viewMode === 'tree' && (
          <FileTreeList
            root={fileTree}
            selectedPath={selectedCommitFile}
            onSelectFile={setSelectedCommitFile}
            expandedPaths={expandedPaths}
            onToggleFolder={toggleFolder}
          />
        )}
      </div>
    </div>
  )
}
