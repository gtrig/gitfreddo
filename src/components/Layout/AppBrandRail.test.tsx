import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { AppBrandRail } from './AppBrandRail'
import { renderWithProviders } from '@/test/render'

describe('AppBrandRail', () => {
  afterEach(() => cleanup())
  it('renders brand rail with logo', () => {
    renderWithProviders(<AppBrandRail />)
    expect(screen.getByRole('complementary', { name: 'GitFreddo' })).toBeInTheDocument()
    expect(screen.getByAltText('GitFreddo')).toBeInTheDocument()
  })
})
