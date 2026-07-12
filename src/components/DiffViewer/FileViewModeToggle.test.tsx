/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { FileViewModeToggle } from './FileViewModeToggle'
import { renderWithProviders } from '@/test/render'

describe('FileViewModeToggle', () => {
  afterEach(() => cleanup())
  it('renders view mode buttons', () => {
    renderWithProviders(<FileViewModeToggle viewMode="unified" onViewModeChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'unified' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Side by side' })).toBeInTheDocument()
  })
})
