/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { RenameFileModal } from './RenameFileModal'

describe('RenameFileModal', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
  })
  it('renders dialog', () => {
    renderWithProviders(<RenameFileModal open oldPath="old.txt" onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renames to the trimmed new path and closes', async () => {
    const onClose = vi.fn()
    renderWithProviders(<RenameFileModal open oldPath="src/old.txt" onClose={onClose} />)
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, '  src/new.txt  ')
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }))
    await waitFor(() =>
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
        'working.rename',
        { oldPath: 'src/old.txt', newPath: 'src/new.txt' },
        '/tmp/repo'
      )
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('keeps Rename disabled for an unchanged or empty path and cancels', async () => {
    const onClose = vi.fn()
    renderWithProviders(<RenameFileModal open oldPath="old.txt" onClose={onClose} />)
    expect(screen.getByRole('button', { name: 'Rename' })).toBeDisabled()
    await userEvent.clear(screen.getByRole('textbox'))
    expect(screen.getByRole('button', { name: 'Rename' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
  })
})
