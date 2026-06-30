import { describe, expect, it } from 'vitest'
import { buildGitGraphLayout } from './gitGraphLayout'
import type { GitCommit } from './types'

function commit(hash: string, parents: string[], subject = hash): GitCommit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    subject,
    message: subject,
    author: { name: 'Author', email: 'a@b.c', date: '2024-01-01T00:00:00+00:00' },
    refs: []
  }
}

describe('buildGitGraphLayout', () => {
  it('places a linear history on one lane', () => {
    const layout = buildGitGraphLayout(
      [commit('c2', ['c1']), commit('c1', [])],
      'c2'
    )
    expect(layout.laneCount).toBe(1)
    expect(layout.rows.every((row) => row.column === 0)).toBe(true)
    expect(layout.edges).toHaveLength(1)
  })

  it('uses a second lane for merge parents', () => {
    const layout = buildGitGraphLayout(
      [commit('merge', ['main', 'feature']), commit('feature', ['base']), commit('main', ['base']), commit('base', [])],
      'merge'
    )
    expect(layout.laneCount).toBeGreaterThan(1)
  })
})
