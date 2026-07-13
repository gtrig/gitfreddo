import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { parseEditorCommand, resolveOpenInEditorAction, openInEditor } from './open-in-editor'

const spawnMock = vi.fn()
const openPathMock = vi.fn()

vi.mock('child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args)
}))

vi.mock('electron', () => ({
  shell: { openPath: (...args: unknown[]) => openPathMock(...args) }
}))

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

  it('supports single-quoted tokens and escaped double quotes', () => {
    expect(parseEditorCommand("'My Editor' --wait")).toEqual(['My Editor', '--wait'])
    expect(parseEditorCommand('"line one" --wait')).toEqual(['line one', '--wait'])
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

describe('openInEditor', () => {
  it('opens the file with the system default editor', async () => {
    openPathMock.mockResolvedValue('')
    await openInEditor('', '/repo/src/app.ts')
    expect(openPathMock).toHaveBeenCalledWith('/repo/src/app.ts')
  })

  it('throws when the system default editor fails', async () => {
    openPathMock.mockResolvedValue('Failed to open path')
    await expect(openInEditor('', '/repo/src/app.ts')).rejects.toThrow(/Failed to open path/)
  })

  it('spawns a configured editor command', async () => {
    const child = new EventEmitter() as EventEmitter & { unref: ReturnType<typeof vi.fn> }
    child.unref = vi.fn()
    spawnMock.mockReturnValue(child)

    await openInEditor('code --wait', '/repo/src/app.ts')

    expect(spawnMock).toHaveBeenCalledWith(
      'code',
      ['--wait', '/repo/src/app.ts'],
      expect.objectContaining({ detached: true, stdio: 'ignore' })
    )
    expect(child.unref).toHaveBeenCalled()
  })
})
