import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { invalidateRepoChange } from './repoChange'

describe('invalidateRepoChange', () => {
  it('invalidates ref-scoped queries when git metadata changes', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    invalidateRepoChange(queryClient, { repoPath: '/repo', scope: 'refs' })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['repo', '/repo', 'log.graph']
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['repo', '/repo', 'branch.list']
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ predicate: expect.any(Function) })
    )
  })

  it('invalidates working status and diff queries for worktree changes', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    invalidateRepoChange(queryClient, { repoPath: '/repo', scope: 'working' })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['repo', '/repo', 'working.status']
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      predicate: expect.any(Function)
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: ['repo', '/repo', 'log.graph']
    })
  })
})
