import { describe, expect, it } from 'vitest'
import { buildExplainCommitInputs } from '@/lib/ai/explainCommit'
import type { GitCommit } from '@/lib/types'

const commit: GitCommit = {
  hash: 'abc123def456',
  shortHash: 'abc123d',
  subject: 'Add login helper',
  message: 'Add login helper',
  body: '',
  author: { name: 'Ada Lovelace', email: 'ada@example.com', date: '2026-01-01T00:00:00Z' },
  committer: { name: 'Ada Lovelace', email: 'ada@example.com', date: '2026-01-01T00:00:00Z' },
  parents: ['parent'],
  signature: null,
  notes: '',
  stats: null,
  refs: []
}

describe('buildExplainCommitInputs', () => {
  it('maps commit metadata and optional file paths', () => {
    expect(buildExplainCommitInputs([commit], { [commit.hash]: ['src/auth.ts'] })).toEqual([
      {
        hash: 'abc123def456',
        shortHash: 'abc123d',
        subject: 'Add login helper',
        author: 'Ada Lovelace',
        date: '2026-01-01T00:00:00Z',
        filePaths: ['src/auth.ts']
      }
    ])
  })
})
