import { describe, expect, it } from 'vitest'
import { ALL_GIT_IPC_METHODS, GIT_IPC_METHODS, gitIpcInvalidates } from './methods'

describe('GIT_IPC_METHODS', () => {
  it('catalog keys match ALL_GIT_IPC_METHODS', () => {
    expect(Object.keys(GIT_IPC_METHODS).sort()).toEqual([...ALL_GIT_IPC_METHODS].sort())
  })

  it('all methods have required metadata fields', () => {
    for (const method of ALL_GIT_IPC_METHODS) {
      const meta = GIT_IPC_METHODS[method]
      expect(Array.isArray(meta.invalidates), `${method}.invalidates should be an array`).toBe(true)
      expect(Array.isArray(meta.commands), `${method}.commands should be an array`).toBe(true)
    }
  })

  it('refreshes branch and repo head state after commit.create', () => {
    expect(gitIpcInvalidates('commit.create')).toEqual(
      expect.arrayContaining(['branch.list', 'repo.status', 'log.graph', 'working.status'])
    )
  })

  it('does not use the legacy status query suffix', () => {
    for (const method of ALL_GIT_IPC_METHODS) {
      expect(gitIpcInvalidates(method), `${method} invalidates`).not.toContain('status')
    }
  })
})
