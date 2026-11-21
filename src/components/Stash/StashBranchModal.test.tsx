/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { StashBranchModal } from './StashBranchModal'

describe('StashBranchModal', () => {
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
    renderWithProviders(<StashBranchModal open stashIndex={0} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('creates a branch from the stash and closes; cancel closes without creating', async () => {
    const onClose = vi.fn()
    renderWithProviders(<StashBranchModal open stashIndex={2} onClose={onClose} />)
    const create = screen.getAllByRole('button').find((button) => /branch/i.test(button.textContent ?? ''))!
    expect(create).toBeDisabled()
    await userEvent.type(screen.getByRole('textbox'), '  feature/from-stash  ')
    await userEvent.click(create)
    await waitFor(() =>
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
        'stash.branch',
        { index: 2, branchName: 'feature/from-stash' },
        '/tmp/repo'
      )
    )
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
