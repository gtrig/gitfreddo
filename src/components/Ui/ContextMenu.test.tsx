/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContextMenu } from './ContextMenu'
import { renderWithProviders } from '@/test/render'

describe('ContextMenu', () => {
  afterEach(() => cleanup())

  it('renders menu items', () => {
    renderWithProviders(
      <ContextMenu
        x={10}
        y={20}
        items={[{ id: 'copy', label: 'Copy path', onClick: vi.fn() }]}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Copy path' })).toBeInTheDocument()
  })

  it('returns null for empty or separator-only menus', () => {
    const { container, rerender } = renderWithProviders(
      <ContextMenu x={0} y={0} items={[]} onClose={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()

    rerender(
      <ContextMenu
        x={0}
        y={0}
        items={[{ id: 'sep', label: '', separator: true, onClick: vi.fn() }]}
        onClose={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('invokes item click and closes the menu', async () => {
    const onClick = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <ContextMenu
        x={10}
        y={20}
        items={[
          { id: 'copy', label: 'Copy path', onClick },
          { id: 'danger', label: 'Delete', onClick: vi.fn(), danger: true, checked: true }
        ]}
        onClose={onClose}
      />
    )

    await user.click(screen.getByRole('menuitem', { name: 'Copy path' }))
    expect(onClick).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on outside click, Escape, and scroll', () => {
    const onClose = vi.fn()
    renderWithProviders(
      <ContextMenu
        x={10}
        y={20}
        items={[{ id: 'copy', label: 'Copy path', onClick: vi.fn() }]}
        onClose={onClose}
      />
    )

    fireEvent.mouseDown(document.body)
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.scroll(window)

    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('ignores clicks on disabled items', async () => {
    const onClick = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <ContextMenu
        x={10}
        y={20}
        items={[{ id: 'copy', label: 'Copy path', onClick, disabled: true }]}
        onClose={onClose}
      />
    )

    await user.click(screen.getByRole('menuitem', { name: 'Copy path' }))
    expect(onClick).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
