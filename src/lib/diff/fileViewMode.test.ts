import { describe, expect, it } from 'vitest'
import {
  defaultFileContentViewMode,
  fileContentViewModeLabel
} from '@/lib/diff/fileViewMode'

describe('fileContentViewModeLabel', () => {
  const t = (key: string) =>
    ({
      'diff.sideBySide': 'Side by side',
      'diff.fullFile': 'Full file'
    })[key] ?? key

  it('maps split and full to translated labels', () => {
    expect(fileContentViewModeLabel('split', t)).toBe('Side by side')
    expect(fileContentViewModeLabel('full', t)).toBe('Full file')
    expect(fileContentViewModeLabel('unified', t)).toBe('unified')
  })
})

describe('defaultFileContentViewMode', () => {
  it('uses split when preferred, otherwise unified', () => {
    expect(defaultFileContentViewMode('split')).toBe('split')
    expect(defaultFileContentViewMode('unified')).toBe('unified')
    expect(defaultFileContentViewMode('word')).toBe('unified')
    expect(defaultFileContentViewMode(undefined)).toBe('unified')
  })
})
