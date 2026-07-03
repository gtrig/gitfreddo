import { describe, expect, it } from 'vitest'
import {
  alignFileLinesForSplit,
  diffStatsFromUnified,
  parseUnifiedDiffRows,
  rowsToSplitDisplay
} from '@/lib/diff/unifiedDiff'

const sample = `--- a/src/a.go
+++ b/src/a.go
@@ -1,3 +1,4 @@
 package main
-func old() {}
+func new() {}
+func added() {}
 func kept() {}
`

describe('parseUnifiedDiffRows', () => {
  it('assigns old and new line numbers', () => {
    const rows = parseUnifiedDiffRows(sample)
    const remove = rows.find((row) => row.kind === 'remove')
    const add = rows.find((row) => row.kind === 'add')
    const context = rows.find((row) => row.kind === 'context' && row.content === 'package main')

    expect(context?.oldLine).toBe(1)
    expect(context?.newLine).toBe(1)
    expect(remove?.oldLine).toBe(2)
    expect(remove?.newLine).toBeNull()
    expect(add?.oldLine).toBeNull()
    expect(add?.newLine).toBe(2)
  })

  it('counts additions and deletions', () => {
    const stats = diffStatsFromUnified(sample)
    expect(stats.additions).toBe(2)
    expect(stats.deletions).toBe(1)
  })

  it('pairs remove/add rows for split display', () => {
    const rows = parseUnifiedDiffRows(sample)
    const split = rowsToSplitDisplay(rows)
    const paired = split.find((row) => row.leftText === 'func old() {}' && row.rightText === 'func new() {}')
    expect(paired).toBeTruthy()
  })
})

describe('alignFileLinesForSplit', () => {
  it('shows full before and after columns for changed files', () => {
    const oldText = 'alpha\nkeep\nold line\n'
    const newText = 'alpha\nkeep\nnew line\n'
    const split = alignFileLinesForSplit(oldText, newText)

    expect(split.find((row) => row.leftText === 'keep' && row.rightText === 'keep')).toBeTruthy()
    expect(split.find((row) => row.leftText === 'old line' && row.leftKind === 'remove')).toBeTruthy()
    expect(split.find((row) => row.rightText === 'new line' && row.rightKind === 'add')).toBeTruthy()
  })

  it('shows only the after column for added files', () => {
    const split = alignFileLinesForSplit('', 'new file\n')
    expect(split).toHaveLength(1)
    expect(split[0].leftText).toBeNull()
    expect(split[0].rightText).toBe('new file')
  })

  it('shows identical content on both sides for unchanged files', () => {
    const split = alignFileLinesForSplit('same\n', 'same\n')
    expect(split).toHaveLength(1)
    expect(split[0].leftText).toBe('same')
    expect(split[0].rightText).toBe('same')
  })
})
