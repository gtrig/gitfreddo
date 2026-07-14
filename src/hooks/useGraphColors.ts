import { useMemo } from 'react'
import { useAppSettings } from '@/hooks/useAppSettings'
import { cssVar, normalizeTheme } from '@/lib/themes'

export interface GraphColors {
  lane: (column: number) => string
  edge: string
  merge: string
  head: string
  headStroke: string
  ancestor: string
  ancestorStroke: string
  selected: string
  wip: string
  wipStroke: string
  stash: string
  stashStroke: string
  nodeStroke: string
}

export function useGraphColors(): GraphColors {
  const { data } = useAppSettings()
  const theme = normalizeTheme(data?.theme)

  return useMemo(
    () => ({
      lane: (column: number) => cssVar(`--gf-graph-lane-${column % 7}`),
      edge: cssVar('--gf-graph-edge'),
      merge: cssVar('--gf-graph-merge'),
      head: cssVar('--gf-graph-head'),
      headStroke: cssVar('--gf-graph-head-stroke'),
      ancestor: cssVar('--gf-graph-ancestor') || '#22c55e',
      ancestorStroke: cssVar('--gf-graph-ancestor-stroke') || '#4ade80',
      selected: cssVar('--gf-graph-selected'),
      wip: cssVar('--gf-graph-wip'),
      wipStroke: cssVar('--gf-graph-wip-stroke'),
      stash: cssVar('--gf-graph-stash') || '#38bdf8',
      stashStroke: cssVar('--gf-graph-stash-stroke') || '#7dd3fc',
      nodeStroke: cssVar('--gf-graph-node-stroke')
    }),
    [theme]
  )
}
