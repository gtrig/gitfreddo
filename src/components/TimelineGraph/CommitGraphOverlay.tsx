import { buildGraphEdgePath, buildWipToHeadPath } from '@/lib/commitGraphPaths'
import {
  graphHeight,
  GRAPH_ROW_HEIGHT,
  rowCenterY,
  type GitGraphLayout
} from '@/lib/gitGraphLayout'
import {
  columnCenterX,
  DEFAULT_GRAPH_METRICS,
  graphWidth,
  WORKING_TREE_COLUMN
} from '@/lib/graphMetrics'

const LANE_COLORS = ['#71717a', '#38bdf8', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#fb923c']

function laneColor(column: number): string {
  return LANE_COLORS[column % LANE_COLORS.length]
}

export function CommitGraphOverlay({
  layout,
  showWorkingRow,
  workingSelected,
  selectedHash,
  rowHeight = GRAPH_ROW_HEIGHT
}: {
  layout: GitGraphLayout
  showWorkingRow: boolean
  workingSelected: boolean
  selectedHash: string | null
  rowHeight?: number
}) {
  const rowCount = showWorkingRow ? layout.rows.length + 1 : layout.rows.length
  const height = graphHeight(rowCount, rowHeight)
  const width = graphWidth(layout.laneCount, DEFAULT_GRAPH_METRICS)
  const rowByKey = new Map(layout.rows.map((row) => [row.key, row]))
  const headRow = layout.rows.find((row) => row.isHead)

  const wipX = columnCenterX(WORKING_TREE_COLUMN, DEFAULT_GRAPH_METRICS)
  const wipY = rowCenterY(0, rowHeight)
  const headY = headRow ? rowCenterY(headRow.rowIndex, rowHeight) : wipY

  return (
    <svg
      width={width}
      height={height}
      className="pointer-events-none shrink-0"
      aria-hidden
    >
      {Array.from({ length: layout.laneCount }, (_, column) => {
        const x = columnCenterX(column, DEFAULT_GRAPH_METRICS)
        return (
          <line
            key={`lane-${column}`}
            x1={x}
            y1={0}
            x2={x}
            y2={height}
            stroke={laneColor(column)}
            strokeWidth={column === WORKING_TREE_COLUMN ? 1.5 : 1}
            opacity={column === WORKING_TREE_COLUMN ? 0.14 : 0.08}
          />
        )
      })}

      {showWorkingRow && headRow && (
        <path
          d={buildWipToHeadPath(wipX, wipY, headY)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="4 3"
          opacity={0.85}
          strokeLinecap="round"
        />
      )}

      {layout.edges.map((edge) => {
        const fromRow = rowByKey.get(edge.fromKey)
        const toRow = rowByKey.get(edge.toKey)
        if (!fromRow || !toRow) return null

        const x1 = columnCenterX(edge.fromColumn, DEFAULT_GRAPH_METRICS)
        const y1 = rowCenterY(fromRow.rowIndex, rowHeight)
        const x2 = columnCenterX(edge.toColumn, DEFAULT_GRAPH_METRICS)
        const y2 = rowCenterY(toRow.rowIndex, rowHeight)

        return (
          <path
            key={`${edge.fromKey}-${edge.toKey}-${edge.kind}`}
            d={buildGraphEdgePath(x1, y1, x2, y2, edge.kind === 'merge' ? 'merge' : 'parent')}
            fill="none"
            stroke={edge.kind === 'merge' ? '#34d399' : '#71717a'}
            strokeWidth={1.75}
            strokeLinecap="round"
            opacity={0.9}
          />
        )
      })}

      {showWorkingRow && (
        <circle
          cx={wipX}
          cy={wipY}
          r={workingSelected ? 5 : 4.5}
          fill="#f59e0b"
          stroke={workingSelected ? '#38bdf8' : '#fbbf24'}
          strokeWidth={workingSelected ? 2 : 1.5}
        />
      )}

      {layout.rows.map((row) => {
        const x = columnCenterX(row.column, DEFAULT_GRAPH_METRICS)
        const y = rowCenterY(row.rowIndex, rowHeight)
        const selected = selectedHash === row.key

        return (
          <circle
            key={row.key}
            cx={x}
            cy={y}
            r={selected ? 5 : 4.5}
            fill={row.isMerge ? '#34d399' : row.isHead ? '#34d399' : laneColor(row.column)}
            stroke={selected ? '#38bdf8' : row.isHead ? '#6ee7b7' : '#52525b'}
            strokeWidth={selected ? 2 : 1.5}
          />
        )
      })}
    </svg>
  )
}
