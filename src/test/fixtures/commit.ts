import type { GitCommit } from '@/lib/types'

export function makeCommit(overrides: Partial<GitCommit> = {}): GitCommit {
  const author = { name: 'Author', email: 'a@b.c', date: '2024-06-01T12:00:00Z' }
  return {
    hash: 'abc1234567890abcdef1234567890abcdef123456',
    shortHash: 'abc1234',
    parents: [],
    message: 'Subject line\n\nBody text',
    subject: 'Subject line',
    body: 'Body text',
    author,
    committer: author,
    signature: null,
    notes: '',
    stats: { filesChanged: 2, insertions: 10, deletions: 3 },
    refs: ['main'],
    ...overrides
  }
}
