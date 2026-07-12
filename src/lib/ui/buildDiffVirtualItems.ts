import { diffRowCommentTarget, groupRowsByHunk, type DiffRow } from '@/lib/diff/unifiedDiff'
import { lineCommentTargetKey } from '@/lib/github/prTimeline'

export interface DiffVirtualHunk {
  kind: 'hunk'
  content: string
  groupIndex: number
}

export interface DiffVirtualRow {
  kind: 'row'
  row: DiffRow
  groupIndex: number
  rowInGroup: number
  commentTargetKey: string | null
}

export interface DiffVirtualComments {
  kind: 'comments'
  commentTargetKey: string
  groupIndex: number
  rowInGroup: number
}

export type DiffVirtualItem = DiffVirtualHunk | DiffVirtualRow | DiffVirtualComments

/**
 * Flattens unified diff rows into a flat list of virtual items for use with a
 * virtualizer. Optionally threads comment-block items after the rows they belong to
 * when a set of comment target keys is provided.
 */
export function buildDiffVirtualItems(
  rows: DiffRow[],
  commentTargetKeys?: Set<string>
): DiffVirtualItem[] {
  const groups = groupRowsByHunk(rows)
  const items: DiffVirtualItem[] = []

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex]!
    const hunkRow = group[0]
    if (hunkRow?.kind === 'hunk') {
      items.push({ kind: 'hunk', content: hunkRow.content, groupIndex })
    }

    const codeRows = group.filter((r) => r.kind !== 'hunk')
    for (let rowInGroup = 0; rowInGroup < codeRows.length; rowInGroup++) {
      const row = codeRows[rowInGroup]!
      const target = diffRowCommentTarget(row)
      const targetKey = target ? lineCommentTargetKey(target.side, target.line) : null

      items.push({ kind: 'row', row, groupIndex, rowInGroup, commentTargetKey: targetKey })

      if (targetKey && commentTargetKeys?.has(targetKey)) {
        items.push({ kind: 'comments', commentTargetKey: targetKey, groupIndex, rowInGroup })
      }
    }
  }

  return items
}
