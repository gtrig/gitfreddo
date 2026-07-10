import { describe, expect, it } from 'vitest'
import { COMMIT_DESCRIPTION_PREVIEW_CHARS, previewCommitDescription } from './textPreview'

describe('previewCommitDescription', () => {
  it('returns the full text when it is within the limit', () => {
    const text = 'Short commit body.'
    expect(previewCommitDescription(text)).toEqual({ preview: text, truncated: false })
  })

  it('truncates long text to about the default character limit', () => {
    const text = 'word '.repeat(60).trim()
    const result = previewCommitDescription(text)
    expect(result.truncated).toBe(true)
    expect(result.preview.length).toBeLessThanOrEqual(COMMIT_DESCRIPTION_PREVIEW_CHARS)
    expect(text.startsWith(result.preview)).toBe(true)
  })

  it('prefers breaking on a word boundary when possible', () => {
    const text = `${'alpha '.repeat(30)}beta gamma delta`
    const result = previewCommitDescription(text, 40)
    expect(result.truncated).toBe(true)
    expect(result.preview.endsWith(' ')).toBe(false)
    expect(result.preview.split(' ').every((word) => word.length > 0)).toBe(true)
  })
})
