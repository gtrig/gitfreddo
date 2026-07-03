import { describe, expect, it } from 'vitest'
import { parseReflogLine } from './reflog'

describe('parseReflogLine', () => {
  it('parses a reflog line with selector and subject', () => {
    const line =
      'abc1234567890abcdef1234567890abcdef123456 HEAD@{0}\tcommit: Fix login bug'
    expect(parseReflogLine(line)).toEqual({
      hash: 'abc1234567890abcdef1234567890abcdef123456',
      shortHash: 'abc1234',
      selector: 'HEAD@{0}',
      subject: 'commit: Fix login bug',
      timestamp: 'HEAD@{0}'
    })
  })

  it('returns null for empty or malformed lines', () => {
    expect(parseReflogLine('')).toBeNull()
    expect(parseReflogLine('onlyhash')).toBeNull()
  })
})
