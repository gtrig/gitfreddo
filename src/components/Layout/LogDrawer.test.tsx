/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogDrawer, LogToggleButton, useLogSubscription } from './LogDrawer'
import { useLogStore } from '@/stores/logs'
import { renderWithProviders } from '@/test/render'
import { copyToClipboard } from '@/lib/clipboard'

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: vi.fn()
}))

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(
    ({
      count,
      estimateSize
    }: {
      count: number
      estimateSize: (index: number) => number
    }) => ({
      getVirtualItems: () =>
        Array.from({ length: count }, (_, index) => ({
          index,
          key: index,
          start: index * estimateSize(index),
          size: estimateSize(index)
        })),
      getTotalSize: () =>
        Array.from({ length: count }, (_, index) => estimateSize(index)).reduce(
          (total, size) => total + size,
          0
        ),
      measureElement: vi.fn(),
      scrollToIndex: vi.fn()
    })
  )
}))

function LogSubscriptionProbe() {
  useLogSubscription()
  return null
}

function makeLogEntry(index: number) {
  return {
    id: `app-${index}`,
    stream: 'app' as const,
    level: 'info' as const,
    timestamp: index,
    message: `entry ${index}`
  }
}

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

  it('shows git logging off message on empty git tab', async () => {
    useLogStore.setState({ activeTab: 'git', gitListening: false, gitEntries: [] })
    renderWithProviders(<LogDrawer />)
    expect(screen.getByText(/git logging is off/i)).toBeInTheDocument()
  })

  it('toggles drawer open state from collapsed header', async () => {
    useLogStore.setState({
      open: false,
      appEntries: [
        { id: 'app-1', stream: 'app', level: 'info', timestamp: 0, message: 'collapsed entry' }
      ]
    })

    const user = userEvent.setup()
    renderWithProviders(<LogDrawer />)
    expect(screen.getByText(/\(1\)/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /logs/i }))
    expect(useLogStore.getState().open).toBe(true)
    expect(screen.getByText('collapsed entry')).toBeInTheDocument()
  })

  it('virtualizes long log lists', () => {
    useLogStore.setState({
      open: true,
      activeTab: 'app',
      appEntries: Array.from({ length: 55 }, (_, index) => makeLogEntry(index))
    })

    renderWithProviders(<LogDrawer />)
    expect(screen.getByText('entry 0')).toBeInTheDocument()
    expect(screen.getByText('entry 54')).toBeInTheDocument()
  })
})

describe('LogToggleButton', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    useLogStore.setState({
      open: false,
      gitEntries: [],
      appEntries: [{ id: 'app-1', stream: 'app', level: 'info', timestamp: 0, message: 'one' }]
    })
  })

  it('shows total log count badge and toggles drawer', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LogToggleButton />)

    expect(screen.getByLabelText(/logs \(1\)/i)).toBeInTheDocument()
    await user.click(screen.getByLabelText(/logs \(1\)/i))
    expect(useLogStore.getState().open).toBe(true)
  })

  it('caps badge display at 99+', () => {
    useLogStore.setState({
      appEntries: Array.from({ length: 120 }, (_, index) => makeLogEntry(index))
    })
    renderWithProviders(<LogToggleButton />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })
})

describe('useLogSubscription', () => {
  afterEach(() => cleanup())

  it('appends log entries and ignores git entries when listening is off', () => {
    useLogStore.setState({ gitListening: false, gitEntries: [], appEntries: [] })
    const onLogEntry = vi.fn((handler: (entry: unknown) => void) => {
      handler({
        id: 'git-1',
        stream: 'git',
        level: 'info',
        timestamp: 1,
        message: 'ignored git'
      })
      handler({
        id: 'app-1',
        stream: 'app',
        level: 'info',
        timestamp: 2,
        message: 'app log'
      })
      return vi.fn()
    })
    window.gitfreddo.onLogEntry = onLogEntry as typeof window.gitfreddo.onLogEntry

    renderWithProviders(<LogSubscriptionProbe />)

    expect(useLogStore.getState().gitEntries).toHaveLength(0)
    expect(useLogStore.getState().appEntries).toHaveLength(1)
    expect(useLogStore.getState().appEntries[0]?.message).toBe('app log')
  })
})
