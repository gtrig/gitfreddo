import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddNoteModal } from './AddNoteModal'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import type { GitCommit } from '@/lib/types'

const commit: GitCommit = {
  hash: 'abc1234567890abcdef1234567890abcdef123456',
  shortHash: 'abc1234',
  parents: [],
  subject: 'Fix bug',
  body: '',
  message: 'Fix bug',
  author: { name: 'A', email: 'a@test.com', date: '2024-01-01T00:00:00Z' },
  committer: { name: 'A', email: 'a@test.com', date: '2024-01-01T00:00:00Z' },
  refs: [],
  notes: '',
  signature: null,
  stats: null
}

describe('AddNoteModal', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'notes.add') return undefined
      return {}
    })
  })

  it('submits a new note', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(<AddNoteModal commit={commit} open onClose={onClose} />)

    await user.type(screen.getByRole('textbox'), 'Release note')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
      'notes.add',
      expect.objectContaining({ hash: commit.hash, message: 'Release note' })
    )
    expect(onClose).toHaveBeenCalled()
  })
})
