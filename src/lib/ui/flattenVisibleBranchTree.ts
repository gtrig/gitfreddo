import type { BranchTreeNode } from '@/lib/workspace/branchTree'

export interface FlatBranchTreeItem {
  id: string
  kind: 'folder' | 'branch'
  depth: number
  node: BranchTreeNode
}

/**
 * Flattens a `BranchTreeNode[]` into a flat ordered list of visible rows,
 * respecting folder open/closed state and an optional text filter.
 *
 * When `filter` is non-empty, all ancestor folders are treated as open so
 * matching branches are always visible — mirroring the existing sidebar behavior.
 */
export function flattenVisibleBranchTree(
  nodes: BranchTreeNode[],
  openFolders: Set<string>,
  filter = '',
  _depth = 0
): FlatBranchTreeItem[] {
  const result: FlatBranchTreeItem[] = []
  const hasFilter = filter.trim().length > 0

  function walk(items: BranchTreeNode[], depth: number, folderPath: string): void {
    for (const node of items) {
      if (node.type === 'folder') {
        const path = folderPath ? `${folderPath}/${node.name}` : node.name
        result.push({ id: `folder:${path}`, kind: 'folder', depth, node })
        const isOpen = hasFilter || openFolders.has(path)
        if (isOpen && node.children) {
          walk(node.children, depth + 1, path)
        }
      } else {
        result.push({ id: `branch:${node.branch?.name ?? node.name}`, kind: 'branch', depth, node })
      }
    }
  }

  walk(nodes, 0, '')
  return result
}
