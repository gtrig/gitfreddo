/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SubmodulesSection } from './SubmodulesSection'
import { useWorkspaceStore } from '@/stores/workspace'
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

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => {
    const mutation = { mutateAsync: vi.fn(async () => undefined), isPending: false }
    return {
      submoduleInit: { mutateAsync: submoduleInit, isPending: false },
      submoduleUpdate: { mutateAsync: submoduleUpdate, isPending: false },
      submoduleSync: { mutateAsync: submoduleSync, isPending: false },
      submoduleDeinit: { mutateAsync: submoduleDeinit, isPending: false },
      submoduleRemove: mutation,
      submoduleAdd: mutation,
      stageAdd: mutation
    }
  }
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
})
