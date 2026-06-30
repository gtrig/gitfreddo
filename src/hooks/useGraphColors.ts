import { useMemo } from 'react'
import { useAppSettings } from '@/hooks/useAppSettings'
import { cssVar, normalizeTheme } from '@/lib/themes'

export interface GraphColors {
  lane: (column: number) => string
  edge: string
  merge: string
  head: string
  headStroke: string
  selected: string
  wip: string
  wipStroke: string
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
      selected: cssVar('--gf-graph-selected'),
      wip: cssVar('--gf-graph-wip'),
      wipStroke: cssVar('--gf-graph-wip-stroke'),
      nodeStroke: cssVar('--gf-graph-node-stroke')
    }),
    [theme]
  )
}
