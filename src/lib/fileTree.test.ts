import { describe, expect, it } from 'vitest'
import { buildFileTree, countCommitFiles, commitMessageBody } from './fileTree'
import type { CommitFileItem } from './types'

describe('countCommitFiles', () => {
  it('totals added, changed, and removed files', () => {
    const files: CommitFileItem[] = [
      { path: 'a.ts', kind: 'added' },
      { path: 'b.ts', kind: 'changed' },
      { path: 'c.ts', kind: 'removed' }
    ]
    expect(countCommitFiles(files)).toEqual({ added: 1, changed: 1, removed: 1 })
  })
})

describe('buildFileTree', () => {
  it('groups files by directory and rolls up counts', () => {
    const tree = buildFileTree([
      { path: 'src/a.ts', kind: 'changed' },
      { path: 'src/lib/b.ts', kind: 'added' },
      { path: 'shared/c.ts', kind: 'added' }
    ])

    expect(tree.children).toHaveLength(2)
    const src = tree.children.find((child) => child.type === 'folder' && child.name === 'src')
    expect(src?.type === 'folder' && src.counts).toEqual({ added: 1, changed: 1, removed: 0 })
  })
})

describe('commitMessageBody', () => {
  it('returns lines after the subject', () => {
    expect(
      commitMessageBody('Fix graph\n\nDetails here.', 'Fix graph')
    ).toBe('Details here.')
  })
})
