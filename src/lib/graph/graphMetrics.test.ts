import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GRAPH_METRICS,
  graphWidth,
  laneWidthForGraphColumn,
  minGraphColumnWidth
} from '@/lib/graph/graphMetrics'

describe('timeline graph column sizing', () => {
  it('derives lane width from the graph column width', () => {
    const laneCount = 3
    const metrics = { ...DEFAULT_GRAPH_METRICS, laneWidth: 24 }
    const columnWidth = graphWidth(laneCount, metrics)
    expect(laneWidthForGraphColumn(columnWidth, laneCount, metrics)).toBe(24)
  })

  it('clamps graph column width to the minimum lane width', () => {
    expect(minGraphColumnWidth(2, DEFAULT_GRAPH_METRICS)).toBe(72)
  })
})
