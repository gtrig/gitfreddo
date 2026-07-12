/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { SettingsSidebar } from './SettingsSidebar'
import { renderWithProviders } from '@/test/render'

describe('SettingsSidebar', () => {
  afterEach(() => cleanup())
  it('renders settings navigation', () => {
    renderWithProviders(<SettingsSidebar active="interface" onSelect={vi.fn()} />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /interface/i })).toHaveAttribute('aria-current', 'page')
  })
})
