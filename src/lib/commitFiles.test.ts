import { describe, expect, it } from 'vitest'
import { parseCommitNameStatus } from './commitFiles'

describe('parseCommitNameStatus', () => {
  it('parses added, modified, and deleted files', () => {
    const files = parseCommitNameStatus('M\tsrc/app.ts\nA\tsrc/new.ts\nD\tsrc/old.ts')
    expect(files).toEqual([
      { path: 'src/app.ts', kind: 'changed' },
      { path: 'src/new.ts', kind: 'added' },
      { path: 'src/old.ts', kind: 'removed' }
    ])
  })

  it('uses the destination path for renames', () => {
    const files = parseCommitNameStatus('R100\told-name.ts\tnew-name.ts')
    expect(files).toEqual([{ path: 'new-name.ts', kind: 'changed' }])
  })
})
