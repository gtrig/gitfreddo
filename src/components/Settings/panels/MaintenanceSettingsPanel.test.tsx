/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { MaintenanceSettingsPanel } from './MaintenanceSettingsPanel'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useAppUpdate', () => ({
  useAppUpdate: vi.fn(() => ({
    state: { status: 'idle' },
    check: vi.fn(),
    download: vi.fn(),
    install: vi.fn(),
    dismiss: vi.fn()
  }))
}))

describe('MaintenanceSettingsPanel', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
  })
  it('renders update channel selector', () => {
    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={vi.fn()} />
    )
    expect(screen.getByText(/update channel/i)).toBeInTheDocument()
  })
})
