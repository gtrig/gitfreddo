import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Modal,
  Checkbox,
  ConfirmDialog,
  FieldLabel,
  TextInput,
  TextArea,
  Select,
  ActionButton
} from './Modal'
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

  it('closes on Escape and traps Tab focus within the dialog', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <Modal open title="Keyboard" onClose={onClose}>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Modal>
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()

    const dialog = screen.getByRole('dialog')
    const last = within(dialog).getByRole('button', { name: 'Last' })
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(within(dialog).getByLabelText(/close/i))
  })

  it('closes when clicking the backdrop', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <Modal open title="Backdrop" onClose={onClose}>
        <p>Content</p>
      </Modal>
    )
    await userEvent.click(screen.getByRole('presentation'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders Checkbox with theme palette classes', () => {
    render(<Checkbox aria-label="Enable feature" />)
    const checkbox = screen.getByRole('checkbox', { name: 'Enable feature' })
    expect(checkbox).toHaveClass('gf-checkbox')
    expect(checkbox).toHaveAttribute('type', 'checkbox')
  })

  it('renders form helpers and action button variants', async () => {
    const onConfirm = vi.fn()
    render(
      <>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <TextInput id="name" defaultValue="GitFreddo" />
        <TextArea defaultValue="Notes" />
        <Select aria-label="Theme">
          <option>Dark</option>
        </Select>
        <ActionButton variant="primary">Primary</ActionButton>
        <ActionButton variant="danger">Danger</ActionButton>
        <ConfirmDialog
          open
          title="Delete"
          message="Are you sure?"
          confirmLabel="Delete"
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      </>
    )

    expect(screen.getByLabelText('Name')).toHaveValue('GitFreddo')
    expect(screen.getByRole('combobox', { name: 'Theme' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('shows busy state in confirm dialog', () => {
    render(
      <ConfirmDialog
        open
        busy
        title="Working"
        message="Please wait"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Working…')).toBeInTheDocument()
  })
})
