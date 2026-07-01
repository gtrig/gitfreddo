import { describe, expect, it } from 'vitest'
import { parseBlamePorcelain } from './blame'

describe('parseBlamePorcelain', () => {
  it('parses line porcelain output', () => {
    const stdout = [
      'abc1234567890123456789012345678901234567890 1 1 1',
      'author Alice',
      'author-mail <alice@test.com>',
      'author-time 1700000000 +0000',
      'summary init',
      '\tline one',
      'def1234567890123456789012345678901234567890 2 2 1',
      'author Bob',
      'author-mail <bob@test.com>',
      'author-time 1700000001 +0000',
      'summary fix',
      '\tline two'
    ].join('\n')

    const lines = parseBlamePorcelain(stdout)
    expect(lines).toHaveLength(2)
    expect(lines[0]?.line).toBe(1)
    expect(lines[0]?.content).toBe('line one')
    expect(lines[1]?.author).toBe('Bob')
  })
})
