import type { FileTreeFolder, FileTreeFile, FileTreeNode } from '@/lib/workspace/fileTree'

export interface FlatFileTreeItem {
  id: string
  kind: 'folder' | 'file'
  depth: number
  node: FileTreeNode
}

/**
 * Flattens a `FileTreeFolder` into a flat ordered list of visible items, respecting
 * which folders are expanded. The root folder itself is not included; its children
 * start at depth 0.
 */
export function flattenVisibleFileTree(
  root: FileTreeFolder,
  expandedPaths: Set<string>
): FlatFileTreeItem[] {
  const result: FlatFileTreeItem[] = []

  function walk(nodes: FileTreeNode[], depth: number): void {
    for (const node of nodes) {
      if (node.type === 'folder') {
        result.push({ id: `folder:${node.path}`, kind: 'folder', depth, node })
        if (expandedPaths.has(node.path)) {
          walk(node.children, depth + 1)
        }
      } else {
        result.push({ id: `file:${node.path}`, kind: 'file', depth, node: node as FileTreeFile })
      }
    }
  }

  walk(root.children, 0)
  return result
}
