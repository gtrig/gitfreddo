import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { CommitPanel } from './CommitPanel'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import type { GitWorkingStatus } from '@/lib/types'

const emptyWorking: GitWorkingStatus = {
  branch: 'main',
  ahead: 0,
  behind: 0,
  staged: [],
  unstaged: [],
  untracked: [],
  conflicted: [],
  isClean: true,
  mergeInProgress: false,
  rebaseInProgress: false,
  cherryPickInProgress: false
}

describe('CommitPanel', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, processExited: false, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      processExited: false,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'config.get') return null
      if (method === 'branch.list') return []
      if (method === 'remote.list') return []
      if (method === 'log.graph') return { commits: [], refs: [] }
      return {}
    })
  })

  it('disables commit when summary is empty', () => {
    renderWithProviders(<CommitPanel working={emptyWorking} />)
    const primary = screen
      .getAllByRole('button')
      .find((button) => button.className.includes('emerald-600'))
    expect(primary).toBeDefined()
    expect(primary).toBeDisabled()
  })
})
