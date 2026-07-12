/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { ReflogModal } from './ReflogModal'
import type { GitReflogEntry } from '@/lib/types'

function makeEntry(index: number): GitReflogEntry {
  return {
    selector: `HEAD@{${index}}`,
    hash: `hash${String(index).padStart(40, '0')}`,
    shortHash: `h${index}`,
    subject: `Commit message ${index}`,
    timestamp: `2024-01-${String((index % 28) + 1).padStart(2, '0')} 12:00:00`
  }
}

describe('ReflogModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    useSelectionStore.setState({
      timelineSelection: null,
      selectedCommitHashes: [],
      selectedWorkingFile: null,
      selectedStashIndex: null,
      selectTimelineNode: vi.fn()
    })
    window.gitfreddo = createGitFreddoMock()
  })

  it('renders dialog', () => {
    renderWithProviders(<ReflogModal open onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows loading state while fetching reflog', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(
      () => new Promise(() => undefined)
    )

    renderWithProviders(<ReflogModal open onClose={vi.fn()} />)
    expect(screen.getByText(/loading reflog/i)).toBeInTheDocument()
  })

  it('shows empty state when reflog has no entries', async () => {
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue([])

    renderWithProviders(<ReflogModal open onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Reflog is empty.')).toBeInTheDocument()
    })
  })

  it('lists reflog entries and selects commit on click', async () => {
    const onClose = vi.fn()
    const selectTimelineNode = vi.fn()
    useSelectionStore.setState({ selectTimelineNode })

    const entries: GitReflogEntry[] = [
      {
        selector: 'HEAD@{0}',
        hash: 'abc1234567890abcdef1234567890abcdef123456',
        shortHash: 'abc1234',
        subject: 'checkout: moving to main',
        timestamp: '2024-06-01 10:00:00'
      },
      {
        selector: 'HEAD@{1}',
        hash: 'def4567890abcdef4567890abcdef4567890abcd',
        shortHash: 'def4567',
        subject: '',
        timestamp: ''
      }
    ]
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue(entries)

    renderWithProviders(<ReflogModal open onClose={onClose} />)

    await waitFor(() => {
      expect(screen.getByText('checkout: moving to main')).toBeInTheDocument()
    })
    expect(screen.getByText('(no message)')).toBeInTheDocument()
    expect(screen.getByText('abc1234')).toBeInTheDocument()

    await userEvent.click(screen.getByText('checkout: moving to main'))
    expect(selectTimelineNode).toHaveBeenCalledWith('commit', entries[0]!.hash)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows load error message', async () => {
    vi.mocked(window.gitfreddo.invoke).mockRejectedValue(new Error('git failed'))

    renderWithProviders(<ReflogModal open onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('git failed')).toBeInTheDocument()
    })
  })

  it('virtualizes long reflog lists', async () => {
    const entries = Array.from({ length: 55 }, (_, index) => makeEntry(index))
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue(entries)

    renderWithProviders(<ReflogModal open onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Commit message 0')).toBeInTheDocument()
    })
    expect(screen.queryByText('Commit message 54')).not.toBeInTheDocument()
  })

  it('calls onClose from close button', async () => {
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue([])
    const onClose = vi.fn()

    renderWithProviders(<ReflogModal open onClose={onClose} />)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^close$/i }).length).toBeGreaterThan(0)
    })
    const closeButtons = screen.getAllByRole('button', { name: /^close$/i })
    await userEvent.click(closeButtons[closeButtons.length - 1]!)
    expect(onClose).toHaveBeenCalled()
  })

  it('does not fetch when workspace is disconnected', () => {
    useWorkspaceStore.setState({ connected: false, activePath: null })

    renderWithProviders(<ReflogModal open onClose={vi.fn()} />)

    expect(window.gitfreddo.invoke).not.toHaveBeenCalled()
    expect(screen.queryByText(/loading reflog/i)).not.toBeInTheDocument()
  })
})
