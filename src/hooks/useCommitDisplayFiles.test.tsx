/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCommitDisplayFiles } from './useCommitDisplayFiles'

vi.mock('@/hooks/useGit', () => ({
  useCommitChangedFiles: vi.fn(),
  useCommitTreeFiles: vi.fn()
}))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useCommitDisplayFiles', () => {
  beforeEach(async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useCommitChangedFiles).mockReturnValue({
      data: [{ path: 'src/a.ts', kind: 'changed' }],
      isLoading: false,
      error: null
    } as ReturnType<typeof git.useCommitChangedFiles>)
    vi.mocked(git.useCommitTreeFiles).mockReturnValue({
      data: ['src/a.ts', 'README.md'],
      isLoading: false,
      error: null
    } as ReturnType<typeof git.useCommitTreeFiles>)
  })

  it('returns changed files when showAllFiles is false', () => {
    const queryClient = new QueryClient()
    const { result } = renderHook(() => useCommitDisplayFiles('abc', false), {
      wrapper: createWrapper(queryClient)
    })

    expect(result.current.files).toEqual([{ path: 'src/a.ts', kind: 'changed' }])
    expect(result.current.loading).toBe(false)
  })

  it('merges tree files when showAllFiles is true', async () => {
    const queryClient = new QueryClient()
    const { result } = renderHook(() => useCommitDisplayFiles('abc', true), {
      wrapper: createWrapper(queryClient)
    })

    await waitFor(() => {
      expect(result.current.files.some((file) => file.path === 'README.md')).toBe(true)
    })
    expect(result.current.loadingAllFiles).toBe(false)
  })

  it('surfaces query errors', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useCommitChangedFiles).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('failed')
    } as ReturnType<typeof git.useCommitChangedFiles>)

    const queryClient = new QueryClient()
    const { result } = renderHook(() => useCommitDisplayFiles('abc', false), {
      wrapper: createWrapper(queryClient)
    })

    expect(result.current.error?.message).toBe('failed')
  })
})
