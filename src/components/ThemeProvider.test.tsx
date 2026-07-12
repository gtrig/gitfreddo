import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { ThemeProvider } from './ThemeProvider'
import { renderWithProviders } from '@/test/render'

describe('ThemeProvider', () => {
  afterEach(() => cleanup())
  it('renders children', () => {
    renderWithProviders(
      <ThemeProvider>
        <span>App content</span>
      </ThemeProvider>
    )
    expect(screen.getByText('App content')).toBeInTheDocument()
  })
})
