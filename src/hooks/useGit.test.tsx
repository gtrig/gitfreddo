/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useBranches,
  useCommitChangedFiles,
  useLogGraph,
  useRepoStatus,
  useWorkingStatus
} from './useGit'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'
import { useWorkspaceStore } from '@/stores/workspace'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function connectWorkspace(path = '/repo/test') {
  useWorkspaceStore.setState({
    tabs: [{ path, connected: true, connecting: false }],
    activePath: path,
    workspacePath: path,
    connected: true
  })
}

describe('useGit query hooks', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      workspacePath: null,
      connected: false
    })
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue(defaultMockSettings)
    vi.mocked(window.gitfreddo.invoke).mockClear()
  })

  it('does not fetch when no repository is connected', () => {
    const { result } = renderHook(() => useRepoStatus(), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(window.gitfreddo.invoke).not.toHaveBeenCalled()
  })

  it('fetches repo status when a workspace is connected', async () => {
    const status = {
      path: '/repo/test',
      root: '/repo/test',
      head: 'abc123',
      branch: 'main',
      isDetached: false,
      commonDir: '/repo/test/.git',
      isLinkedWorktree: false
    }
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue(status)
    connectWorkspace()

    const { result } = renderHook(() => useRepoStatus(), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(status))
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('repo.status')
  })

  it('fetches branches for the active repository', async () => {
    const branches = [{ name: 'main', isCurrent: true, isRemote: false, upstream: null }]
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue(branches)
    connectWorkspace()

    const { result } = renderHook(() => useBranches(), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(branches))
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('branch.list')
  })

  it('passes maxCount from settings to log.graph', async () => {
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue({
      ...defaultMockSettings,
      logMaxCount: 250
    })
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue({ commits: [], lanes: [] })
    connectWorkspace()

    const { result } = renderHook(() => useLogGraph(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('log.graph', { maxCount: 250 })
  })

  it('parses commit changed files from log.show output', async () => {
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue('M\tsrc/app.ts\nA\tsrc/new.ts')
    connectWorkspace()

    const { result } = renderHook(() => useCommitChangedFiles('abc123'), { wrapper })
    await waitFor(() => expect(result.current.data).toHaveLength(2))
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('log.show', { hash: 'abc123' })
    expect(result.current.data?.[0]?.path).toBe('src/app.ts')
  })

  it('respects the enabled flag', () => {
    connectWorkspace()
    const { result } = renderHook(() => useWorkingStatus(false), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(window.gitfreddo.invoke).not.toHaveBeenCalledWith('working.status')
  })
})
