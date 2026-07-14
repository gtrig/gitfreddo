import { describe, expect, it } from 'vitest'
import { parseLines, toGitOptions } from './helpers'

describe('toGitOptions', () => {
  it('maps ctx to RunGitOptions', () => {
    expect(toGitOptions({ cwd: '/repo', gitBinaryPath: 'git' })).toEqual({
      cwd: '/repo',
      gitBinaryPath: 'git'
    })
  })
})

describe('parseLines', () => {
  it('returns empty array for blank stdout', () => {
    expect(parseLines('', (line) => line)).toEqual([])
    expect(parseLines('   \n', () => null)).toEqual([])
  })

  it('maps and filters lines', () => {
    expect(
      parseLines('a\n\nb\nskip\nc', (line) => (line === 'skip' || !line ? null : line.toUpperCase()))
    ).toEqual(['A', 'B', 'C'])
  })
})
