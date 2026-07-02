export type GraphEdgeKind = 'parent' | 'proposal' | 'merge' | 'chain' | 'branch' | 'pad'

export interface GraphEdge {
  kind: GraphEdgeKind
}

function effectiveRadius(
  cornerRadius: number,
  verticalSpan: number,
  horizontalSpan: number
): number {
  const maxByVertical = verticalSpan / 2 - 0.5
  const maxByHorizontal = horizontalSpan / 2 - 0.5
  return Math.max(1.5, Math.min(cornerRadius, maxByVertical, maxByHorizontal, 10))
}

/** Horizontal at the child row, then vertical to the parent (merge / branch-out). */
function buildTopElbowPath(
  childX: number,
  childY: number,
  parentX: number,
  parentY: number,
  cornerRadius: number
): string {
  const verticalSpan = parentY - childY
  const horizontalSpan = Math.abs(parentX - childX)
  const r = effectiveRadius(cornerRadius, verticalSpan, horizontalSpan)
  const hDir = parentX > childX ? 1 : -1

  if (verticalSpan <= r * 1.5 || horizontalSpan <= r * 1.5) {
    return `M ${childX} ${childY} L ${parentX} ${childY} L ${parentX} ${parentY}`
  }

  return [
    `M ${childX} ${childY}`,
    `L ${parentX - hDir * r} ${childY}`,
    `Q ${parentX} ${childY} ${parentX} ${childY + r}`,
    `L ${parentX} ${parentY}`
  ].join(' ')
}

/** Vertical on the child lane, then horizontal at the parent row (branch-in to fork). */
function buildBottomElbowPath(
  childX: number,
  childY: number,
  parentX: number,
  parentY: number,
  cornerRadius: number
): string {
  const verticalSpan = parentY - childY
  const horizontalSpan = Math.abs(parentX - childX)
  const r = effectiveRadius(cornerRadius, verticalSpan, horizontalSpan)
  const hDir = parentX > childX ? 1 : -1

  if (verticalSpan <= r * 1.5 || horizontalSpan <= r * 1.5) {
    return `M ${childX} ${childY} L ${childX} ${parentY} L ${parentX} ${parentY}`
  }

  return [
    `M ${childX} ${childY}`,
    `L ${childX} ${parentY - r}`,
    `Q ${childX} ${parentY} ${childX + hDir * r} ${parentY}`,
    `L ${parentX} ${parentY}`
  ].join(' ')
}

/**
 * Anchor commit → stash: horizontal from the anchor on the main lane, then vertical on
 * the dedicated stash lane to the stash row (GitKraken-style pad connector).
 */
export function buildStashPadPath(
  anchorX: number,
  anchorY: number,
  padX: number,
  padY: number,
  cornerRadius = 8
): string {
  if (Math.abs(padX - anchorX) < 0.5) {
    return `M ${anchorX} ${anchorY} L ${padX} ${padY}`
  }

  const horizontalSpan = Math.abs(padX - anchorX)
  const verticalSpan = Math.abs(padY - anchorY)
  const r = effectiveRadius(cornerRadius, verticalSpan, horizontalSpan)
  const hDir = padX > anchorX ? 1 : -1
  const vDir = padY < anchorY ? -1 : 1

  if (verticalSpan <= r * 1.5 || horizontalSpan <= r * 1.5) {
    return `M ${anchorX} ${anchorY} L ${padX} ${anchorY} L ${padX} ${padY}`
  }

  return [
    `M ${anchorX} ${anchorY}`,
    `L ${padX - hDir * r} ${anchorY}`,
    `Q ${padX} ${anchorY} ${padX} ${anchorY + vDir * r}`,
    `L ${padX} ${padY}`
  ].join(' ')
}

/**
 * GitKraken-style orthogonal edge: straight vertical on one lane, or a top elbow
 * (horizontal at the child row, then vertical to the parent) when lanes differ.
 */
export function buildGraphEdgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  kind: GraphEdgeKind,
  cornerRadius = 8
): string {
  if (kind === 'pad') {
    return buildStashPadPath(x1, y1, x2, y2, cornerRadius)
  }

  if (Math.abs(x1 - x2) < 0.5) {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }

  const childY = Math.min(y1, y2)
  const parentY = Math.max(y1, y2)
  const childX = y1 <= y2 ? x1 : x2
  const parentX = y1 <= y2 ? x2 : x1

  if (kind === 'merge' || kind === 'branch') {
    return buildTopElbowPath(childX, childY, parentX, parentY, cornerRadius)
  }

  return buildBottomElbowPath(childX, childY, parentX, parentY, cornerRadius)
}

/** WIP row → HEAD: always a straight vertical on the working-tree column. */
export function buildWipToHeadPath(wipX: number, wipY: number, headY: number): string {
  return `M ${wipX} ${wipY} L ${wipX} ${headY}`
}
