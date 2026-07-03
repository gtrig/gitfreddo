import { describe, expect, it } from 'vitest'
import { primaryTimelineRef, splitTimelineRefs, timelineRefs } from '@/lib/timeline/timelineRefs'

describe('timelineRefs', () => {
  const gitfreddoRemotes = new Set(['gitfreddo'])
  const originRemotes = new Set(['origin'])

  it('unwraps HEAD to the checked-out branch', () => {
    expect(timelineRefs(['HEAD -> main'])).toEqual([
      { label: 'main', kind: 'branch', fullRef: 'main', sourceOrder: 0 }
    ])
  })

  it('hides symbolic remote HEAD refs', () => {
    expect(timelineRefs(['HEAD -> main', 'gitfreddo/develop', 'gitfreddo/HEAD'], undefined, gitfreddoRemotes)).toEqual([
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
    expect(timelineRefs(['main', 'origin/main'], undefined, originRemotes)).toEqual([
      { label: 'main', kind: 'branch', fullRef: 'main', sourceOrder: 0 }
    ])
  })

  it('keeps slash-containing local branches as local branches', () => {
    expect(timelineRefs(['feature/uptime'], undefined, originRemotes)).toEqual([
      { label: 'feature/uptime', kind: 'branch', fullRef: 'feature/uptime', sourceOrder: 0 }
    ])
    expect(timelineRefs(['HEAD -> feature/uptime', 'feature/uptime'], undefined, originRemotes)).toEqual([
      { label: 'feature/uptime', kind: 'branch', fullRef: 'feature/uptime', sourceOrder: 1 }
    ])
  })

  it('classifies remote-tracking refs using configured remote names', () => {
    expect(timelineRefs(['origin/feature/uptime'], undefined, originRemotes)).toEqual([
      {
        label: 'origin/feature/uptime',
        kind: 'remote',
        fullRef: 'origin/feature/uptime',
        sourceOrder: 0
      }
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
    const refs = timelineRefs(['tag: v1.0.0', 'main', 'origin/develop'], undefined, new Set(['origin']))
    expect(primaryTimelineRef(refs)?.label).toBe('origin/develop')
  })
})

describe('splitTimelineRefs', () => {
  it('splits the latest ref from the rest', () => {
    const refs = timelineRefs(['tag: v1.0.0', 'main', 'origin/develop'], undefined, new Set(['origin']))
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
