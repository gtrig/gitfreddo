import { describe, expect, it, vi } from 'vitest'
import type { RepoManager } from '../git/repo-manager'
import { enrichAiContext } from './context'

function createManager(invoke: ReturnType<typeof vi.fn>): RepoManager {
  return {
    getRepoPath: () => '/repo',
    invoke: invoke
  } as unknown as RepoManager
}

describe('enrichAiContext explain_commit', () => {
  it('loads commit messages and diffs when missing', async () => {
    const invoke = vi.fn(async (_repoPath: string, method: string, params?: unknown) => {
      if (method === 'log.message') {
        return 'Add login helper\n\nExpose shared auth utility.'
      }
      if (method === 'diff.show') {
        const ref = (params as { ref: string }).ref
        return { unified: `diff for ${ref}` }
      }
      if (method === 'repo.status') {
        return { branch: 'main' }
      }
      throw new Error(`unexpected ${method}`)
    })

    const enriched = await enrichAiContext(createManager(invoke), {
      purpose: 'explain_commit',
      context: {
        commits: [
          {
            hash: 'abc123def456',
            shortHash: 'abc123d',
            subject: 'Add login helper',
            filePaths: ['src/auth.ts']
          }
        ]
      }
    })

    expect(invoke).toHaveBeenCalledWith('/repo', 'log.message', { hash: 'abc123def456' })
    expect(invoke).toHaveBeenCalledWith('/repo', 'diff.show', { ref: 'abc123def456' })
    expect(enriched.context?.branch).toBe('main')
    expect(enriched.context?.diffText).toContain('abc123d')
    expect(enriched.context?.diffText).toContain('diff for abc123def456')
    expect(enriched.context?.commits?.[0]?.message).toContain('Add login helper')
  })

  it('skips enrichment when diff text is already provided', async () => {
    const invoke = vi.fn()
    const enriched = await enrichAiContext(createManager(invoke), {
      purpose: 'explain_commit',
      context: {
        diffText: 'already loaded',
        commits: [
          {
            hash: 'abc123def456',
            shortHash: 'abc123d',
            subject: 'Add login helper'
          }
        ]
      }
    })

    expect(invoke).not.toHaveBeenCalled()
    expect(enriched.context?.diffText).toBe('already loaded')
  })

  it('loads multiple commit diffs in chronological sections', async () => {
    const invoke = vi.fn(async (_repoPath: string, method: string, params?: unknown) => {
      if (method === 'log.message') {
        return 'Commit message'
      }
      if (method === 'diff.show') {
        const ref = (params as { ref: string }).ref
        return { unified: `diff for ${ref}` }
      }
      if (method === 'repo.status') {
        return { branch: 'main' }
      }
      throw new Error(`unexpected ${method}`)
    })

    const enriched = await enrichAiContext(createManager(invoke), {
      purpose: 'explain_commit',
      context: {
        commits: [
          {
            hash: 'abc123def456',
            shortHash: 'abc123d',
            subject: 'First'
          },
          {
            hash: 'def456abc789',
            shortHash: 'def456a',
            subject: 'Second'
          }
        ]
      }
    })

    expect(enriched.context?.diffText).toContain('abc123d')
    expect(enriched.context?.diffText).toContain('def456a')
    expect(enriched.context?.diffText).toContain('diff for abc123def456')
    expect(enriched.context?.diffText).toContain('diff for def456abc789')
  })
})
