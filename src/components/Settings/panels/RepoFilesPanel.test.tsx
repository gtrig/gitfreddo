import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepoFilesPanel } from './RepoFilesPanel'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'

describe('RepoFilesPanel', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string, params) => {
      if (method === 'working.read') {
        const path = (params as { path: string }).path
        if (path === '.gitattributes') {
          return { exists: false, content: '' }
        }
        return { exists: true, content: '# ignore\n' }
      }
      return undefined
    })
  })

  it('offers to create a missing repository file', async () => {
    renderWithProviders(<RepoFilesPanel />)

    await userEvent.click(screen.getByRole('button', { name: '.gitattributes' }))

    expect(
      await screen.findByText('.gitattributes does not exist in this repository yet.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create .gitattributes' })).toBeInTheDocument()
  })

  it('opens an editor after choosing to create a missing file', async () => {
    renderWithProviders(<RepoFilesPanel />)

    await userEvent.click(screen.getByRole('button', { name: '.gitattributes' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Create .gitattributes' }))

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create .gitattributes' })).not.toBeDisabled()
  })

  it('saves an edited file and confirms, or reports a failed save', async () => {
    const show = vi.fn()
    useToastStore.setState({ show })
    renderWithProviders(<RepoFilesPanel />)
    const editor = await screen.findByRole('textbox')
    await userEvent.type(editor, 'node_modules/\n')
    await userEvent.click(screen.getByRole('button', { name: /^save /i }))
    await vi.waitFor(() =>
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
        'working.write',
        { path: '.gitignore', content: '# ignore\nnode_modules/\n' },
        '/tmp/repo'
      )
    )
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('Saved .gitignore.', 'success'))

    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'working.read') return { exists: true, content: '# ignore\n' }
      throw new Error('disk full')
    })
    await userEvent.type(screen.getByRole('textbox'), 'dist/\n')
    await userEvent.click(screen.getByRole('button', { name: /^save /i }))
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('disk full', 'error'))
  })

  it('asks to open a repository when none is connected', () => {
    useWorkspaceStore.setState({ connected: false, activePath: null, tabs: [] })
    renderWithProviders(<RepoFilesPanel />)
    expect(screen.getByText('Open a repository to edit repository files.')).toBeInTheDocument()
  })
})

