import { describe, expect, it } from 'vitest'
import { applyConflictResolutions, parseConflictMarkers } from '@/lib/conflicts/conflictMarkers'

describe('parseConflictMarkers', () => {
  it('parses a single conflict hunk', () => {
    const content = [
      'before',
      '<<<<<<< HEAD',
      'ours line',
      '=======',
      'theirs line',
      '>>>>>>> feature',
      'after'
    ].join('\n')

    const hunks = parseConflictMarkers(content)
    expect(hunks).toHaveLength(1)
    expect(hunks[0]?.ours).toBe('ours line')
    expect(hunks[0]?.theirs).toBe('theirs line')
  })
})

describe('applyConflictResolutions', () => {
  it('replaces conflict markers with resolved content', () => {
    const content = [
      'keep',
      '<<<<<<< HEAD',
      'ours',
      '=======',
      'theirs',
      '>>>>>>> branch',
      'tail'
    ].join('\n')

    const result = applyConflictResolutions(content, new Map([[0, 'resolved']]))
    expect(result).toBe(['keep', 'resolved', 'tail'].join('\n'))
  })
})
