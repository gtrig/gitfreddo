export interface GraphMetrics {
  laneWidth: number
  minGraphWidth: number
  sidePadding: number
  cornerRadius: number
}

/** Column 0 is reserved for the working-tree / active-lane spine (always straight). */
export const WORKING_TREE_COLUMN = 0

export const DEFAULT_GRAPH_METRICS: GraphMetrics = {
  laneWidth: 18,
  minGraphWidth: 56,
  sidePadding: 8,
  // Base 4.2; effective radius is scaled in commitGraphPaths (currently ×0.945).
  cornerRadius: 4.2
}

export const GRAPH_LANE_WIDTH_MIN = 18
export const GRAPH_LANE_WIDTH_MAX = 64
export const GRAPH_LANE_WIDTH_DEFAULT = 18

const STORAGE_KEY = 'gitfredo.timeline.graphLaneWidth'

export function loadGraphLaneWidth(): number {
  if (typeof localStorage === 'undefined') {
    return GRAPH_LANE_WIDTH_DEFAULT
  }
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return GRAPH_LANE_WIDTH_DEFAULT
  }
  const parsed = Number.parseInt(stored, 10)
  if (!Number.isFinite(parsed)) {
    return GRAPH_LANE_WIDTH_DEFAULT
  }
  return Math.min(GRAPH_LANE_WIDTH_MAX, Math.max(GRAPH_LANE_WIDTH_MIN, parsed))
}

export function saveGraphLaneWidth(width: number): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  const clamped = Math.min(GRAPH_LANE_WIDTH_MAX, Math.max(GRAPH_LANE_WIDTH_MIN, width))
  localStorage.setItem(STORAGE_KEY, String(clamped))
}

export function graphWidth(
  laneCount: number,
  metrics: GraphMetrics = DEFAULT_GRAPH_METRICS
): number {
  return Math.max(metrics.minGraphWidth, laneCount * metrics.laneWidth + metrics.sidePadding * 2)
}

export function columnCenterX(
  column: number,
  metrics: GraphMetrics = DEFAULT_GRAPH_METRICS
): number {
  return metrics.sidePadding + column * metrics.laneWidth + metrics.laneWidth / 2
}
