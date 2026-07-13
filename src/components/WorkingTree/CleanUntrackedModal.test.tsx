/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { CleanUntrackedModal } from './CleanUntrackedModal'

const workingCleanMutate = vi.fn(async () => undefined)

const { mockUseCleanPreview } = vi.hoisted(() => ({
  mockUseCleanPreview: vi.fn((includeIgnored: boolean) => ({
    data: includeIgnored ? ['ignored.log', 'tmp.txt'] : ['tmp.txt'],
    isLoading: false,
    error: null as Error | null
  }))
}))

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    workingClean: { mutateAsync: workingCleanMutate, isPending: false }
  })
}))

vi.mock('@/hooks/useGit', () => ({
  useCleanPreview: mockUseCleanPreview
}))

describe('CleanUntrackedModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    workingCleanMutate.mockClear()
    mockUseCleanPreview.mockImplementation((includeIgnored: boolean) => ({
      data: includeIgnored ? ['ignored.log', 'tmp.txt'] : ['tmp.txt'],
      isLoading: false,
      error: null
    }))
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
  })

  it('renders dialog', () => {
    renderWithProviders(<CleanUntrackedModal open onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('lists preview files and removes them on confirm', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<CleanUntrackedModal open onClose={onClose} />)

    expect(await screen.findByText('tmp.txt')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /remove 1 file/i }))

    await waitFor(() => {
      expect(workingCleanMutate).toHaveBeenCalledWith({ includeIgnored: false })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('reloads preview when include ignored is toggled', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CleanUntrackedModal open onClose={vi.fn()} />)

    await screen.findByText('tmp.txt')
    await user.click(screen.getByRole('checkbox'))

    await waitFor(() => {
      expect(mockUseCleanPreview).toHaveBeenCalledWith(true, true)
    })
    expect(await screen.findByText('ignored.log')).toBeInTheDocument()
  })

  it('shows empty state and disables remove when nothing would be deleted', async () => {
    mockUseCleanPreview.mockReturnValue({ data: [], isLoading: false, error: null })
    renderWithProviders(<CleanUntrackedModal open onClose={vi.fn()} />)

    expect(await screen.findByText(/no files would be removed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove 0 file/i })).toBeDisabled()
  })

  it('shows preview errors', async () => {
    mockUseCleanPreview.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('preview failed')
    })
    renderWithProviders(<CleanUntrackedModal open onClose={vi.fn()} />)

    expect(await screen.findByText('preview failed')).toBeInTheDocument()
  })
})
