import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PickMergeParentModal } from './PickMergeParentModal'
import { renderWithProviders } from '@/test/render'
import type { GitCommit } from '@/lib/types'

const mergeCommit: GitCommit = {
  hash: 'merge1234567890abcdef1234567890abcd',
  shortHash: 'merge12',
  parents: ['parent1hash1234567890abcdef12345678', 'parent2hash1234567890abcdef12345678'],
  subject: 'Merge branch side',
  body: '',
  message: 'Merge branch side',
  author: { name: 'A', email: 'a@test.com', date: '2024-01-01T00:00:00Z' },
  committer: { name: 'A', email: 'a@test.com', date: '2024-01-01T00:00:00Z' },
  refs: [],
  notes: '',
  signature: null,
  stats: null
}

const commits: GitCommit[] = [
  {
    ...mergeCommit,
    hash: 'parent1hash1234567890abcdef12345678',
    shortHash: 'parent1',
    parents: [],
    subject: 'Main line'
  },
  {
    ...mergeCommit,
    hash: 'parent2hash1234567890abcdef12345678',
    shortHash: 'parent2',
    parents: [],
    subject: 'Side line'
  },
  mergeCommit
]

describe('PickMergeParentModal', () => {
  afterEach(() => {
    cleanup()
  })

  it('confirms selected mainline parent', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderWithProviders(
      <PickMergeParentModal
        open
        commit={mergeCommit}
        commits={commits}
        action="revert"
        onClose={() => undefined}
        onConfirm={onConfirm}
      />
    )

    const radios = screen.getAllByRole('radio')
    await user.click(radios[1]!)
    await user.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onConfirm).toHaveBeenCalledWith(2)
  })
})
