import { timelineRefs } from '@/lib/timeline/timelineRefs'
import type { GitGraphLayout } from '@/lib/graph/gitGraphLayout'

export interface TimelineRefConnectorSpec {
  anchorId: string
  targetColumn: number
  targetRowIndex: number
  stroke: string
  dashed?: boolean
  prominent?: boolean
  dimKey: string
}

export interface ConnectorGraphColors {
  stash: string
  head: string
  lane: (column: number) => string
}

export function buildConnectorSpecs({
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
  colors: ConnectorGraphColors
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
