import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { invalidateRepoChange, shouldHandleRepoChangeEvent } from './repoChange'
import { useOperationStore } from '@/stores/operation'

describe('invalidateRepoChange', () => {
  it('invalidates ref-scoped queries', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    invalidateRepoChange(queryClient, { repoPath: '/repo', scope: 'refs' })

    expect(invalidateSpy).toHaveBeenCalled()
    expect(
      invalidateSpy.mock.calls.some(([options]) =>
        JSON.stringify(options?.queryKey).includes('branch.list')
      )
    ).toBe(true)
  })

  it('invalidates working-tree and diff queries', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    invalidateRepoChange(queryClient, { repoPath: '/repo', scope: 'working' })

    expect(invalidateSpy).toHaveBeenCalled()
    expect(
      invalidateSpy.mock.calls.some(([options]) => options?.predicate !== undefined)
    ).toBe(true)
  })
})

describe('shouldHandleRepoChangeEvent', () => {
  it('returns true when no git operation is running', () => {
    useOperationStore.setState({ count: 0 })
    expect(shouldHandleRepoChangeEvent()).toBe(true)
  })

  it('returns false while an operation is in progress', () => {
    useOperationStore.setState({ count: 2 })
    expect(shouldHandleRepoChangeEvent()).toBe(false)
  })
})
