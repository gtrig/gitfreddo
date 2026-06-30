import { useCallback, useMemo, useState } from 'react'
import {
  BRANCH_TAG_WIDTH_MAX,
  BRANCH_TAG_WIDTH_MIN,
  graphMetricsWithLaneWidth,
  graphWidth,
  laneWidthForGraphColumn,
  loadBranchTagWidth,
  loadGraphLaneWidth,
  minGraphColumnWidth,
  saveBranchTagWidth,
  saveGraphLaneWidth
} from '@/lib/graphMetrics'

export function useTimelineColumnSizes(laneCount: number) {
  const [laneWidth, setLaneWidth] = useState(loadGraphLaneWidth)
  const [branchTagWidth, setBranchTagWidth] = useState(loadBranchTagWidth)
  const [resizing, setResizing] = useState(false)

  const metrics = useMemo(() => graphMetricsWithLaneWidth(laneWidth), [laneWidth])
  const graphColumnWidth = useMemo(
    () => graphWidth(Math.max(laneCount, 1), metrics),
    [laneCount, metrics]
  )

  const onBranchTagResize = useCallback((delta: number) => {
    setBranchTagWidth((current) => {
      const next = Math.min(BRANCH_TAG_WIDTH_MAX, Math.max(BRANCH_TAG_WIDTH_MIN, current + delta))
      saveBranchTagWidth(next)
      return next
    })
  }, [])

  const onGraphLaneResize = useCallback(
    (delta: number) => {
      setLaneWidth((current) => {
        const currentMetrics = graphMetricsWithLaneWidth(current)
        const currentGraphWidth = graphWidth(Math.max(laneCount, 1), currentMetrics)
        const minWidth = minGraphColumnWidth(laneCount, currentMetrics)
        const nextGraphWidth = Math.max(minWidth, currentGraphWidth + delta)
        const next = laneWidthForGraphColumn(nextGraphWidth, laneCount, currentMetrics)
        saveGraphLaneWidth(next)
        return next
      })
    },
    [laneCount]
  )

  return {
    branchTagWidth,
    graphColumnWidth,
    metrics,
    resizing,
    setResizing,
    onBranchTagResize,
    onGraphLaneResize
  }
}
