/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogDrawer } from './LogDrawer'
import { useLogStore } from '@/stores/logs'
import { renderWithProviders } from '@/test/render'
import { copyToClipboard } from '@/lib/clipboard'

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: vi.fn()
}))

describe('LogDrawer', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    useLogStore.setState({
      open: true,
      height: 220,
      activeTab: 'app',
      gitListening: false,
      gitEntries: [],
      appEntries: [
        {
          id: 'app-1',
          stream: 'app',
          level: 'error',
          timestamp: 0,
          message: 'Something happened',
          details: 'stack trace'
        }
      ]
    })
  })

  it('copies the log line message and details when the copy button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LogDrawer />)
    const button = screen.getByRole('button', { name: /copy log line/i })
    await user.click(button)
    expect(copyToClipboard).toHaveBeenCalledWith('Something happened\nstack trace')
  })

  it('copies just the message when there are no details', async () => {
    useLogStore.setState({
      appEntries: [{ id: 'app-2', stream: 'app', level: 'info', timestamp: 0, message: 'Only a message' }]
    })
    const user = userEvent.setup()
    renderWithProviders(<LogDrawer />)
    const button = screen.getByRole('button', { name: /copy log line/i })
    await user.click(button)
    expect(copyToClipboard).toHaveBeenCalledWith('Only a message')
  })

  it('switches to the git tab and toggles git listening', async () => {
    useLogStore.setState({
      gitEntries: [
        {
          id: 'git-1',
          stream: 'git',
          level: 'info',
          timestamp: 0,
          message: 'git status'
        }
      ]
    })

    const user = userEvent.setup()
    renderWithProviders(<LogDrawer />)

    await user.click(screen.getByRole('button', { name: /^git\b/i }))
    expect(screen.getByText('git status')).toBeInTheDocument()

    await user.click(screen.getByRole('switch', { name: /listen to git commands/i }))
    expect(useLogStore.getState().gitListening).toBe(true)
  })

  it('clears the active tab and collapses the drawer', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LogDrawer />)

    await user.click(screen.getByRole('button', { name: /clear/i }))
    expect(useLogStore.getState().appEntries).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: /^close$/i }))
    expect(useLogStore.getState().open).toBe(false)
  })

  it('resizes the drawer height while dragging', () => {
    useLogStore.setState({ open: true, height: 220 })
    renderWithProviders(<LogDrawer />)

    const handle = screen.getByRole('separator')
    fireEvent.mouseDown(handle, { clientY: 400 })
    fireEvent.mouseMove(window, { clientY: 360 })
    fireEvent.mouseUp(window)

    expect(useLogStore.getState().height).toBe(260)
  })

  it('shows entry counts on tabs', () => {
    useLogStore.setState({
      open: true,
      gitEntries: [
        {
          id: 'git-1',
          stream: 'git',
          level: 'info',
          timestamp: 0,
          message: 'git status'
        }
      ],
      appEntries: [
        {
          id: 'app-1',
          stream: 'app',
          level: 'info',
          timestamp: 0,
          message: 'app event'
        }
      ]
    })

    renderWithProviders(<LogDrawer />)
    expect(screen.getByRole('button', { name: /git/i })).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: /application/i })).toHaveTextContent('1')
  })
})
