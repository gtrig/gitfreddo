/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GitWorkingTree } from './GitWorkingTree'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
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

vi.mock('@/components/WorkingTree/CommitPanel', () => ({
  CommitPanel: () => null
}))
vi.mock('@/components/WorkingTree/AnalyzeChangesWithAi', () => ({
  AnalyzeChangesWithAi: () => null
}))
vi.mock('@/components/WorkingTree/CleanUntrackedModal', () => ({
  CleanUntrackedModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Clean untracked</div> : null
}))
vi.mock('@/components/WorkingTree/RenameFileModal', () => ({
  RenameFileModal: ({ open, oldPath }: { open: boolean; oldPath: string }) =>
    open ? <div data-testid="rename-modal">{oldPath}</div> : null
}))

vi.mock('@/hooks/useGit', () => ({
  useWorkingStatus: vi.fn(() => ({
    data: emptyWorking,
    isLoading: false,
    error: null
  })),
  useRepoStatus: vi.fn(() => ({ data: { head: 'abc', branch: 'main', isDetached: false } })),
  useLogGraph: vi.fn(() => ({ data: { commits: [], refs: [] }, isLoading: false, error: null })),
  useCleanPreview: vi.fn(() => ({ data: [], isLoading: false, error: null }))
}))

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: vi.fn(() => {
    const mutation = { isPending: false, mutateAsync: vi.fn() }
    return {
      stageAdd: mutation,
      stageReset: mutation,
      workingDiscard: mutation,
      workingRemove: mutation,
      workingAddToGitignore: mutation,
      submoduleUpdate: mutation,
      submoduleSync: mutation,
      commit: mutation
    }
  })
}))

vi.mock('@/hooks/useInvalidateGit', () => ({
  useInvalidateGit: vi.fn(() => vi.fn())
}))

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    options: { count },
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * estimateSize(),
        size: estimateSize()
      })),
    getTotalSize: () => count * estimateSize(),
    measureElement: vi.fn(),
    scrollToIndex: vi.fn()
  }))
}))


type Mutation = { isPending: boolean; mutateAsync: ReturnType<typeof vi.fn> }

async function setup(working: Partial<GitWorkingStatus>, overrides: Record<string, Mutation> = {}) {
  const { useWorkingStatus, useRepoStatus } = await import('@/hooks/useGit')
  const { useGitMutations } = await import('@/hooks/useGitMutations')
  vi.mocked(useWorkingStatus).mockReturnValue({
    data: { ...emptyWorking, isClean: false, ...working },
    isLoading: false,
    error: null
  } as ReturnType<typeof useWorkingStatus>)
  vi.mocked(useRepoStatus).mockReturnValue({
    data: { head: 'abc', branch: 'main', isDetached: false, root: '/tmp/repo' }
  } as unknown as ReturnType<typeof useRepoStatus>)
  const idle = (): Mutation => ({ isPending: false, mutateAsync: vi.fn(async () => undefined) })
  const mutations: Record<string, Mutation> = {
    stageAdd: idle(),
    stageReset: idle(),
    workingDiscard: idle(),
    workingRemove: idle(),
    workingAddToGitignore: idle(),
    submoduleUpdate: idle(),
    submoduleSync: idle(),
    commit: idle(),
    ...overrides
  }
  vi.mocked(useGitMutations).mockReturnValue(mutations as unknown as ReturnType<typeof useGitMutations>)
  const show = vi.fn()
  useToastStore.setState({ show })
  renderWithProviders(<GitWorkingTree />)
  return { mutations, show }
}

const openFileMenu = async (name: string, item: string | RegExp) => {
  fireEvent.contextMenu(screen.getByText(name))
  await userEvent.click(screen.getByRole('menuitem', { name: item }))
}

describe('GitWorkingTree file actions', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
  })

  it('adds a file to .gitignore and confirms it', async () => {
    const { mutations, show } = await setup({ untracked: [{ path: 'debug.log', status: 'untracked' }] })
    await openFileMenu('debug.log', 'Add to .gitignore')
    expect(mutations.workingAddToGitignore!.mutateAsync).toHaveBeenCalledWith({ path: 'debug.log', directory: false })
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('Added "debug.log" to .gitignore', 'success'))
  })

  it('shows the error when adding to .gitignore fails', async () => {
    const failing = { isPending: false, mutateAsync: vi.fn().mockRejectedValue(new Error('read-only')) }
    const { show } = await setup(
      { untracked: [{ path: 'debug.log', status: 'untracked' }] },
      { workingAddToGitignore: failing }
    )
    await openFileMenu('debug.log', 'Add to .gitignore')
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('read-only', 'error'))
  })

  it('deletes an untracked file after confirmation', async () => {
    await setup({ untracked: [{ path: 'scratch.txt', status: 'untracked' }] })
    await openFileMenu('scratch.txt', 'Delete file…')
    expect(screen.getByText('Delete untracked file "scratch.txt"? This cannot be undone.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(window.gitfreddo.deleteWorkspaceFile).toHaveBeenCalledWith('scratch.txt', '/tmp/repo')
  })

  it('cancels deleting an untracked file', async () => {
    await setup({ untracked: [{ path: 'scratch.txt', status: 'untracked' }] })
    await openFileMenu('scratch.txt', 'Delete file…')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(window.gitfreddo.deleteWorkspaceFile).not.toHaveBeenCalled()
  })

  it('shows other remove errors without offering a forced remove', async () => {
    const failing = { isPending: false, mutateAsync: vi.fn().mockRejectedValue(new Error('index.lock exists')) }
    const { show } = await setup(
      { unstaged: [{ path: 'dirty.txt', status: 'modified' }] },
      { workingRemove: failing }
    )
    await openFileMenu('dirty.txt', /remove from repository/i)
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('index.lock exists', 'error'))
    expect(screen.queryByRole('button', { name: 'Remove anyway' })).not.toBeInTheDocument()
  })

  it('cancels a forced remove', async () => {
    const workingRemove = {
      isPending: false,
      mutateAsync: vi.fn().mockRejectedValueOnce(new Error('File has local modifications: x'))
    }
    await setup({ unstaged: [{ path: 'dirty.txt', status: 'modified' }] }, { workingRemove })
    await openFileMenu('dirty.txt', /remove from repository/i)
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(workingRemove.mutateAsync).toHaveBeenCalledTimes(1)
  })

  it('discards all staged changes after confirmation', async () => {
    const { mutations } = await setup({ staged: [{ path: 'ready.txt', status: 'modified' }] })
    const discardButtons = screen.getAllByRole('button', { name: 'Discard all…' })
    await userEvent.click(discardButtons[discardButtons.length - 1]!)
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(mutations.workingDiscard!.mutateAsync).toHaveBeenCalledWith({ paths: ['ready.txt'], staged: true })
  })

  it('cancels a discard', async () => {
    const { mutations } = await setup({ unstaged: [{ path: 'dirty.txt', status: 'modified' }] })
    await userEvent.click(screen.getAllByRole('button', { name: 'Discard all…' })[0]!)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mutations.workingDiscard!.mutateAsync).not.toHaveBeenCalled()
  })

  it('opens a submodule in a new tab, or switches to it if already open', async () => {
    await setup({
      unstaged: [{ path: 'vendor', status: 'modified', isSubmodule: true, submoduleStatus: 'ahead' }]
    })
    await openFileMenu('vendor', 'Open submodule')
    await vi.waitFor(() => expect(window.gitfreddo.connect).toHaveBeenCalledWith('/tmp/repo/vendor'))
    expect(useWorkspaceStore.getState().tabs.map((tab) => tab.path)).toContain('/tmp/repo/vendor')

    await useWorkspaceStore.getState().switchWorkspace('/tmp/repo')
    vi.mocked(window.gitfreddo.connect).mockClear()
    fireEvent.contextMenu(screen.getAllByText('vendor')[0]!)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Open submodule' }))
    await vi.waitFor(() => expect(useWorkspaceStore.getState().activePath).toBe('/tmp/repo/vendor'))
    expect(window.gitfreddo.connect).not.toHaveBeenCalled()
  })

  it('stages and unstages folder contents from the tree view', async () => {
    const { mutations } = await setup({
      unstaged: [{ path: 'src/a.ts', status: 'modified' }],
      staged: [{ path: 'lib/b.ts', status: 'modified' }]
    })
    await userEvent.click(screen.getByRole('button', { name: /expand all/i }))
    fireEvent.contextMenu(screen.getAllByText('src')[0]!)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Stage folder contents' }))
    expect(mutations.stageAdd!.mutateAsync).toHaveBeenCalledWith({ paths: ['src/a.ts'] })

    fireEvent.contextMenu(screen.getAllByText('lib')[0]!)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unstage folder contents' }))
    expect(mutations.stageReset!.mutateAsync).toHaveBeenCalledWith({ paths: ['lib/b.ts'] })

    await userEvent.click(screen.getAllByText('src')[0]!)
    await userEvent.click(screen.getAllByText('src')[0]!)
  })

  describe.each([
    ['a short list', 1],
    ['a virtualized list', 60]
  ])('path view with %s', (_label, extra) => {
    it('wires every file action from the row menu', async () => {
      const filler = Array.from({ length: extra - 1 }, (_, index) => ({
        path: `filler-${index}.txt`,
        status: 'modified' as const
      }))
      const { mutations } = await setup({
        unstaged: [
          { path: 'app.ts', status: 'modified' },
          { path: 'vendor', status: 'modified', isSubmodule: true, submoduleStatus: 'ahead' },
          ...filler
        ],
        staged: [{ path: 'ready.ts', status: 'modified' }]
      })
      const openFileHistory = vi.fn()
      useSelectionStore.setState({ openFileHistory } as never)
      await userEvent.click(screen.getByRole('button', { name: /^tree$/i }))

      await openFileMenu('app.ts', 'Stage')
      expect(mutations.stageAdd!.mutateAsync).toHaveBeenCalledWith({ paths: ['app.ts'] })
      await openFileMenu('ready.ts', /^unstage$/i)
      expect(mutations.stageReset!.mutateAsync).toHaveBeenCalledWith({ paths: ['ready.ts'] })
      await openFileMenu('app.ts', 'File history…')
      expect(openFileHistory).toHaveBeenCalledWith('app.ts')
      await openFileMenu('app.ts', 'Add to .gitignore')
      expect(mutations.workingAddToGitignore!.mutateAsync).toHaveBeenCalledWith({ path: 'app.ts', directory: false })
      await openFileMenu('vendor', 'Update')
      expect(mutations.submoduleUpdate!.mutateAsync).toHaveBeenCalledWith({ paths: ['vendor'], init: true })
      await openFileMenu('vendor', 'Sync')
      expect(mutations.submoduleSync!.mutateAsync).toHaveBeenCalledWith({ paths: ['vendor'] })
      await openFileMenu('vendor', 'Open submodule')
      await vi.waitFor(() => expect(window.gitfreddo.connect).toHaveBeenCalledWith('/tmp/repo/vendor'))
      await openFileMenu('app.ts', 'Discard changes…')
      expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      await openFileMenu('app.ts', /remove from repository/i)
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(mutations.workingRemove!.mutateAsync).not.toHaveBeenCalled()
      await openFileMenu('app.ts', 'Rename…')
      expect(screen.getByTestId('rename-modal')).toHaveTextContent('app.ts')
    })
  })
})

