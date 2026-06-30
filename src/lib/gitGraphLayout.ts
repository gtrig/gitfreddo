import type { GitCommit } from './types'

export const GRAPH_ROW_HEIGHT = 52

export interface GitGraphRow {
  key: string
  commit: GitCommit
  rowIndex: number
  column: number
  isHead: boolean
  isMerge: boolean
}

export interface GitGraphEdge {
  fromKey: string
  toKey: string
  fromColumn: number
  toColumn: number
  kind: 'parent' | 'merge'
}

export interface GitGraphLayout {
  rows: GitGraphRow[]
  edges: GitGraphEdge[]
  laneCount: number
  headKey: string | null
}

export function rowCenterY(rowIndex: number, rowHeight = GRAPH_ROW_HEIGHT): number {
  return rowIndex * rowHeight + rowHeight / 2
}

/** Map layout row index to the visual timeline row (0 = top). */
export function visualRowIndex(layoutRowIndex: number, showWorkingRow: boolean): number {
  return showWorkingRow ? layoutRowIndex + 1 : layoutRowIndex
}

export function graphHeight(rowCount: number, rowHeight = GRAPH_ROW_HEIGHT): number {
  return rowCount * rowHeight
}

function buildChildrenMap(commits: GitCommit[]): Map<string, string[]> {
  const children = new Map<string, string[]>()
  for (const commit of commits) {
    for (const parent of commit.parents) {
      const list = children.get(parent)
      if (list) {
        list.push(commit.hash)
      } else {
        children.set(parent, [commit.hash])
      }
    }
  }
  return children
}

function insertActiveBranch(
  branches: (string | null)[],
  nearColumn: number,
  commitSha: string,
  forbidden: Set<number>
): number {
  let offset = 1
  while (nearColumn - offset >= 0 || nearColumn + offset < branches.length) {
    const right = nearColumn + offset
    if (right < branches.length && branches[right] === null && !forbidden.has(right)) {
      branches[right] = commitSha
      return right
    }
    const left = nearColumn - offset
    if (left >= 0 && branches[left] === null && !forbidden.has(left)) {
      branches[left] = commitSha
      return left
    }
    offset += 1
  }
  branches.push(commitSha)
  return branches.length - 1
}

/**
 * Straight-branch lane assignment (GitKraken / gitamine style).
 * Commits are processed newest-first so child columns are known before parents.
 */
export function buildGitGraphLayout(commits: GitCommit[], head: string): GitGraphLayout {
  if (commits.length === 0) {
    return { rows: [], edges: [], laneCount: 1, headKey: head || null }
  }

  const parentsByHash = new Map(commits.map((commit) => [commit.hash, commit.parents]))
  const childrenByHash = buildChildrenMap(commits)
  const columnByHash = new Map<string, number>()
  const rowByHash = new Map<string, number>()

  const branches: (string | null)[] = []
  const activeNodes = new Map<string, Set<number>>()
  const activeNodesQueue: Array<[number, string]> = []

  let row = 0
  for (const commit of commits) {
    row += 1
    const commitSha = commit.hash
    const children = childrenByHash.get(commitSha) ?? []
    const branchChildren = children.filter(
      (child) => parentsByHash.get(child)?.[0] === commitSha
    )
    const mergeChildren = children.filter(
      (child) => parentsByHash.get(child)?.[0] !== commitSha
    )

    let highestMergeChild: string | undefined
    let highestMergeChildRow = Infinity
    for (const childSha of mergeChildren) {
      const childRow = rowByHash.get(childSha)
      if (childRow !== undefined && childRow < highestMergeChildRow) {
        highestMergeChildRow = childRow
        highestMergeChild = childSha
      }
    }
    const forbiddenIndices = highestMergeChild
      ? (activeNodes.get(highestMergeChild) ?? new Set<number>())
      : new Set<number>()

    let childToReplace: string | null = null
    let replaceColumn = Infinity
    if (commitSha === head) {
      childToReplace = '__head__'
      replaceColumn = 0
    } else {
      for (const childSha of branchChildren) {
        const childColumn = columnByHash.get(childSha)
        if (childColumn === undefined) continue
        if (!forbiddenIndices.has(childColumn) && childColumn < replaceColumn) {
          childToReplace = childSha
          replaceColumn = childColumn
        }
      }
    }

    let column: number
    if (childToReplace) {
      column = replaceColumn
      branches[column] = commitSha
    } else if (children.length > 0) {
      const childColumn = columnByHash.get(children[0]) ?? 0
      column = insertActiveBranch(branches, childColumn, commitSha, forbiddenIndices)
    } else {
      column = insertActiveBranch(branches, 0, commitSha, new Set())
    }

    activeNodesQueue.sort((left, right) => left[0] - right[0])
    while (activeNodesQueue.length > 0 && activeNodesQueue[0][0] < row) {
      const [, sha] = activeNodesQueue.shift()!
      activeNodes.delete(sha)
    }

    const occupiedColumns = [column, ...branchChildren.map((child) => columnByHash.get(child)!)]
    for (const occupied of activeNodes.values()) {
      for (const col of occupiedColumns) {
        occupied.add(col)
      }
    }
    activeNodes.set(commitSha, new Set())

    const parentRows = commit.parents
      .map((parent) => rowByHash.get(parent))
      .filter((parentRow): parentRow is number => parentRow !== undefined)
    if (parentRows.length > 0) {
      activeNodesQueue.push([Math.max(...parentRows), commitSha])
      activeNodesQueue.sort((left, right) => left[0] - right[0])
    }

    for (const childSha of branchChildren) {
      if (childSha !== childToReplace) {
        const childColumn = columnByHash.get(childSha)
        if (childColumn !== undefined) {
          branches[childColumn] = null
        }
      }
    }

    if (commit.parents.length === 0) {
      branches[column] = null
    }

    columnByHash.set(commitSha, column)
    rowByHash.set(commitSha, row)
  }

  const rows: GitGraphRow[] = commits.map((commit, index) => ({
    key: commit.hash,
    commit,
    rowIndex: index,
    column: columnByHash.get(commit.hash) ?? 0,
    isHead: commit.hash === head,
    isMerge: commit.parents.length > 1
  }))

  const rowByKey = new Map(rows.map((row) => [row.key, row]))
  const edges: GitGraphEdge[] = []

  for (const row of rows) {
    for (let index = 0; index < row.commit.parents.length; index += 1) {
      const parentHash = row.commit.parents[index]
      const parentRow = rowByKey.get(parentHash)
      if (!parentRow) continue

      edges.push({
        fromKey: row.key,
        toKey: parentHash,
        fromColumn: row.column,
        toColumn: parentRow.column,
        kind: index === 0 ? 'parent' : 'merge'
      })
    }
  }

  const laneCount = Math.max(1, branches.length)

  return {
    rows,
    edges,
    laneCount,
    headKey: head || commits[0]?.hash || null
  }
}
