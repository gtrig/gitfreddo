import { useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useWorkingStatus } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { statusColor, statusLabel, type GitFileChange } from '@/lib/types'
import { buildFileTree, collectFolderPaths, countCommitFiles, type FileTreeNode } from '@/lib/fileTree'
import type { CommitFileItem } from '@/lib/types'
import { LoadingRow, Spinner } from '@/components/ui/Spinner'

function FileRow({
  file,
  onSelect,
  selected,
  onStage
}: {
  file: GitFileChange
  onSelect: () => void
  selected: boolean
  onStage?: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onSelect}
        className={`min-w-0 flex-1 rounded px-2 py-1 text-left text-xs hover:bg-gf-surface-hover ${
          selected ? 'bg-gf-surface text-white' : 'text-gf-fg-muted'
        }`}
      >
        <span className={`mr-2 inline-block w-3 text-center font-mono text-[11px] ${statusColor(file.status)}`}>
          {statusLabel(file.status)}
        </span>
        <span className="font-mono">{file.path}</span>
      </button>
      {onStage && (
        <button
          type="button"
          onClick={onStage}
          className="rounded px-2 py-0.5 text-[10px] text-gf-fg-subtle hover:bg-gf-surface-hover"
        >
          stage
        </button>
      )}
    </div>
  )
}

function toCommitKind(status: GitFileChange['status']): CommitFileItem['kind'] {
  if (status === 'added' || status === 'untracked' || status === 'copied') return 'added'
  if (status === 'deleted') return 'removed'
  return 'changed'
}

function toTreeItems(files: GitFileChange[]): CommitFileItem[] {
  return files.map((file) => ({ path: file.path, kind: toCommitKind(file.status) }))
}

function fileNameFromPath(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
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

function FolderCounts({
  counts
}: {
  counts: ReturnType<typeof countCommitFiles>
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[10px]">
      {counts.changed > 0 && <span className="text-amber-400">{counts.changed}</span>}
      {counts.added > 0 && <span className="text-emerald-400">+{counts.added}</span>}
      {counts.removed > 0 && <span className="text-rose-400">-{counts.removed}</span>}
    </span>
  )
}

function TreeNode({
  node,
  depth,
  selectedFile,
  setSelectedFile,
  expandedPaths,
  toggleExpanded,
  pathToFile,
  mode,
  onStage
}: {
  node: FileTreeNode
  depth: number
  selectedFile: string | null
  setSelectedFile: (path: string, mode: 'working' | 'staged') => void
  expandedPaths: Set<string>
  toggleExpanded: (path: string) => void
  pathToFile: Map<string, GitFileChange>
  mode: 'working' | 'staged'
  onStage?: (path: string) => void
}) {
  if (node.type === 'folder') {
    const open = expandedPaths.has(node.path)
    return (
      <>
        <button
          type="button"
          onClick={() => toggleExpanded(node.path)}
          className="flex w-full items-center gap-2 px-2 py-1 text-left text-xs text-gf-fg-muted hover:bg-gf-surface-hover"
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          <Chevron open={open} />
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
          <FolderCounts counts={node.counts} />
        </button>
        {open &&
          node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              expandedPaths={expandedPaths}
              toggleExpanded={toggleExpanded}
              pathToFile={pathToFile}
              mode={mode}
              onStage={onStage}
            />
          ))}
      </>
    )
  }

  const file = pathToFile.get(node.path)
  if (!file) return null
  return (
    <div className="flex items-center gap-1" style={{ paddingLeft: 22 + depth * 12 }}>
      <button
        type="button"
        onClick={() => setSelectedFile(file.path, mode)}
        className={`min-w-0 flex-1 rounded px-2 py-1 text-left text-xs hover:bg-gf-surface-hover ${
          selectedFile === file.path ? 'bg-gf-surface text-white' : 'text-gf-fg-muted'
        }`}
      >
        <span className={`mr-2 inline-block w-3 text-center font-mono text-[11px] ${statusColor(file.status)}`}>
          {statusLabel(file.status)}
        </span>
        <span className="truncate font-mono">{fileNameFromPath(file.path)}</span>
      </button>
      {onStage && (
        <button
          type="button"
          onClick={() => onStage(file.path)}
          className="rounded px-2 py-0.5 text-[10px] text-gf-fg-subtle hover:bg-gf-surface-hover"
        >
          {mode === 'staged' ? 'unstage' : 'stage'}
        </button>
      )}
    </div>
  )
}

export function GitWorkingTree() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data, isLoading, error } = useWorkingStatus(connected)
  const { stageAdd, stageReset } = useGitMutations()
  const selectedFile = useSelectionStore((s) => s.selectedWorkingFile)
  const setSelectedWorkingFile = useSelectionStore((s) => s.setSelectedWorkingFile)
  const [viewMode, setViewMode] = useState<'path' | 'tree'>('tree')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  if (!connected) {
    return <p className="p-4 text-sm text-gf-fg-subtle">Open a repository to view changes.</p>
  }

  if (isLoading) return <div className="p-4"><LoadingRow /></div>
  if (error) return <p className="text-sm text-red-400 p-4">{(error as Error).message}</p>

  const renderSection = (
    title: string,
    files: GitFileChange[],
    mode: 'working' | 'staged',
    canStage: boolean
  ) => (
    <div className="mb-3">
      <h3 className="mb-1 text-[11px] font-semibold text-gf-fg-subtle">
        {title} ({files.length})
      </h3>
      {files.length === 0 ? (
        <p className="text-xs text-gf-fg-subtle">—</p>
      ) : (
        <>
          {viewMode === 'path' ? (
            <div className="space-y-0.5">
              {files.map((file) => (
                <FileRow
                  key={file.path}
                  file={file}
                  selected={selectedFile === file.path}
                  onSelect={() => setSelectedWorkingFile(file.path, mode)}
                  onStage={
                    canStage
                      ? () => void stageAdd.mutateAsync({ paths: [file.path] })
                      : () => void stageReset.mutateAsync({ paths: [file.path] })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {buildFileTree(toTreeItems(files))
                .children.map((node) => (
                  <TreeNode
                    key={node.path}
                    node={node}
                    depth={0}
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedWorkingFile}
                    expandedPaths={expandedPaths}
                    toggleExpanded={(path) =>
                      setExpandedPaths((current) => {
                        const next = new Set(current)
                        if (next.has(path)) next.delete(path)
                        else next.add(path)
                        return next
                      })
                    }
                    pathToFile={new Map(files.map((f) => [f.path, f]))}
                    mode={mode}
                    onStage={
                      canStage
                        ? (path) => void stageAdd.mutateAsync({ paths: [path] })
                        : (path) => void stageReset.mutateAsync({ paths: [path] })
                    }
                  />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <div className="flex h-full flex-col bg-gf-bg-deep">
      <div className="flex items-center justify-between border-b border-gf-border px-3 py-2">
        <p className="text-xs text-gf-fg-muted">
          {data?.staged.length ?? 0} file change{(data?.staged.length ?? 0) === 1 ? '' : 's'} in{' '}
          <span className="rounded bg-gf-surface px-1 py-0.5 text-[10px] text-gf-fg">{data?.branch}</span>
        </p>
        <button
          type="button"
          onClick={() => setViewMode((m) => (m === 'path' ? 'tree' : 'path'))}
          className="rounded border border-gf-border-strong px-2 py-0.5 text-[10px] text-gf-fg-subtle hover:bg-gf-surface"
        >
          {viewMode === 'path' ? 'Path' : 'Tree'}
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-gf-border px-3 py-2">
        <div className="flex items-center gap-2">
          <p className="text-xs text-gf-fg-subtle">
            {data && (data.unstaged.length > 0 || data.untracked.length > 0 || data.conflicted.length > 0)
              ? 'Unstage Files'
              : 'No unstaged files'}
          </p>
          <button
            type="button"
            onClick={() =>
              setExpandedPaths(
                new Set(
                  collectFolderPaths(buildFileTree(toTreeItems([...(data?.unstaged ?? []), ...(data?.untracked ?? []), ...(data?.conflicted ?? [])])))
                )
              )
            }
            className="text-[10px] text-gf-accent-fg hover:text-gf-fg"
          >
            Expand all
          </button>
        </div>
        {data && !data.isClean && (
          <button
            type="button"
            disabled={stageAdd.isPending}
            onClick={() => void stageAdd.mutateAsync({ paths: [] })}
            className="inline-flex items-center gap-1 rounded border border-gf-border-strong px-2 py-0.5 text-[10px] text-gf-fg-muted hover:bg-gf-surface disabled:opacity-50"
          >
            {stageAdd.isPending && <Spinner size="sm" />}
            Stage All Changes
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {renderSection(
          'Unstaged',
          [...(data?.unstaged ?? []), ...(data?.untracked ?? []), ...(data?.conflicted ?? [])],
          'working',
          true
        )}
        <div className="my-4 border-t border-gf-border/70" />
        {renderSection('Staged Files', data?.staged ?? [], 'staged', false)}
      </div>
      <div className="border-t border-gf-border px-3 py-2">
        <p className="text-[10px] text-gf-fg-subtle">
          {data && (data.ahead > 0 || data.behind > 0) && (
            <span>
              {data.ahead > 0 && `↑${data.ahead}`}
              {data.behind > 0 && ` ↓${data.behind}`}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
