/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { BranchVisibilityToggle } from './BranchVisibilityToggle'
import { renderWithProviders } from '@/test/render'

describe('BranchVisibilityToggle', () => {
  afterEach(() => cleanup())
  it('renders hide from graph button when visible', () => {
    renderWithProviders(<BranchVisibilityToggle hidden={false} onToggle={vi.fn()} />)
    expect(screen.getByRole('button', { name: /hide from graph/i })).toBeInTheDocument()
  })
})
