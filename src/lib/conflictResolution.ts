import type { ConflictHunk } from '@/lib/conflictMarkers'
import type { AiConflictResolutionProposal } from '../../shared/ai'
import {
  buildResolutionFromLineSelection,
  defaultLineSelection,
  initLineSelections,
  lineSelectionFromResolution,
  type HunkLineSelection
} from '@/lib/threeWayMerge'

export type HunkEditMode = 'checkbox' | 'manual'

export function initResolvedTexts(
  hunks: ConflictHunk[],
  selections?: Map<number, HunkLineSelection>
): Map<number, string> {
  const resolved = new Map<number, string>()
  const lineSelections = selections ?? initLineSelections(hunks)
  for (const hunk of hunks) {
    const selection = lineSelections.get(hunk.id) ?? defaultLineSelection(hunk)
    resolved.set(hunk.id, buildResolutionFromLineSelection(hunk, selection))
  }
  return resolved
}

export function initHunkEditModes(hunks: ConflictHunk[]): Map<number, HunkEditMode> {
  const modes = new Map<number, HunkEditMode>()
  for (const hunk of hunks) {
    modes.set(hunk.id, 'checkbox')
  }
  return modes
}

export function syncCheckboxFromResolvedText(
  hunk: ConflictHunk,
  text: string
): HunkLineSelection {
  return lineSelectionFromResolution(hunk, text)
}

export function resolvedTextsFromProposals(
  proposals: AiConflictResolutionProposal[]
): Map<number, string> {
  return new Map(proposals.map((proposal) => [proposal.hunkId, proposal.text]))
}

export function proposalsMapFromList(
  proposals: AiConflictResolutionProposal[]
): Map<number, AiConflictResolutionProposal> {
  return new Map(proposals.map((proposal) => [proposal.hunkId, proposal]))
}

export type PreviewLineKind = 'context' | 'hunk' | 'activeHunk'

export interface PreviewLine {
  text: string
  kind: PreviewLineKind
}

export function buildPreviewLines(
  markerContent: string,
  hunks: ConflictHunk[],
  resolvedTexts: Map<number, string>,
  activeHunkId: number | null
): PreviewLine[] {
  const lines = markerContent.split('\n')
  const output: PreviewLine[] = []
  let i = 0
  let hunkId = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (!line.startsWith('<<<<<<<')) {
      output.push({ text: line, kind: 'context' })
      i++
      continue
    }

    while (i < lines.length && !lines[i]!.startsWith('>>>>>>>')) {
      i++
    }
    if (i < lines.length) i++

    const hunk = hunks[hunkId]
    const resolved = hunk ? resolvedTexts.get(hunk.id) ?? '' : ''
    const kind: PreviewLineKind =
      hunk && hunk.id === activeHunkId ? 'activeHunk' : 'hunk'
    for (const resolvedLine of resolved.split('\n')) {
      output.push({ text: resolvedLine, kind })
    }
    hunkId++
  }

  return output
}
