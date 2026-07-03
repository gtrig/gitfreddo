import { describe, expect, it } from 'vitest'
import { parseCleanPreviewOutput, parsePorcelainV2Line } from './status'

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

describe('parsePorcelainV2Line', () => {
  it('parses an ordinary modified file', () => {
    const line =
      '1 M. N... 100644 100644 100644 abc def src/App.tsx'
    expect(parsePorcelainV2Line(line)).toEqual({
      path: 'src/App.tsx',
      status: 'modified'
    })
  })

  it('parses a rename with similarity score and tab-separated paths', () => {
    const line =
      '2 R. N... 100644 100644 100644 abc def R93 src/components/Branches/CheckoutRemoteModal.tsx\tsrc/components/actions/CheckoutRemoteModal.tsx'
    expect(parsePorcelainV2Line(line)).toEqual({
      path: 'src/components/Branches/CheckoutRemoteModal.tsx',
      oldPath: 'src/components/actions/CheckoutRemoteModal.tsx',
      status: 'renamed'
    })
  })

  it('parses paths that contain spaces', () => {
    const line =
      '1 M. N... 100644 100644 100644 abc def docs/my file.md'
    expect(parsePorcelainV2Line(line)).toEqual({
      path: 'docs/my file.md',
      status: 'modified'
    })
  })
})
