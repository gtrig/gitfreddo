import { describe, expect, it } from 'vitest'
import { buildSquashMergeIntoMessage } from './squashMergeInto'

describe('buildSquashMergeIntoMessage', () => {
  it('builds a default squash-merge commit message', () => {
    expect(buildSquashMergeIntoMessage('feature/login')).toBe(
      "Squashed commit from branch 'feature/login'"
    )
  })
})
