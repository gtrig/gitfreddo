import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingRow, Spinner } from '@/components/Ui/Spinner'
import { renderWithProviders } from '@/test/render'

describe('Spinner', () => {
  it('renders a status indicator', () => {
    renderWithProviders(<Spinner size="lg" />)
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument()
  })
})

describe('LoadingRow', () => {
  it('renders a custom label', () => {
    render(<LoadingRow label="Fetching commits" />)
    expect(screen.getByText('Fetching commits')).toBeInTheDocument()
  })
})
