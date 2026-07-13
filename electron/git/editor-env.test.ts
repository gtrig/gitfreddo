import { describe, expect, it } from 'vitest'
import { buildGitNodeEditorCommand, quoteGitEditorPath } from './editor-env'

describe('editor-env', () => {
  it('quotes paths with spaces', () => {
    expect(quoteGitEditorPath('C:/Program Files/node.exe')).toBe('"C:/Program Files/node.exe"')
  })

  it('normalizes backslashes without quoting simple paths', () => {
    expect(quoteGitEditorPath('C:\\Users\\runner\\seq-editor.mjs')).toBe(
      'C:/Users/runner/seq-editor.mjs'
    )
  })

  it('builds a node editor command with quoted binaries and scripts', () => {
    expect(
      buildGitNodeEditorCommand(
        'C:/Users/runner/AppData/Local/Temp/seq-editor.mjs',
        'C:/Program Files/nodejs/node.exe'
      )
    ).toBe('"C:/Program Files/nodejs/node.exe" C:/Users/runner/AppData/Local/Temp/seq-editor.mjs')
  })
})
