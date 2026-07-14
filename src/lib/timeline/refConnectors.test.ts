import { describe, expect, it } from 'vitest'
import { buildConnectorSpecs } from './refConnectors'
import type { GitGraphLayout } from '@/lib/graph/gitGraphLayout'

describe('buildConnectorSpecs', () => {
  const layout: GitGraphLayout = {
    laneCount: 1,
    rows: [{ key: 'abc', column: 0, rowIndex: 0, isStash: false }]
  } as GitGraphLayout

  it('builds a branch connector for commits with refs', () => {
    const specs = buildConnectorSpecs({
      commits: [{ hash: 'abc', refs: ['HEAD -> main', 'main'] }],
      layout,
      head: 'abc',
      currentBranch: 'main',
      isDetached: false,
      tagNames: new Set(),
      remoteNames: new Set(),
      colors: { stash: 's', head: 'h', lane: () => 'l' }
    })

    expect(specs).toEqual([
      expect.objectContaining({
        anchorId: 'ref:abc',
        targetColumn: 0,
        prominent: true,
        stroke: 'h'
      })
    ])
  })

  it('builds a dashed stash connector', () => {
    const stashLayout: GitGraphLayout = {
      laneCount: 1,
      rows: [{ key: 'stash', column: 1, rowIndex: 2, isStash: true }]
    } as GitGraphLayout

    expect(
      buildConnectorSpecs({
        commits: [{ hash: 'stash', refs: [] }],
        layout: stashLayout,
        head: 'abc',
        currentBranch: 'main',
        isDetached: false,
        tagNames: new Set(),
        remoteNames: new Set(),
        colors: { stash: 's', head: 'h', lane: () => 'l' }
      })
    ).toEqual([
      expect.objectContaining({
        anchorId: 'stash:stash',
        dashed: true,
        stroke: 's'
      })
    ])
  })
})
