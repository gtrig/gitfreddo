export type GraphEdgeKind = 'parent' | 'proposal' | 'merge' | 'chain' | 'branch' | 'pad'

export interface GraphEdge {
  kind: GraphEdgeKind
}

function effectiveRadius(cornerRadius: number, segmentLength: number): number {
  const boosted = cornerRadius * 15
  const maxBySegment = segmentLength / 2 - 0.5
  return Math.max(1.5, Math.min(boosted, maxBySegment, 10))
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
  cornerRadius = 4.2
): string {
  if (kind === 'pad') {
    const padX = x2
    const padY = y2
    const anchorX = x1
    const anchorY = y1
    if (Math.abs(padX - anchorX) < 0.5) {
      return `M ${padX} ${padY} L ${anchorX} ${anchorY}`
    }
    const r = effectiveRadius(cornerRadius, Math.abs(anchorY - padY))
    const dir = padX > anchorX ? 1 : -1
    return [
      `M ${padX} ${padY}`,
      `L ${anchorX + dir * r} ${padY}`,
      `Q ${anchorX} ${padY} ${anchorX} ${padY + r}`,
      `L ${anchorX} ${anchorY}`
    ].join(' ')
  }

  if (Math.abs(x1 - x2) < 0.5) {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }

  const topY = Math.min(y1, y2)
  const bottomY = Math.max(y1, y2)
  const topX = y1 <= y2 ? x1 : x2
  const bottomX = y1 <= y2 ? x2 : x1
  const verticalSpan = bottomY - topY
  const r = effectiveRadius(cornerRadius, verticalSpan)
  const hDir = bottomX > topX ? 1 : -1

  if (verticalSpan <= r * 1.5) {
    return `M ${topX} ${topY} L ${bottomX} ${topY} L ${bottomX} ${bottomY}`
  }

  return [
    `M ${topX} ${topY}`,
    `L ${bottomX - hDir * r} ${topY}`,
    `Q ${bottomX} ${topY} ${bottomX} ${topY + r}`,
    `L ${bottomX} ${bottomY}`
  ].join(' ')
}

/** WIP row → HEAD: always a straight vertical on the working-tree column. */
export function buildWipToHeadPath(wipX: number, wipY: number, headY: number): string {
  return `M ${wipX} ${wipY} L ${wipX} ${headY}`
}
