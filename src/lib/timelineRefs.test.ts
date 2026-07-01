import { describe, expect, it } from 'vitest'
import { primaryTimelineRef, splitTimelineRefs, timelineRefs } from './timelineRefs'

describe('timelineRefs', () => {
  it('unwraps HEAD to the checked-out branch', () => {
    expect(timelineRefs(['HEAD -> main'])).toEqual([
      { label: 'main', kind: 'branch', fullRef: 'main', sourceOrder: 0 }
    ])
  })

  it('hides symbolic remote HEAD refs', () => {
    expect(timelineRefs(['HEAD -> main', 'gitfreddo/develop', 'gitfreddo/HEAD'])).toEqual([
      { label: 'main', kind: 'branch', fullRef: 'main', sourceOrder: 0 },
      { label: 'gitfreddo/develop', kind: 'remote', fullRef: 'gitfreddo/develop', sourceOrder: 1 }
    ])
  })

  it('hides bare HEAD refs', () => {
    expect(timelineRefs(['HEAD', 'main'])).toEqual([
      { label: 'main', kind: 'branch', fullRef: 'main', sourceOrder: 1 }
    ])
  })

  it('hides stash refs', () => {
    expect(timelineRefs(['stash', 'main'])).toEqual([
      { label: 'main', kind: 'branch', fullRef: 'main', sourceOrder: 1 }
    ])
    expect(timelineRefs(['refs/stash', 'develop'])).toEqual([
      { label: 'develop', kind: 'branch', fullRef: 'develop', sourceOrder: 1 }
    ])
    expect(timelineRefs(['stash@{0}', 'main'])).toEqual([
      { label: 'main', kind: 'branch', fullRef: 'main', sourceOrder: 1 }
    ])
  })

  it('classifies tags from git log decorations', () => {
    expect(timelineRefs(['tag: v1.0.0', 'main'])).toEqual([
      { label: 'v1.0.0', kind: 'tag', fullRef: 'v1.0.0', sourceOrder: 0 },
      { label: 'main', kind: 'branch', fullRef: 'main', sourceOrder: 1 }
    ])
  })

  it('prefers local branch over remote with the same short name', () => {
    expect(timelineRefs(['main', 'origin/main'])).toEqual([
      { label: 'main', kind: 'branch', fullRef: 'main', sourceOrder: 0 }
    ])
  })

  it('classifies remote tags from the tag list', () => {
    const tagNames = new Set(['origin/v1.0.0'])
    expect(timelineRefs(['origin/v1.0.0'], tagNames)).toEqual([
      { label: 'origin/v1.0.0', kind: 'tag', fullRef: 'origin/v1.0.0', sourceOrder: 0 }
    ])
  })

  it('keeps branch and tag refs that share the same label', () => {
    expect(timelineRefs(['tag: v1.0.0', 'v1.0.0'])).toEqual([
      { label: 'v1.0.0', kind: 'tag', fullRef: 'v1.0.0', sourceOrder: 0 },
      { label: 'v1.0.0', kind: 'branch', fullRef: 'v1.0.0', sourceOrder: 1 }
    ])
  })

  it('parses refs/tags/ decorations', () => {
    expect(timelineRefs(['refs/tags/v1.0.0'])).toEqual([
      { label: 'v1.0.0', kind: 'tag', fullRef: 'v1.0.0', sourceOrder: 0 }
    ])
  })
})

describe('primaryTimelineRef', () => {
  it('returns the ref with the highest source order', () => {
    const refs = timelineRefs(['tag: v1.0.0', 'main', 'origin/develop'])
    expect(primaryTimelineRef(refs)?.label).toBe('origin/develop')
  })
})

describe('splitTimelineRefs', () => {
  it('splits the latest ref from the rest', () => {
    const refs = timelineRefs(['tag: v1.0.0', 'main', 'origin/develop'])
    expect(splitTimelineRefs(refs)).toEqual({
      primary: {
        label: 'origin/develop',
        kind: 'remote',
        fullRef: 'origin/develop',
        sourceOrder: 2
      },
      rest: [
        { label: 'v1.0.0', kind: 'tag', fullRef: 'v1.0.0', sourceOrder: 0 },
        { label: 'main', kind: 'branch', fullRef: 'main', sourceOrder: 1 }
      ]
    })
  })
})
