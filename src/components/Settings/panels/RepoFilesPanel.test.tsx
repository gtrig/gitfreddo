import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepoFilesPanel } from './RepoFilesPanel'
import { useWorkspaceStore } from '@/stores/workspace'
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
})
