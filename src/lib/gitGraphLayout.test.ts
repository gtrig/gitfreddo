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

function columnOf(layout: ReturnType<typeof buildGitGraphLayout>, hash: string): number {
  return layout.rows.find((row) => row.key === hash)?.column ?? -1
}

describe('buildGitGraphLayout', () => {
  it('places a linear history on one lane', () => {
    const layout = buildGitGraphLayout([commit('c2', ['c1']), commit('c1', [])], 'c2')
    expect(layout.laneCount).toBe(1)
    expect(layout.rows.every((row) => row.column === 0)).toBe(true)
    expect(layout.edges).toHaveLength(1)
  })

  it('keeps the main line straight and puts merged branches on their own lane', () => {
    const layout = buildGitGraphLayout(
      [
        commit('merge', ['main', 'feature']),
        commit('feature', ['base']),
        commit('main', ['base']),
        commit('base', [])
      ],
      'merge'
    )

    expect(columnOf(layout, 'merge')).toBe(0)
    expect(columnOf(layout, 'main')).toBe(0)
    expect(columnOf(layout, 'feature')).toBeGreaterThan(0)
    expect(layout.laneCount).toBeGreaterThan(1)
  })

  it('assigns parallel branch tips to separate lanes', () => {
    const layout = buildGitGraphLayout(
      [
        commit('tip-a', ['fork']),
        commit('tip-b', ['fork']),
        commit('fork', ['base']),
        commit('base', [])
      ],
      'tip-a'
    )

    expect(columnOf(layout, 'tip-a')).not.toBe(columnOf(layout, 'tip-b'))
    expect(columnOf(layout, 'fork')).toBe(Math.min(columnOf(layout, 'tip-a'), columnOf(layout, 'tip-b')))
  })

  it('creates merge edges across lanes for secondary parents', () => {
    const layout = buildGitGraphLayout(
      [
        commit('merge', ['main', 'feature']),
        commit('feature', ['base']),
        commit('main', ['base']),
        commit('base', [])
      ],
      'merge'
    )

    const mergeEdge = layout.edges.find(
      (edge) => edge.fromKey === 'merge' && edge.toKey === 'feature' && edge.kind === 'merge'
    )
    expect(mergeEdge).toBeDefined()
    expect(mergeEdge?.fromColumn).not.toBe(mergeEdge?.toColumn)
  })
})
