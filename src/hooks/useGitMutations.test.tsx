/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useGitMutations } from './useGitMutations'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { useOperationStore } from '@/stores/operation'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useGitMutations', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    window.gitfreddo = createGitFreddoMock()
    useWorkspaceStore.setState({
      tabs: [{ path: '/repo', connected: true, connecting: false }],
      activePath: '/repo',
      workspacePath: '/repo',
      connected: true
    })
    useToastStore.setState({ message: null, tone: 'info', show: vi.fn(), clear: vi.fn() })
    useOperationStore.setState({
      count: 0,
      message: null,
      output: '',
      hookResult: null,
      begin: vi.fn(),
      end: vi.fn(),
      appendOutput: vi.fn(),
      setHookResult: vi.fn()
    })
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('invokes git IPC methods for the active repository', async () => {
    const { result } = renderHook(() => useGitMutations(), { wrapper })

    await act(async () => {
      await result.current.fetch.mutateAsync(undefined)
    })

    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('fetch', undefined)
  })

  it('shows a success toast for remote actions', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })

    const { result } = renderHook(() => useGitMutations(), { wrapper })
    await act(async () => {
      await result.current.push.mutateAsync(undefined)
    })
    await act(async () => {
      vi.runAllTimers()
    })

    expect(show).toHaveBeenCalledWith('toast.push.success', 'success')
  })

  it('throws when no repository is connected', async () => {
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      workspacePath: null,
      connected: false
    })

    const { result } = renderHook(() => useGitMutations(), { wrapper })

    await expect(result.current.commit.mutateAsync(undefined)).rejects.toThrow('toast.noRepoConnected')
  })

  it('invalidates related queries after a successful mutation', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const localWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useGitMutations(), { wrapper: localWrapper })
    await act(async () => {
      await result.current.stageAdd.mutateAsync({ paths: ['file.ts'] })
    })
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled())
  })

  it('invokes each git mutation for the active repository', async () => {
    const { result } = renderHook(() => useGitMutations(), { wrapper })

    await act(async () => {
      await result.current.checkout.mutateAsync({ name: 'main' })
      await result.current.createBranch.mutateAsync({ name: 'feature', startPoint: 'HEAD' })
      await result.current.deleteBranch.mutateAsync({ name: 'feature', force: true })
      await result.current.renameBranch.mutateAsync({ oldName: 'feature', newName: 'feature2' })
      await result.current.checkoutRemote.mutateAsync({ remoteBranch: 'origin/main' })
      await result.current.setUpstream.mutateAsync({ branch: 'main', upstream: 'origin/main' })
      await result.current.unsetUpstream.mutateAsync({ branch: 'main' })
      await result.current.deleteRemoteBranch.mutateAsync({ remote: 'origin', branch: 'feature' })
      await result.current.stageAdd.mutateAsync({ paths: ['a.txt'] })
      await result.current.stageReset.mutateAsync({ paths: ['a.txt'] })
      await result.current.workingDiscard.mutateAsync({ paths: ['a.txt'], staged: false })
      await result.current.workingRemove.mutateAsync({ paths: ['a.txt'] })
      await result.current.workingClean.mutateAsync({ includeIgnored: false })
      await result.current.workingRename.mutateAsync({ oldPath: 'a.txt', newPath: 'b.txt' })
      await result.current.workingAddToGitignore.mutateAsync({ path: 'ignored.txt' })
      await result.current.submoduleAdd.mutateAsync({ path: 'vendor', url: 'https://example.com/x.git' })
      await result.current.submoduleInit.mutateAsync({ paths: ['vendor'] })
      await result.current.submoduleUpdate.mutateAsync({ paths: ['vendor'] })
      await result.current.submoduleSync.mutateAsync({ paths: ['vendor'] })
      await result.current.submoduleDeinit.mutateAsync({ path: 'vendor' })
      await result.current.submoduleRemove.mutateAsync({ path: 'vendor' })
      await result.current.submoduleSetUrl.mutateAsync({ path: 'vendor', url: 'https://example.com/y.git' })
      await result.current.stageApplyPatch.mutateAsync({ patch: 'diff' })
      await result.current.commit.mutateAsync({ message: 'msg' })
      await result.current.rewordCommit.mutateAsync({ hash: 'abc', message: 'new' })
      await result.current.fetch.mutateAsync(undefined)
      await result.current.pull.mutateAsync(undefined)
      await result.current.merge.mutateAsync({ branch: 'feature' })
      await result.current.squashMergeInto.mutateAsync({
        sourceBranch: 'feature',
        targetBranch: 'main',
        message: 'squash'
      })
      await result.current.mergeAbort.mutateAsync(undefined)
      await result.current.mergeContinue.mutateAsync(undefined)
      await result.current.rebaseStart.mutateAsync({ onto: 'abc', from: 'def' })
      await result.current.rebaseInteractive.mutateAsync({ commits: ['abc'] })
      await result.current.rebaseAbort.mutateAsync(undefined)
      await result.current.rebaseContinue.mutateAsync(undefined)
      await result.current.rebaseSkip.mutateAsync(undefined)
      await result.current.cherryPickContinue.mutateAsync(undefined)
      await result.current.cherryPickAbort.mutateAsync(undefined)
      await result.current.cherryPickSkip.mutateAsync(undefined)
      await result.current.cherryPick.mutateAsync({ hash: 'abc' })
      await result.current.squashCommits.mutateAsync({ hashes: ['abc', 'def'] })
      await result.current.dropCommits.mutateAsync({ hashes: ['abc'] })
      await result.current.revertCommit.mutateAsync({ hash: 'abc' })
      await result.current.reset.mutateAsync({ mode: 'soft', ref: 'abc' })
      await result.current.resetHead.mutateAsync({ mode: 'mixed' })
      await result.current.undoLast.mutateAsync(undefined)
      await result.current.stashPush.mutateAsync({ message: 'wip' })
      await result.current.stashPop.mutateAsync({ index: 0 })
      await result.current.stashApply.mutateAsync({ index: 0 })
      await result.current.stashDrop.mutateAsync({ index: 0 })
      await result.current.worktreeAdd.mutateAsync({ path: '/tmp/wt', branch: 'main' })
      await result.current.worktreeRemove.mutateAsync({ path: '/tmp/wt' })
      await result.current.worktreePrune.mutateAsync(undefined)
      await result.current.remoteAdd.mutateAsync({ name: 'origin', url: 'https://example.com/r.git' })
      await result.current.remoteRemove.mutateAsync({ name: 'backup' })
      await result.current.remoteRename.mutateAsync({ oldName: 'origin', newName: 'backup' })
      await result.current.remoteSetUrl.mutateAsync({ name: 'origin', url: 'https://example.com/r2.git' })
      await result.current.createTag.mutateAsync({ name: 'v1', target: 'abc' })
      await result.current.deleteTag.mutateAsync({ name: 'v1' })
      await result.current.renameTag.mutateAsync({ oldName: 'v1', newName: 'v2' })
      await result.current.pushTag.mutateAsync({ name: 'v1' })
      await result.current.stashBranch.mutateAsync({ index: 0, branch: 'stash-branch' })
      await result.current.bisectStart.mutateAsync({ badRef: 'HEAD', goodRef: 'abc' })
      await result.current.bisectGood.mutateAsync({ ref: 'abc' })
      await result.current.bisectBad.mutateAsync({ ref: 'HEAD' })
      await result.current.bisectReset.mutateAsync(undefined)
      await result.current.notesAdd.mutateAsync({ hash: 'abc', message: 'note' })
    })

    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('branch.checkout', { name: 'main' })
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('notes.add', { hash: 'abc', message: 'note' })
  })
})
