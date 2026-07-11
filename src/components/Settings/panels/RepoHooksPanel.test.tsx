import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepoHooksPanel } from './RepoHooksPanel'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'

describe('RepoHooksPanel', () => {
  afterEach(() => {
    cleanup()
    vi.mocked(window.gitfreddo.invoke).mockReset()
  })

  beforeEach(() => {
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
})
