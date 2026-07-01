import { buildGraphEdgePath, buildStashPadPath, buildWipToHeadPath } from '@/lib/commitGraphPaths'
import {
  graphHeight,
  GRAPH_ROW_HEIGHT,
  rowCenterY,
  visualRowIndex,
  type GitGraphLayout
} from '@/lib/gitGraphLayout'
import {
  columnCenterX,
  DEFAULT_GRAPH_METRICS,
  graphWidth,
  type GraphMetrics,
  WORKING_TREE_COLUMN
} from '@/lib/graphMetrics'
import { useGraphColors } from '@/hooks/useGraphColors'

export function CommitGraphOverlay({
  layout,
  showWorkingRow,
  workingSelected,
  selectedHash,
  selectedHashes,
  rowHeight = GRAPH_ROW_HEIGHT,
  metrics = DEFAULT_GRAPH_METRICS
}: {
  layout: GitGraphLayout
  showWorkingRow: boolean
  workingSelected: boolean
  selectedHash: string | null
  selectedHashes?: ReadonlySet<string>
  rowHeight?: number
  metrics?: GraphMetrics
}) {
  const colors = useGraphColors()
  const rowCount = showWorkingRow ? layout.rows.length + 1 : layout.rows.length
  const height = graphHeight(rowCount, rowHeight)
  const width = graphWidth(layout.laneCount, metrics)
  const rowByKey = new Map(layout.rows.map((row) => [row.key, row]))
  const headRow = layout.rows.find((row) => row.isHead)

  const wipX = columnCenterX(WORKING_TREE_COLUMN, metrics)
  const wipY = rowCenterY(0, rowHeight)
  const headY = headRow
    ? rowCenterY(visualRowIndex(headRow.rowIndex, showWorkingRow), rowHeight)
    : wipY

  const rowCenter = (layoutRowIndex: number) =>
    rowCenterY(visualRowIndex(layoutRowIndex, showWorkingRow), rowHeight)

  return (
    <svg
      width={width}
      height={height}
      className="pointer-events-none shrink-0 overflow-visible"
      aria-hidden
    >
      <line
        x1={wipX}
        y1={0}
        x2={wipX}
        y2={height}
        stroke={colors.lane(WORKING_TREE_COLUMN)}
        strokeWidth={1}
        strokeDasharray="2 3"
        opacity={0.45}
      />

      {showWorkingRow && headRow && (
        <path
          d={buildWipToHeadPath(wipX, wipY, headY)}
          fill="none"
          stroke={colors.wip}
          strokeWidth={2}
          strokeDasharray="4 3"
          opacity={0.85}
          strokeLinecap="round"
        />
      )}

      {layout.edges
        .filter((edge) => edge.kind !== 'pad')
        .map((edge) => {
          const fromRow = rowByKey.get(edge.fromKey)
          const toRow = rowByKey.get(edge.toKey)
          if (!fromRow || !toRow) return null

          const x1 = columnCenterX(edge.fromColumn, metrics)
          const y1 = rowCenter(fromRow.rowIndex)
          const x2 = columnCenterX(edge.toColumn, metrics)
          const y2 = rowCenter(toRow.rowIndex)

          return (
            <path
              key={`${edge.fromKey}-${edge.toKey}-${edge.kind}`}
              d={buildGraphEdgePath(x1, y1, x2, y2, edge.kind === 'merge' ? 'merge' : 'parent')}
              fill="none"
              stroke={colors.lane(edge.kind === 'merge' ? edge.toColumn : edge.fromColumn)}
              strokeWidth={2.1}
              strokeLinecap="round"
              opacity={0.96}
            />
          )
        })}

      {showWorkingRow && (
        <circle
          cx={wipX}
          cy={wipY}
          r={workingSelected ? 4.6 : 4.1}
          fill={colors.wip}
          stroke={workingSelected ? colors.selected : colors.wipStroke}
          strokeWidth={workingSelected ? 2 : 1.5}
        />
      )}

      {layout.rows.map((row) => {
        const x = columnCenterX(row.column, metrics)
        const y = rowCenter(row.rowIndex)
        const isPrimary = selectedHash === row.key
        const isSelected = selectedHashes?.has(row.key) ?? isPrimary

        if (row.isStash) {
          const size = isPrimary ? 10 : isSelected ? 9.5 : 9
          const half = size / 2
          const highlighted = isPrimary || isSelected
          return (
            <g key={row.key}>
              <rect
                x={x - half}
                y={y - half}
                width={size}
                height={size}
                rx={2}
                fill={colors.stash}
                stroke={colors.stashStroke}
                strokeWidth={highlighted ? 2.5 : 1.5}
              />
              <path
                d={`M ${x - 2.5} ${y - 1.2} h 5 v 3.2 h -5 z M ${x - 2.5} ${y + 0.6} h 5`}
                fill="none"
                stroke={highlighted ? '#f0f9ff' : colors.stashStroke}
                strokeWidth={1}
                strokeLinecap="round"
                opacity={highlighted ? 1 : 0.95}
              />
            </g>
          )
        }

        return (
          <circle
            key={row.key}
            cx={x}
            cy={y}
            r={isPrimary ? 4.7 : isSelected ? 4.5 : 4.2}
            fill={row.isMerge ? colors.merge : row.isHead ? colors.head : colors.lane(row.column)}
            stroke={
              isPrimary || isSelected
                ? colors.selected
                : row.isHead
                  ? colors.headStroke
                  : colors.nodeStroke
            }
            strokeWidth={isPrimary ? 2 : isSelected ? 1.75 : 1.5}
          />
        )
      })}

      {layout.edges
        .filter((edge) => edge.kind === 'pad')
        .map((edge) => {
          const fromRow = rowByKey.get(edge.fromKey)
          const toRow = rowByKey.get(edge.toKey)
          if (!fromRow || !toRow) return null

          const anchorX = columnCenterX(edge.fromColumn, metrics)
          const anchorY = rowCenter(fromRow.rowIndex)
          const padX = columnCenterX(edge.toColumn, metrics)
          const padY = rowCenter(toRow.rowIndex)
          const padPath = buildStashPadPath(anchorX, anchorY, padX, padY)
          const padActive =
            selectedHash === edge.fromKey ||
            selectedHash === edge.toKey ||
            selectedHashes?.has(edge.fromKey) ||
            selectedHashes?.has(edge.toKey)
          const stroke = colors.stash
          const strokeWidth = padActive ? 3.5 : 3

          return (
            <g key={`${edge.fromKey}-${edge.toKey}-pad`}>
              <path
                d={padPath}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth + 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.28}
              />
              <path
                d={padPath}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )
        })}
    </svg>
  )
}
