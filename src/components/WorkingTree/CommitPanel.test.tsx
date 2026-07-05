import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { CommitPanel } from './CommitPanel'
import { useWorkspaceStore } from '@/stores/workspace'
import { COMMIT_PANEL_DEFAULT, useLayoutStore } from '@/stores/layout'
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
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    useLayoutStore.setState({ commitPanelHeight: COMMIT_PANEL_DEFAULT })
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

  it('sizes the description field from the resizable commit panel height', () => {
    useLayoutStore.setState({ commitPanelHeight: 320 })
    const view = renderWithProviders(<CommitPanel working={emptyWorking} />)
    expect(view.getByTestId('commit-panel')).toHaveStyle({ height: '320px' })
    expect(view.getByPlaceholderText('Description')).toHaveClass('flex-1')
  })
})
