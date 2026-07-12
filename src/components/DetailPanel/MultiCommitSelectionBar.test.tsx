/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { MultiCommitSelectionBar } from './MultiCommitSelectionBar'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

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

describe('MultiCommitSelectionBar', () => {
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
  it('renders selected commit count', () => {
    renderWithProviders(
      <MultiCommitSelectionBar
        commits={[commit]}
        allCommits={[commit]}
        primaryHash={commit.hash}
        head={commit.hash}
        branch="main"
        isDetached={false}
        isClean
        gitBusy={false}
        onSelectPrimary={vi.fn()}
        onCopyAllHashes={vi.fn()}
        onCompare={vi.fn()}
        onCherryPickAll={vi.fn()}
        onSquash={vi.fn()}
      />
    )
    expect(screen.getByText(/1 commits selected/i)).toBeInTheDocument()
  })
})
