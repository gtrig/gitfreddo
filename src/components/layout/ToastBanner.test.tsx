import { describe, expect, it, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastBanner } from './ToastBanner'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'

describe('ToastBanner', () => {
  afterEach(() => {
    useToastStore.setState({ message: null, tone: 'info' })
  })

  it('shows toast message from store', () => {
    useToastStore.setState({ message: 'Test toast', tone: 'success' })
    renderWithProviders(<ToastBanner />)
    expect(screen.getByText('Test toast')).toBeInTheDocument()
  })

  it('returns null when no message', () => {
    useToastStore.setState({ message: null, tone: 'info' })
    const { container } = renderWithProviders(<ToastBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('clears message on dismiss', async () => {
    const user = userEvent.setup()
    useToastStore.setState({ message: 'Dismiss me', tone: 'info' })
    const { container } = renderWithProviders(<ToastBanner />)
    const dismiss = container.querySelector('[aria-label="Dismiss"]')
    expect(dismiss).toBeTruthy()
    await user.click(dismiss!)
    expect(useToastStore.getState().message).toBeNull()
  })
})
