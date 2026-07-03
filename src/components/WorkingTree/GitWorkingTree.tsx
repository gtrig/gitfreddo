import { useState, type ReactNode } from 'react'
import { MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useWorkingStatus } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useInvalidateGit } from '@/hooks/useInvalidateGit'
import { statusColor, statusLabel, type GitFileChange } from '@/lib/types'
import { buildFileTree, collectFolderPaths, countCommitFiles, type FileTreeNode } from '@/lib/fileTree'
import type { CommitFileItem } from '@/lib/types'
import { LoadingRow, Spinner } from '@/components/ui/Spinner'
import { SidebarIconChevron } from '@/components/layout/sidebar/SidebarIcons'
import { CommitPanel } from '@/components/WorkingTree/CommitPanel'
import { CleanUntrackedModal } from '@/components/WorkingTree/CleanUntrackedModal'
import { ConfirmDialog } from '@/components/ui/Modal'
import { FileHistoryModal } from '@/components/actions/FileHistoryModal'
import { RenameFileModal } from '@/components/actions/RenameFileModal'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { useContextMenu, type OpenContextMenu } from '@/hooks/useContextMenu'
import { discardablePaths, pathsUnderFolderPrefix } from '@/lib/workingTreePaths'
import {
  workingTreeFileContextMenuItems,
  workingTreeFolderContextMenuItems
} from '@/lib/detailPanelContextMenus'

type WorkingTreeActionVariant = 'stage' | 'unstage' | 'clear'

const actionVariantStyles: Record<WorkingTreeActionVariant, string> = {
  stage: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15',
  unstage: 'border-amber-500/40 text-amber-400 hover:bg-amber-500/15',
  clear: 'border-rose-500/40 text-rose-400 hover:bg-rose-500/15'
}

const actionVariantSpinnerStyles: Record<WorkingTreeActionVariant, string> = {
  stage: 'border-emerald-400/30 border-t-emerald-300',
  unstage: 'border-amber-400/30 border-t-amber-300',
  clear: 'border-rose-400/30 border-t-rose-300'
}

function WorkingTreeActionButton({
  variant,
  label,
  onClick,
  disabled = false,
  loading = false,
  size = 'md'
}: {
  variant: WorkingTreeActionVariant
  label: string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  size?: 'sm' | 'md'
}) {
  const Icon = variant === 'stage' ? PlusIcon : variant === 'unstage' ? MinusIcon : TrashIcon
  const buttonSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded border disabled:cursor-not-allowed disabled:opacity-50 ${buttonSize} ${actionVariantStyles[variant]}`}
    >
      {loading ? (
        <Spinner size="sm" className={actionVariantSpinnerStyles[variant]} />
      ) : (
        <Icon aria-hidden className={iconSize} />
      )}
    </button>
  )
}

function FileRow({
  file,
  onSelect,
  selected,
  onStage,
  mode,
  openMenu,
  onDiscard,
  onDelete,
  onRemove,
  onRename,
  onFileHistory
}: {
  file: GitFileChange
  onSelect: () => void
  selected: boolean
  onStage?: () => void
  mode: 'working' | 'staged'
  openMenu: OpenContextMenu
  onDiscard?: () => void
  onDelete?: () => void
  onRemove?: () => void
  onRename?: () => void
  onFileHistory?: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onSelect}
        onContextMenu={(event) =>
          openMenu(
            event,
            workingTreeFileContextMenuItems(file.path, mode, file.status, {
              onSelect,
              onStageToggle: onStage ?? (() => {}),
              onOpenInEditor: () => void window.gitfreddo.openInEditor(file.path),
              onFileHistory: onFileHistory,
              onRename: onRename,
              onDiscard,
              onDelete,
              onRemove
            })
          )
        }
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
        <WorkingTreeActionButton
          variant={mode === 'staged' ? 'unstage' : 'stage'}
          label={mode === 'staged' ? 'Unstage' : 'Stage'}
          onClick={onStage}
          size="sm"
        />
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
  const trimmed = path.replace(/\/+$/, '')
  const parts = trimmed.split('/')
  const name = parts[parts.length - 1]
  if (!name) return path
  return path.endsWith('/') ? `${name}/` : name
}

function Chevron({ open }: { open: boolean }) {
  return <SidebarIconChevron open={open} className="h-3 w-3 shrink-0 text-gf-fg-subtle" />
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
  onStage,
  openMenu,
  onDiscard,
  onDelete,
  onRemove,
  onDiscardFolder,
  onStageFolder,
  onRename,
  onFileHistory
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
  openMenu: OpenContextMenu
  onDiscard?: (path: string, staged: boolean) => void
  onDelete?: (path: string) => void
  onRemove?: (path: string) => void
  onDiscardFolder?: (folderPath: string) => void
  onStageFolder?: (folderPath: string) => void
  onRename?: (path: string) => void
  onFileHistory?: (path: string) => void
}) {
  if (node.type === 'folder') {
    const open = expandedPaths.has(node.path)
    return (
      <>
        <button
          type="button"
          onClick={() => toggleExpanded(node.path)}
          onContextMenu={(event) =>
            openMenu(
              event,
              workingTreeFolderContextMenuItems(node.path, open, mode, {
                onToggle: () => toggleExpanded(node.path),
                onStageFolder: onStageFolder ? () => onStageFolder(node.path) : undefined,
                onDiscardFolder: onDiscardFolder
                  ? () => onDiscardFolder(node.path)
                  : undefined
              })
            )
          }
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
              openMenu={openMenu}
              onDiscard={onDiscard}
              onDelete={onDelete}
              onRemove={onRemove}
              onDiscardFolder={onDiscardFolder}
              onStageFolder={onStageFolder}
              onRename={onRename}
              onFileHistory={onFileHistory}
            />
          ))}
      </>
    )
  }

  const file = pathToFile.get(node.path)
  if (!file) return null
  const selectFile = () => setSelectedFile(file.path, mode)
  const stageToggle = () => onStage?.(file.path)
  return (
    <div className="flex items-center gap-1" style={{ paddingLeft: 22 + depth * 12 }}>
      <button
        type="button"
        onClick={selectFile}
        onContextMenu={(event) =>
          openMenu(
            event,
            workingTreeFileContextMenuItems(file.path, mode, file.status, {
              onSelect: selectFile,
              onStageToggle: stageToggle,
              onOpenInEditor: () => void window.gitfreddo.openInEditor(file.path),
              onFileHistory: onFileHistory ? () => onFileHistory(file.path) : undefined,
              onRename: onRename ? () => onRename(file.path) : undefined,
              onDiscard: onDiscard ? () => onDiscard(file.path, mode === 'staged') : undefined,
              onDelete: onDelete ? () => onDelete(file.path) : undefined,
              onRemove: onRemove ? () => onRemove(file.path) : undefined
            })
          )
        }
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
        <WorkingTreeActionButton
          variant={mode === 'staged' ? 'unstage' : 'stage'}
          label={mode === 'staged' ? 'Unstage' : 'Stage'}
          onClick={() => onStage(file.path)}
          size="sm"
        />
      )}
    </div>
  )
}

export function GitWorkingTree() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data, isLoading, error } = useWorkingStatus(connected)
  const { stageAdd, stageReset, workingDiscard, workingRemove } = useGitMutations()
  const invalidate = useInvalidateGit()
  const selectedFile = useSelectionStore((s) => s.selectedWorkingFile)
  const setSelectedWorkingFile = useSelectionStore((s) => s.setSelectedWorkingFile)
  const [viewMode, setViewMode] = useState<'path' | 'tree'>('tree')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [pendingDiscard, setPendingDiscard] = useState<{ paths: string[]; staged: boolean } | null>(
    null
  )
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [cleanOpen, setCleanOpen] = useState(false)
  const [renamePath, setRenamePath] = useState<string | null>(null)
  const [fileHistoryPath, setFileHistoryPath] = useState<string | null>(null)
  const { state: menuState, openMenu, closeMenu } = useContextMenu()

  const gitOpInProgress = Boolean(
    data?.mergeInProgress || data?.rebaseInProgress || data?.cherryPickInProgress
  )

  const changesFiles = [
    ...(data?.unstaged ?? []),
    ...(data?.untracked ?? []),
    ...(!gitOpInProgress ? (data?.conflicted ?? []) : [])
  ]
  const stagedFiles = data?.staged ?? []
  const unstagedDiscardable = discardablePaths(data?.unstaged ?? [])
  const stagedDiscardable = discardablePaths(stagedFiles)
  const totalChangeCount =
    (data?.unstaged.length ?? 0) +
    (data?.untracked.length ?? 0) +
    (!gitOpInProgress ? (data?.conflicted.length ?? 0) : 0) +
    (data?.staged.length ?? 0)

  function expandAllFolders() {
    const paths = new Set<string>()
    for (const path of collectFolderPaths(buildFileTree(toTreeItems(changesFiles)))) {
      paths.add(path)
    }
    for (const path of collectFolderPaths(buildFileTree(toTreeItems(stagedFiles)))) {
      paths.add(path)
    }
    setExpandedPaths(paths)
  }

  function requestDiscard(path: string, staged: boolean) {
    setPendingDiscard({ paths: [path], staged })
  }

  function requestBulkDiscard(paths: string[], staged: boolean) {
    if (paths.length === 0) return
    setPendingDiscard({ paths, staged })
  }

  function requestFolderDiscard(folderPath: string, files: GitFileChange[], staged: boolean) {
    const inFolder = pathsUnderFolderPrefix(files, folderPath)
    const paths = discardablePaths(files.filter((file) => inFolder.includes(file.path)))
    requestBulkDiscard(paths, staged)
  }

  function requestFolderStage(folderPath: string, files: GitFileChange[], staged: boolean) {
    const paths = pathsUnderFolderPrefix(files, folderPath)
    if (paths.length === 0) return
    if (staged) {
      void stageReset.mutateAsync({ paths })
    } else {
      void stageAdd.mutateAsync({ paths })
    }
  }

  function requestDelete(path: string) {
    setPendingDelete(path)
  }

  function requestRemove(path: string) {
    setPendingRemove(path)
  }

  const busy =
    stageAdd.isPending ||
    stageReset.isPending ||
    workingDiscard.isPending ||
    workingRemove.isPending ||
    deleteBusy

  if (!connected) {
    return <p className="p-4 text-sm text-gf-fg-subtle">Open a repository to view changes.</p>
  }

  if (isLoading) return <div className="p-4"><LoadingRow /></div>
  if (error) return <p className="text-sm text-red-400 p-4">{(error as Error).message}</p>

  const renderSection = (
    title: string,
    files: GitFileChange[],
    mode: 'working' | 'staged',
    canStage: boolean,
    headerActions?: ReactNode
  ) => (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold text-gf-fg-subtle">
          {title} ({files.length})
        </h3>
        {headerActions}
      </div>
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
                  mode={mode}
                  onSelect={() => setSelectedWorkingFile(file.path, mode)}
                  onStage={
                    canStage
                      ? () => void stageAdd.mutateAsync({ paths: [file.path] })
                      : () => void stageReset.mutateAsync({ paths: [file.path] })
                  }
                  onDiscard={() => requestDiscard(file.path, mode === 'staged')}
                  onRemove={
                    file.status !== 'untracked' && file.status !== 'conflicted'
                      ? () => requestRemove(file.path)
                      : undefined
                  }
                  onDelete={
                    file.status === 'untracked' ? () => requestDelete(file.path) : undefined
                  }
                  onRename={() => setRenamePath(file.path)}
                  onFileHistory={() => setFileHistoryPath(file.path)}
                  openMenu={openMenu}
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
                    onDiscard={requestDiscard}
                    onDelete={requestDelete}
                    onRemove={requestRemove}
                    onDiscardFolder={(folderPath) =>
                      requestFolderDiscard(folderPath, files, mode === 'staged')
                    }
                    onStageFolder={(folderPath) =>
                      requestFolderStage(folderPath, files, mode === 'staged')
                    }
                    onRename={setRenamePath}
                    onFileHistory={setFileHistoryPath}
                    openMenu={openMenu}
                  />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-gf-bg-deep">
      <div className="flex shrink-0 items-center justify-between border-b border-gf-border px-3 py-2">
        <p className="text-xs text-gf-fg-muted">
          {totalChangeCount} file change{totalChangeCount === 1 ? '' : 's'} on{' '}
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

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gf-border px-3 py-2">
        <div>
          {viewMode === 'tree' && totalChangeCount > 0 && (
            <button
              type="button"
              onClick={expandAllFolders}
              className="text-[10px] text-gf-accent-fg hover:text-gf-fg"
            >
              Expand all
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {(data?.untracked.length ?? 0) > 0 && (
            <WorkingTreeActionButton
              variant="clear"
              label="Clean untracked…"
              disabled={busy}
              onClick={() => setCleanOpen(true)}
            />
          )}
          {data && !data.isClean && changesFiles.length > 0 && (
            <WorkingTreeActionButton
              variant="stage"
              label="Stage all"
              disabled={busy}
              loading={stageAdd.isPending}
              onClick={() => void stageAdd.mutateAsync({ paths: [] })}
            />
          )}
          {stagedFiles.length > 0 && (
            <WorkingTreeActionButton
              variant="unstage"
              label="Unstage all"
              disabled={busy}
              loading={stageReset.isPending}
              onClick={() => void stageReset.mutateAsync({})}
            />
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {renderSection(
          'Changes',
          changesFiles,
          'working',
          true,
          unstagedDiscardable.length > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => requestBulkDiscard(unstagedDiscardable, false)}
              className="text-[10px] text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              Discard all…
            </button>
          ) : undefined
        )}
        <div className="my-4 border-t border-gf-border/70" />
        {renderSection(
          'Staged',
          stagedFiles,
          'staged',
          false,
          <div className="flex items-center gap-1">
            {stagedDiscardable.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => requestBulkDiscard(stagedDiscardable, true)}
                className="text-[10px] text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                Discard all…
              </button>
            )}
          </div>
        )}
      </div>
      {data && <CommitPanel working={data} />}

      {menuState && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={menuState.items}
          onClose={closeMenu}
        />
      )}

      <CleanUntrackedModal open={cleanOpen} onClose={() => setCleanOpen(false)} />

      {renamePath && (
        <RenameFileModal
          open
          oldPath={renamePath}
          onClose={() => setRenamePath(null)}
        />
      )}

      {fileHistoryPath && (
        <FileHistoryModal
          open
          path={fileHistoryPath}
          onClose={() => setFileHistoryPath(null)}
        />
      )}

      {pendingDiscard && (
        <ConfirmDialog
          open
          title="Discard changes"
          message={
            pendingDiscard.paths.length === 1
              ? `Discard local changes to "${pendingDiscard.paths[0]}"? This cannot be undone.`
              : `Discard local changes to ${pendingDiscard.paths.length} files? This cannot be undone.`
          }
          confirmLabel="Discard"
          busy={workingDiscard.isPending}
          onConfirm={async () => {
            await workingDiscard.mutateAsync({
              paths: pendingDiscard.paths,
              staged: pendingDiscard.staged
            })
            setPendingDiscard(null)
          }}
          onCancel={() => setPendingDiscard(null)}
        />
      )}

      {pendingRemove && (
        <ConfirmDialog
          open
          title="Remove from repository"
          message={`Remove "${pendingRemove}" from the repository and stage the deletion?`}
          confirmLabel="Remove"
          busy={workingRemove.isPending}
          onConfirm={async () => {
            await workingRemove.mutateAsync({ paths: [pendingRemove] })
            setPendingRemove(null)
          }}
          onCancel={() => setPendingRemove(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          open
          title="Delete file"
          message={`Delete untracked file "${pendingDelete}"? This cannot be undone.`}
          confirmLabel="Delete"
          busy={deleteBusy}
          onConfirm={async () => {
            setDeleteBusy(true)
            try {
              await window.gitfreddo.deleteWorkspaceFile(pendingDelete)
              invalidate('working.status')
              setPendingDelete(null)
            } finally {
              setDeleteBusy(false)
            }
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
