/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { SquashMergeIntoModal } from './SquashMergeIntoModal'

const mockBranches = [
  { name: 'main', head: 'abc', isCurrent: false, isRemote: false, ahead: 0, behind: 0 },
  { name: 'feature', head: 'def', isCurrent: true, isRemote: false, ahead: 0, behind: 0 }
]

describe('SquashMergeIntoModal', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    useSelectionStore.setState({ timelineSelection: null })
    useToastStore.setState({ message: null, tone: 'info', show: vi.fn(), clear: vi.fn() })
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method) => {
      if (method === 'branch.list') return mockBranches
      if (method === 'merge.squashInto') {
        return { status: 'completed', targetBranch: 'main' }
      }
      return undefined
    })
  })

  it('renders dialog', () => {
    renderWithProviders(<SquashMergeIntoModal sourceBranch="feature" onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('completes squash merge into target branch', async () => {
    const show = vi.fn()
    const onClose = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    const user = userEvent.setup()

    renderWithProviders(<SquashMergeIntoModal sourceBranch="feature" onClose={onClose} />)
    await waitFor(() => expect(screen.getByRole('option', { name: 'main' })).toBeInTheDocument())
    await user.selectOptions(screen.getByRole('combobox', { name: /target branch/i }), 'main')
    await user.click(screen.getByRole('button', { name: /^Squash and merge$/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(show).toHaveBeenCalledWith(expect.stringContaining('main'), 'success')
  })

  it('shows conflict toast and selects merge node when squash hits conflicts', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method) => {
      if (method === 'branch.list') return mockBranches
      if (method === 'merge.squashInto') {
        return { status: 'conflicts', conflictedPaths: ['README.md', 'src/app.ts'] }
      }
      return undefined
    })

    const user = userEvent.setup()
    renderWithProviders(<SquashMergeIntoModal sourceBranch="feature" onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('option', { name: 'main' })).toBeInTheDocument())
    await user.selectOptions(screen.getByRole('combobox', { name: /target branch/i }), 'main')
    await user.click(screen.getByRole('button', { name: /^Squash and merge$/i }))

    await waitFor(() => expect(show).toHaveBeenCalled())
    expect(useSelectionStore.getState().timelineSelection).toEqual({
      kind: 'merge',
      id: 'conflicts'
    })
  })

  it('shows inline error when squash merge fails', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method) => {
      if (method === 'branch.list') return mockBranches
      if (method === 'merge.squashInto') throw new Error('working tree not clean')
      return undefined
    })

    const user = userEvent.setup()
    renderWithProviders(<SquashMergeIntoModal sourceBranch="feature" onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('option', { name: 'main' })).toBeInTheDocument())
    await user.selectOptions(screen.getByRole('combobox', { name: /target branch/i }), 'main')
    await user.click(screen.getByRole('button', { name: /^Squash and merge$/i }))

    expect(await screen.findByText(/working tree not clean/i)).toBeInTheDocument()
  })
})
