import { buildOutputFromResolutions } from '@/lib/conflicts/threeWayMerge'

export interface ConflictHunk {
  id: number
  oursLabel: string
  theirsLabel: string
  ours: string
  theirs: string
  resolved: string
}

export function parseConflictMarkers(content: string): ConflictHunk[] {
  const lines = content.split('\n')
  const hunks: ConflictHunk[] = []
  let i = 0
  let hunkId = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (!line.startsWith('<<<<<<<')) {
      i++
      continue
    }

    const oursLabel = line.slice('<<<<<<<'.length).trim() || 'ours'
    i++
    const oursLines: string[] = []

    while (i < lines.length && !lines[i]!.startsWith('=======')) {
      oursLines.push(lines[i] ?? '')
      i++
    }

    if (i >= lines.length) break
    i++
    const theirsLines: string[] = []

    while (i < lines.length && !lines[i]!.startsWith('>>>>>>>')) {
      theirsLines.push(lines[i] ?? '')
      i++
    }

    if (i >= lines.length) break
    const theirsLabel = (lines[i] ?? '').slice('>>>>>>>'.length).trim() || 'theirs'
    i++

    const ours = oursLines.join('\n')
    const theirs = theirsLines.join('\n')
    hunks.push({
      id: hunkId++,
      oursLabel,
      theirsLabel,
      ours,
      theirs,
      resolved: `${ours}\n${theirs}`.trim()
    })
  }

  return hunks
}

export function applyConflictResolutions(
  content: string,
  resolutions: Map<number, string>
): string {
  return buildOutputFromResolutions(content, resolutions)
}
