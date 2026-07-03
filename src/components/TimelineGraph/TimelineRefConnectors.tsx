import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { COMMIT_SEARCH_FADE_CLASS } from '@/lib/commitSearch'
import {
  graphHeight,
  rowCenterY,
  visualRowIndex,
  type GitGraphLayout
} from '@/lib/gitGraphLayout'
import { columnCenterX, graphWidth, type GraphMetrics } from '@/lib/graphMetrics'
import { timelineRefs } from '@/lib/timelineRefs'
import { useGraphColors } from '@/hooks/useGraphColors'
import {
  TimelineRefConnectorRegisterContext,
  useConnectorAnchorRegistry
} from './TimelineRefConnectorContext'

export interface TimelineRefConnectorSpec {
  anchorId: string
  targetColumn: number
  targetRowIndex: number
  stroke: string
  dashed?: boolean
  prominent?: boolean
  dimKey: string
}

interface TimelineRefConnectorLine {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  stroke: string
  dashed?: boolean
  prominent?: boolean
  dimmed: boolean
}

function buildConnectorSpecs({
  commits,
  layout,
  head,
  currentBranch,
  isDetached,
  tagNames,
  remoteNames,
  colors
}: {
  commits: Array<{ hash: string; refs: string[] }>
  layout: GitGraphLayout
  head: string
  currentBranch: string
  isDetached: boolean
  tagNames: ReadonlySet<string>
  remoteNames: ReadonlySet<string>
  colors: ReturnType<typeof useGraphColors>
}): TimelineRefConnectorSpec[] {
  const rowByKey = new Map(layout.rows.map((row) => [row.key, row]))
  const specs: TimelineRefConnectorSpec[] = []

  for (const commit of commits) {
    const row = rowByKey.get(commit.hash)
    if (!row) continue

    if (row.isStash) {
      specs.push({
        anchorId: `stash:${commit.hash}`,
        targetColumn: row.column,
        targetRowIndex: row.rowIndex,
        stroke: colors.stash,
        dashed: true,
        dimKey: commit.hash
      })
      continue
    }

    const refs = timelineRefs(commit.refs, tagNames, remoteNames)
    const showDetachedHead = commit.hash === head && isDetached
    if (refs.length === 0 && !showDetachedHead) continue

    const isCurrent =
      commit.hash === head &&
      !isDetached &&
      Boolean(currentBranch) &&
      refs.some((ref) => ref.kind === 'branch' && ref.label === currentBranch)

    specs.push({
      anchorId: `ref:${commit.hash}`,
      targetColumn: row.column,
      targetRowIndex: row.rowIndex,
      stroke: isCurrent ? colors.head : colors.lane(row.column),
      prominent: isCurrent,
      dimKey: commit.hash
    })
  }

  return specs
}

function measureConnectorLines({
  container,
  anchors,
  specs,
  graphLeft,
  prefixRows,
  rowHeight,
  metrics,
  dimmedHashes,
  selectedHash,
  selectedHashes
}: {
  container: HTMLElement
  anchors: Map<string, HTMLElement>
  specs: TimelineRefConnectorSpec[]
  graphLeft: number
  prefixRows: number
  rowHeight: number
  metrics: GraphMetrics
  dimmedHashes?: ReadonlySet<string> | null
  selectedHash: string | null
  selectedHashes?: ReadonlySet<string>
}): TimelineRefConnectorLine[] {
  const containerRect = container.getBoundingClientRect()
  const lines: TimelineRefConnectorLine[] = []

  for (const spec of specs) {
    const anchor = anchors.get(spec.anchorId)
    if (!anchor) continue

    const anchorRect = anchor.getBoundingClientRect()
    const x1 = anchorRect.right - containerRect.left
    const y1 = anchorRect.top + anchorRect.height / 2 - containerRect.top
    const x2 = graphLeft + columnCenterX(spec.targetColumn, metrics)
    const y2 = rowCenterY(visualRowIndex(spec.targetRowIndex, prefixRows), rowHeight)

    if (x2 <= x1 + 2) continue

    const dimmed =
      Boolean(dimmedHashes?.has(spec.dimKey)) &&
      selectedHash !== spec.dimKey &&
      !selectedHashes?.has(spec.dimKey)

    lines.push({
      id: spec.anchorId,
      x1,
      y1,
      x2,
      y2,
      stroke: spec.stroke,
      dashed: spec.dashed,
      prominent: spec.prominent,
      dimmed
    })
  }

  return lines
}

export function TimelineRefConnectorProvider({
  children,
  commits,
  layout,
  head,
  currentBranch,
  isDetached,
  tagNames,
  remoteNames,
  branchTagWidth,
  resizeGap,
  prefixRows,
  rowHeight,
  metrics,
  dimmedHashes,
  selectedHash,
  selectedHashes
}: {
  children: ReactNode
  commits: Array<{ hash: string; refs: string[] }>
  layout: GitGraphLayout
  head: string
  currentBranch: string
  isDetached: boolean
  tagNames: ReadonlySet<string>
  remoteNames: ReadonlySet<string>
  branchTagWidth: number
  resizeGap: number
  prefixRows: number
  rowHeight: number
  metrics: GraphMetrics
  dimmedHashes?: ReadonlySet<string> | null
  selectedHash: string | null
  selectedHashes?: ReadonlySet<string>
}) {
  const colors = useGraphColors()
  const containerRef = useRef<HTMLDivElement>(null)
  const [lines, setLines] = useState<TimelineRefConnectorLine[]>([])
  const measureFrameRef = useRef<number | null>(null)

  const specs = useMemo(
    () =>
      buildConnectorSpecs({
        commits,
        layout,
        head,
        currentBranch,
        isDetached,
        tagNames,
        remoteNames,
        colors
      }),
    [colors, commits, currentBranch, head, isDetached, layout, remoteNames, tagNames]
  )

  const specsRef = useRef(specs)
  specsRef.current = specs

  const { register, anchorsRef } = useConnectorAnchorRegistry(() => {
    scheduleMeasureRef.current()
  })

  const scheduleMeasureRef = useRef<() => void>(() => {})

  scheduleMeasureRef.current = () => {
    if (measureFrameRef.current !== null) {
      cancelAnimationFrame(measureFrameRef.current)
    }
    measureFrameRef.current = requestAnimationFrame(() => {
      measureFrameRef.current = null
      const container = containerRef.current
      if (!container) return
      setLines(
        measureConnectorLines({
          container,
          anchors: anchorsRef.current,
          specs: specsRef.current,
          graphLeft: branchTagWidth + resizeGap,
          prefixRows,
          rowHeight,
          metrics,
          dimmedHashes,
          selectedHash,
          selectedHashes
        })
      )
    })
  }

  useLayoutEffect(() => {
    scheduleMeasureRef.current()
  }, [
    branchTagWidth,
    dimmedHashes,
    metrics,
    prefixRows,
    resizeGap,
    rowHeight,
    selectedHash,
    selectedHashes,
    specs
  ])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => scheduleMeasureRef.current())
    observer.observe(container)

    const onScroll = () => scheduleMeasureRef.current()
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onScroll)
      if (measureFrameRef.current !== null) {
        cancelAnimationFrame(measureFrameRef.current)
      }
    }
  }, [])

  const height = graphHeight(layout.rows.length + prefixRows, rowHeight)
  const width = branchTagWidth + resizeGap + graphWidth(layout.laneCount, metrics)

  return (
    <div ref={containerRef} className="relative flex shrink-0 sticky left-0 z-10 bg-gf-bg-deep">
      <TimelineRefConnectorRegisterContext.Provider value={register}>
        <svg
          width={width}
          height={height}
          className={`pointer-events-none absolute left-0 top-0 z-0 overflow-visible ${COMMIT_SEARCH_FADE_CLASS}`}
          aria-hidden
        >
          {lines.map((line) => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.stroke}
              strokeWidth={line.prominent ? 2.25 : 1.75}
              strokeLinecap="round"
              strokeDasharray={line.dashed ? '4 3' : undefined}
              className={
                line.dimmed ? 'opacity-35' : line.prominent ? 'opacity-100' : 'opacity-30'
              }
            />
          ))}
        </svg>
        {children}
      </TimelineRefConnectorRegisterContext.Provider>
    </div>
  )
}
