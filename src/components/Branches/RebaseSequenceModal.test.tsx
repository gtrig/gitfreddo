import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { RebaseSequenceModal } from './RebaseSequenceModal'
import { renderWithProviders } from '@/test/render'
import type { GitCommit } from '@/lib/types'

const commits: GitCommit[] = [
  {
    hash: 'abc1234567890abcdef1234567890abcdef123456',
    shortHash: 'abc1234',
    parents: [],
    subject: 'First',
    body: '',
    message: 'First',
    author: { name: 'A', email: 'a@test.com', date: '2024-01-01T00:00:00Z' },
    committer: { name: 'A', email: 'a@test.com', date: '2024-01-01T00:00:00Z' },
    refs: [],
    notes: '',
    signature: null,
    stats: null
  }
]

describe('RebaseSequenceModal', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders interactive rebase title', () => {
    renderWithProviders(<RebaseSequenceModal open commits={commits} onClose={() => undefined} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/interactive rebase/i)).toBeInTheDocument()
  })
})
