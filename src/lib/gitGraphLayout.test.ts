import { describe, expect, it } from 'vitest'
import { buildGitGraphLayout, rowCenterY, visualRowIndex } from './gitGraphLayout'
import type { GitCommit } from './types'

function commit(hash: string, parents: string[], subject = hash): GitCommit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    subject,
    message: subject,
    body: '',
    author: { name: 'Author', email: 'a@b.c', date: '2024-01-01T00:00:00+00:00' },
    committer: { name: 'Author', email: 'a@b.c', date: '2024-01-01T00:00:00+00:00' },
    signature: null,
    notes: '',
    stats: null,
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

  it('uses zero-based row indices for the first commit', () => {
    const layout = buildGitGraphLayout([commit('c2', ['c1']), commit('c1', [])], 'c2')
    expect(layout.rows[0]?.rowIndex).toBe(0)
    expect(layout.rows[1]?.rowIndex).toBe(1)
  })

  it('places stash commits on a pad lane with a dashed connector edge', () => {
    const stash = {
      ...commit('stash-tip', ['main-tip'], 'WIP on main'),
      refs: ['stash']
    }
    const layout = buildGitGraphLayout(
      [stash, commit('main-tip', ['base']), commit('base', [])],
      'main-tip'
    )

    const stashRow = layout.rows.find((row) => row.key === 'stash-tip')
    const mainRow = layout.rows.find((row) => row.key === 'main-tip')

    expect(stashRow?.isStash).toBe(true)
    expect(stashRow?.isMerge).toBe(false)
    expect(stashRow?.column).toBe((mainRow?.column ?? 0) + 1)

    const padEdge = layout.edges.find(
      (edge) => edge.fromKey === 'main-tip' && edge.toKey === 'stash-tip' && edge.kind === 'pad'
    )
    expect(padEdge).toBeDefined()

    const stashParentEdge = layout.edges.find((edge) => edge.fromKey === 'stash-tip')
    expect(stashParentEdge).toBeUndefined()
  })

  it('anchors stash pad to the stash base when HEAD is ahead of the stash base', () => {
    const stash = {
      ...commit('stash-tip', ['base', 'index-tip'], 'WIP on main'),
      refs: ['stash']
    }
    const layout = buildGitGraphLayout(
      [commit('head', ['base']), stash, commit('base', [])],
      'head'
    )

    const padEdge = layout.edges.find(
      (edge) => edge.fromKey === 'base' && edge.toKey === 'stash-tip' && edge.kind === 'pad'
    )
    expect(padEdge).toBeDefined()
    expect(layout.edges.some((edge) => edge.fromKey === 'head' && edge.toKey === 'stash-tip')).toBe(
      false
    )
    expect(layout.edges.some((edge) => edge.fromKey === 'stash-tip')).toBe(false)
  })

  it('anchors stash pad after the base commit hash was rewritten', () => {
    const stash = {
      ...commit(
        'stash-tip',
        ['old-base'],
        'WIP on main: deadbeef Reworded base subject'
      ),
      refs: ['stash']
    }
    const layout = buildGitGraphLayout(
      [
        commit('head', ['new-base']),
        stash,
        commit('new-base', [], 'Reworded base subject'),
        commit('old-base', [], 'Reworded base subject')
      ],
      'head'
    )

    const padEdge = layout.edges.find(
      (edge) => edge.toKey === 'stash-tip' && edge.kind === 'pad'
    )
    expect(padEdge?.fromKey).toBe('new-base')
  })
})

describe('visualRowIndex', () => {
  it('offsets commits when the working row is visible', () => {
    expect(visualRowIndex(0, true)).toBe(1)
    expect(rowCenterY(visualRowIndex(0, true))).toBe(rowCenterY(1))
  })

  it('aligns commits to the top row when the working row is hidden', () => {
    expect(visualRowIndex(0, false)).toBe(0)
    expect(rowCenterY(visualRowIndex(0, false))).toBe(rowCenterY(0))
  })
})
