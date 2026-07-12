/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { BisectPanelModal } from './BisectPanelModal'

const bisectStart = vi.fn(async () => undefined)
const bisectGood = vi.fn(async () => undefined)
const bisectBad = vi.fn(async () => undefined)
const bisectReset = vi.fn(async () => undefined)

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    bisectStart: { mutateAsync: bisectStart, isPending: false },
    bisectGood: { mutateAsync: bisectGood, isPending: false },
    bisectBad: { mutateAsync: bisectBad, isPending: false },
    bisectReset: { mutateAsync: bisectReset, isPending: false }
  })
}))

describe('BisectPanelModal', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    bisectStart.mockClear()
    bisectGood.mockClear()
    bisectBad.mockClear()
    bisectReset.mockClear()
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
  })

  it('renders dialog', () => {
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue({
      active: false,
      current: null,
      good: null,
      bad: null
    })
    renderWithProviders(<BisectPanelModal open onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('starts bisect with bad and good refs', async () => {
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue({
      active: false,
      current: null,
      good: null,
      bad: null
    })

    renderWithProviders(<BisectPanelModal open onClose={vi.fn()} />)
    await screen.findByRole('button', { name: /start bisect/i })

    await userEvent.type(screen.getByPlaceholderText(/HEAD or commit hash/i), 'bad1234')
    await userEvent.type(screen.getByPlaceholderText(/Older known-good commit/i), 'good5678')
    await userEvent.click(screen.getByRole('button', { name: /start bisect/i }))

    await waitFor(() => {
      expect(bisectStart).toHaveBeenCalledWith({ badRef: 'bad1234', goodRef: 'good5678' })
    })
  })

  it('marks current commit good or bad during active bisect', async () => {
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue({
      active: true,
      current: 'abc1234567890',
      good: 'good5678',
      bad: 'bad1234'
    })

    renderWithProviders(<BisectPanelModal open onClose={vi.fn()} />)
    await screen.findByRole('button', { name: /mark current good/i })

    await userEvent.click(screen.getByRole('button', { name: /mark current good/i }))
    expect(bisectGood).toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /mark current bad/i }))
    expect(bisectBad).toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /reset bisect/i }))
    expect(bisectReset).toHaveBeenCalled()
  })
})
