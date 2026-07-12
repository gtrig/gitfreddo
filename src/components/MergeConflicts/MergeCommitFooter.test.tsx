/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { MergeCommitFooter } from './MergeCommitFooter'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

describe('MergeCommitFooter', () => {
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
  it('renders complete merge button', () => {
    renderWithProviders(
      <MergeCommitFooter
        mergeStatus={{
          inProgress: true,
          kind: 'merge',
          conflictedPaths: [],
          currentBranch: 'main',
          incomingLabel: 'feature'
        }}
        conflictedCount={0}
      />
    )
    expect(screen.getByRole('button', { name: /complete merge/i })).toBeInTheDocument()
  })
})
