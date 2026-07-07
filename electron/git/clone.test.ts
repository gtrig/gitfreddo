import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildCloneArgs } from '../../shared/git/commands'

vi.mock('./git-runner', () => ({
  runGitOrThrow: vi.fn()
}))

import { runGitOrThrow } from './git-runner'
import { cloneRepository } from './clone'

describe('cloneRepository', () => {
  beforeEach(() => {
    vi.mocked(runGitOrThrow).mockReset()
    vi.mocked(runGitOrThrow).mockResolvedValue('')
  })

  it('clones with catalog args into a new folder', async () => {
    const parentDir = await mkdtemp(join(tmpdir(), 'gitfreddo-clone-'))
    try {
      const target = await cloneRepository('https://example.com/foo.git', parentDir)
      const expectedPath = join(parentDir, 'foo')

      expect(target).toBe(expectedPath)
      expect(runGitOrThrow).toHaveBeenCalledWith(
        buildCloneArgs({
          url: 'https://example.com/foo.git',
          targetPath: expectedPath,
          submoduleRecursion: 'on-demand'
        }),
        expect.objectContaining({ cwd: parentDir, gitBinaryPath: 'git' })
      )
    } finally {
      await rm(parentDir, { recursive: true, force: true })
    }
  })

  it('rejects empty URLs', async () => {
    await expect(cloneRepository('  ', '/tmp')).rejects.toThrow('Repository URL is required')
  })
})
