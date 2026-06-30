import { describe, expect, it } from 'vitest'
import { buildLogGraphArgs, LOG_RECORD_SEPARATOR, parseLogGraphOutput } from './gitLog'

describe('buildLogGraphArgs', () => {
  it('includes all refs and topological ordering for branch-aware graphs', () => {
    const args = buildLogGraphArgs(500)
    expect(args).toContain('--all')
    expect(args).toContain('--topo-order')
    expect(args).not.toContain('--date-order')
    expect(args).toContain('--max-count=500')
  })
})

describe('parseLogGraphOutput', () => {
  it('parses commits separated by record delimiter', () => {
    const stdout = [
      'abc123\x1fdef456\x1fFix bug\x1fAlice\x1falice@test.com\x1f2024-01-01T00:00:00+00:00\x1fHEAD -> main',
      'def456\x1f\x1fInitial commit\x1fBob\x1fbob@test.com\x1f2023-12-01T00:00:00+00:00\x1f'
    ].join(LOG_RECORD_SEPARATOR)

    const commits = parseLogGraphOutput(stdout)
    expect(commits).toHaveLength(2)
    expect(commits[0]?.hash).toBe('abc123')
    expect(commits[0]?.parents).toEqual(['def456'])
    expect(commits[0]?.refs).toContain('HEAD -> main')
    expect(commits[1]?.parents).toEqual([])
  })

  it('does not split a single commit when subject text is long', () => {
    const stdout = `aaa111\x1f\x1f${'line '.repeat(40).trim()}\x1fAuthor\x1fa@b.c\x1f2024-01-01T00:00:00+00:00\x1f${LOG_RECORD_SEPARATOR}`

    expect(parseLogGraphOutput(stdout)).toHaveLength(1)
  })
})
