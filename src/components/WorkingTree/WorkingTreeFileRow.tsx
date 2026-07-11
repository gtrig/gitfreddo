import type { TFunction } from 'i18next'
import { MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid'
import { statusColor, statusLabel, type GitFileChange, type CommitFileItem } from '@/lib/types'
import { submoduleStatusColor, submoduleStatusLabel } from '@/lib/git/submoduleStatus'
import { countCommitFiles, type FileTreeNode } from '@/lib/workspace/fileTree'
import { Spinner } from '@/components/Ui/Spinner'
import { SidebarIconChevron } from '@/components/Layout/sidebar/SidebarIcons'
import type { OpenContextMenu } from '@/hooks/useContextMenu'
import {
  workingTreeFileContextMenuItems,
  workingTreeFolderContextMenuItems
} from '@/lib/context-menus/detailPanelContextMenus'

// ---------------------------------------------------------------------------
// Action button
// ---------------------------------------------------------------------------

export type WorkingTreeActionVariant = 'stage' | 'unstage' | 'clear'

export const actionVariantStyles: Record<WorkingTreeActionVariant, string> = {
  stage: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15',
  unstage: 'border-amber-500/40 text-amber-400 hover:bg-amber-500/15',
  clear: 'border-rose-500/40 text-rose-400 hover:bg-rose-500/15'
}

const actionVariantSpinnerStyles: Record<WorkingTreeActionVariant, string> = {
  stage: 'border-emerald-400/30 border-t-emerald-300',
  unstage: 'border-amber-400/30 border-t-amber-300',
  clear: 'border-rose-400/30 border-t-rose-300'
}

export function WorkingTreeActionButton({
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

// ---------------------------------------------------------------------------
// File status badge
// ---------------------------------------------------------------------------

export function fileStatusBadge(file: GitFileChange): { label: string; color: string } {
  if (file.isSubmodule && file.submoduleStatus) {
    return {
      label: submoduleStatusLabel(file.submoduleStatus),
      color: submoduleStatusColor(file.submoduleStatus)
    }
  }
  return { label: statusLabel(file.status), color: statusColor(file.status) }
}

// ---------------------------------------------------------------------------
// Path display
// ---------------------------------------------------------------------------

export function FileChangePath({ file }: { file: GitFileChange }) {
  if (file.status === 'renamed' && file.oldPath) {
    return (
      <span className="truncate font-mono">
        <span className="text-gf-fg-subtle">{file.oldPath}</span>
        <span className="text-gf-fg-subtle"> → </span>
        {file.path}
      </span>
    )
  }

  return <span className="truncate font-mono">{file.path}</span>
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function toCommitKind(status: GitFileChange['status']): CommitFileItem['kind'] {
  if (status === 'added' || status === 'untracked' || status === 'copied') return 'added'
  if (status === 'deleted') return 'removed'
  return 'changed'
}

export function toTreeItems(files: GitFileChange[]): CommitFileItem[] {
  return files.map((file) => ({ path: file.path, kind: toCommitKind(file.status) }))
}

export function fileNameFromPath(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  const parts = trimmed.split('/')
  const name = parts[parts.length - 1]
  if (!name) return path
  return path.endsWith('/') ? `${name}/` : name
}

// ---------------------------------------------------------------------------
// Chevron + FolderCounts
// ---------------------------------------------------------------------------

export function Chevron({ open }: { open: boolean }) {
  return <SidebarIconChevron open={open} className="h-3 w-3 shrink-0 text-gf-fg-subtle" />
}

export function FolderCounts({
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

// ---------------------------------------------------------------------------
// FileRow
// ---------------------------------------------------------------------------

export interface FileRowProps {
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
  onAddToGitignore?: () => void
  onOpenSubmodule?: () => void
  onUpdateSubmodule?: () => void
  onSyncSubmodule?: () => void
  stageLabel: string
  unstageLabel: string
  repoPath?: string | null
  t: TFunction
}

export function FileRow({
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
  onFileHistory,
  onAddToGitignore,
  onOpenSubmodule,
  onUpdateSubmodule,
  onSyncSubmodule,
  stageLabel,
  unstageLabel,
  repoPath,
  t
}: FileRowProps) {
  const badge = fileStatusBadge(file)
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onSelect}
        onContextMenu={(event) =>
          openMenu(
            event,
            workingTreeFileContextMenuItems(
              file.path,
              mode,
              file.status,
              {
                onSelect,
                onStageToggle: onStage ?? (() => {}),
                onOpenInEditor: () => void window.gitfreddo.openInEditor(file.path, repoPath ?? undefined),
                onFileHistory: onFileHistory,
                onRename: file.isSubmodule ? undefined : onRename,
                onDiscard: file.isSubmodule ? undefined : onDiscard,
                onDelete: file.isSubmodule ? undefined : onDelete,
                onRemove: file.isSubmodule ? undefined : onRemove,
                onAddToGitignore: file.isSubmodule ? undefined : onAddToGitignore,
                onOpenSubmodule,
                onUpdateSubmodule,
                onSyncSubmodule
              },
              { isSubmodule: file.isSubmodule },
              t
            )
          )
        }
        className={`min-w-0 flex-1 rounded px-2 py-1 text-left text-xs hover:bg-gf-surface-hover ${
          selected ? 'bg-gf-surface text-white' : 'text-gf-fg-muted'
        }`}
      >
        <span className={`mr-2 inline-block w-3 text-center font-mono text-[11px] ${badge.color}`}>
          {badge.label}
        </span>
        <FileChangePath file={file} />
      </button>
      {onStage && (
        <WorkingTreeActionButton
          variant={mode === 'staged' ? 'unstage' : 'stage'}
          label={mode === 'staged' ? unstageLabel : stageLabel}
          onClick={onStage}
          size="sm"
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TreeNode
// ---------------------------------------------------------------------------

export interface TreeNodeProps {
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
  onAddToGitignore?: (path: string, directory?: boolean) => void
  onOpenSubmodule?: (path: string) => void
  onUpdateSubmodule?: (path: string) => void
  onSyncSubmodule?: (path: string) => void
  repoPath?: string | null
  stageLabel: string
  unstageLabel: string
  t: TFunction
}

export function TreeNode({
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
  onFileHistory,
  onAddToGitignore,
  onOpenSubmodule,
  onUpdateSubmodule,
  onSyncSubmodule,
  repoPath,
  stageLabel,
  unstageLabel,
  t
}: TreeNodeProps) {
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
              workingTreeFolderContextMenuItems(
                node.path,
                open,
                mode,
                {
                  onToggle: () => toggleExpanded(node.path),
                  onStageFolder: onStageFolder ? () => onStageFolder(node.path) : undefined,
                  onDiscardFolder: onDiscardFolder
                    ? () => onDiscardFolder(node.path)
                    : undefined,
                  onAddToGitignore: onAddToGitignore
                    ? () => onAddToGitignore(node.path, true)
                    : undefined
                },
                t
              )
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
              onAddToGitignore={onAddToGitignore}
              onOpenSubmodule={onOpenSubmodule}
              onUpdateSubmodule={onUpdateSubmodule}
              onSyncSubmodule={onSyncSubmodule}
              repoPath={repoPath}
              stageLabel={stageLabel}
              unstageLabel={unstageLabel}
              t={t}
            />
          ))}
      </>
    )
  }

  const file = pathToFile.get(node.path)
  if (!file) return null
  const selectFile = () => setSelectedFile(file.path, mode)
  const stageToggle = () => onStage?.(file.path)
  const badge = fileStatusBadge(file)
  return (
    <div className="flex items-center gap-1" style={{ paddingLeft: 22 + depth * 12 }}>
      <button
        type="button"
        onClick={selectFile}
        onContextMenu={(event) =>
          openMenu(
            event,
            workingTreeFileContextMenuItems(
              file.path,
              mode,
              file.status,
              {
                onSelect: selectFile,
                onStageToggle: stageToggle,
                onOpenInEditor: () => void window.gitfreddo.openInEditor(file.path, repoPath ?? undefined),
                onFileHistory: onFileHistory ? () => onFileHistory(file.path) : undefined,
                onRename: onRename && !file.isSubmodule ? () => onRename(file.path) : undefined,
                onDiscard: onDiscard && !file.isSubmodule
                  ? () => onDiscard(file.path, mode === 'staged')
                  : undefined,
                onDelete: onDelete && !file.isSubmodule ? () => onDelete(file.path) : undefined,
                onRemove: onRemove && !file.isSubmodule ? () => onRemove(file.path) : undefined,
                onAddToGitignore:
                  onAddToGitignore && !file.isSubmodule
                    ? () => onAddToGitignore(file.path)
                    : undefined,
                onOpenSubmodule: onOpenSubmodule
                  ? () => onOpenSubmodule(file.path)
                  : undefined,
                onUpdateSubmodule: onUpdateSubmodule
                  ? () => onUpdateSubmodule(file.path)
                  : undefined,
                onSyncSubmodule: onSyncSubmodule ? () => onSyncSubmodule(file.path) : undefined
              },
              { isSubmodule: file.isSubmodule },
              t
            )
          )
        }
        className={`min-w-0 flex-1 rounded px-2 py-1 text-left text-xs hover:bg-gf-surface-hover ${
          selectedFile === file.path ? 'bg-gf-surface text-white' : 'text-gf-fg-muted'
        }`}
      >
        <span className={`mr-2 inline-block w-3 text-center font-mono text-[11px] ${badge.color}`}>
          {badge.label}
        </span>
        <span className="truncate font-mono">{fileNameFromPath(file.path)}</span>
      </button>
      {onStage && (
        <WorkingTreeActionButton
          variant={mode === 'staged' ? 'unstage' : 'stage'}
          label={mode === 'staged' ? unstageLabel : stageLabel}
          onClick={() => onStage(file.path)}
          size="sm"
        />
      )}
    </div>
  )
}
