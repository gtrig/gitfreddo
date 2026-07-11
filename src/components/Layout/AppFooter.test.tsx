import { describe, expect, it } from 'vitest'
import { within } from '@testing-library/react'
import { AppFooter } from './AppFooter'
import { renderWithProviders } from '@/test/render'

describe('AppFooter', () => {
  it('shows version at the bottom right', () => {
    const { container } = renderWithProviders(<AppFooter version="0.3.0" />)
    const footer = container.querySelector('footer')
    expect(footer).toBeTruthy()
    expect(within(footer as HTMLElement).getByText('v0.3.0')).toBeInTheDocument()
  })

  it('shows placeholder when version is not loaded yet', () => {
    const { container } = renderWithProviders(<AppFooter version="" />)
    const footer = container.querySelector('footer')
    expect(footer).toBeTruthy()
    expect(within(footer as HTMLElement).getByText('…')).toBeInTheDocument()
  })

  it('shows zoom controls on the right after the version', async () => {
    const { container } = renderWithProviders(<AppFooter version="0.3.0" />)
    const footer = container.querySelector('footer')
    expect(footer).toBeTruthy()
    const scoped = within(footer as HTMLElement)
    expect(await scoped.findByText('100%')).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument()
    const children = Array.from(footer!.children)
    expect(children.indexOf(scoped.getByText('v0.3.0'))).toBeLessThan(
      children.indexOf(scoped.getByRole('button', { name: 'Zoom in' }).closest('div')!)
    )
  })
})
