import { describe, expect, it } from 'vitest'
import { buildLogGraphArgs, LOG_RECORD_SEPARATOR, parseLogGraphOutput } from './log'

describe('buildLogGraphArgs', () => {
  it('includes graph format flags', () => {
    const args = buildLogGraphArgs(500)
    expect(args[0]).toBe('log')
    expect(args).toContain('--all')
    expect(args).toContain('--shortstat')
    expect(args.some((arg) => arg.startsWith('--max-count=500'))).toBe(true)
    expect(args.some((arg) => arg.includes(LOG_RECORD_SEPARATOR))).toBe(true)
  })
})

describe('parseLogGraphOutput', () => {
  it('parses a single commit record', () => {
    const block = [
      'abc1234567890abcdef1234567890abcdef12345678',
      '',
      'Initial commit',
      'Alice',
      'alice@example.com',
      '2024-01-01T00:00:00+00:00',
      'Alice',
      'alice@example.com',
      '2024-01-01T00:00:00+00:00',
      'N',
      '',
      '',
      'HEAD -> main'
    ].join('\x1f')

    const commits = parseLogGraphOutput(`${block}${LOG_RECORD_SEPARATOR}`)
    expect(commits).toHaveLength(1)
    expect(commits[0]?.hash).toBe('abc1234567890abcdef1234567890abcdef12345678')
    expect(commits[0]?.subject).toBe('Initial commit')
    expect(commits[0]?.refs).toContain('HEAD -> main')
  })
})
