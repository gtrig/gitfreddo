import { describe, expect, it } from 'vitest'
import {
  alignFileLinesForSplit,
  buildAddedFileDiff,
  buildFileViewDiff,
  buildHunkPatch,
  buildRemovedFileDiff,
  buildUnifiedDiff,
  diffStatsFromRows,
  diffStatsFromSplitRows,
  diffStatsFromUnified,
  groupRowsByHunk,
  headHashForPath,
  isBinaryContent,
  parseUnifiedDiff,
  parseUnifiedDiffRows,
  rowsToSplitDisplay,
  splitRowsForDisplay
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

describe('buildUnifiedDiff', () => {
  it('builds a unified diff for simple edits', () => {
    const diff = buildUnifiedDiff('alpha\nbeta\n', 'alpha\ngamma\n', 'src/file.ts')
    expect(diff).toContain('--- a/src/file.ts')
    expect(diff).toContain('-beta')
    expect(diff).toContain('+gamma')
    expect(diffStatsFromUnified(diff)).toEqual({ additions: 1, deletions: 1 })
  })
})

describe('added and removed file diffs', () => {
  it('builds added file diff', () => {
    const diff = buildAddedFileDiff('new.ts', 'hello\nworld\n')
    expect(diff).toContain('+++ b/new.ts')
    expect(diff).toContain('+hello')
    expect(diffStatsFromUnified(diff).additions).toBe(2)
  })

  it('builds removed file diff', () => {
    const diff = buildRemovedFileDiff('old.ts', 'line\n')
    expect(diff).toContain('--- a/old.ts')
    expect(diff).toContain('-line')
    expect(diffStatsFromUnified(diff).deletions).toBe(1)
  })

  it('handles empty added and removed files', () => {
    expect(buildAddedFileDiff('empty.ts', '')).toContain('@@ -0,0 +0,0 @@')
    expect(buildRemovedFileDiff('empty.ts', '')).toContain('@@ -0,0 +0,0 @@')
  })
})

describe('buildFileViewDiff', () => {
  it('renders file contents as context lines', () => {
    const diff = buildFileViewDiff('readme.md', 'title\n')
    expect(diff).toContain(' title')
    expect(parseUnifiedDiffRows(diff).some((row) => row.kind === 'context')).toBe(true)
  })
})

describe('parseUnifiedDiff', () => {
  it('maps rows back to diff line text', () => {
    const lines = parseUnifiedDiff(sample)
    expect(lines.some((line) => line.text === '+func new() {}')).toBe(true)
  })
})

describe('hunk helpers', () => {
  const rows = parseUnifiedDiffRows(sample)

  it('groups rows by hunk', () => {
    const groups = groupRowsByHunk(rows)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.some((row) => row.kind === 'remove')).toBe(true)
  })

  it('builds hunk patches and split rows', () => {
    const patch = buildHunkPatch('src/a.go', rows)
    expect(patch).toContain('@@')
    const split = splitRowsForDisplay(rows)
    expect(diffStatsFromSplitRows(split)).toEqual(diffStatsFromRows(rows))
    expect(rowsToSplitDisplay(rows).length).toBeGreaterThan(0)
  })
})

describe('isBinaryContent', () => {
  it('detects null bytes', () => {
    expect(isBinaryContent('text')).toBe(false)
    expect(isBinaryContent('bin\0ary')).toBe(true)
  })
})

describe('headHashForPath', () => {
  const diff = {
    added: [{ path: 'new.ts', hash: 'aaa' }],
    removed: [{ path: 'old.ts', hash: 'bbb' }],
    changed: [{ path: 'changed.ts', old_hash: 'ccc', new_hash: 'ddd' }],
    unchanged: [{ path: 'same.ts', hash: 'eee' }]
  }

  it('resolves hashes from diff buckets', () => {
    expect(headHashForPath('old.ts', diff)).toBe('bbb')
    expect(headHashForPath('same.ts', diff)).toBe('eee')
    expect(headHashForPath('changed.ts', diff)).toBe('ccc')
    expect(headHashForPath('new.ts', diff)).toBeNull()
    expect(headHashForPath('missing.ts', diff)).toBeNull()
  })
})
