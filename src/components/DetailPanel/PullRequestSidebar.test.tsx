/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PullRequestSidebar } from './PullRequestSidebar'
import { renderWithProviders } from '@/test/render'
import type { GitHubPullRequestFile } from '@shared/github'

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

const files: GitHubPullRequestFile[] = [
  { path: 'src/b.ts', status: 'modified', additions: 2, deletions: 1, changes: 3 },
  { path: 'src/a.ts', status: 'added', additions: 5, deletions: 0, changes: 5 }
]

describe('PullRequestSidebar', () => {
  afterEach(() => cleanup())

  it('switches between overview, commits, and files tabs', async () => {
    const onSelectPane = vi.fn()
    renderWithProviders(
      <PullRequestSidebar
        pane={{ kind: 'overview' }}
        onSelectPane={onSelectPane}
        files={files}
        commitCount={3}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /commits/i }))
    expect(onSelectPane).toHaveBeenCalledWith({ kind: 'commits' })

    await userEvent.click(screen.getByRole('button', { name: /files/i }))
    expect(onSelectPane).toHaveBeenCalledWith({ kind: 'files' })

    await userEvent.click(screen.getByRole('button', { name: /overview/i }))
    expect(onSelectPane).toHaveBeenCalledWith({ kind: 'overview' })
  })

  it('shows sidebar hints on overview and commits panes', () => {
    const { rerender } = renderWithProviders(
      <PullRequestSidebar pane={{ kind: 'overview' }} onSelectPane={vi.fn()} files={files} />
    )
    expect(screen.getByText(/PR description and conversation appear/i)).toBeInTheDocument()

    rerender(
      <PullRequestSidebar pane={{ kind: 'commits' }} onSelectPane={vi.fn()} files={files} />
    )
    expect(screen.getByText(/Commit list appears in the main panel/i)).toBeInTheDocument()
  })

  it('lists files sorted ascending and toggles sort order', async () => {
    renderWithProviders(
      <PullRequestSidebar pane={{ kind: 'files' }} onSelectPane={vi.fn()} files={files} />
    )

    const rows = screen.getAllByRole('button', { name: /src\/(a|b)\.ts/i })
    expect(rows[0]).toHaveTextContent('src/a.ts')
    expect(rows[1]).toHaveTextContent('src/b.ts')

    await userEvent.click(screen.getByRole('button', { name: 'Sorted A–Z' }))
    const reversed = screen.getAllByRole('button', { name: /src\/(a|b)\.ts/i })
    expect(reversed[0]).toHaveTextContent('src/b.ts')
    expect(reversed[1]).toHaveTextContent('src/a.ts')
  })

  it('selects a file and shows addition/deletion stats', async () => {
    const onSelectPane = vi.fn()
    renderWithProviders(
      <PullRequestSidebar
        pane={{ kind: 'files' }}
        onSelectPane={onSelectPane}
        files={files}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /src\/a\.ts/i }))
    expect(onSelectPane).toHaveBeenCalledWith({ kind: 'file', path: 'src/a.ts' })
    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByText('−1')).toBeInTheDocument()
  })

  it('shows loading, error, and empty states in files pane', () => {
    const { rerender } = renderWithProviders(
      <PullRequestSidebar
        pane={{ kind: 'files' }}
        onSelectPane={vi.fn()}
        files={[]}
        loading
      />
    )
    expect(screen.getByText(/loading files/i)).toBeInTheDocument()

    rerender(
      <PullRequestSidebar
        pane={{ kind: 'files' }}
        onSelectPane={vi.fn()}
        files={[]}
        error={new Error('Files API failed')}
      />
    )
    expect(screen.getByText('Files API failed')).toBeInTheDocument()

    rerender(
      <PullRequestSidebar pane={{ kind: 'files' }} onSelectPane={vi.fn()} files={[]} />
    )
    expect(screen.getByText(/no file changes/i)).toBeInTheDocument()
  })

  it('toggles AI analysis file selection and select all/none actions', async () => {
    const onToggleAnalysisFile = vi.fn()
    const onSelectAllAnalysisFiles = vi.fn()
    const onClearAnalysisFiles = vi.fn()

    renderWithProviders(
      <PullRequestSidebar
        pane={{ kind: 'file', path: 'src/a.ts' }}
        onSelectPane={vi.fn()}
        files={files}
        analysisSelectedPaths={['src/a.ts']}
        onToggleAnalysisFile={onToggleAnalysisFile}
        onSelectAllAnalysisFiles={onSelectAllAnalysisFiles}
        onClearAnalysisFiles={onClearAnalysisFiles}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /select all/i }))
    expect(onSelectAllAnalysisFiles).toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /select none/i }))
    expect(onClearAnalysisFiles).toHaveBeenCalled()

    const checkbox = screen.getByRole('checkbox', { name: /include src\/b\.ts in ai analysis/i })
    await userEvent.click(checkbox)
    expect(onToggleAnalysisFile).toHaveBeenCalledWith('src/b.ts', true)
  })

  it('virtualizes large file lists', () => {
    const manyFiles = Array.from({ length: 55 }, (_, index) => ({
      path: `file-${index}.ts`,
      status: 'modified' as const,
      additions: 1,
      deletions: 0,
      changes: 1
    }))

    renderWithProviders(
      <PullRequestSidebar pane={{ kind: 'files' }} onSelectPane={vi.fn()} files={manyFiles} />
    )

    expect(screen.getByText('file-0.ts')).toBeInTheDocument()
    expect(screen.getByText('file-54.ts')).toBeInTheDocument()
  })
})
