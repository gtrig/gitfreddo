import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ArrowsUpDownIcon, MinusIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/solid'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ContextMenu } from '@/components/Ui/ContextMenu'
import { SidebarIconChevron } from '@/components/Layout/sidebar/SidebarIcons'
import { useContextMenu, type OpenContextMenu } from '@/hooks/useContextMenu'
import { commitFileContextMenuItems, commitFolderContextMenuItems } from '@/lib/context-menus/detailPanelContextMenus'
import { commitFileKindColor } from '@/lib/git/commitFiles'
import {
  buildFileTree,
  collectFolderPaths,
  countCommitFiles,
  sortCommitFiles,
  type CommitFileCounts,
  type FileTreeFolder,
  type FileTreeNode
} from '@/lib/workspace/fileTree'
import type { CommitFileItem } from '@/lib/types'
import { flattenVisibleFileTree, type FlatFileTreeItem } from '@/lib/ui/flattenVisibleFileTree'
import { FILE_ROW_HEIGHT, VIRTUAL_OVERSCAN, shouldVirtualize } from '@/lib/ui/virtualList'

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

function FileKindIcon({ kind }: { kind: CommitFileItem['kind'] }) {
  if (kind === 'added') return <AddedIcon className="h-3.5 w-3.5" />
  if (kind === 'changed') return <ModifiedIcon className="h-3.5 w-3.5" />
  if (kind === 'removed') return <RemovedIcon className="h-3.5 w-3.5" />
  return <span className="inline-block h-3.5 w-3.5" aria-hidden />
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
        <FileKindIcon kind={file.kind} />
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
        <FileKindIcon kind={node.kind} />
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

function FlatTreeItemRow({
  item,
  selectedPath,
  onSelectFile,
  onToggleFolder,
  isExpanded,
  openMenu,
  onFileHistory,
  t
}: {
  item: FlatFileTreeItem
  selectedPath: string | null
  onSelectFile: (path: string) => void
  onToggleFolder: (path: string) => void
  isExpanded: (path: string) => boolean
  openMenu: OpenContextMenu
  onFileHistory: (path: string) => void
  t: TFunction
}) {
  const { node, depth } = item
  if (node.type === 'folder') {
    const open = isExpanded(node.path)
    return (
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
        <FileKindIcon kind={node.kind} />
      </span>
      <span className="min-w-0 truncate font-mono text-xs">{node.name}</span>
    </button>
  )
}

export function CommitFileList({
  files,
  loading,
  error,
  selectedPath,
  onSelectFile,
  onFileHistory,
  showAllFiles,
  onShowAllFilesChange,
  loadingAllFiles = false,
  showBadges = true,
  embedded = false,
  className = ''
}: {
  files: CommitFileItem[]
  loading: boolean
  error?: Error | null
  selectedPath: string | null
  onSelectFile: (path: string) => void
  onFileHistory: (path: string) => void
  showAllFiles: boolean
  onShowAllFilesChange: (value: boolean) => void
  loadingAllFiles?: boolean
  showBadges?: boolean
  embedded?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'path' | 'tree'>('tree')
  const [sortAscending, setSortAscending] = useState(true)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set())
  const { state: menuState, openMenu, closeMenu } = useContextMenu()

  const counts = useMemo(() => countCommitFiles(files), [files])
  const sortedFiles = useMemo(
    () => sortCommitFiles(files, sortAscending),
    [files, sortAscending]
  )
  const fileTree = useMemo(
    () => buildFileTree(files, sortAscending),
    [files, sortAscending]
  )

  const flatTreeItems = useMemo(
    () => flattenVisibleFileTree(fileTree, expandedPaths),
    [fileTree, expandedPaths]
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const useVirtualization = !embedded && shouldVirtualize(files.length)

  const pathVirtualizer = useVirtualizer({
    count: useVirtualization && viewMode === 'path' ? sortedFiles.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => FILE_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  const treeVirtualizer = useVirtualizer({
    count: useVirtualization && viewMode === 'tree' ? flatTreeItems.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => FILE_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

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

  const isExpanded = (path: string) => expandedPaths.has(path)

  return (
    <div
      className={`flex flex-col ${embedded ? '' : 'min-h-0 flex-1'} ${className}`}
    >
      {showBadges && (
        <div className="border-b border-gf-border px-4 py-2.5">
          <FileChangeBadges counts={counts} t={t} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gf-border px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            role="switch"
            aria-checked={showAllFiles}
            aria-label={t('detail.showAllFiles')}
            onClick={() => onShowAllFilesChange(!showAllFiles)}
            className={`inline-flex items-center gap-2 rounded-md border px-2 py-0.5 text-xs transition-colors ${
              showAllFiles
                ? 'border-gf-accent/40 bg-gf-accent/10 text-gf-fg'
                : 'border-gf-border-strong text-gf-fg-subtle hover:bg-gf-surface-hover hover:text-gf-fg-muted'
            }`}
          >
            <span
              aria-hidden
              className={`relative inline-flex h-3.5 w-6 shrink-0 rounded-full transition-colors ${
                showAllFiles ? 'bg-gf-accent' : 'bg-gf-border-strong'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform ${
                  showAllFiles ? 'translate-x-2.5' : 'translate-x-0'
                }`}
              />
            </span>
            {t('detail.showAllFiles')}
          </button>
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

      <div
        ref={embedded ? undefined : scrollRef}
        className={embedded ? '' : 'min-h-0 flex-1 overflow-y-auto'}
      >
        {(loading || (showAllFiles && loadingAllFiles)) && (
          <p className="px-4 py-3 text-sm text-gf-fg-subtle">{t('detail.loadingFiles')}</p>
        )}
        {!loading && error && (
          <p className="px-4 py-3 text-sm text-red-400">
            {error instanceof Error ? error.message : t('detail.failedToLoadCommitFiles')}
          </p>
        )}
        {!loading && !error && files.length === 0 && (
          <p className="px-4 py-3 text-sm text-gf-fg-subtle">{t('detail.noFileChanges')}</p>
        )}
        {!loading && !error && viewMode === 'path' && (
          useVirtualization ? (
            <div style={{ height: pathVirtualizer.getTotalSize(), position: 'relative' }}>
              {pathVirtualizer.getVirtualItems().map((virtualItem) => {
                const file = sortedFiles[virtualItem.index]!
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute', top: 0, left: 0, width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`
                    }}
                  >
                    <PathFileRow
                      file={file}
                      selected={selectedPath === file.path}
                      onSelect={() => onSelectFile(file.path)}
                      openMenu={openMenu}
                      onFileHistory={onFileHistory}
                      t={t}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-1">
              {sortedFiles.map((file) => (
                <PathFileRow
                  key={file.path}
                  file={file}
                  selected={selectedPath === file.path}
                  onSelect={() => onSelectFile(file.path)}
                  openMenu={openMenu}
                  onFileHistory={onFileHistory}
                  t={t}
                />
              ))}
            </div>
          )
        )}
        {!loading && !error && viewMode === 'tree' && (
          useVirtualization ? (
            <div className="py-1" style={{ height: treeVirtualizer.getTotalSize(), position: 'relative' }}>
              {treeVirtualizer.getVirtualItems().map((virtualItem) => {
                const item = flatTreeItems[virtualItem.index]!
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute', top: 0, left: 0, width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`
                    }}
                  >
                    <FlatTreeItemRow
                      item={item}
                      selectedPath={selectedPath}
                      onSelectFile={onSelectFile}
                      onToggleFolder={toggleFolder}
                      isExpanded={isExpanded}
                      openMenu={openMenu}
                      onFileHistory={onFileHistory}
                      t={t}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <FileTreeList
              root={fileTree}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              expandedPaths={expandedPaths}
              onToggleFolder={toggleFolder}
              openMenu={openMenu}
              onFileHistory={onFileHistory}
              t={t}
            />
          )
        )}
      </div>

      {menuState && (
        <ContextMenu x={menuState.x} y={menuState.y} items={menuState.items} onClose={closeMenu} />
      )}
    </div>
  )
}
