/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('toggles show-all-files and switches to tree view', async () => {
    const onShowAllFilesChange = vi.fn()
    renderWithProviders(
      <CommitFileList
        files={[
          { path: 'src/app.ts', kind: 'changed' },
          { path: 'src/util.ts', kind: 'added' },
          { path: 'old.ts', kind: 'removed' }
        ]}
        loading={false}
        selectedPath={null}
        onSelectFile={vi.fn()}
        onFileHistory={vi.fn()}
        showAllFiles={false}
        onShowAllFilesChange={onShowAllFilesChange}
      />
    )

    await userEvent.click(screen.getByRole('switch', { name: /show all files/i }))
    expect(onShowAllFilesChange).toHaveBeenCalledWith(true)

    await userEvent.click(screen.getByRole('button', { name: /^tree$/i }))
    expect(screen.getByRole('button', { name: /^path$/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /expand all/i }))
    expect(screen.getByText('util.ts')).toBeInTheDocument()
  })

  it('selects a file and shows loading, error, and empty states', async () => {
    const onSelectFile = vi.fn()
    const { rerender } = renderWithProviders(
      <CommitFileList
        files={[]}
        loading
        selectedPath={null}
        onSelectFile={onSelectFile}
        onFileHistory={vi.fn()}
        showAllFiles={false}
        onShowAllFilesChange={vi.fn()}
      />
    )
    expect(screen.getByText(/loading files/i)).toBeInTheDocument()

    rerender(
      <CommitFileList
        files={[]}
        loading={false}
        error={new Error('Failed to load files')}
        selectedPath={null}
        onSelectFile={onSelectFile}
        onFileHistory={vi.fn()}
        showAllFiles={false}
        onShowAllFilesChange={vi.fn()}
      />
    )
    expect(screen.getByText('Failed to load files')).toBeInTheDocument()

    rerender(
      <CommitFileList
        files={[]}
        loading={false}
        selectedPath={null}
        onSelectFile={onSelectFile}
        onFileHistory={vi.fn()}
        showAllFiles={false}
        onShowAllFilesChange={vi.fn()}
      />
    )
    expect(screen.getByText(/no file changes/i)).toBeInTheDocument()

    rerender(
      <CommitFileList
        files={[{ path: 'README.md', kind: 'changed' }]}
        loading={false}
        selectedPath="README.md"
        onSelectFile={onSelectFile}
        onFileHistory={vi.fn()}
        showAllFiles={false}
        onShowAllFilesChange={vi.fn()}
      />
    )
    await userEvent.click(screen.getByText('README.md'))
    expect(onSelectFile).toHaveBeenCalledWith('README.md')
  })

  it('expands folders in tree view and opens folder context menu', async () => {
    renderWithProviders(
      <CommitFileList
        files={[
          { path: 'src/app.ts', kind: 'changed' },
          { path: 'src/lib/util.ts', kind: 'added' }
        ]}
        loading={false}
        selectedPath={null}
        onSelectFile={vi.fn()}
        onFileHistory={vi.fn()}
        showAllFiles={false}
        onShowAllFilesChange={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /^tree$/i }))
    await userEvent.click(screen.getByRole('button', { name: /expand all/i }))
    expect(screen.getByText('util.ts')).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByText('src'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('collapses an expanded folder from the folder context menu', async () => {
    renderWithProviders(
      <CommitFileList
        files={[
          { path: 'src/app.ts', kind: 'changed' },
          { path: 'src/lib/util.ts', kind: 'added' }
        ]}
        loading={false}
        selectedPath={null}
        onSelectFile={vi.fn()}
        onFileHistory={vi.fn()}
        showAllFiles={false}
        onShowAllFilesChange={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /^tree$/i }))
    await userEvent.click(screen.getByRole('button', { name: /expand all/i }))
    expect(screen.getByText('util.ts')).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByText('src'))
    await userEvent.click(screen.getByRole('menuitem', { name: /collapse/i }))
    expect(screen.queryByText('util.ts')).not.toBeInTheDocument()
  })

  it('opens file history from the file context menu', async () => {
    const onFileHistory = vi.fn()
    renderWithProviders(
      <CommitFileList
        files={[{ path: 'README.md', kind: 'changed' }]}
        loading={false}
        selectedPath={null}
        onSelectFile={vi.fn()}
        onFileHistory={onFileHistory}
        showAllFiles={false}
        onShowAllFilesChange={vi.fn()}
      />
    )

    fireEvent.contextMenu(screen.getByText('README.md'))
    await userEvent.click(screen.getByRole('menuitem', { name: /file history/i }))
    expect(onFileHistory).toHaveBeenCalledWith('README.md')
  })

  it('shows change badges and toggles sort order', async () => {
    renderWithProviders(
      <CommitFileList
        files={[
          { path: 'b.ts', kind: 'changed' },
          { path: 'a.ts', kind: 'added' },
          { path: 'c.ts', kind: 'removed' }
        ]}
        loading={false}
        selectedPath={null}
        onSelectFile={vi.fn()}
        onFileHistory={vi.fn()}
        showAllFiles={false}
        onShowAllFilesChange={vi.fn()}
      />
    )

    expect(screen.getByText(/1 modified/i)).toBeInTheDocument()
    expect(screen.getByText(/1 added/i)).toBeInTheDocument()
    expect(screen.getByText(/1 deleted/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /sorted a–z/i }))
    await userEvent.click(screen.getByRole('button', { name: /^path$/i }))
    const rows = screen.getAllByText(/\.ts$/)
    expect(rows[0]).toHaveTextContent('c.ts')
  })

  it('shows loading-all-files state and generic error fallback', () => {
    const { rerender } = renderWithProviders(
      <CommitFileList
        files={[]}
        loading={false}
        loadingAllFiles
        showAllFiles
        selectedPath={null}
        onSelectFile={vi.fn()}
        onFileHistory={vi.fn()}
        onShowAllFilesChange={vi.fn()}
      />
    )
    expect(screen.getByText(/loading files/i)).toBeInTheDocument()

    rerender(
      <CommitFileList
        files={[]}
        loading={false}
        error={'network down' as unknown as Error}
        selectedPath={null}
        onSelectFile={vi.fn()}
        onFileHistory={vi.fn()}
        showAllFiles={false}
        onShowAllFilesChange={vi.fn()}
      />
    )
    expect(screen.getByText(/failed to load commit files/i)).toBeInTheDocument()
  })

  it('virtualizes tree rows and opens path view context menus', async () => {
    const files = Array.from({ length: 55 }, (_, index) => ({
      path: `dir/file-${index}.ts`,
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

    await userEvent.click(screen.getByRole('button', { name: /^tree$/i }))
    await userEvent.click(screen.getByRole('button', { name: /expand all/i }))
    expect(screen.getByText('file-0.ts')).toBeInTheDocument()
    expect(screen.getByText('file-54.ts')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^path$/i }))
    fireEvent.contextMenu(screen.getByText('dir/file-10.ts'))
    expect(screen.getByRole('menuitem', { name: /copy path/i })).toBeInTheDocument()
  })

  it('hides badges when showBadges is false and renders embedded lists', () => {
    renderWithProviders(
      <CommitFileList
        files={[{ path: 'README.md', kind: 'changed' }]}
        loading={false}
        selectedPath={null}
        onSelectFile={vi.fn()}
        onFileHistory={vi.fn()}
        showAllFiles={false}
        onShowAllFilesChange={vi.fn()}
        showBadges={false}
        embedded
      />
    )

    expect(screen.queryByText(/modified/i)).not.toBeInTheDocument()
    expect(screen.getByText('README.md')).toBeInTheDocument()
  })
})
