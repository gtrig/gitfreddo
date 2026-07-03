import { describe, expect, it } from 'vitest'
import { buildGraphEdgePath, buildStashPadPath, buildWipToHeadPath } from '@/lib/graph/commitGraphPaths'

describe('buildGraphEdgePath', () => {
  it('draws a vertical line for same-column commits', () => {
    const path = buildGraphEdgePath(40, 20, 40, 80, 'parent')
    expect(path).toMatch(/^M 40 20/)
    expect(path).toContain('40 80')
  })

  it('routes pad stash edges from the anchor across to the stash lane, then to the stash row', () => {
    const path = buildStashPadPath(40, 100, 80, 40)
    expect(path).toMatch(/^M 40 100/)
    expect(path).toContain('80')
    expect(path).toContain('40')
    expect(path).not.toContain('M 80 40 L 80 100')
  })

  it('routes cross-lane edges with a top elbow like GitKraken', () => {
    const path = buildGraphEdgePath(60, 20, 30, 80, 'merge')
    expect(path).toContain('M 60 20')
    expect(path).toContain('30 20')
    expect(path).toContain('30 80')
    expect(path).not.toContain('C ')
  })

  it('routes branch-in parent edges with a bottom elbow at the fork', () => {
    const path = buildGraphEdgePath(60, 20, 30, 80, 'parent')
    expect(path).toContain('M 60 20')
    expect(path).toContain('60 80')
    expect(path).toContain('30 80')
    expect(path).not.toContain('60 20 L 30 20')
  })
})

describe('buildWipToHeadPath', () => {
  it('is always a straight vertical line on the working-tree column', () => {
    expect(buildWipToHeadPath(26, 10, 90)).toBe('M 26 10 L 26 90')
  })
})
