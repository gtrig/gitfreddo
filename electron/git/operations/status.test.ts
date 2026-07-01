import { describe, expect, it } from 'vitest'
import { parseCleanPreviewOutput } from './status'

describe('parseCleanPreviewOutput', () => {
  it('parses would-remove lines', () => {
    const output = [
      'Would remove temp.txt',
      'Would remove build/output.log',
      ''
    ].join('\n')

    expect(parseCleanPreviewOutput(output)).toEqual(['temp.txt', 'build/output.log'])
  })

  it('returns empty array for empty output', () => {
    expect(parseCleanPreviewOutput('')).toEqual([])
    expect(parseCleanPreviewOutput('\n\n')).toEqual([])
  })
})
