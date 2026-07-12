/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SubmodulesSection } from './SubmodulesSection'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'

const submodule = {
  path: 'vendor/lib',
  name: 'vendor',
  url: 'https://example.com/lib.git',
  status: 'initialized' as const,
  hasWorkingTree: true
}

const submoduleUpdate = vi.fn(async () => undefined)
const submoduleSync = vi.fn(async () => undefined)
const submoduleInit = vi.fn(async () => undefined)
const submoduleDeinit = vi.fn(async () => undefined)
const submoduleRemove = vi.fn(async () => undefined)
const stageAdd = vi.fn(async () => undefined)
const showToast = vi.fn()

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    submoduleInit: { mutateAsync: submoduleInit, isPending: false },
    submoduleUpdate: { mutateAsync: submoduleUpdate, isPending: false },
    submoduleSync: { mutateAsync: submoduleSync, isPending: false },
    submoduleDeinit: { mutateAsync: submoduleDeinit, isPending: false },
    submoduleRemove: { mutateAsync: submoduleRemove, isPending: false },
    submoduleAdd: { mutateAsync: vi.fn(async () => undefined), isPending: false },
    stageAdd: { mutateAsync: stageAdd, isPending: false }
  })
}))

vi.mock('@/components/Submodules/EditSubmoduleUrlModal', () => ({
  EditSubmoduleUrlModal: ({
    open,
    submodulePath
  }: {
    open: boolean
    submodulePath: string
  }) => (open ? <div role="dialog">Edit URL for {submodulePath}</div> : null)
}))

describe('SubmodulesSection', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    submoduleUpdate.mockClear()
    submoduleSync.mockClear()
    submoduleInit.mockClear()
    submoduleDeinit.mockClear()
    submoduleRemove.mockClear()
    stageAdd.mockClear()
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'submodule.list') {
        return [
          {
            path: 'vendor/lib',
            name: 'vendor',
            url: 'https://example.com/lib.git',
            status: 'initialized',
            hasWorkingTree: true
          }
        ]
      }
      if (method === 'repo.status') {
        return { root: '/tmp/repo', head: 'abc', branch: 'main', isDetached: false }
      }
      return undefined
    })
  })

  it('renders submodule rows when data is provided', () => {
    renderWithProviders(
      <SubmodulesSection
        submodules={[
          {
            path: 'vendor/lib',
            name: 'vendor',
            url: 'https://example.com/lib.git',
            status: 'initialized',
            hasWorkingTree: true
          }
        ]}
        filter=""
        isLoading={false}
        error={null}
      />
    )
    expect(screen.getByText('vendor/lib')).toBeInTheDocument()
  })

  it('shows empty state when there are no submodules', () => {
    renderWithProviders(
      <SubmodulesSection submodules={[]} filter="" isLoading={false} error={null} />
    )
    expect(screen.getByText(/no submodules/i)).toBeInTheDocument()
  })

  it('opens row context menu and the add submodule modal', async () => {
    vi.mocked(window.gitfreddo.normalizeRepoPath).mockImplementation(async (path) => path)
    renderWithProviders(
      <SubmodulesSection submodules={[submodule]} filter="" isLoading={false} error={null} />
    )

    fireEvent.contextMenu(screen.getByText('vendor/lib'))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /add submodule/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('opens submodule in workspace tab from row click', async () => {
    const openWorkspace = vi.fn(async () => undefined)
    useWorkspaceStore.setState({ openWorkspace })
    vi.mocked(window.gitfreddo.normalizeRepoPath).mockResolvedValue('/tmp/repo/vendor/lib')
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'repo.status') {
        return { root: '/tmp/repo', head: 'abc', branch: 'main', isDetached: false }
      }
      return undefined
    })

    renderWithProviders(
      <SubmodulesSection submodules={[submodule]} filter="" isLoading={false} error={null} />
    )

    await userEvent.click(screen.getByText('vendor/lib'))
    expect(openWorkspace).toHaveBeenCalledWith('/tmp/repo/vendor/lib')
  })

  it('shows loading, error, and filtered empty states', () => {
    const { rerender } = renderWithProviders(
      <SubmodulesSection submodules={[]} filter="" isLoading error={null} />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(
      <SubmodulesSection
        submodules={[]}
        filter=""
        isLoading={false}
        error={new Error('Submodule load failed')}
      />
    )
    expect(screen.getByText('Submodule load failed')).toBeInTheDocument()

    rerender(
      <SubmodulesSection submodules={[submodule]} filter="missing" isLoading={false} error={null} />
    )
    expect(screen.getByText(/no submodules/i)).toBeInTheDocument()
  })

  it('runs bulk update and sync actions from the section menu', async () => {
    renderWithProviders(
      <SubmodulesSection submodules={[submodule]} filter="" isLoading={false} error={null} />
    )

    await userEvent.click(screen.getByRole('button', { name: /submodules actions/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /update all/i }))
    expect(submoduleUpdate).toHaveBeenCalledWith({ init: true, recursive: true })

    await userEvent.click(screen.getByRole('button', { name: /submodules actions/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /sync all/i }))
    expect(submoduleSync).toHaveBeenCalledWith({ recursive: true })
  })

  it('updates and deinitializes a submodule from the row menu', async () => {
    renderWithProviders(
      <SubmodulesSection submodules={[submodule]} filter="" isLoading={false} error={null} />
    )

    fireEvent.contextMenu(screen.getByText('vendor/lib'))
    await userEvent.click(screen.getByRole('menuitem', { name: /^update$/i }))
    expect(submoduleUpdate).toHaveBeenCalledWith({ paths: ['vendor/lib'], init: true })

    fireEvent.contextMenu(screen.getByText('vendor/lib'))
    await userEvent.click(screen.getByRole('menuitem', { name: /deinitialize/i }))
    await userEvent.click(screen.getByRole('button', { name: /deinitialize/i }))
    expect(submoduleDeinit).toHaveBeenCalledWith({ path: 'vendor/lib', force: false })
  })

  it('initializes an uninitialized submodule from the row menu', async () => {
    renderWithProviders(
      <SubmodulesSection
        submodules={[{ ...submodule, status: 'uninitialized', hasWorkingTree: false }]}
        filter=""
        isLoading={false}
        error={null}
      />
    )

    fireEvent.contextMenu(screen.getByText('vendor/lib'))
    await userEvent.click(screen.getByRole('menuitem', { name: /^initialize$/i }))
    expect(submoduleInit).toHaveBeenCalledWith({ paths: ['vendor/lib'] })
  })

  it('syncs a submodule and opens the edit URL modal from the row menu', async () => {
    renderWithProviders(
      <SubmodulesSection submodules={[submodule]} filter="" isLoading={false} error={null} />
    )

    fireEvent.contextMenu(screen.getByText('vendor/lib'))
    await userEvent.click(screen.getByRole('menuitem', { name: /^sync$/i }))
    expect(submoduleSync).toHaveBeenCalledWith({ paths: ['vendor/lib'] })

    fireEvent.contextMenu(screen.getByText('vendor/lib'))
    await userEvent.click(screen.getByRole('menuitem', { name: /set url/i }))
    expect(screen.getByText(/Edit URL for vendor\/lib/)).toBeInTheDocument()
  })

  it('stages dirty submodule pointer changes from the row menu', async () => {
    renderWithProviders(
      <SubmodulesSection
        submodules={[{ ...submodule, status: 'dirty' }]}
        filter=""
        isLoading={false}
        error={null}
      />
    )

    fireEvent.contextMenu(screen.getByText('vendor/lib'))
    await userEvent.click(screen.getByRole('menuitem', { name: /stage pointer/i }))
    expect(stageAdd).toHaveBeenCalledWith({ paths: ['vendor/lib'] })
  })

  it('removes a submodule after confirmation', async () => {
    renderWithProviders(
      <SubmodulesSection submodules={[submodule]} filter="" isLoading={false} error={null} />
    )

    fireEvent.contextMenu(screen.getByText('vendor/lib'))
    await userEvent.click(screen.getByRole('menuitem', { name: /^remove/i }))
    await userEvent.click(screen.getByRole('button', { name: /^remove$/i }))
    expect(submoduleRemove).toHaveBeenCalledWith({ path: 'vendor/lib', force: false })
  })

  it('offers force deinit after a failed deinitialize attempt', async () => {
    submoduleDeinit.mockRejectedValueOnce(new Error('Working tree dirty'))

    renderWithProviders(
      <SubmodulesSection submodules={[submodule]} filter="" isLoading={false} error={null} />
    )

    fireEvent.contextMenu(screen.getByText('vendor/lib'))
    await userEvent.click(screen.getByRole('menuitem', { name: /deinitialize/i }))
    await userEvent.click(screen.getByRole('button', { name: /deinitialize/i }))

    expect(showToast).toHaveBeenCalledWith('Working tree dirty', 'error')
    await userEvent.click(screen.getByRole('button', { name: /force deinit/i }))
    expect(submoduleDeinit).toHaveBeenLastCalledWith({ path: 'vendor/lib', force: true })
  })

  it('switches to an existing workspace tab instead of opening a duplicate', async () => {
    const switchWorkspace = vi.fn(async () => undefined)
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo/vendor/lib', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false,
      switchWorkspace
    })
    vi.mocked(window.gitfreddo.normalizeRepoPath).mockResolvedValue('/tmp/repo/vendor/lib')

    renderWithProviders(
      <SubmodulesSection submodules={[submodule]} filter="" isLoading={false} error={null} />
    )

    await userEvent.click(screen.getByText('vendor/lib'))
    expect(switchWorkspace).toHaveBeenCalledWith('/tmp/repo/vendor/lib')
  })

  it('shows an error toast when bulk update fails', async () => {
    submoduleUpdate.mockRejectedValueOnce(new Error('Update failed'))

    renderWithProviders(
      <SubmodulesSection submodules={[submodule]} filter="" isLoading={false} error={null} />
    )

    await userEvent.click(screen.getByRole('button', { name: /submodules actions/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /update all/i }))
    expect(showToast).toHaveBeenCalledWith('Update failed', 'error')
  })
})
