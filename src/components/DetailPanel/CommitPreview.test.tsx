/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { CommitPreview } from './CommitPreview'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { makeCommit } from '@/test/fixtures/commit'

vi.mock('@/hooks/useCommitDisplayFiles', () => ({
  useCommitDisplayFiles: vi.fn(() => ({
    files: [{ path: 'README.md', kind: 'changed' as const }],
    isLoading: false
  }))
}))

vi.mock('@/hooks/useAppSettings', () => ({
  useAiEnabled: vi.fn(() => false)
}))

import { useWorkspaceStore } from '@/stores/workspace'

describe('CommitPreview', () => {
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

  it('renders commit subject and file change summary', () => {
    const commit = makeCommit()
    renderWithProviders(<CommitPreview commit={commit} />)
    expect(screen.getByText('Subject line')).toBeInTheDocument()
    expect(screen.getByText(/1 file change in commit/i)).toBeInTheDocument()
  })
})
