import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildInitArgs } from '../../shared/git/commands'

vi.mock('./git-runner', () => ({
  runGitOrThrow: vi.fn()
}))

vi.mock('./repo-path', () => ({
  hasGitDir: vi.fn(() => false)
}))

import { runGitOrThrow } from './git-runner'
import { hasGitDir } from './repo-path'
import { initRepository } from './init'

describe('initRepository', () => {
  beforeEach(() => {
    vi.mocked(runGitOrThrow).mockReset()
    vi.mocked(runGitOrThrow).mockResolvedValue('')
    vi.mocked(hasGitDir).mockReturnValue(false)
  })

  it('runs git init via catalog args', async () => {
    const parentDir = await mkdtemp(join(tmpdir(), 'gitfreddo-init-'))
    const repoPath = join(parentDir, 'new-repo')
    try {
      const result = await initRepository(repoPath)
      expect(result).toBe(repoPath)
      expect(runGitOrThrow).toHaveBeenCalledWith(buildInitArgs(), {
        cwd: repoPath,
        gitBinaryPath: 'git'
      })
    } finally {
      await rm(parentDir, { recursive: true, force: true })
    }
  })

  it('rejects when the folder is already a git repository', async () => {
    vi.mocked(hasGitDir).mockReturnValue(true)
    await expect(initRepository('/existing/repo')).rejects.toThrow(/already a git repository/i)
  })
})
