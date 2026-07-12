/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiffOverlay } from './DiffOverlay'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'
import {
  useDiffCommitRange,
  useDiffShow,
  useDiffStaged,
  useDiffWorking,
  useStashDiff
} from '@/hooks/useGit'

const stageApplyPatchMutate = vi.fn()
const showToast = vi.fn()
const onClose = vi.fn()

const unifiedDiff = `diff --git a/README.md b/README.md
index 1111111..2222222 100644
--- a/README.md
+++ b/README.md
@@ -1 +1,2 @@
-old
+new
+line`

vi.mock('@/hooks/useGit', () => ({
  useDiffWorking: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useDiffStaged: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useDiffShow: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useDiffCommitRange: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useStashDiff: vi.fn(() => ({ data: null, isLoading: false, error: null }))
}))

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: vi.fn(() => ({
    stageApplyPatch: { isPending: false, mutateAsync: stageApplyPatchMutate }
  }))
}))

describe('DiffOverlay', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    stageApplyPatchMutate.mockReset()
    showToast.mockClear()
    onClose.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    useSelectionStore.setState({
      diffMode: 'working',
      selectedWorkingFile: 'README.md',
      selectedCommitFile: null,
      selectedCommitHash: null,
      selectedStashFile: null,
      selectedStashIndex: null,
      compareCommitRange: null
    })
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue(defaultMockSettings)
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'file.blame') {
        return [{ line: 1, commit: 'abc', author: 'Author', date: '2024-01-01', text: 'new' }]
      }
      return {}
    })
    vi.mocked(useDiffWorking).mockReturnValue({
      data: { path: 'README.md', unified: unifiedDiff },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useDiffWorking>)
    vi.mocked(useDiffStaged).mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useDiffStaged>)
    vi.mocked(useDiffShow).mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useDiffShow>)
    vi.mocked(useDiffCommitRange).mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useDiffCommitRange>)
    vi.mocked(useStashDiff).mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useStashDiff>)
  })

  it('returns null when no path is available', () => {
    useSelectionStore.setState({ diffMode: 'working', selectedWorkingFile: null })
    const { container } = renderWithProviders(<DiffOverlay onClose={onClose} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders diff overlay header for working file selection', () => {
    renderWithProviders(<DiffOverlay onClose={onClose} />)
    expect(screen.getByText('README.md')).toBeInTheDocument()
    expect(screen.getByText('new')).toBeInTheDocument()
  })

  it('closes the overlay from the header action', async () => {
    renderWithProviders(<DiffOverlay onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows loading and error states', () => {
    vi.mocked(useDiffWorking).mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    } as unknown as ReturnType<typeof useDiffWorking>)
    const { rerender } = renderWithProviders(<DiffOverlay onClose={onClose} />)
    expect(screen.getByText(/loading diff/i)).toBeInTheDocument()

    vi.mocked(useDiffWorking).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Diff failed')
    } as unknown as ReturnType<typeof useDiffWorking>)
    rerender(<DiffOverlay onClose={onClose} />)
    expect(screen.getByText('Diff failed')).toBeInTheDocument()
  })

  it('shows empty state when diff has no rows', () => {
    vi.mocked(useDiffWorking).mockReturnValue({
      data: { path: 'README.md', unified: '' },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useDiffWorking>)
    renderWithProviders(<DiffOverlay onClose={onClose} />)
    expect(screen.getByText(/no changes in this range/i)).toBeInTheDocument()
  })

  it('switches between unified, split, word, and blame view modes', async () => {
    renderWithProviders(<DiffOverlay onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: /side by side/i }))
    expect(screen.getByText('old')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^word$/i }))
    expect(screen.getByText('new')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^blame$/i }))
    expect(screen.getByText(/Author/)).toBeInTheDocument()
  })

  it('stages a hunk in working diff mode', async () => {
    renderWithProviders(<DiffOverlay onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /stage hunk/i }))
    expect(stageApplyPatchMutate).toHaveBeenCalledWith(
      expect.objectContaining({ reverse: false })
    )
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/hunk staged/i), 'success')
  })

  it('unstages a hunk in staged diff mode', async () => {
    useSelectionStore.setState({ diffMode: 'staged', selectedWorkingFile: 'README.md' })
    vi.mocked(useDiffStaged).mockReturnValue({
      data: { path: 'README.md', unified: unifiedDiff },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useDiffStaged>)

    renderWithProviders(<DiffOverlay onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /unstage hunk/i }))
    expect(stageApplyPatchMutate).toHaveBeenCalledWith(
      expect.objectContaining({ reverse: true })
    )
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/hunk unstaged/i), 'success')
  })

  it('renders commit, commit-range, and stash diff modes', () => {
    useSelectionStore.setState({
      diffMode: 'commit',
      selectedWorkingFile: null,
      selectedCommitHash: 'abc1234',
      selectedCommitFile: 'src/app.ts'
    })
    vi.mocked(useDiffShow).mockReturnValue({
      data: { path: 'src/app.ts', unified: unifiedDiff },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useDiffShow>)
    const { rerender } = renderWithProviders(<DiffOverlay onClose={onClose} />)
    expect(screen.getByText('new')).toBeInTheDocument()

    useSelectionStore.setState({
      diffMode: 'commit-range',
      selectedWorkingFile: null,
      compareCommitRange: {
        oldestHash: 'aaa',
        newestHash: 'bbb',
        label: 'abc1234..def5678'
      }
    })
    vi.mocked(useDiffCommitRange).mockReturnValue({
      data: { path: 'src/app.ts', unified: unifiedDiff },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useDiffCommitRange>)
    rerender(<DiffOverlay onClose={onClose} />)
    expect(screen.getByText('abc1234..def5678')).toBeInTheDocument()

    useSelectionStore.setState({
      diffMode: 'stash',
      selectedWorkingFile: null,
      selectedStashIndex: 0,
      selectedStashFile: 'stash-file.ts'
    })
    vi.mocked(useStashDiff).mockReturnValue({
      data: { path: 'stash-file.ts', unified: unifiedDiff },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useStashDiff>)
    rerender(<DiffOverlay onClose={onClose} />)
    expect(screen.getByText('stash-file.ts')).toBeInTheDocument()
  })

  it('omits blame mode for commit-range and stash diffs', () => {
    useSelectionStore.setState({
      diffMode: 'commit-range',
      compareCommitRange: {
        oldestHash: 'aaa',
        newestHash: 'bbb',
        label: 'range'
      }
    })
    vi.mocked(useDiffCommitRange).mockReturnValue({
      data: { path: 'src/app.ts', unified: unifiedDiff },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useDiffCommitRange>)

    renderWithProviders(<DiffOverlay onClose={onClose} />)
    expect(screen.queryByRole('button', { name: /^blame$/i })).not.toBeInTheDocument()
  })
})
