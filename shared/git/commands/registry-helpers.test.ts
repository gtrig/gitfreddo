import { describe, expect, it } from 'vitest'
import { defineCommand } from './_types'
import { getGitCommand, allGitCommandIds } from './registry'
import { buildDiffConflictNamesArgs } from './status'
import { buildRebaseInteractiveArgs } from './merge-rebase'
import { parseLogGraphOutput } from './log'

describe('registry helpers', () => {
  it('defineCommand returns the descriptor', () => {
    const descriptor = defineCommand({
      id: 'test.echo',
      subcommand: 'echo',
      buildArgs: () => ['echo', 'hi']
    })
    expect(descriptor.buildArgs(undefined as never)).toEqual(['echo', 'hi'])
  })

  it('getGitCommand looks up by id', () => {
    expect(getGitCommand('switch.checkout')?.subcommand).toBe('switch')
    expect(getGitCommand('missing')).toBeUndefined()
    expect(allGitCommandIds()).toContain('switch.checkout')
  })

  it('builds ancillary command args', () => {
    expect(buildDiffConflictNamesArgs()).toEqual(['diff', '--name-only', '--diff-filter=U'])
    expect(buildRebaseInteractiveArgs({ root: true })).toContain('--root')
    expect(buildRebaseInteractiveArgs({ baseHash: 'abc' })).toContain('-i')
  })

  it('parseLogGraphOutput skips invalid records', () => {
    expect(parseLogGraphOutput('')).toEqual([])
    expect(parseLogGraphOutput('not-a-valid-record')).toEqual([])
  })
})
