import { describe, expect, it, vi } from 'vitest'
import type { RepoManager } from '../git/repo-manager'
import { enrichAiContext } from './context'

function manager(invoke: (repoPath: string, method: string, params?: unknown) => unknown): RepoManager {
  return { getRepoPath: () => '/repo', invoke: vi.fn(async (...args: [string, string, unknown?]) => invoke(...args)) } as unknown as RepoManager
}

const failing = manager(() => {
  throw new Error('git failed')
})

describe('enrichAiContext fallbacks', () => {
  it('keeps pull request analysis params when SHAs are missing, the diff is empty, or git fails', async () => {
    const base = { purpose: 'analyze_pull_request' as const, context: { baseSha: 'a', headSha: 'b' } }
    expect(await enrichAiContext(manager(() => ({})), { purpose: 'analyze_pull_request', context: {} })).toEqual({
      purpose: 'analyze_pull_request',
      context: {}
    })
    expect(await enrichAiContext(manager(() => ({ unified: '   ' })), base)).toBe(base)
    expect(await enrichAiContext(failing, base)).toBe(base)
  })

  it('keeps explain and recompose params when nothing could be loaded or git fails', async () => {
    const commits = [{ hash: 'abc', shortHash: 'abc', subject: 's', filePaths: [] }]
    for (const purpose of ['explain_commit', 'recompose_commit'] as const) {
      const empty = { purpose, context: { commits: [] } }
      expect(await enrichAiContext(failing, empty)).toBe(empty)
      const params = { purpose, context: { commits } }
      expect(await enrichAiContext(failing, params)).toBe(params)
    }
  })

  it('loads recompose context like explain_commit', async () => {
    const enriched = await enrichAiContext(
      manager((_repo, method) => {
        if (method === 'log.message') return 'Subject\n\nBody'
        if (method === 'diff.show') return { unified: 'diff --git a/x b/x' }
        if (method === 'repo.status') return { branch: 'main' }
        throw new Error(method)
      }),
      { purpose: 'recompose_commit', context: { commits: [{ hash: 'abc', shortHash: 'abc', subject: 'Subject', filePaths: [] }] } }
    )
    expect(enriched.context?.diffText).toContain('diff --git')
  })

  it('leaves purposes without a diff untouched', async () => {
    const params = { purpose: 'stash_message' as const, context: { diffText: 'already here' } }
    expect(await enrichAiContext(failing, params)).toBe(params)
  })
})
