/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { CommitFileList } from './CommitFileList'

describe('CommitFileList', () => {
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
  it('renders component', () => {
    renderWithProviders(
      <CommitFileList
        files={[{ path: 'README.md', kind: 'changed' }]}
        loading={false}
        selectedPath={null}
        onSelectFile={vi.fn()}
        onFileHistory={vi.fn()}
        showAllFiles={false}
        onShowAllFilesChange={vi.fn()}
      />
    )
    expect(screen.getByText('README.md')).toBeInTheDocument()
  })
})
