import { describe, expect, it } from 'vitest'
import { formatLineNo } from './formatLineNo'

describe('formatLineNo', () => {
  it('stringifies line numbers and blanks nulls', () => {
    expect(formatLineNo(12)).toBe('12')
    expect(formatLineNo(null)).toBe('')
  })
})
