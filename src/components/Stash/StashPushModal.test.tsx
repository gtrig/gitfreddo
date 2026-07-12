/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { StashPushModal } from './StashPushModal'

const stashPushMutate = vi.fn(async () => undefined)

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: vi.fn(() => ({
    stashPush: { mutateAsync: stashPushMutate, isPending: false }
  }))
}))

import { useGitMutations } from '@/hooks/useGitMutations'

const showToast = vi.fn()

describe('StashPushModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    stashPushMutate.mockClear()
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(useGitMutations).mockReturnValue({
      stashPush: { mutateAsync: stashPushMutate, isPending: false }
    } as unknown as ReturnType<typeof useGitMutations>)
  })

  it('renders dialog with optional message field', () => {
    renderWithProviders(
      <StashPushModal open initialMessage="WIP feature" onClose={vi.fn()} />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('WIP feature')).toBeInTheDocument()
  })

  it('resets form when reopened', () => {
    const { rerender } = renderWithProviders(
      <StashPushModal open initialMessage="temp" onClose={vi.fn()} />
    )

    void userEvent.click(screen.getByRole('checkbox', { name: /include untracked/i }))

    rerender(<StashPushModal open={false} initialMessage="" onClose={vi.fn()} />)
    rerender(<StashPushModal open initialMessage="" onClose={vi.fn()} />)

    expect(screen.getByRole('checkbox', { name: /include untracked/i })).not.toBeChecked()
  })

  it('creates a stash with message and flags', async () => {
    const onClose = vi.fn()

    renderWithProviders(<StashPushModal open onClose={onClose} />)

    await userEvent.type(screen.getByRole('textbox'), 'save progress')
    await userEvent.click(screen.getByRole('checkbox', { name: /include untracked/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /include ignored/i }))
    await userEvent.click(screen.getByRole('button', { name: /create stash/i }))

    await waitFor(() => {
      expect(stashPushMutate).toHaveBeenCalledWith({
        message: 'save progress',
        includeUntracked: true,
        includeIgnored: true,
        paths: undefined
      })
    })
    expect(showToast).toHaveBeenCalledWith('Stash created.', 'success')
    expect(onClose).toHaveBeenCalled()
  })

  it('picks paths and stashes only selected files', async () => {
    vi.mocked(window.gitfreddo.pickFiles).mockResolvedValue(['src/a.ts', 'src/b.ts'])

    renderWithProviders(<StashPushModal open onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /stash specific paths/i }))
    await waitFor(() => {
      expect(screen.getByText('src/a.ts')).toBeInTheDocument()
    })
    expect(screen.getByText('src/b.ts')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /create stash/i }))
    await waitFor(() => {
      expect(stashPushMutate).toHaveBeenCalledWith({
        message: undefined,
        includeUntracked: false,
        includeIgnored: false,
        paths: ['src/a.ts', 'src/b.ts']
      })
    })
  })

  it('virtualizes long picked path lists', async () => {
    const manyPaths = Array.from({ length: 55 }, (_, index) => `file-${index}.ts`)
    vi.mocked(window.gitfreddo.pickFiles).mockResolvedValue(manyPaths)

    renderWithProviders(<StashPushModal open onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /stash specific paths/i }))

    await waitFor(() => {
      expect(screen.getByText('file-0.ts')).toBeInTheDocument()
    })
    expect(screen.queryByText('file-54.ts')).not.toBeInTheDocument()
  })

  it('shows error toast when stash creation fails', async () => {
    stashPushMutate.mockRejectedValueOnce(new Error('Nothing to stash'))

    renderWithProviders(<StashPushModal open onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /create stash/i }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Nothing to stash', 'error')
    })
  })

  it('calls onClose from cancel button', async () => {
    const onClose = vi.fn()
    renderWithProviders(<StashPushModal open onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
