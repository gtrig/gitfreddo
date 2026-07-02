import type { ConflictHunk } from '@/lib/conflictMarkers'

export interface LineRange {
  start: number
  end: number
}

export interface HunkLineRanges {
  hunkId: number
  sideA: LineRange | null
  sideB: LineRange | null
}

function findBlockRange(content: string, block: string): LineRange | null {
  if (!block) return null
  const lines = content.split('\n')
  const blockLines = block.split('\n')
  if (blockLines.length === 0) return null

  outer: for (let i = 0; i <= lines.length - blockLines.length; i++) {
    for (let j = 0; j < blockLines.length; j++) {
      if (lines[i + j] !== blockLines[j]) continue outer
    }
    return { start: i + 1, end: i + blockLines.length }
  }
  return null
}

export function mapHunksToLineRanges(
  sideA: string,
  sideB: string,
  hunks: ConflictHunk[]
): HunkLineRanges[] {
  return hunks.map((hunk) => ({
    hunkId: hunk.id,
    sideA: findBlockRange(sideA, hunk.ours),
    sideB: findBlockRange(sideB, hunk.theirs)
  }))
}

export function buildOutputFromResolutions(
  markerContent: string,
  resolutions: Map<number, string>
): string {
  const lines = markerContent.split('\n')
  const output: string[] = []
  let i = 0
  let hunkId = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (!line.startsWith('<<<<<<<')) {
      output.push(line)
      i++
      continue
    }

    while (i < lines.length && !lines[i]!.startsWith('>>>>>>>')) {
      i++
    }
    if (i < lines.length) i++

    const resolved = resolutions.get(hunkId)
    if (resolved !== undefined && resolved.length > 0) {
      output.push(...resolved.split('\n'))
    }
    hunkId++
  }

  return output.join('\n')
}

export function hasUnresolvedMarkers(content: string): boolean {
  return content.includes('<<<<<<<')
}

export interface HunkLineSelection {
  ours: boolean[]
  theirs: boolean[]
}

export function defaultLineSelection(hunk: ConflictHunk): HunkLineSelection {
  const oursLines = hunk.ours.split('\n')
  const theirsLines = hunk.theirs.split('\n')
  return {
    ours: oursLines.map(() => true),
    theirs: theirsLines.map(() => false)
  }
}

export function buildResolutionFromLineSelection(
  hunk: ConflictHunk,
  selection: HunkLineSelection
): string {
  const oursLines = hunk.ours.split('\n')
  const theirsLines = hunk.theirs.split('\n')
  const picked: string[] = []

  for (let i = 0; i < oursLines.length; i++) {
    if (selection.ours[i]) picked.push(oursLines[i] ?? '')
  }
  for (let i = 0; i < theirsLines.length; i++) {
    if (selection.theirs[i]) picked.push(theirsLines[i] ?? '')
  }

  return picked.join('\n')
}

export function lineSelectionFromResolution(
  hunk: ConflictHunk,
  resolution: string
): HunkLineSelection {
  const oursLines = hunk.ours.split('\n')
  const theirsLines = hunk.theirs.split('\n')
  const resolvedLines = resolution.split('\n')

  if (resolvedLines.length === 1 && resolvedLines[0] === hunk.ours) {
    return { ours: oursLines.map(() => true), theirs: theirsLines.map(() => false) }
  }
  if (resolvedLines.length === 1 && resolvedLines[0] === hunk.theirs) {
    return { ours: oursLines.map(() => false), theirs: theirsLines.map(() => true) }
  }

  const ours = oursLines.map((line) => resolvedLines.includes(line))
  const theirs = theirsLines.map((line) => resolvedLines.includes(line))
  return { ours, theirs }
}

export function initLineSelections(hunks: ConflictHunk[]): Map<number, HunkLineSelection> {
  const map = new Map<number, HunkLineSelection>()
  for (const hunk of hunks) {
    map.set(hunk.id, defaultLineSelection(hunk))
  }
  return map
}

export function resolutionsFromLineSelections(
  hunks: ConflictHunk[],
  selections: Map<number, HunkLineSelection>
): Map<number, string> {
  const resolutions = new Map<number, string>()
  for (const hunk of hunks) {
    const selection = selections.get(hunk.id) ?? defaultLineSelection(hunk)
    resolutions.set(hunk.id, buildResolutionFromLineSelection(hunk, selection))
  }
  return resolutions
}

export type OutputLineSource = 'ours' | 'theirs' | 'context'

export interface OutputLine {
  text: string
  source: OutputLineSource
}

export function buildResolutionLinesWithSources(
  hunk: ConflictHunk,
  selection: HunkLineSelection
): OutputLine[] {
  const oursLines = hunk.ours.split('\n')
  const theirsLines = hunk.theirs.split('\n')
  const lines: OutputLine[] = []

  for (let i = 0; i < oursLines.length; i++) {
    if (selection.ours[i]) {
      lines.push({ text: oursLines[i] ?? '', source: 'ours' })
    }
  }
  for (let i = 0; i < theirsLines.length; i++) {
    if (selection.theirs[i]) {
      lines.push({ text: theirsLines[i] ?? '', source: 'theirs' })
    }
  }

  return lines
}

export function buildOutputLinesWithSources(
  markerContent: string,
  hunks: ConflictHunk[],
  selections: Map<number, HunkLineSelection>
): OutputLine[] {
  const lines = markerContent.split('\n')
  const output: OutputLine[] = []
  let i = 0
  let hunkId = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (!line.startsWith('<<<<<<<')) {
      output.push({ text: line, source: 'context' })
      i++
      continue
    }

    while (i < lines.length && !lines[i]!.startsWith('>>>>>>>')) {
      i++
    }
    if (i < lines.length) i++

    const hunk = hunks[hunkId]
    if (hunk) {
      const selection = selections.get(hunk.id) ?? defaultLineSelection(hunk)
      output.push(...buildResolutionLinesWithSources(hunk, selection))
    }
    hunkId++
  }

  return output
}

export function outputTextFromLines(lines: OutputLine[]): string {
  return lines.map((line) => line.text).join('\n')
}
