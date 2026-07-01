import { describe, expect, it } from 'vitest'
import { buildLogGraphArgs, LOG_RECORD_SEPARATOR, parseLogGraphOutput } from './gitLog'

function logRecord(
  fields: Partial<{
    hash: string
    parents: string
    subject: string
    authorName: string
    authorEmail: string
    authorDate: string
    committerName: string
    committerEmail: string
    committerDate: string
    signature: string
    notes: string
    body: string
    refs: string
    shortstat: string
  }> = {}
): string {
  const line = [
    fields.hash ?? 'abc123',
    fields.parents ?? 'def456',
    fields.subject ?? 'Fix bug',
    fields.authorName ?? 'Alice',
    fields.authorEmail ?? 'alice@test.com',
    fields.authorDate ?? '2024-01-01T00:00:00+00:00',
    fields.committerName ?? 'Alice',
    fields.committerEmail ?? 'alice@test.com',
    fields.committerDate ?? '2024-01-01T00:00:00+00:00',
    fields.signature ?? 'N',
    fields.notes ?? '',
    fields.body ?? '',
    fields.refs ?? 'HEAD -> main'
  ].join('\x1f')

  return fields.shortstat ? `${line}\n\n${fields.shortstat}` : line
}

describe('buildLogGraphArgs', () => {
  it('includes all refs, shortstat, and topological ordering for branch-aware graphs', () => {
    const args = buildLogGraphArgs(500)
    expect(args).toContain('--all')
    expect(args).toContain('--topo-order')
    expect(args).toContain('--shortstat')
    expect(args).not.toContain('--date-order')
    expect(args).toContain('--max-count=500')
  })
})

describe('parseLogGraphOutput', () => {
  it('parses commits separated by record delimiter', () => {
    const stdout = [
      logRecord({ hash: 'abc123', parents: 'def456', refs: 'HEAD -> main' }),
      logRecord({ hash: 'def456', parents: '', refs: '' })
    ].join(LOG_RECORD_SEPARATOR)

    const commits = parseLogGraphOutput(stdout)
    expect(commits).toHaveLength(2)
    expect(commits[0]?.hash).toBe('abc123')
    expect(commits[0]?.parents).toEqual(['def456'])
    expect(commits[0]?.refs).toContain('HEAD -> main')
    expect(commits[0]?.committer.name).toBe('Alice')
    expect(commits[1]?.parents).toEqual([])
  })

  it('preserves tag decorations from git log', () => {
    const stdout = `${logRecord({ refs: 'tag: v1.0.0' })}${LOG_RECORD_SEPARATOR}`

    expect(parseLogGraphOutput(stdout)[0]?.refs).toEqual(['tag: v1.0.0'])
  })

  it('parses shortstat lines appended to each commit block', () => {
    const stdout = `${logRecord({ shortstat: '2 files changed, 3 insertions(+), 1 deletion(-)' })}${LOG_RECORD_SEPARATOR}`

    expect(parseLogGraphOutput(stdout)[0]?.stats).toEqual({
      filesChanged: 2,
      insertions: 3,
      deletions: 1
    })
  })

  it('preserves multiline commit bodies as a single field', () => {
    const stdout = `${logRecord({ body: 'Line one\nLine two' })}${LOG_RECORD_SEPARATOR}`

    const commit = parseLogGraphOutput(stdout)[0]
    expect(commit?.body).toBe('Line one\nLine two')
    expect(commit?.message).toBe('Fix bug\n\nLine one\nLine two')
  })

  it('does not split a single commit when subject text is long', () => {
    const stdout = `${logRecord({ subject: 'line '.repeat(40).trim() })}${LOG_RECORD_SEPARATOR}`

    expect(parseLogGraphOutput(stdout)).toHaveLength(1)
  })
})
