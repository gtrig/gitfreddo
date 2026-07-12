/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { MaintenanceSettingsPanel } from './MaintenanceSettingsPanel'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import userEvent from '@testing-library/user-event'

const checkForUpdates = vi.fn(async () => undefined)
const showToast = vi.fn()

vi.mock('@/hooks/useAppUpdate', () => ({
  useAppUpdate: vi.fn(() => ({
    state: { status: 'idle', currentVersion: '1.0.0' },
    bannerVisible: false,
    checkForUpdates,
    downloadUpdate: vi.fn(),
    installUpdate: vi.fn(),
    dismissBanner: vi.fn()
  }))
}))

vi.mock('@/components/DetailPanel/RemoveStaleBranchesModal', () => ({
  RemoveStaleBranchesModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Remove stale branches</div> : null
}))

describe('MaintenanceSettingsPanel', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    checkForUpdates.mockClear()
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
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

  it('prunes unreachable objects after confirmation', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'maintenance.unreachable') {
        return {
          totalCommitCount: 2,
          commits: [{ hash: 'abc', subject: 'Old', authorDate: '2024-01-01T00:00:00Z' }],
          blobCount: 1,
          treeCount: 1
        }
      }
      if (method === 'maintenance.prune') return { removedCommitCount: 2 }
      return undefined
    })

    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Scan' }))
    expect(await screen.findByText('Old')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remove unreachable' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
      'maintenance.unreachable',
      undefined,
      '/tmp/repo'
    )
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('maintenance.prune', undefined, '/tmp/repo')
  })

  it('warns when no repository is connected', () => {
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      connected: false,
      workspacePath: null,
      workspacePickerOpen: false
    })

    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={vi.fn()} />
    )

    expect(screen.getByText(/open a repository to run maintenance/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scan' })).toBeDisabled()
  })

  it('shows scan error toast when unreachable scan fails', async () => {
    vi.mocked(window.gitfreddo.invoke).mockRejectedValue(new Error('Scan failed'))

    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Scan' }))
    expect(showToast).toHaveBeenCalledWith('Scan failed', 'error')
  })

  it('exports settings backup and shows success toast', async () => {
    vi.mocked(window.gitfreddo.exportSettingsBackup).mockResolvedValue('/tmp/backup.json')

    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Export settings' }))
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringMatching(/backup\.json/i),
        'success'
      )
    })
  })

  it('shows export error toast when backup fails', async () => {
    vi.mocked(window.gitfreddo.exportSettingsBackup).mockRejectedValue(new Error('Export failed'))

    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Export settings' }))
    expect(showToast).toHaveBeenCalledWith('Export failed', 'error')
  })

  it('imports settings after confirmation', async () => {
    const onChange = vi.fn()
    vi.mocked(window.gitfreddo.importSettingsBackup).mockResolvedValue({
      ...defaultMockSettings,
      updateChannel: 'beta'
    })

    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={onChange} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Import settings' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Import settings' }))

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ updateChannel: 'beta' }))
      expect(showToast).toHaveBeenCalledWith(
        expect.stringMatching(/restored from backup/i),
        'success'
      )
    })
  })

  it('does nothing when import dialog is cancelled in the picker', async () => {
    const onChange = vi.fn()
    vi.mocked(window.gitfreddo.importSettingsBackup).mockResolvedValue(null)

    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={onChange} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Import settings' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Import settings' }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('updates maintenance preferences through onChange', async () => {
    const onChange = vi.fn()

    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={onChange} />
    )

    await userEvent.selectOptions(screen.getByRole('combobox'), 'beta')
    expect(onChange).toHaveBeenCalledWith({ updateChannel: 'beta' })

    await userEvent.click(screen.getByRole('checkbox', { name: /check for updates on startup/i }))
    expect(onChange).toHaveBeenCalledWith({ checkForUpdatesOnStartup: false })
  })

  it('checks for updates manually', async () => {
    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: /check for updates/i }))
    expect(checkForUpdates).toHaveBeenCalledWith(true)
  })

  it('opens remove stale branches modal', async () => {
    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: /remove stale branches/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent(/remove stale branches/i)
  })

  it('shows truncated unreachable commit preview and object counts', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'maintenance.unreachable') {
        return {
          totalCommitCount: 120,
          commits: Array.from({ length: 50 }, (_, index) => ({
            hash: `hash-${index}`,
            shortHash: `abc${index}`,
            subject: `Commit ${index}`,
            authorDate: '2024-01-01T00:00:00Z'
          })),
          blobCount: 3,
          treeCount: 2
        }
      }
      return undefined
    })

    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Scan' }))
    expect(await screen.findByText('Commit 0')).toBeInTheDocument()
    expect(screen.getByText(/Found 120 unreachable commits/i)).toBeInTheDocument()
    expect(screen.getByText(/and 5 other objects/i)).toBeInTheDocument()
    expect(screen.getByText(/showing first/i)).toBeInTheDocument()
  })

  it('shows cleanup complete toast when prune removes nothing', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'maintenance.unreachable') {
        return {
          totalCommitCount: 1,
          commits: [{ hash: 'abc', shortHash: 'abc', subject: 'Old', authorDate: '' }],
          blobCount: 0,
          treeCount: 0
        }
      }
      if (method === 'maintenance.prune') return { removedCommitCount: 0 }
      return undefined
    })

    renderWithProviders(
      <MaintenanceSettingsPanel form={defaultMockSettings} onChange={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Scan' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove unreachable' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/cleanup complete/i), 'success')
  })
})
