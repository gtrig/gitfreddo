/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { RenameEntityModal } from './RenameEntityModal'

function renderModal(overrides: Partial<Parameters<typeof RenameEntityModal>[0]> = {}) {
  const props = {
    open: true,
    currentName: 'refs/tags/v1',
    titleKey: 'modals.renameTag.title',
    renameKey: 'modals.renameTag.rename',
    newNameKey: 'modals.renameTag.newName',
    isPending: false,
    onClose: vi.fn(),
    onRename: vi.fn(async () => undefined),
    normalizeCurrentName: (name: string) => name.replace('refs/tags/', ''),
    ...overrides
  }
  renderWithProviders(<RenameEntityModal {...props} />)
  return props
}

describe('RenameEntityModal', () => {
  afterEach(() => cleanup())

  it('starts from the normalized current name and only allows a real change', async () => {
    renderModal()
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('v1')
    expect(screen.getByRole('button', { name: 'Rename' })).toBeDisabled()
    await userEvent.clear(input)
    expect(screen.getByRole('button', { name: 'Rename' })).toBeDisabled()
  })

  it('renames to the trimmed name and closes', async () => {
    const props = renderModal()
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, '  v2  ')
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }))
    expect(props.onRename).toHaveBeenCalledWith('v2')
    await waitFor(() => expect(props.onClose).toHaveBeenCalled())
  })

  it('prefers an explicit display name and closes on cancel', async () => {
    const props = renderModal({ displayName: 'shown-name' })
    expect(screen.getByRole('textbox')).toHaveValue('shown-name')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onClose).toHaveBeenCalled()
    expect(props.onRename).not.toHaveBeenCalled()
  })
})
