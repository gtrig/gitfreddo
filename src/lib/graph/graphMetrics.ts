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
  // Effective radius is capped per segment in commitGraphPaths.
  cornerRadius: 8
}

export const GRAPH_LANE_WIDTH_MIN = 18
export const GRAPH_LANE_WIDTH_MAX = 64
export const GRAPH_LANE_WIDTH_DEFAULT = 18

export const BRANCH_TAG_WIDTH_MIN = 72
export const BRANCH_TAG_WIDTH_MAX = 280
export const BRANCH_TAG_WIDTH_DEFAULT = 116

const LANE_WIDTH_STORAGE_KEY = 'gitfreddo.timeline.graphLaneWidth'
const BRANCH_TAG_STORAGE_KEY = 'gitfreddo.timeline.branchTagWidth'

function clampLaneWidth(width: number): number {
  return Math.min(GRAPH_LANE_WIDTH_MAX, Math.max(GRAPH_LANE_WIDTH_MIN, width))
}

function clampBranchTagWidth(width: number): number {
  return Math.min(BRANCH_TAG_WIDTH_MAX, Math.max(BRANCH_TAG_WIDTH_MIN, width))
}

export function loadGraphLaneWidth(): number {
  if (typeof localStorage === 'undefined') {
    return GRAPH_LANE_WIDTH_DEFAULT
  }
  const stored = localStorage.getItem(LANE_WIDTH_STORAGE_KEY)
  if (!stored) {
    return GRAPH_LANE_WIDTH_DEFAULT
  }
  const parsed = Number.parseInt(stored, 10)
  if (!Number.isFinite(parsed)) {
    return GRAPH_LANE_WIDTH_DEFAULT
  }
  return clampLaneWidth(parsed)
}

export function saveGraphLaneWidth(width: number): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(LANE_WIDTH_STORAGE_KEY, String(clampLaneWidth(width)))
}

export function loadBranchTagWidth(): number {
  if (typeof localStorage === 'undefined') {
    return BRANCH_TAG_WIDTH_DEFAULT
  }
  const stored = localStorage.getItem(BRANCH_TAG_STORAGE_KEY)
  if (!stored) {
    return BRANCH_TAG_WIDTH_DEFAULT
  }
  const parsed = Number.parseInt(stored, 10)
  if (!Number.isFinite(parsed)) {
    return BRANCH_TAG_WIDTH_DEFAULT
  }
  return clampBranchTagWidth(parsed)
}

export function saveBranchTagWidth(width: number): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(BRANCH_TAG_STORAGE_KEY, String(clampBranchTagWidth(width)))
}

export function graphMetricsWithLaneWidth(laneWidth: number): GraphMetrics {
  return { ...DEFAULT_GRAPH_METRICS, laneWidth: clampLaneWidth(laneWidth) }
}

export function laneWidthForGraphColumn(
  graphColumnWidth: number,
  laneCount: number,
  metrics: GraphMetrics = DEFAULT_GRAPH_METRICS
): number {
  const lanes = Math.max(1, laneCount)
  const inner = graphColumnWidth - metrics.sidePadding * 2
  return clampLaneWidth(inner / lanes)
}

export function minGraphColumnWidth(
  laneCount: number,
  metrics: GraphMetrics = DEFAULT_GRAPH_METRICS
): number {
  return graphWidth(laneCount, { ...metrics, laneWidth: GRAPH_LANE_WIDTH_MIN })
}

export function graphWidth(
  laneCount: number,
  metrics: GraphMetrics = DEFAULT_GRAPH_METRICS
): number {
  const lanes = Math.max(1, laneCount)
  const minWidth = lanes >= 2 ? Math.max(metrics.minGraphWidth, 72) : metrics.minGraphWidth
  return Math.max(minWidth, lanes * metrics.laneWidth + metrics.sidePadding * 2)
}

export function columnCenterX(
  column: number,
  metrics: GraphMetrics = DEFAULT_GRAPH_METRICS
): number {
  return metrics.sidePadding + column * metrics.laneWidth + metrics.laneWidth / 2
}
