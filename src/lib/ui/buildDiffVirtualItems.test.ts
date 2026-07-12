import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffRows } from '@/lib/diff/unifiedDiff'
import { buildDiffVirtualItems } from './buildDiffVirtualItems'

const SAMPLE_DIFF = `--- a/foo.ts
+++ b/foo.ts
@@ -1,3 +1,3 @@
 context
-old line
+new line
 context2`

describe('buildDiffVirtualItems', () => {
  it('returns empty array for empty rows', () => {
    expect(buildDiffVirtualItems([])).toEqual([])
  })

  it('produces hunk item followed by row items', () => {
    const rows = parseUnifiedDiffRows(SAMPLE_DIFF)
    const items = buildDiffVirtualItems(rows)
    expect(items[0]?.kind).toBe('hunk')
    expect(items.slice(1).every((i) => i.kind === 'row')).toBe(true)
  })

  it('produces one item per non-hunk, non-header row', () => {
    const rows = parseUnifiedDiffRows(SAMPLE_DIFF)
    const codeRows = rows.filter((r) => r.kind !== 'hunk' && r.kind !== 'header')
    const items = buildDiffVirtualItems(rows)
    const rowItems = items.filter((i) => i.kind === 'row')
    expect(rowItems).toHaveLength(codeRows.length)
  })

  it('assigns correct groupIndex to all items in the same hunk', () => {
    const rows = parseUnifiedDiffRows(SAMPLE_DIFF)
    const items = buildDiffVirtualItems(rows)
    expect(items.every((i) => i.groupIndex === 0)).toBe(true)
  })

  it('inserts comments item after a row when its key is in commentTargetKeys', () => {
    const rows = parseUnifiedDiffRows(SAMPLE_DIFF)
    const items = buildDiffVirtualItems(rows)
    const rowItems = items.filter((i) => i.kind === 'row')

    const firstRowWithTarget = rowItems.find(
      (i) => i.kind === 'row' && i.commentTargetKey !== null
    )
    if (!firstRowWithTarget || firstRowWithTarget.kind !== 'row') return

    const key = firstRowWithTarget.commentTargetKey!
    const withComments = buildDiffVirtualItems(rows, new Set([key]))
    const idxRow = withComments.findIndex(
      (i) => i.kind === 'row' && i.commentTargetKey === key
    )
    expect(withComments[idxRow + 1]?.kind).toBe('comments')
    expect((withComments[idxRow + 1] as { kind: 'comments'; commentTargetKey: string })?.commentTargetKey).toBe(key)
  })

  it('does not insert comments item when key is not in commentTargetKeys', () => {
    const rows = parseUnifiedDiffRows(SAMPLE_DIFF)
    const items = buildDiffVirtualItems(rows, new Set())
    expect(items.every((i) => i.kind !== 'comments')).toBe(true)
  })

  it('handles multiple hunks', () => {
    const multiHunkDiff = `--- a/foo.ts
+++ b/foo.ts
@@ -1,2 +1,2 @@
-old1
+new1
@@ -10,2 +10,2 @@
-old2
+new2`
    const rows = parseUnifiedDiffRows(multiHunkDiff)
    const items = buildDiffVirtualItems(rows)
    const hunks = items.filter((i) => i.kind === 'hunk')
    expect(hunks).toHaveLength(2)
    expect(hunks[0]?.groupIndex).toBe(0)
    expect(hunks[1]?.groupIndex).toBe(1)
  })
})
