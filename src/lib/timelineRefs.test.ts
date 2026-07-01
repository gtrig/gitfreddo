import { describe, expect, it } from 'vitest'
import { timelineRefs } from './timelineRefs'

describe('timelineRefs', () => {
  it('unwraps HEAD to the checked-out branch', () => {
    expect(timelineRefs(['HEAD -> main'])).toEqual(['main'])
  })

  it('hides symbolic remote HEAD refs', () => {
    expect(timelineRefs(['HEAD -> main', 'gitfreddo/develop', 'gitfreddo/HEAD'])).toEqual([
      'main',
      'gitfreddo/develop'
    ])
  })

  it('hides bare HEAD refs', () => {
    expect(timelineRefs(['HEAD', 'main'])).toEqual(['main'])
  })
})
