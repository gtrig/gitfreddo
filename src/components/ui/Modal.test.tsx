import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

describe('Modal', () => {
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
    render(
      <Modal open title="Closable" onClose={onClose}>
        <p>Content</p>
      </Modal>
    )
    const closeButtons = screen.getAllByLabelText('Close')
    await user.click(closeButtons[closeButtons.length - 1]!)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
