import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
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
})
