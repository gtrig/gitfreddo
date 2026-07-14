import { describe, expect, it } from 'vitest'
import { parseHashInput } from './parseHashInput'

describe('parseHashInput', () => {
  it('extracts valid hashes from mixed input', () => {
    expect(parseHashInput('abc1234, DEF5678 deadbeef\nnot-hash')).toEqual([
      'abc1234',
      'def5678',
      'deadbeef'
    ])
  })
})
