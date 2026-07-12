/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { CommitFileList } from './CommitFileList'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * estimateSize(),
        size: estimateSize()
      })),
    getTotalSize: () => count * estimateSize(),
    measureElement: vi.fn(),
    scrollToIndex: vi.fn()
  }))
}))

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

  it('opens a file context menu', () => {
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

    fireEvent.contextMenu(screen.getByText('README.md'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('virtualizes large file lists', () => {
    const files = Array.from({ length: 60 }, (_, index) => ({
      path: `file-${index}.ts`,
      kind: 'changed' as const
    }))

    renderWithProviders(
      <CommitFileList
        files={files}
        loading={false}
        selectedPath={null}
        onSelectFile={vi.fn()}
        onFileHistory={vi.fn()}
        showAllFiles
        onShowAllFilesChange={vi.fn()}
      />
    )

    expect(screen.getByText('file-0.ts')).toBeInTheDocument()
    expect(screen.getByText('file-59.ts')).toBeInTheDocument()
  })
})
