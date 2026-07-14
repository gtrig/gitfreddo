import { describe, expect, it } from 'vitest'
import { buildBranchOptions, buildPrSeed } from './prForm'

describe('buildPrSeed', () => {
  it('returns undefined for empty fields', () => {
    expect(buildPrSeed('', '')).toBeUndefined()
  })

  it('formats title and body', () => {
    expect(buildPrSeed('Hello', 'World')).toBe('Title: Hello\n\nDescription:\nWorld')
  })
})

describe('buildBranchOptions', () => {
  it('lists local branches and injects preferred when missing', () => {
    expect(
      buildBranchOptions(
        [
          { name: 'main', isRemote: false },
          { name: 'origin/main', isRemote: true },
          { name: 'feat', isRemote: false }
        ],
        'hotfix'
      )
    ).toEqual(['hotfix', 'feat', 'main'])
  })
})
