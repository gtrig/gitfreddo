import { describe, expect, it } from 'vitest'
import { discardablePaths, pathsUnderFolderPrefix } from './workingTreePaths'
import type { GitFileChange } from './types'

function file(path: string, status: GitFileChange['status']): GitFileChange {
  return { path, status }
}

describe('workingTreePaths', () => {
  it('collects discardable paths excluding untracked and conflicted', () => {
    const files = [
      file('a.ts', 'modified'),
      file('b.ts', 'untracked'),
      file('c.ts', 'conflicted'),
      file('d.ts', 'deleted')
    ]

    expect(discardablePaths(files)).toEqual(['a.ts', 'd.ts'])
  })

  it('collects paths under a folder prefix', () => {
    const files = [
      file('src/a.ts', 'modified'),
      file('src/lib/b.ts', 'modified'),
      file('docs/readme.md', 'modified'),
      file('src', 'added')
    ]

    expect(pathsUnderFolderPrefix(files, 'src')).toEqual(['src/a.ts', 'src/lib/b.ts', 'src'])
  })
})
