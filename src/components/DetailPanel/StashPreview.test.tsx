/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StashPreview } from './StashPreview'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useStashFiles } from '@/hooks/useGit'

vi.mock('@/hooks/useGit', () => ({
  useStashFiles: vi.fn(() => ({
    data: 'M\tREADME.md',
    isLoading: false,
    error: null
  }))
}))

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
    measureElement: vi.fn()
  }))
}))

const stash = {
  index: 0,
  hash: 'abc1234567890abcdef1234567890abcdef123456',
  message: 'WIP on main',
  branch: 'main'
}

describe('StashPreview', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    useSelectionStore.setState({ selectedStashFile: null })
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(useStashFiles).mockReturnValue({
      data: 'M\tREADME.md',
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useStashFiles>)
  })

  it('renders stash message, branch, and file list', () => {
    renderWithProviders(<StashPreview stash={stash} />)
    expect(screen.getByText('WIP on main')).toBeInTheDocument()
    expect(screen.getByText(/Branch:\s*main/)).toBeInTheDocument()
    expect(screen.getByText('README.md')).toBeInTheDocument()
  })

  it('shows loading and empty states', () => {
    vi.mocked(useStashFiles).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    } as unknown as ReturnType<typeof useStashFiles>)
    const { rerender } = renderWithProviders(<StashPreview stash={stash} />)
    expect(screen.getByText(/loading files/i)).toBeInTheDocument()

    vi.mocked(useStashFiles).mockReturnValue({
      data: '',
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useStashFiles>)
    rerender(<StashPreview stash={stash} />)
    expect(screen.getByText(/no file changes in this stash/i)).toBeInTheDocument()
  })

  it('selects a stash file when clicked', async () => {
    renderWithProviders(<StashPreview stash={stash} />)
    await userEvent.click(screen.getByRole('button', { name: /README\.md/i }))
    expect(useSelectionStore.getState().selectedStashFile).toBe('README.md')
  })

  it('expands nested folders and lists nested files', async () => {
    vi.mocked(useStashFiles).mockReturnValue({
      data: 'M\tsrc/nested/app.ts\nA\tsrc/util.ts',
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useStashFiles>)

    renderWithProviders(<StashPreview stash={stash} />)
    await userEvent.click(screen.getByRole('button', { name: /^src$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^nested$/i }))
    expect(screen.getByText('app.ts')).toBeInTheDocument()
    expect(screen.getByText('util.ts')).toBeInTheDocument()
  })

  it('expands all folders from the toolbar action', async () => {
    vi.mocked(useStashFiles).mockReturnValue({
      data: 'M\tsrc/nested/app.ts',
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useStashFiles>)

    renderWithProviders(<StashPreview stash={stash} />)
    await userEvent.click(screen.getByRole('button', { name: /expand all/i }))
    expect(screen.getByText('app.ts')).toBeInTheDocument()
  })

  it('opens context menus for files and folders', async () => {
    vi.mocked(useStashFiles).mockReturnValue({
      data: 'M\tsrc/app.ts',
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useStashFiles>)

    renderWithProviders(<StashPreview stash={stash} />)
    await userEvent.click(screen.getByRole('button', { name: /^src$/i }))
    fireEvent.contextMenu(screen.getByRole('button', { name: /^src$/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: /app\.ts/i }))
    expect(screen.getAllByRole('menu')).toHaveLength(1)
  })

  it('virtualizes large stash file trees', () => {
    const lines = Array.from({ length: 55 }, (_, index) => `M\tfile-${index}.ts`).join('\n')
    vi.mocked(useStashFiles).mockReturnValue({
      data: lines,
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useStashFiles>)

    renderWithProviders(<StashPreview stash={stash} />)
    expect(screen.getByText('file-0.ts')).toBeInTheDocument()
    expect(screen.getByText('file-54.ts')).toBeInTheDocument()
  })

  it('falls back to stash index label when message is empty', () => {
    renderWithProviders(<StashPreview stash={{ ...stash, message: '', branch: '' }} />)
    expect(screen.getByText('stash@{0}')).toBeInTheDocument()
  })
})
