import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../git-dir', () => ({
  readGitMetadataFile: vi.fn()
}))

vi.mock('../git-runner', () => ({
  runCommand: vi.fn(),
  runGitOrThrow: vi.fn()
}))

import { readGitMetadataFile } from '../git-dir'
import { runCommand, runGitOrThrow } from '../git-runner'
import {
  bisectBad,
  bisectGood,
  bisectReset,
  bisectStart,
  bisectStatus
} from './bisect'

describe('bisect operations', () => {
  beforeEach(() => {
    vi.mocked(readGitMetadataFile).mockReset()
    vi.mocked(runCommand).mockReset()
    vi.mocked(runGitOrThrow).mockReset()
  })

  it('reports inactive when BISECT_LOG is missing', async () => {
    vi.mocked(readGitMetadataFile).mockResolvedValue(undefined)

    await expect(bisectStatus('/repo', 'git')).resolves.toEqual({ active: false })
  })

  it('parses active bisect status from git output', async () => {
    vi.mocked(readGitMetadataFile).mockResolvedValue('log')
    vi.mocked(runCommand).mockResolvedValue({
      stdout: 'git bisect start\nbad abcdef0123456789\ngood 1234567890abcdef\n',
      stderr: '',
      code: 0
    })
    vi.mocked(runGitOrThrow).mockResolvedValue('fedcba0987654321\n')

    await expect(bisectStatus('/repo', 'git')).resolves.toEqual({
      active: true,
      bad: 'abcdef0123456789',
      good: '1234567890abcdef',
      current: 'fedcba0987654321'
    })
  })

  it('starts, marks good/bad, and resets bisect', async () => {
    vi.mocked(runGitOrThrow).mockResolvedValue('')

    await bisectStart('/repo', 'git', 'HEAD', 'main~5')
    await bisectGood('/repo', 'git', 'abc1234')
    await bisectBad('/repo', 'git')
    await bisectReset('/repo', 'git')

    expect(runGitOrThrow).toHaveBeenCalledTimes(4)
  })
})
