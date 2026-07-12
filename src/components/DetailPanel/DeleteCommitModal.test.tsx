/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { DeleteCommitModal } from './DeleteCommitModal'
const commit = {
  hash: 'abc1234567890abcdef1234567890abcdef123456',
  shortHash: 'abc1234',
  parents: [],
  subject: 'First commit',
  body: '',
  message: 'First commit',
  author: { name: 'A', email: 'a@test.com', date: '2024-01-01T00:00:00Z' },
  committer: { name: 'A', email: 'a@test.com', date: '2024-01-01T00:00:00Z' },
  refs: [],
  notes: '',
  signature: null,
  stats: null
}

describe('DeleteCommitModal', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
  })
  it('renders delete commit dialog', () => {
    renderWithProviders(
      <DeleteCommitModal open action="drop" commits={[commit]} ahead={0} onClose={vi.fn()} />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
