/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { GitWorkingTree } from './GitWorkingTree'
import { useWorkspaceStore } from '@/stores/workspace'
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
  CleanUntrackedModal: () => null
}))
vi.mock('@/components/WorkingTree/RenameFileModal', () => ({
  RenameFileModal: () => null
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

describe('GitWorkingTree', () => {
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
  it('renders working tree sections', () => {
    renderWithProviders(<GitWorkingTree />)
    expect(screen.getByText(/Changes \(\d+\)/)).toBeInTheDocument()
    expect(screen.getByText(/Staged \(\d+\)/)).toBeInTheDocument()
  })

  it('lists unstaged and staged files', async () => {
    const { useWorkingStatus } = await import('@/hooks/useGit')
    vi.mocked(useWorkingStatus).mockReturnValue({
      data: {
        ...emptyWorking,
        isClean: false,
        unstaged: [{ path: 'dirty.txt', status: 'modified' }],
        staged: [{ path: 'ready.txt', status: 'added' }]
      },
      isLoading: false,
      error: null
    } as ReturnType<typeof useWorkingStatus>)

    renderWithProviders(<GitWorkingTree />)
    expect(screen.getByText('dirty.txt')).toBeInTheDocument()
    expect(screen.getByText('ready.txt')).toBeInTheDocument()
  })
})
