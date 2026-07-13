import { describe, expect, it, vi } from 'vitest'
import type { Query } from '@tanstack/react-query'
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
    const predicateCall = invalidateSpy.mock.calls.find(([options]) => options?.predicate)?.[0]
    const predicate = predicateCall?.predicate
    expect(predicate).toBeTypeOf('function')
    const asQuery = (queryKey: readonly unknown[]): Query =>
      ({ queryKey }) as unknown as Query
    expect(predicate?.(asQuery(['repo', '/repo', 'diff.working']))).toBe(true)
    expect(predicate?.(asQuery(['repo', '/other', 'diff.file']))).toBe(false)
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
