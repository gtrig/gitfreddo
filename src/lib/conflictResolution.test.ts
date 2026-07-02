import { describe, expect, it } from 'vitest'
import type { ConflictHunk } from '@/lib/conflictMarkers'
import {
  buildPreviewLines,
  initHunkEditModes,
  initResolvedTexts,
  proposalsMapFromList,
  resolvedTextsFromProposals,
  syncCheckboxFromResolvedText
} from '@/lib/conflictResolution'
import { initLineSelections } from '@/lib/threeWayMerge'

const hunks: ConflictHunk[] = [
  {
    id: 0,
    oursLabel: 'HEAD',
    theirsLabel: 'feature',
    ours: 'ours line',
    theirs: 'theirs line',
    resolved: 'ours line\ntheirs line'
  }
]

describe('conflictResolution', () => {
  it('initializes resolved text from default selections', () => {
    const selections = initLineSelections(hunks)
    const resolved = initResolvedTexts(hunks, selections)
    expect(resolved.get(0)).toBe('ours line')
  })

  it('syncs checkbox state from resolved text', () => {
    const selection = syncCheckboxFromResolvedText(hunks[0]!, 'theirs line')
    expect(selection.ours).toEqual([false])
    expect(selection.theirs).toEqual([true])
  })

  it('builds maps from AI proposals', () => {
    const proposals = [
      { hunkId: 0, text: 'merged', analysis: 'combined', confidence: 88 }
    ]
    expect(resolvedTextsFromProposals(proposals).get(0)).toBe('merged')
    expect(proposalsMapFromList(proposals).get(0)?.confidence).toBe(88)
  })

  it('initializes edit modes as checkbox', () => {
    const modes = initHunkEditModes(hunks)
    expect(modes.get(0)).toBe('checkbox')
  })

  it('builds preview lines with active hunk highlight', () => {
    const markerContent = [
      'before',
      '<<<<<<< HEAD',
      'ours line',
      '=======',
      'theirs line',
      '>>>>>>> feature',
      'after'
    ].join('\n')
    const resolved = new Map([[0, 'merged']])
    const preview = buildPreviewLines(markerContent, hunks, resolved, 0)
    expect(preview.map((line) => line.text)).toEqual(['before', 'merged', 'after'])
    expect(preview[1]?.kind).toBe('activeHunk')
  })
})
