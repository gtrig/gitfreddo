/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { UpdateBanner } from './UpdateBanner'
import { renderWithProviders } from '@/test/render'

describe('UpdateBanner', () => {
  afterEach(() => cleanup())
  it('renders update available banner', () => {
    renderWithProviders(
      <UpdateBanner
        visible
        state={{ status: 'available', availableVersion: '1.2.3', progressPercent: 0, currentVersion: '1.2.2' }}
        onDownload={vi.fn()}
        onInstall={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/1\.2\.3/)).toBeInTheDocument()
  })
})
