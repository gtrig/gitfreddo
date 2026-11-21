import { describe, expect, it } from 'vitest'
import {
  alignFileLinesForSplit,
  buildFileViewDiff,
  buildRemovedFileDiff,
  buildUnifiedDiff,
  parseUnifiedDiff
} from './unifiedDiff'

describe('buildUnifiedDiff hunks', () => {
  it('reports a single replaced line that is followed by unchanged lines', () => {
    const diff = buildUnifiedDiff('a\nb\nc\nd\ne\n', 'a\nZ\nc\nd\ne\n', 'f.txt')
    expect(diff).toBe('--- a/f.txt\n+++ b/f.txt\n@@ -2,1 +2,1 @@\n-b\n+Z')
  })

  it('reports a line replaced by two lines', () => {
    const diff = buildUnifiedDiff('a\nb\nc\nd\n', 'a\nX\nY\nc\nd\n', 'f.txt')
    expect(diff).toBe('--- a/f.txt\n+++ b/f.txt\n@@ -2,1 +2,2 @@\n-b\n+X\n+Y')
  })

  it('produces only headers for identical text', () => {
    expect(buildUnifiedDiff('same\n', 'same\n', 'f.txt')).toBe('--- a/f.txt\n+++ b/f.txt')
  })

  it('uses the line before as the start of an empty side', () => {
    expect(buildUnifiedDiff('a\nb\nc\n', 'a\n', 'f.txt')).toBe(
      '--- a/f.txt\n+++ b/f.txt\n@@ -2,2 +1,0 @@\n-b\n-c'
    )
    expect(buildUnifiedDiff('a\n', 'a\nb\nc\n', 'f.txt')).toBe(
      '--- a/f.txt\n+++ b/f.txt\n@@ -1,0 +2,2 @@\n+b\n+c'
    )
  })

  it('splits separate changes into separate hunks', () => {
    const diff = buildUnifiedDiff('a\nb\nc\nd\ne\n', 'a\nB\nc\nd\nE\n', 'f.txt')
    expect(diff.match(/^@@/gm)).toHaveLength(2)
    expect(diff).toContain('@@ -5,1 +5,1 @@\n-e\n+E')
  })
})

describe('file-level diff builders', () => {
  it('handles empty removed and empty viewed files', () => {
    expect(buildRemovedFileDiff('gone.txt', '')).toBe('--- a/gone.txt\n+++ /dev/null\n@@ -0,0 +0,0 @@')
    expect(buildFileViewDiff('empty.txt', '')).toBe('--- a/empty.txt\n+++ b/empty.txt\n@@ empty file @@')
  })

  it('keeps header lines as-is when flattening rows', () => {
    const lines = parseUnifiedDiff('diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-old\n+new\n')
    expect(lines.some((line) => line.text.startsWith('@@'))).toBe(true)
    expect(lines.map((line) => line.text)).toEqual(expect.arrayContaining(['-old', '+new']))
  })
})

describe('alignFileLinesForSplit', () => {
  it('pads the shorter side when one file has extra trailing lines', () => {
    const removedTail = alignFileLinesForSplit('a\nb\nc\n', 'a\n')
    expect(removedTail.length).toBeGreaterThanOrEqual(3)
    const addedTail = alignFileLinesForSplit('a\n', 'a\nb\nc\n')
    expect(addedTail.length).toBeGreaterThanOrEqual(3)
  })

  it('aligns interleaved deletions and insertions', () => {
    const rows = alignFileLinesForSplit('a\nold1\nb\nold2\n', 'a\nnew1\nb\nnew2\nextra\n')
    expect(rows.length).toBeGreaterThanOrEqual(5)
  })
})
