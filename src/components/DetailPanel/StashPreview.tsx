import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStashFiles } from '@/hooks/useGit'
import { useSelectionStore } from '@/stores/selection'
import { parseCommitNameStatus } from '@/lib/git/commitFiles'
import { buildFileTree, collectFolderPaths, sortCommitFiles } from '@/lib/workspace/fileTree'
import { commitFileKindColor } from '@/lib/git/commitFiles'
import type { CommitFileItem, GitStashEntry } from '@/lib/types'
import { ContextMenu } from '@/components/Ui/ContextMenu'
import { useContextMenu } from '@/hooks/useContextMenu'
import { commitFileContextMenuItems, commitFolderContextMenuItems } from '@/lib/context-menus/detailPanelContextMenus'
import { flattenVisibleFileTree } from '@/lib/ui/flattenVisibleFileTree'
import { FILE_ROW_HEIGHT, VIRTUAL_OVERSCAN, shouldVirtualize } from '@/lib/ui/virtualList'

interface StashPreviewProps {
  stash: GitStashEntry
}

function fileNameFromPath(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

export function StashPreview({ stash }: StashPreviewProps) {
  const { t } = useTranslation()
  const { data: filesOutput, isLoading } = useStashFiles(stash.index)
  const selectedStashFile = useSelectionStore((s) => s.selectedStashFile)
  const setSelectedStashFile = useSelectionStore((s) => s.setSelectedStashFile)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const { state: menuState, openMenu, closeMenu } = useContextMenu()
  const scrollRef = useRef<HTMLDivElement>(null)

  const changedFiles = useMemo(
    () => (filesOutput ? parseCommitNameStatus(filesOutput) : []),
    [filesOutput]
  )

  const treeItems: CommitFileItem[] = useMemo(
    () => sortCommitFiles(changedFiles),
    [changedFiles]
  )

  const tree = useMemo(() => buildFileTree(treeItems), [treeItems])

  const flatTreeItems = useMemo(
    () => flattenVisibleFileTree(tree, expandedPaths),
    [tree, expandedPaths]
  )

  const useVirtualization = shouldVirtualize(treeItems.length)

  const virtualizer = useVirtualizer({
    count: useVirtualization ? flatTreeItems.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => FILE_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  function toggleExpanded(path: string) {
    setExpandedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function renderNode(node: ReturnType<typeof buildFileTree>['children'][number], depth: number) {
    if (node.type === 'folder') {
      const open = expandedPaths.has(node.path)
      return (
        <div key={node.path}>
          <button
            type="button"
            onClick={() => toggleExpanded(node.path)}
            onContextMenu={(event) =>
              openMenu(
                event,
                commitFolderContextMenuItems(node.path, open, () => toggleExpanded(node.path), t)
              )
            }
            className="flex w-full items-center gap-2 px-2 py-1 text-left text-xs text-gf-fg-muted hover:bg-gf-surface-hover"
            style={{ paddingLeft: 8 + depth * 12 }}
          >
            <span className="truncate font-medium">{node.name}</span>
          </button>
          {open &&
            node.children.map((child) => (
              <div key={child.path}>{renderNode(child, depth + 1)}</div>
            ))}
        </div>
      )
    }

    const select = () => setSelectedStashFile(node.path)
    return (
      <button
        key={node.path}
        type="button"
        onClick={select}
        onContextMenu={(event) =>
          openMenu(
            event,
            commitFileContextMenuItems(node.path, fileNameFromPath(node.path), select, undefined, t)
          )
        }
        className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-gf-surface-hover ${
          selectedStashFile === node.path ? 'bg-gf-surface text-white' : 'text-gf-fg-muted'
        }`}
        style={{ paddingLeft: 22 + depth * 12 }}
      >
        <span className={`font-mono text-[11px] ${commitFileKindColor(node.kind)}`}>
          {node.kind === 'added' ? 'A' : node.kind === 'removed' ? 'D' : 'M'}
        </span>
        <span className="truncate font-mono">{fileNameFromPath(node.path)}</span>
      </button>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-gf-border px-4 py-3">
        <p className="text-xs font-semibold text-gf-fg-subtle">{t('detail.stash')}</p>
        <p className="mt-1 text-sm text-gf-fg">{stash.message || `stash@{${stash.index}}`}</p>
        {stash.branch && (
          <p className="mt-1 text-xs text-gf-fg-subtle">{t('detail.branch')} {stash.branch}</p>
        )}
      </div>
      <div className="flex items-center justify-between border-b border-gf-border px-4 py-2">
        <p className="text-xs text-gf-fg-subtle">
          {isLoading ? t('detail.loadingFiles') : t('detail.changedFiles', { count: changedFiles.length })}
        </p>
        <button
          type="button"
          onClick={() => setExpandedPaths(new Set(collectFolderPaths(tree)))}
          className="text-[10px] text-gf-accent-fg hover:text-gf-fg"
        >
          {t('detail.expandAll')}
        </button>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {!isLoading && changedFiles.length === 0 && (
          <p className="px-2 text-xs text-gf-fg-subtle">{t('detail.noFileChangesInStash')}</p>
        )}
        {useVirtualization ? (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
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
                  {renderNode(item.node, item.depth)}
                </div>
              )
            })}
          </div>
        ) : (
          tree.children.map((node) => renderNode(node, 0))
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
