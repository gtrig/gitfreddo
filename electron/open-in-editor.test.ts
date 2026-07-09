import { describe, expect, it } from 'vitest'
import { parseEditorCommand, resolveOpenInEditorAction } from './open-in-editor'

describe('parseEditorCommand', () => {
  it('splits on whitespace', () => {
    expect(parseEditorCommand('code --wait')).toEqual(['code', '--wait'])
  })

  it('supports double-quoted tokens', () => {
    expect(parseEditorCommand('"/usr/bin/My Editor" --wait')).toEqual([
      '/usr/bin/My Editor',
      '--wait'
    ])
  })

  it('returns empty array for blank input', () => {
    expect(parseEditorCommand('   ')).toEqual([])
  })
})

describe('resolveOpenInEditorAction', () => {
  it('uses the system default when editor command is unset', () => {
    expect(resolveOpenInEditorAction('', '/repo/src/app.ts')).toEqual({
      type: 'default',
      filePath: '/repo/src/app.ts'
    })
  })

  it('spawns the configured editor with the file path appended', () => {
    expect(resolveOpenInEditorAction('code --wait', '/repo/src/app.ts')).toEqual({
      type: 'command',
      command: 'code',
      args: ['--wait', '/repo/src/app.ts']
    })
  })

  it('treats whitespace-only editor command as unset', () => {
    expect(resolveOpenInEditorAction('  ', '/repo/src/app.ts')).toEqual({
      type: 'default',
      filePath: '/repo/src/app.ts'
    })
  })
})
