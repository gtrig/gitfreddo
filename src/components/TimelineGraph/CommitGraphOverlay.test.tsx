/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { CommitGraphOverlay } from './CommitGraphOverlay'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'
import { makeCommit } from '@/test/fixtures/commit'
import { buildGitGraphLayout } from '@/lib/graph/gitGraphLayout'

// In jsdom, CSS custom properties resolve to '' so useGraphColors falls back to
// its literal defaults. The ancestor fill/stroke fall back to these greens.
const ANCESTOR_FILL = '#22c55e'
const ANCESTOR_STROKE = '#4ade80'

const c3 = makeCommit({ hash: 'c3', shortHash: 'c3', parents: ['c2'], refs: [] })
const c2 = makeCommit({ hash: 'c2', shortHash: 'c2', parents: ['c1'], refs: [] })
const c1 = makeCommit({ hash: 'c1', shortHash: 'c1', parents: [], refs: [] })
const commits = [c3, c2, c1]

function renderOverlay(ancestorHashes: ReadonlySet<string> | null) {
  const layout = buildGitGraphLayout(commits, 'c3')
  return renderWithProviders(
    <CommitGraphOverlay
      layout={layout}
      workingSelected={false}
      selectedHash={null}
      ancestorHashes={ancestorHashes}
    />
  )
}

describe('CommitGraphOverlay ancestor highlighting', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue(defaultMockSettings)
  })

  it('paints ancestor nodes green', () => {
    const { container } = renderOverlay(new Set(['c3', 'c2', 'c1']))
    const greenNodes = container.querySelectorAll(`circle[fill="${ANCESTOR_FILL}"]`)
    expect(greenNodes.length).toBe(3)
    for (const node of greenNodes) {
      expect(node.getAttribute('stroke')).toBe(ANCESTOR_STROKE)
    }
  })

  it('paints edges between ancestors green', () => {
    const { container } = renderOverlay(new Set(['c3', 'c2', 'c1']))
    const greenEdges = container.querySelectorAll(`path[stroke="${ANCESTOR_FILL}"]`)
    // Two parent edges: c3->c2 and c2->c1.
    expect(greenEdges.length).toBe(2)
  })

  it('leaves non-ancestor nodes and edges ungreened', () => {
    const { container } = renderOverlay(new Set(['c1']))
    const greenNodes = container.querySelectorAll(`circle[fill="${ANCESTOR_FILL}"]`)
    expect(greenNodes.length).toBe(1)
    // No edge has both endpoints in the ancestor set, so no green edges.
    const greenEdges = container.querySelectorAll(`path[stroke="${ANCESTOR_FILL}"]`)
    expect(greenEdges.length).toBe(0)
  })

  it('greens nothing when no ancestor set is provided', () => {
    const { container } = renderOverlay(null)
    expect(container.querySelectorAll(`circle[fill="${ANCESTOR_FILL}"]`).length).toBe(0)
    expect(container.querySelectorAll(`path[stroke="${ANCESTOR_FILL}"]`).length).toBe(0)
  })
})
