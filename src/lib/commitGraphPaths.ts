export type GraphEdgeKind = 'parent' | 'proposal' | 'merge' | 'chain' | 'branch' | 'pad'

export interface GraphEdge {
  kind: GraphEdgeKind
}

function effectiveRadius(cornerRadius: number, segmentLength: number): number {
  const boosted = cornerRadius * 15
  const maxBySegment = segmentLength / 2 - 0.5
  return Math.max(1.5, Math.min(boosted, maxBySegment, 10))
}

/** Orthogonal commit-graph edge with rounded corners. */
export function buildGraphEdgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  kind: GraphEdgeKind,
  cornerRadius = 4.2
): string {
  if (kind === 'pad') {
    // Pad sits right of the anchor spine: horizontal from spine at pad Y, then down to anchor.
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
  const midY = topY + (bottomY - topY) / 2
  const r = effectiveRadius(cornerRadius, bottomY - topY)

  const goingLeft = topX > bottomX
  const hDir = goingLeft ? -1 : 1

  const v1End = midY - r
  const hStart = topX + hDir * r
  const hEnd = bottomX - hDir * r
  const v2Start = midY + r

  return [
    `M ${topX} ${topY}`,
    `L ${topX} ${v1End}`,
    `Q ${topX} ${midY} ${hStart} ${midY}`,
    `L ${hEnd} ${midY}`,
    `Q ${bottomX} ${midY} ${bottomX} ${v2Start}`,
    `L ${bottomX} ${bottomY}`
  ].join(' ')
}

/** WIP row → HEAD: always a straight vertical on the working-tree column. */
export function buildWipToHeadPath(wipX: number, wipY: number, headY: number): string {
  return `M ${wipX} ${wipY} L ${wipX} ${headY}`
}
