import { describe, expect, it } from 'vitest'
import { buildFileTree } from '@/lib/workspace/fileTree'
import { flattenVisibleFileTree } from './flattenVisibleFileTree'
import type { CommitFileItem } from '@/lib/types'

function file(path: string, kind: CommitFileItem['kind'] = 'changed'): CommitFileItem {
  return { path, kind }
}

describe('flattenVisibleFileTree', () => {
  it('returns empty array for empty tree', () => {
    const tree = buildFileTree([])
    expect(flattenVisibleFileTree(tree, new Set())).toEqual([])
  })

  it('returns flat files at depth 0 when no folders', () => {
    const tree = buildFileTree([file('a.ts'), file('b.ts')])
    const items = flattenVisibleFileTree(tree, new Set())
    expect(items.map((i) => i.id)).toEqual(['file:a.ts', 'file:b.ts'])
    expect(items.every((i) => i.depth === 0)).toBe(true)
    expect(items.every((i) => i.kind === 'file')).toBe(true)
  })

  it('shows folder at depth 0 but hides its children when collapsed', () => {
    const tree = buildFileTree([file('src/a.ts'), file('src/b.ts')])
    const items = flattenVisibleFileTree(tree, new Set())
    expect(items).toHaveLength(1)
    expect(items[0]?.kind).toBe('folder')
    expect(items[0]?.id).toBe('folder:src')
    expect(items[0]?.depth).toBe(0)
  })

  it('shows folder children when expanded', () => {
    const tree = buildFileTree([file('src/a.ts'), file('src/b.ts')])
    const items = flattenVisibleFileTree(tree, new Set(['src']))
    expect(items).toHaveLength(3)
    expect(items[0]?.kind).toBe('folder')
    expect(items[1]?.kind).toBe('file')
    expect(items[1]?.depth).toBe(1)
    expect(items[2]?.kind).toBe('file')
    expect(items[2]?.depth).toBe(1)
  })

  it('handles nested folders with partial expansion', () => {
    const tree = buildFileTree([
      file('a/b/c.ts'),
      file('a/d.ts'),
      file('e.ts')
    ])
    // Only expand 'a', not 'a/b'
    const items = flattenVisibleFileTree(tree, new Set(['a']))
    const ids = items.map((i) => i.id)
    expect(ids).toContain('folder:a')
    expect(ids).toContain('folder:a/b')
    expect(ids).toContain('file:a/d.ts')
    expect(ids).not.toContain('file:a/b/c.ts')
  })

  it('shows deeply nested files when all ancestors expanded', () => {
    const tree = buildFileTree([file('a/b/c.ts')])
    const items = flattenVisibleFileTree(tree, new Set(['a', 'a/b']))
    expect(items.map((i) => i.id)).toEqual(['folder:a', 'folder:a/b', 'file:a/b/c.ts'])
    expect(items[2]?.depth).toBe(2)
  })

  it('assigns unique ids using path', () => {
    const tree = buildFileTree([file('x/y.ts'), file('x/z.ts')])
    const items = flattenVisibleFileTree(tree, new Set(['x']))
    const ids = items.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('preserves sorted order from buildFileTree', () => {
    const tree = buildFileTree([file('z.ts'), file('a.ts'), file('m.ts')])
    const items = flattenVisibleFileTree(tree, new Set())
    const paths = items.map((i) => i.node.path)
    expect(paths).toEqual([...paths].sort())
  })
})
