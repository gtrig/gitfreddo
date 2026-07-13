/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepoHooksPanel } from './RepoHooksPanel'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

const showToast = vi.fn()

describe('RepoHooksPanel', () => {
  afterEach(() => {
    cleanup()
    vi.mocked(window.gitfreddo.invoke).mockReset()
    vi.mocked(window.confirm).mockReset()
  })

  beforeEach(() => {
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    window.gitfreddo = createGitFreddoMock()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
  })

  it('offers to configure .githooks when hooks exist outside the active hooks directory', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'hooks.list') {
        return {
          hooks: [
            {
              name: 'pre-push',
              filename: 'pre-push.sample',
              enabled: false,
              executable: false
            }
          ],
          hooksDir: '/tmp/repo/.git/hooks',
          alternateHooksDir: '/tmp/repo/.githooks',
          alternateHooksPath: '.githooks'
        }
      }
      if (method === 'hooks.read') {
        return '#!/bin/sh\n'
      }
      return undefined
    })

    renderWithProviders(<RepoHooksPanel />)

    expect(
      await screen.findByText(/Hooks exist in \/tmp\/repo\/.githooks but Git is using/)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use .githooks' })).toBeInTheDocument()
  })

  it('sets core.hooksPath when choosing the alternate hooks directory', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'hooks.list') {
        return {
          hooks: [],
          hooksDir: '/tmp/repo/.git/hooks',
          alternateHooksDir: '/tmp/repo/.githooks',
          alternateHooksPath: '.githooks'
        }
      }
      if (method === 'config.set') {
        return undefined
      }
      return undefined
    })

    renderWithProviders(<RepoHooksPanel />)
    await userEvent.click(await screen.findByRole('button', { name: 'Use .githooks' }))

    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('config.set', {
      key: 'core.hooksPath',
      value: '.githooks',
      scope: 'local'
    })
  })

  it('loads hook content and saves edits', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'hooks.list') {
        return {
          hooks: [{ name: 'pre-commit', filename: 'pre-commit', enabled: true, executable: true }],
          hooksDir: '/tmp/repo/.git/hooks'
        }
      }
      if (method === 'hooks.read') return '#!/bin/sh\necho hook\n'
      if (method === 'hooks.write') return undefined
      return undefined
    })

    renderWithProviders(<RepoHooksPanel />)
    const textarea = await screen.findByRole('textbox')
    expect(textarea).toHaveValue('#!/bin/sh\necho hook\n')

    await userEvent.type(textarea, '\necho updated')
    await userEvent.click(screen.getByRole('button', { name: /save pre-commit/i }))

    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('hooks.write', {
      name: 'pre-commit',
      content: '#!/bin/sh\necho hook\n\necho updated'
    })
  })

  it('enables a disabled hook', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'hooks.list') {
        return {
          hooks: [{ name: 'pre-push', filename: 'pre-push.sample', enabled: false, executable: false }],
          hooksDir: '/tmp/repo/.git/hooks'
        }
      }
      if (method === 'hooks.read') return '#!/bin/sh\n'
      if (method === 'hooks.enable' || method === 'hooks.disable') return undefined
      return undefined
    })

    renderWithProviders(<RepoHooksPanel />)
    await screen.findByRole('textbox')
    await userEvent.click(screen.getByRole('button', { name: 'Enable' }))
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('hooks.enable', { name: 'pre-push' })
  })

  it('shows connect prompt when no repository is open', () => {
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      connected: false,
      workspacePath: null,
      workspacePickerOpen: false
    })

    renderWithProviders(<RepoHooksPanel />)
    expect(screen.getByText(/Open a repository to manage git hooks/i)).toBeInTheDocument()
  })

  it('disables an enabled hook', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'hooks.list') {
        return {
          hooks: [{ name: 'pre-commit', filename: 'pre-commit', enabled: true, executable: true }],
          hooksDir: '/tmp/repo/.git/hooks'
        }
      }
      if (method === 'hooks.read') return '#!/bin/sh\n'
      if (method === 'hooks.disable') return undefined
      return undefined
    })

    renderWithProviders(<RepoHooksPanel />)
    await screen.findByRole('textbox')
    await userEvent.click(screen.getByRole('button', { name: 'Disable' }))
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('hooks.disable', { name: 'pre-commit' })
  })

  it('deletes a hook after confirmation', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'hooks.list') {
        return {
          hooks: [{ name: 'pre-commit', filename: 'pre-commit', enabled: true, executable: true }],
          hooksDir: '/tmp/repo/.git/hooks'
        }
      }
      if (method === 'hooks.read') return '#!/bin/sh\n'
      if (method === 'hooks.delete') return undefined
      return undefined
    })

    renderWithProviders(<RepoHooksPanel />)
    await screen.findByRole('textbox')
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(window.confirm).toHaveBeenCalled()
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('hooks.delete', { name: 'pre-commit' })
  })

  it('skips delete when confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'hooks.list') {
        return {
          hooks: [{ name: 'pre-commit', filename: 'pre-commit', enabled: true, executable: true }],
          hooksDir: '/tmp/repo/.git/hooks'
        }
      }
      if (method === 'hooks.read') return '#!/bin/sh\n'
      return undefined
    })

    renderWithProviders(<RepoHooksPanel />)
    await screen.findByRole('textbox')
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(window.gitfreddo.invoke).not.toHaveBeenCalledWith('hooks.delete', expect.anything())
  })
})
