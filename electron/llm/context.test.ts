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

describe('enrichAiContext recompose_commit', () => {
  it('loads commit message and diff when missing', async () => {
    const invoke = vi.fn(async (_repoPath: string, method: string, params?: unknown) => {
      if (method === 'log.message') {
        return 'fix: auth bug\n\nHandle expired tokens.'
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
      purpose: 'recompose_commit',
      context: {
        currentText: 'fix: auth bug',
        commits: [
          {
            hash: 'abc123def456',
            shortHash: 'abc123d',
            subject: 'fix: auth bug',
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
    expect(enriched.context?.commits?.[0]?.message).toContain('fix: auth bug')
  })
})

describe('enrichAiContext pull_request', () => {
  it('loads diff between base and head branches', async () => {
    const invoke = vi.fn(async (_repoPath: string, method: string, params?: unknown) => {
      if (method === 'diff.commits') {
        expect(params).toEqual({ fromRef: 'main', toRef: 'feature' })
        return { unified: '+++ b/src/feature.ts\n+change' }
      }
      throw new Error(`unexpected ${method}`)
    })

    const enriched = await enrichAiContext(createManager(invoke), {
      purpose: 'pull_request',
      context: { headBranch: 'feature', baseBranch: 'main' }
    })

    expect(invoke).toHaveBeenCalledWith('/repo', 'diff.commits', {
      fromRef: 'main',
      toRef: 'feature'
    })
    expect(enriched.context?.diffText).toContain('feature.ts')
    expect(enriched.context?.headBranch).toBe('feature')
    expect(enriched.context?.baseBranch).toBe('main')
    expect(enriched.context?.filePaths).toEqual(['src/feature.ts'])
  })

  it('skips enrichment when diff text is already provided', async () => {
    const invoke = vi.fn()
    const enriched = await enrichAiContext(createManager(invoke), {
      purpose: 'pull_request',
      context: {
        headBranch: 'feature',
        baseBranch: 'main',
        diffText: 'already loaded'
      }
    })

    expect(invoke).not.toHaveBeenCalled()
    expect(enriched.context?.diffText).toBe('already loaded')
  })
})

describe('enrichAiContext analyze_pull_request', () => {
  it('loads merge-base diff for scoped pull request SHAs', async () => {
    const invoke = vi.fn(async (_repoPath: string, method: string, params?: unknown) => {
      if (method === 'diff.commits') {
        expect(params).toEqual({
          fromRef: 'basesha',
          toRef: 'headsha',
          mergeBase: true,
          paths: ['src/a.ts']
        })
        return { unified: '+++ b/src/a.ts\n+change' }
      }
      throw new Error(`unexpected ${method}`)
    })

    const enriched = await enrichAiContext(createManager(invoke), {
      purpose: 'analyze_pull_request',
      context: {
        baseSha: 'basesha',
        headSha: 'headsha',
        analysisScope: 'partial',
        filePaths: ['src/a.ts']
      }
    })

    expect(enriched.context?.diffText).toContain('src/a.ts')
  })
})

describe('enrichAiContext resolve_conflict', () => {
  it('loads conflict stages when not provided', async () => {
    const invoke = vi.fn(async (_repoPath: string, method: string, params?: unknown) => {
      if (method === 'file.readStage') {
        const stage = (params as { stage: number }).stage
        return stage === 1 ? 'base' : stage === 2 ? 'ours' : 'theirs'
      }
      if (method === 'working.read') {
        return { content: '<<<<<<<\n=======\n>>>>>>>' }
      }
      if (method === 'merge.status') {
        return {
          currentBranch: 'main',
          kind: 'merge',
          incomingLabel: 'feature'
        }
      }
      throw new Error(`unexpected ${method}`)
    })

    const enriched = await enrichAiContext(createManager(invoke), {
      purpose: 'resolve_conflict',
      context: { filePath: 'src/conflict.ts' }
    })

    expect(invoke).toHaveBeenCalledWith('/repo', 'file.readStage', {
      stage: 2,
      path: 'src/conflict.ts'
    })
    expect(enriched.context?.sideA).toBe('ours')
    expect(enriched.context?.operationKind).toBe('merge')
    expect(enriched.context?.incomingLabel).toBe('feature')
  })

  it('returns params unchanged when file path is missing', async () => {
    const invoke = vi.fn()
    const params = { purpose: 'resolve_conflict' as const, context: {} }
    const enriched = await enrichAiContext(createManager(invoke), params)
    expect(invoke).not.toHaveBeenCalled()
    expect(enriched).toEqual(params)
  })
})

describe('enrichAiContext commit_message', () => {
  it('loads staged diff and file paths', async () => {
    const invoke = vi.fn(async (_repoPath: string, method: string) => {
      if (method === 'working.status') {
        return {
          branch: 'main',
          staged: [{ path: 'src/auth.ts' }],
          unstaged: [],
          untracked: [],
          conflicted: []
        }
      }
      if (method === 'diff.staged') {
        return { unified: '+++ b/src/auth.ts\n+export {}' }
      }
      if (method === 'repo.status') {
        return { branch: 'main' }
      }
      throw new Error(`unexpected ${method}`)
    })

    const enriched = await enrichAiContext(createManager(invoke), {
      purpose: 'commit_message',
      context: {}
    })

    expect(enriched.context?.filePaths).toEqual(['src/auth.ts'])
    expect(enriched.context?.diffText).toContain('src/auth.ts')
    expect(enriched.context?.branch).toBe('main')
  })
})

describe('enrichAiContext stash_message', () => {
  it('loads working diff for unstaged and untracked files', async () => {
    const invoke = vi.fn(async (_repoPath: string, method: string) => {
      if (method === 'working.status') {
        return {
          branch: 'main',
          staged: [],
          unstaged: [{ path: 'README.md' }],
          untracked: [{ path: 'notes.txt' }],
          conflicted: []
        }
      }
      if (method === 'diff.working') {
        return { unified: '+++ b/README.md\n+change' }
      }
      throw new Error(`unexpected ${method}`)
    })

    const enriched = await enrichAiContext(createManager(invoke), {
      purpose: 'stash_message',
      context: {}
    })

    expect(enriched.context?.filePaths).toEqual(['README.md', 'notes.txt'])
    expect(enriched.context?.diffText).toContain('README.md')
  })
})

describe('enrichAiContext analyze_changes', () => {
  it('combines staged and unstaged diffs with branch metadata', async () => {
    const invoke = vi.fn(async (_repoPath: string, method: string) => {
      if (method === 'working.status') {
        return {
          branch: 'feature',
          staged: [{ path: 'src/a.ts' }],
          unstaged: [{ path: 'README.md' }],
          untracked: [],
          conflicted: []
        }
      }
      if (method === 'diff.staged') {
        return { unified: 'staged diff' }
      }
      if (method === 'diff.working') {
        return { unified: 'working diff' }
      }
      throw new Error(`unexpected ${method}`)
    })

    const enriched = await enrichAiContext(createManager(invoke), {
      purpose: 'analyze_changes',
      context: {}
    })

    expect(enriched.context?.branch).toBe('feature')
    expect(enriched.context?.stagedFilePaths).toEqual(['src/a.ts'])
    expect(enriched.context?.unstagedFilePaths).toEqual(['README.md'])
    expect(enriched.context?.diffText).toContain('Staged changes')
    expect(enriched.context?.diffText).toContain('Unstaged changes')
  })
})

describe('enrichAiContext no repo', () => {
  it('returns params unchanged when repo path is unavailable', async () => {
    const manager = {
      getRepoPath: () => null,
      invoke: vi.fn()
    } as unknown as RepoManager
    const params = { purpose: 'commit_message' as const, context: {} }
    await expect(enrichAiContext(manager, params)).resolves.toEqual(params)
  })
})
