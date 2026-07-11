import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToastStore } from '@/stores/toast'
import { useLogStore } from '@/stores/logs'

describe('useToastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToastStore.setState({ message: null, tone: 'info' })
    useLogStore.setState({ appEntries: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows info messages unchanged', () => {
    useToastStore.getState().show('Copied to clipboard', 'info')
    expect(useToastStore.getState().message).toBe('Copied to clipboard')
  })

  it('humanizes raw git errors before displaying them', () => {
    useToastStore
      .getState()
      .show("fatal: Authentication failed for 'https://github.com/foo/bar.git/'", 'error')
    expect(useToastStore.getState().message).toBe(
      'Authentication failed. Check your saved credentials or SSH key, then try again.'
    )
  })

  it('logs the humanized message with the raw error as details', () => {
    useToastStore
      .getState()
      .show("fatal: Authentication failed for 'https://github.com/foo/bar.git/'", 'error')
    const entry = useLogStore.getState().appEntries[0]
    expect(entry?.message).toBe(
      'Authentication failed. Check your saved credentials or SSH key, then try again.'
    )
    expect(entry?.details).toBe("fatal: Authentication failed for 'https://github.com/foo/bar.git/'")
  })

  it('does not attach redundant details when humanization changes nothing', () => {
    useToastStore.getState().show('Failed to push changes.', 'error')
    const entry = useLogStore.getState().appEntries[0]
    expect(entry?.message).toBe('Failed to push changes.')
    expect(entry?.details).toBeUndefined()
  })
})
