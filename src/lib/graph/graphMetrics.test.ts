import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BRANCH_TAG_WIDTH_DEFAULT,
  columnCenterX,
  DEFAULT_GRAPH_METRICS,
  graphMetricsWithLaneWidth,
  graphWidth,
  laneWidthForGraphColumn,
  loadBranchTagWidth,
  loadGraphLaneWidth,
  minGraphColumnWidth,
  saveBranchTagWidth,
  saveGraphLaneWidth
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

  it('computes lane center positions', () => {
    expect(columnCenterX(0, DEFAULT_GRAPH_METRICS)).toBe(17)
    expect(columnCenterX(2, { ...DEFAULT_GRAPH_METRICS, laneWidth: 20 })).toBe(58)
  })
})

function stubLocalStorage() {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
    clear: () => {
      storage.clear()
    }
  })
  return storage
}

describe('graph metric persistence', () => {
  beforeEach(() => {
    stubLocalStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads defaults when storage is empty or invalid', () => {
    expect(loadGraphLaneWidth()).toBe(18)
    expect(loadBranchTagWidth()).toBe(BRANCH_TAG_WIDTH_DEFAULT)
    localStorage.setItem('gitfreddo.timeline.graphLaneWidth', 'not-a-number')
    expect(loadGraphLaneWidth()).toBe(18)
  })

  it('clamps saved widths to allowed ranges', () => {
    saveGraphLaneWidth(999)
    saveBranchTagWidth(10)
    expect(loadGraphLaneWidth()).toBe(64)
    expect(loadBranchTagWidth()).toBe(72)
  })

  it('returns defaults when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadGraphLaneWidth()).toBe(18)
    expect(loadBranchTagWidth()).toBe(BRANCH_TAG_WIDTH_DEFAULT)
    expect(() => saveGraphLaneWidth(24)).not.toThrow()
    expect(() => saveBranchTagWidth(120)).not.toThrow()
  })

  it('builds metrics and graph widths for multi-lane graphs', () => {
    const metrics = graphMetricsWithLaneWidth(40)
    expect(metrics.laneWidth).toBe(40)
    expect(graphWidth(1, metrics)).toBeGreaterThanOrEqual(56)
    expect(graphWidth(3, metrics)).toBeGreaterThanOrEqual(72)
    expect(minGraphColumnWidth(3, metrics)).toBeGreaterThanOrEqual(72)
  })
})
