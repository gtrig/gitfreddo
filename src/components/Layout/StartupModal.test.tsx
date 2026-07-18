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
      <StartupModal
        open
        onClose={() => undefined}
        onContinue={() => undefined}
        onCheckForUpdates={() => undefined}
      />
    )

    expect(screen.getByText('Support GitFreddo')).toBeInTheDocument()
    expect(screen.getByText('Latest News')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buy Me a Coffee' })).toHaveAttribute(
      'href',
      'https://www.buymeacoffee.com/george0u'
    )
  })

  it('shows recent version updates from NEWS.md', () => {
    renderWithProviders(
      <StartupModal
        open
        onClose={() => undefined}
        onContinue={() => undefined}
        onCheckForUpdates={() => undefined}
      />
    )

    // getStartupNewsUpdates returns the newest non-empty NEWS.md sections
    // (version labels + bullets, English from the file — not i18n).
    expect(screen.getByText('0.4.7')).toBeInTheDocument()
    expect(screen.getByText('0.4.6')).toBeInTheDocument()
    expect(screen.getByText('0.4.5')).toBeInTheDocument()
    expect(
      screen.getByText(
        /Forge credentials no longer leak to unknown remotes or git hooks/
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(/GitLab OAuth connect works in release installers \(credentials load/)
    ).toBeInTheDocument()
  })

  it('calls onClose when user dismisses the modal', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(
      <StartupModal
        open
        onClose={onClose}
        onContinue={() => undefined}
        onCheckForUpdates={() => undefined}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onContinue without hiding when checkbox is unchecked', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    renderWithProviders(
      <StartupModal
        open
        onClose={() => undefined}
        onContinue={onContinue}
        onCheckForUpdates={() => undefined}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Continue to App' }))
    expect(onContinue).toHaveBeenCalledWith({ hideFor30Days: false })
  })

  it('calls onContinue with hide preference when user continues', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    renderWithProviders(
      <StartupModal
        open
        onClose={() => undefined}
        onContinue={onContinue}
        onCheckForUpdates={() => undefined}
      />
    )

    await user.click(screen.getByLabelText("Don't show again for 30 days"))
    await user.click(screen.getByRole('button', { name: 'Continue to App' }))
    expect(onContinue).toHaveBeenCalledWith({ hideFor30Days: true })
  })

  it('calls onCheckForUpdates when user requests update check', async () => {
    const user = userEvent.setup()
    const onCheckForUpdates = vi.fn()
    renderWithProviders(
      <StartupModal
        open
        onClose={() => undefined}
        onContinue={() => undefined}
        onCheckForUpdates={onCheckForUpdates}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Check for Updates' }))
    expect(onCheckForUpdates).toHaveBeenCalledOnce()
  })
})
