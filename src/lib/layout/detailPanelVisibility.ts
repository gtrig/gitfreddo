import type { TimelineSelection } from '@/lib/types'

interface DetailPanelVisibilityOptions {
  commitExists?: boolean
}

export function shouldShowDetailPanel(
  connected: boolean,
  selection: TimelineSelection | null,
  options: DetailPanelVisibilityOptions = {}
): boolean {
  if (!connected || !selection) {
    return false
  }

  if (selection.kind === 'merge' || selection.kind === 'working') {
    return true
  }

  if (selection.kind === 'commit') {
    return options.commitExists ?? false
  }

  return false
}
