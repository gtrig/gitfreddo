import { describe, expect, it } from 'vitest'
import { parseConflictMarkers } from '@/lib/conflicts/conflictMarkers'
import {
  buildOutputFromResolutions,
  buildOutputLinesWithSources,
  outputTextFromLines,
  buildResolutionFromLineSelection,
  defaultLineSelection,
  hasUnresolvedMarkers,
  mapHunksToLineRanges,
  resolutionsFromLineSelections,
  initLineSelections
} from '@/lib/conflicts/threeWayMerge'

describe('threeWayMerge', () => {
  const sideA = '# Alpha line\nunchanged\nalpha tail'
  const sideB = '# Beta line\nunchanged\nbeta tail'
  const markerContent = [
    '# Alpha line',
    '<<<<<<< HEAD',
    '# Alpha line',
    '=======',
    '# Beta line',
    '>>>>>>> branch-beta',
    'unchanged',
    'alpha tail'
  ].join('\n')

  it('maps hunks to line ranges in side files', () => {
    const hunks = parseConflictMarkers(markerContent)
    const ranges = mapHunksToLineRanges(sideA, sideB, hunks)
    expect(ranges).toHaveLength(1)
    expect(ranges[0]?.sideA).toEqual({ start: 1, end: 1 })
    expect(ranges[0]?.sideB).toEqual({ start: 1, end: 1 })
  })

  it('builds output from resolutions', () => {
    const resolutions = new Map([[0, '# Beta line']])
    const output = buildOutputFromResolutions(markerContent, resolutions)
    expect(output).toContain('# Beta line')
    expect(output).not.toContain('<<<<<<<')
    expect(hasUnresolvedMarkers(output)).toBe(false)
  })

  it('detects unresolved markers', () => {
    expect(hasUnresolvedMarkers('<<<<<<< HEAD\n')).toBe(true)
    expect(hasUnresolvedMarkers('clean file\n')).toBe(false)
  })

  it('defaults to all ours lines selected', () => {
    const hunks = parseConflictMarkers(markerContent)
    const hunk = hunks[0]!
    const selection = defaultLineSelection(hunk)
    expect(buildResolutionFromLineSelection(hunk, selection)).toBe('# Alpha line')
  })

  it('combines selected lines from both sides', () => {
    const content = [
      'before',
      '<<<<<<< HEAD',
      'line-a',
      'line-b',
      '=======',
      'line-c',
      '>>>>>>> branch',
      'after'
    ].join('\n')
    const hunks = parseConflictMarkers(content)
    const hunk = hunks[0]!
    const selection = {
      ours: [true, false],
      theirs: [true]
    }
    expect(buildResolutionFromLineSelection(hunk, selection)).toBe('line-a\nline-c')
    const selections = initLineSelections(hunks)
    selections.set(hunk.id, selection)
    const resolutions = resolutionsFromLineSelections(hunks, selections)
    const output = buildOutputFromResolutions(content, resolutions)
    expect(output).toBe('before\nline-a\nline-c\nafter')
  })

  it('tags output lines by source', () => {
    const content = [
      'before',
      '<<<<<<< HEAD',
      'line-a',
      '=======',
      'line-b',
      '>>>>>>> branch',
      'after'
    ].join('\n')
    const hunks = parseConflictMarkers(content)
    const selections = initLineSelections(hunks)
    selections.set(hunks[0]!.id, { ours: [true], theirs: [true] })
    const lines = buildOutputLinesWithSources(content, hunks, selections)
    expect(lines).toEqual([
      { text: 'before', source: 'context' },
      { text: 'line-a', source: 'ours' },
      { text: 'line-b', source: 'theirs' },
      { text: 'after', source: 'context' }
    ])
    expect(outputTextFromLines(lines)).toBe('before\nline-a\nline-b\nafter')
  })
})
