/** After staging/unstaging the only visible hunk, switch the diff overlay to the other side. */
export function diffModeAfterLastHunkAction(
  hunkStageMode: 'stage' | 'unstage',
  hunkCount: number
): 'working' | 'staged' | null {
  if (hunkCount !== 1) return null
  return hunkStageMode === 'stage' ? 'staged' : 'working'
}
