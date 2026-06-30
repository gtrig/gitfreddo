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

export function graphHeight(rowCount: number, rowHeight = GRAPH_ROW_HEIGHT): number {
  return rowCount * rowHeight
}

/** Assign commit lanes (newest-first log order) for a simple git graph. */
export function buildGitGraphLayout(commits: GitCommit[], head: string): GitGraphLayout {
  if (commits.length === 0) {
    return { rows: [], edges: [], laneCount: 1, headKey: head || null }
  }

  const columnByHash = new Map<string, number>()
  const active = new Map<number, string>()
  let maxColumn = 0

  for (const commit of commits) {
    let column = [...active.entries()].find(([, hash]) => hash === commit.hash)?.[0]
    if (column === undefined) {
      column = 0
      while (active.has(column)) {
        column += 1
      }
    } else {
      active.delete(column)
    }

    columnByHash.set(commit.hash, column)
    maxColumn = Math.max(maxColumn, column)

    const parents = commit.parents
    if (parents.length > 0) {
      active.set(column, parents[0])
      columnByHash.set(parents[0], column)
    }

    for (let index = 1; index < parents.length; index += 1) {
      const parent = parents[index]
      let parentColumn = [...active.entries()].find(([, hash]) => hash === parent)?.[0]
      if (parentColumn === undefined) {
        parentColumn = maxColumn + 1
        maxColumn = parentColumn
      }
      active.set(parentColumn, parent)
      columnByHash.set(parent, parentColumn)
    }
  }

  const rows: GitGraphRow[] = commits.map((commit, index) => ({
    key: commit.hash,
    commit,
    rowIndex: index + 1,
    column: columnByHash.get(commit.hash) ?? 0,
    isHead: commit.hash === head,
    isMerge: commit.parents.length > 1
  }))

  const rowByHash = new Map(rows.map((row) => [row.key, row]))
  const edges: GitGraphEdge[] = []

  for (const row of rows) {
    for (let index = 0; index < row.commit.parents.length; index += 1) {
      const parentHash = row.commit.parents[index]
      const parentRow = rowByHash.get(parentHash)
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

  return {
    rows,
    edges,
    laneCount: maxColumn + 1,
    headKey: head || commits[0]?.hash || null
  }
}
