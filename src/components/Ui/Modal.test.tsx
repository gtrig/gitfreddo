import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal, Checkbox } from './Modal'
import { renderWithProviders } from '@/test/render'

describe('Modal', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders title and children when open', () => {
    render(
      <Modal open title="Test modal" onClose={() => undefined}>
        <p>Modal body</p>
      </Modal>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test modal')).toBeInTheDocument()
    expect(screen.getByText('Modal body')).toBeInTheDocument()
  })

  it('returns null when closed', () => {
    const { container } = render(
      <Modal open={false} title="Hidden" onClose={() => undefined}>
        <p>Hidden body</p>
      </Modal>
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(
      <Modal open title="Closable" onClose={onClose}>
        <p>Content</p>
      </Modal>
    )
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByLabelText(/close/i))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders Checkbox with theme palette classes', () => {
    render(<Checkbox aria-label="Enable feature" />)
    const checkbox = screen.getByRole('checkbox', { name: 'Enable feature' })
    expect(checkbox).toHaveClass('gf-checkbox')
    expect(checkbox).toHaveAttribute('type', 'checkbox')
  })
})
