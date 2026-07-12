/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { MaintenanceSettingsPanel } from './MaintenanceSettingsPanel'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'
import { useWorkspaceStore } from '@/stores/workspace'
import userEvent from '@testing-library/user-event'

vi.mock('@/hooks/useAppUpdate', () => ({
  useAppUpdate: vi.fn(() => ({
    state: { status: 'idle' },
    check: vi.fn(),
    download: vi.fn(),
    install: vi.fn(),
    dismiss: vi.fn()
  }))
}))

describe('MaintenanceSettingsPanel', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'maintenance.unreachable') {
        return { totalCommitCount: 0, commits: [], blobCount: 0, treeCount: 0 }
      }
      if (method === 'maintenance.staleBranches') return []
      if (method === 'maintenance.prune') return { removedCommitCount: 0 }
      return undefined
    })
  })
  it('renders update channel selector', () => {
    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={vi.fn()} />
    )
    expect(screen.getByText(/update channel/i)).toBeInTheDocument()
  })

  it('runs maintenance actions when a repository is connected', async () => {
    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Scan' }))
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
      'maintenance.unreachable',
      undefined,
      '/tmp/repo'
    )

    await userEvent.click(screen.getByRole('button', { name: 'Export settings' }))
  })
})
