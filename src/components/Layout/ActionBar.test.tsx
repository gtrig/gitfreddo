import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActionBar } from './ActionBar'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

function mockRepo(remoteNames: string[], upstream = 'origin/main') {
  window.gitfreddo = createGitFreddoMock({
    invoke: vi.fn(async (method: string) => {
      if (method === 'remote.list') {
        return remoteNames.map((name) => ({ name, url: `/remotes/${name}`, fetch: '', push: '' }))
      }
      if (method === 'branch.list') {
        return [{ name: 'main', isCurrent: true, isRemote: false, upstream }]
      }
      return undefined
    })
  })
}

describe('ActionBar', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
  })

  it('renders push and pull when connected', () => {
    mockRepo(['origin'])
    renderWithProviders(<ActionBar />)
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /push/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pull/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fetch/i })).toBeInTheDocument()
  })

  it('has no remote picker when the repo has a single remote', async () => {
    mockRepo(['origin'])
    renderWithProviders(<ActionBar />)
    await waitFor(() =>
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith('remote.list', undefined, '/tmp/repo')
    )
    expect(screen.queryByRole('button', { name: /choose remote/i })).not.toBeInTheDocument()
  })

  it('pushes to a remote picked from the push menu', async () => {
    mockRepo(['origin', 'backup'])
    const user = userEvent.setup()
    renderWithProviders(<ActionBar />)

    await user.click(await screen.findByRole('button', { name: /choose remote/i }))
    expect(screen.getByRole('menuitem', { name: 'Push to origin (upstream)' })).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Push to backup' }))

    await waitFor(() =>
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
        'push',
        { remote: 'backup', setUpstream: false },
        '/tmp/repo'
      )
    )
  })

  it('sets the upstream when the toggle is on', async () => {
    mockRepo(['origin', 'backup'])
    const user = userEvent.setup()
    renderWithProviders(<ActionBar />)

    await user.click(await screen.findByRole('button', { name: /choose remote/i }))
    await user.click(screen.getByRole('menuitem', { name: /set as upstream/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Push to backup' }))

    await waitFor(() =>
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
        'push',
        { remote: 'backup', setUpstream: true },
        '/tmp/repo'
      )
    )
  })

  it('renders nothing when not connected', () => {
    useWorkspaceStore.setState({ connected: false, tabs: [], activePath: null })
    const { container } = renderWithProviders(<ActionBar />)
    expect(container).toBeEmptyDOMElement()
  })
})
