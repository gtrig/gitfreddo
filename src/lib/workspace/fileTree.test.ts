import { describe, expect, it } from 'vitest'
import { buildFileTree, countCommitFiles, commitMessageBody, parsePathForTree, sortCommitFiles, collectFolderPaths, buildCommitMessage, emptyCommitFileCounts } from '@/lib/workspace/fileTree'
import type { CommitFileItem } from '@/lib/types'

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

  it('includes untracked directories with trailing slashes', () => {
    const tree = buildFileTree([
      { path: 'src/a.ts', kind: 'changed' },
      { path: '.cursor/', kind: 'added' }
    ])

    expect(tree.counts).toEqual({ added: 1, changed: 1, removed: 0 })
    const cursor = tree.children.find((child) => child.type === 'file' && child.path === '.cursor/')
    expect(cursor?.type === 'file' && cursor.name).toBe('.cursor/')
  })

  it('nests deeply untracked file paths', () => {
    const tree = buildFileTree([
      { path: '.cursor/plans/non-advanced_git_features_0904ddc8.plan.md', kind: 'added' }
    ])

    const cursor = tree.children.find((child) => child.type === 'folder' && child.name === '.cursor')
    expect(cursor?.type === 'folder').toBe(true)
    if (cursor?.type !== 'folder') return

    const plans = cursor.children.find((child) => child.type === 'folder' && child.name === 'plans')
    expect(plans?.type === 'folder').toBe(true)
    if (plans?.type !== 'folder') return

    expect(plans.children).toHaveLength(1)
    expect(plans.children[0]?.type === 'file' && plans.children[0].path).toBe(
      '.cursor/plans/non-advanced_git_features_0904ddc8.plan.md'
    )
  })
})

describe('parsePathForTree', () => {
  it('treats trailing slashes as directories', () => {
    expect(parsePathForTree('.cursor/')).toEqual({
      parentFolders: [],
      leafName: '.cursor',
      isDirectory: true
    })
    expect(parsePathForTree('src/nested/')).toEqual({
      parentFolders: ['src'],
      leafName: 'nested',
      isDirectory: true
    })
  })
})

describe('commitMessageBody', () => {
  it('returns lines after the subject', () => {
    expect(
      commitMessageBody('Fix graph\n\nDetails here.', 'Fix graph')
    ).toBe('Details here.')
  })
})

describe('sortCommitFiles', () => {
  it('sorts paths ascending or descending', () => {
    const files = [{ path: 'z.ts', kind: 'added' as const }, { path: 'a.ts', kind: 'added' as const }]
    expect(sortCommitFiles(files).map((file) => file.path)).toEqual(['a.ts', 'z.ts'])
    expect(sortCommitFiles(files, false).map((file) => file.path)).toEqual(['z.ts', 'a.ts'])
  })
})

describe('collectFolderPaths', () => {
  it('returns nested folder paths', () => {
    const tree = buildFileTree([
      { path: 'src/lib/a.ts', kind: 'added' },
      { path: 'src/b.ts', kind: 'changed' }
    ])
    expect(collectFolderPaths(tree)).toEqual(['src', 'src/lib'])
  })
})

describe('buildCommitMessage', () => {
  it('joins summary and body with a blank line', () => {
    expect(buildCommitMessage('feat: add auth', 'Login form')).toBe('feat: add auth\n\nLogin form')
    expect(buildCommitMessage('fix bug', '')).toBe('fix bug')
  })
})

describe('emptyCommitFileCounts', () => {
  it('starts at zero', () => {
    expect(emptyCommitFileCounts()).toEqual({ added: 0, changed: 0, removed: 0 })
  })
})
