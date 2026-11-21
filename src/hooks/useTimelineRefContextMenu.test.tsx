/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimelineRefContextMenu } from './useTimelineRefContextMenu'
import { clickAllMenuItems } from '@/test/contextMenuTestUtils'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

vi.mock('./useForgePullRequestActions', () => ({
  useForgePullRequestActions: () => ({
    canCreatePr: true,
    provider: 'github',
    submitPullRequest: vi.fn(async () => undefined)
  })
}))

const mutateAsync = vi.fn(async () => undefined)

vi.mock('./useGitMutations', () => ({
  useGitMutations: () => ({
    checkout: { mutateAsync },
    pushTag: { mutateAsync },
    deleteBranch: { mutateAsync, isPending: false },
    deleteRemoteBranch: { mutateAsync, isPending: false },
    unsetUpstream: { mutateAsync },
    merge: { mutateAsync },
    fastForwardBranch: { mutateAsync }
  })
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function mouseEvent(): React.MouseEvent {
  return {
    clientX: 10,
    clientY: 12,
    preventDefault: () => undefined,
    stopPropagation: () => undefined
  } as React.MouseEvent
}

describe('useTimelineRefContextMenu', () => {
  const remoteBranch = {
    name: 'origin/main',
    head: 'abc',
    isCurrent: false,
    isRemote: true,
    upstream: undefined,
    ahead: 0,
    behind: 0
  }
  const branches = [
    { name: 'main', head: 'abc', isCurrent: true, isRemote: false, upstream: undefined, ahead: 0, behind: 0 },
    remoteBranch
  ]
  const tags = [{ name: 'v1', target: 'abc', message: undefined, isAnnotated: false, isRemote: false }]
  const remotes = [{ name: 'origin', url: 'https://example.com/repo.git', fetch: '+refs/heads/*:refs/remotes/origin/*', push: 'refs/heads/*:refs/heads/*' }]

  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    mutateAsync.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('opens ref menus and exposes modal setters', () => {
    const onSelectCommit = vi.fn()
    const onMerge = vi.fn()
    const onMergeCurrentInto = vi.fn()
    const { result } = renderHook(
      () =>
        useTimelineRefContextMenu({
          connected: true,
          branches,
          tags,
          remotes,
          currentBranch: 'main',
          onSelectCommit,
          onMerge,
          onMergeCurrentInto
        }),
      { wrapper }
    )

    act(() => {
      result.current.openRefMenu(
        mouseEvent(),
        { kind: 'branch', label: 'main', fullRef: 'refs/heads/main', sourceOrder: 0 },
        'abc1234567890abcdef1234567890abcdef123456'
      )
    })

    expect(result.current.menuState).not.toBeNull()
    clickAllMenuItems(result.current.menuState!.items)

    act(() => {
      result.current.setRenameBranch('feature')
      result.current.setPrBranch('feature')
      result.current.setWorktreeBranch('feature')
      result.current.setUpstreamBranch('feature')
      result.current.setCheckoutRemote('origin/feature')
      result.current.setRenameTag(tags[0]!)
      result.current.setPendingDeleteTag({ tag: tags[0]! })
      result.current.setPendingDeleteBranch('feature')
      result.current.setPendingDeleteRemote(remoteBranch)
    })

    expect(result.current.renameBranch).toBe('feature')
    expect(result.current.prBranch).toBe('feature')
    expect(onSelectCommit).toHaveBeenCalled()
  })

  function renderMenu() {
    const feature = {
      name: 'feature',
      head: 'def',
      isCurrent: false,
      isRemote: false,
      upstream: 'origin/feature',
      ahead: 1,
      behind: 0
    }
    return renderHook(
      () =>
        useTimelineRefContextMenu({
          connected: true,
          branches: [...branches, feature],
          tags,
          remotes,
          currentBranch: 'main',
          onSelectCommit: vi.fn(),
          onMerge: vi.fn(),
          onMergeCurrentInto: vi.fn()
        }),
      { wrapper }
    )
  }

  it('runs every action for another branch, a remote branch and a tag', async () => {
    const show = vi.fn()
    useToastStore.setState({ show })
    const { result } = renderMenu()
    const refs = [
      { kind: 'branch', label: 'feature', fullRef: 'refs/heads/feature', sourceOrder: 0 },
      { kind: 'remote', label: 'origin/main', fullRef: 'refs/remotes/origin/main', sourceOrder: 1 },
      { kind: 'tag', label: 'v1', fullRef: 'refs/tags/v1', sourceOrder: 2 }
    ] as const
    for (const ref of refs) {
      act(() => {
        result.current.openRefMenu(mouseEvent(), ref as never, 'def')
      })
      await act(async () => {
        clickAllMenuItems(result.current.menuState!.items)
      })
    }
    expect(mutateAsync).toHaveBeenCalledWith({ branch: 'feature', ffOnly: true })
    expect(mutateAsync).toHaveBeenCalledWith({ branch: 'feature', toRef: 'main' })
    expect(mutateAsync).toHaveBeenCalledWith({ branch: 'feature' })
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ name: 'v1' }))
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith(expect.any(String), 'success'))
  })

  it('reports failed fast-forwards', async () => {
    const show = vi.fn()
    useToastStore.setState({ show })
    mutateAsync.mockRejectedValue(new Error('not possible'))
    const { result } = renderMenu()
    act(() => {
      result.current.openRefMenu(
        mouseEvent(),
        { kind: 'branch', label: 'feature', fullRef: 'refs/heads/feature', sourceOrder: 0 } as never,
        'def'
      )
    })
    await act(async () => {
      for (const item of result.current.menuState!.items) {
        if (/fast-forward/.test(item.id)) item.onClick()
      }
    })
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('not possible', 'error'))
    mutateAsync.mockResolvedValue(undefined)
  })
})

