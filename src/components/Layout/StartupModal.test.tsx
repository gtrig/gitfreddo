import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StartupModal } from './StartupModal'
import { renderWithProviders } from '@/test/render'

describe('StartupModal', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders donation and updates content when open', () => {
    renderWithProviders(
      <StartupModal open onClose={() => undefined} onCheckForUpdates={() => undefined} />
    )

    expect(screen.getByText('Support GitFreddo')).toBeInTheDocument()
    expect(screen.getByText('Latest News')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buy Me a Coffee' })).toHaveAttribute(
      'href',
      'https://www.buymeacoffee.com/george0u'
    )
  })

  it('calls onClose when user dismisses the modal', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(
      <StartupModal open onClose={onClose} onCheckForUpdates={() => undefined} />
    )

    await user.click(screen.getByRole('button', { name: 'Continue to App' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onCheckForUpdates when user requests update check', async () => {
    const user = userEvent.setup()
    const onCheckForUpdates = vi.fn()
    renderWithProviders(
      <StartupModal open onClose={() => undefined} onCheckForUpdates={onCheckForUpdates} />
    )

    await user.click(screen.getByRole('button', { name: 'Check for Updates' }))
    expect(onCheckForUpdates).toHaveBeenCalledOnce()
  })
})
