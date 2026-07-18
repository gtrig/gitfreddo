import type { GitBranch } from '@/lib/types'

export interface BranchTreeNode {
  type: 'folder' | 'branch'
  name: string
  branch?: GitBranch
  children?: BranchTreeNode[]
}

export function parseRemoteBranchName(name: string): { remote: string; branch: string } | null {
  const match = /^remotes\/([^/]+)\/(.+)$/.exec(name)
  if (!match) return null
  return { remote: match[1], branch: match[2] }
}

export function remoteBranchShortName(name: string): string {
  return parseRemoteBranchName(name)?.branch ?? name
}

export function buildBranchTree(
  branches: GitBranch[],
  getPathName: (branch: GitBranch) => string = (branch) => branch.name
): BranchTreeNode[] {
  const root: BranchTreeNode[] = []

  for (const branch of branches) {
    const pathName = getPathName(branch)
    const parts = pathName.split('/')
    if (parts.length === 1) {
      root.push({ type: 'branch', name: pathName, branch })
      continue
    }

    let level = root
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i]
      let folder = level.find((n) => n.type === 'folder' && n.name === folderName)
      if (!folder) {
        folder = { type: 'folder', name: folderName, children: [] }
        level.push(folder)
      }
      level = folder.children!
    }

    const leafName = parts[parts.length - 1]
    level.push({ type: 'branch', name: leafName, branch })
  }

  return sortBranchTree(root)
}

export function buildLocalBranchTree(branches: GitBranch[]): BranchTreeNode[] {
  return buildBranchTree(branches)
}

export function buildRemoteBranchGroups(branches: GitBranch[]): Map<string, GitBranch[]> {
  const groups = new Map<string, GitBranch[]>()

  for (const branch of branches) {
    const parsed = parseRemoteBranchName(branch.name)
    if (!parsed) continue
    const list = groups.get(parsed.remote) ?? []
    list.push(branch)
    groups.set(parsed.remote, list)
  }

  for (const [remote, list] of groups) {
    groups.set(
      remote,
      [...list].sort((a, b) =>
        remoteBranchShortName(a.name).localeCompare(remoteBranchShortName(b.name))
      )
    )
  }

  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

/** Groups remotes, then nests each remote's branches by slash path (like local). */
export function buildRemoteBranchTrees(branches: GitBranch[]): Map<string, BranchTreeNode[]> {
  const groups = buildRemoteBranchGroups(branches)
  const trees = new Map<string, BranchTreeNode[]>()
  for (const [remote, list] of groups) {
    trees.set(
      remote,
      buildBranchTree(list, (branch) => remoteBranchShortName(branch.name))
    )
  }
  return trees
}

function sortBranchTree(nodes: BranchTreeNode[]): BranchTreeNode[] {
  return nodes
    .map((node) =>
      node.type === 'folder' && node.children
        ? { ...node, children: sortBranchTree(node.children) }
        : node
    )
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

export function countBranchTreeNodes(nodes: BranchTreeNode[]): number {
  let count = 0
  for (const node of nodes) {
    if (node.type === 'branch') count++
    else if (node.children) count += countBranchTreeNodes(node.children)
  }
  return count
}

export function filterBranchTree(nodes: BranchTreeNode[], query: string): BranchTreeNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return nodes

  const filtered: BranchTreeNode[] = []
  for (const node of nodes) {
    if (node.type === 'branch') {
      const fullName = node.branch?.name ?? node.name
      if (fullName.toLowerCase().includes(q)) filtered.push(node)
    } else if (node.children) {
      const children = filterBranchTree(node.children, q)
      if (children.length > 0) {
        filtered.push({ ...node, children })
      } else if (node.name.toLowerCase().includes(q)) {
        filtered.push(node)
      }
    }
  }
  return filtered
}

export function matchesFilter(text: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return text.toLowerCase().includes(q)
}
