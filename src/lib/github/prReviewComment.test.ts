import { describe, expect, it } from 'vitest'
import { lineCommentTargetForDiffRow } from './prReviewComment'

describe('prReviewComment', () => {
  it('maps removed lines to LEFT comments', () => {
    expect(
      lineCommentTargetForDiffRow({
        kind: 'remove',
        content: 'x',
        oldLine: 4,
        newLine: null
      })
    ).toEqual({
      side: 'LEFT',
      line: 4
    })
  })

  it('maps added lines to RIGHT comments', () => {
    expect(
      lineCommentTargetForDiffRow({
        kind: 'add',
        content: 'x',
        oldLine: null,
        newLine: 9
      })
    ).toEqual({
      side: 'RIGHT',
      line: 9
    })
  })
})
