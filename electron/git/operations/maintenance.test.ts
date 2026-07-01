import { describe, expect, it } from 'vitest'
import { parseFsckUnreachable } from './maintenance'

describe('parseFsckUnreachable', () => {
  it('parses unreachable commits, blobs, and trees', () => {
    const hash1 = 'a'.repeat(40)
    const hash2 = 'b'.repeat(40)
    const stdout = [
      `unreachable commit ${hash1}`,
      'unreachable blob 1111111111111111111111111111111111111111',
      'unreachable tree 2222222222222222222222222222222222222222',
      `unreachable commit ${hash2}`
    ].join('\n')

    expect(parseFsckUnreachable(stdout)).toEqual({
      commitHashes: [hash1, hash2],
      blobCount: 1,
      treeCount: 1
    })
  })

  it('returns empty counts for blank output', () => {
    expect(parseFsckUnreachable('')).toEqual({
      commitHashes: [],
      blobCount: 0,
      treeCount: 0
    })
  })
})
