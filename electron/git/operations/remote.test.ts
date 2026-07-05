import { execFileSync } from 'child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { remoteNameFromUpstream, parseRemoteVerboseOutput, pushRemote } from './remote'
import { runGitOrThrow } from '../git-runner'

describe('pushRemote', () => {
  let tempDir: string | null = null
  let bareRemote: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
    if (bareRemote) {
      rmSync(bareRemote, { recursive: true, force: true })
      bareRemote = null
    }
  })

  it('pushes an ahead commit to a bare remote', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-push-'))
    bareRemote = mkdtempSync(join(tmpdir(), 'gitfreddo-bare-'))
    const run = (cwd: string, args: string[]) =>
      runGitOrThrow(args, { cwd, gitBinaryPath: 'git' })

    execFileSync('git', ['init', '--bare', bareRemote])
    await run(tempDir, ['init', '-b', 'main'])
    await run(tempDir, ['config', 'user.email', 'test@example.com'])
    await run(tempDir, ['config', 'user.name', 'Test'])
    await run(tempDir, ['remote', 'add', 'origin', bareRemote])
    writeFileSync(join(tempDir, 'README.md'), '# push test\n')
    await run(tempDir, ['add', 'README.md'])
    await run(tempDir, ['commit', '-m', 'initial'])
    await pushRemote(tempDir, 'git', 'origin', 'main', true)

    const remoteHead = (
      await run(bareRemote, ['rev-parse', 'main'])
    ).trim()
    const localHead = (await run(tempDir, ['rev-parse', 'main'])).trim()
    expect(remoteHead).toBe(localHead)
  })
})

describe('remoteNameFromUpstream', () => {
  it('extracts the remote name from an upstream ref', () => {
    expect(remoteNameFromUpstream('origin/main')).toBe('origin')
    expect(remoteNameFromUpstream('upstream')).toBe('upstream')
  })
})

describe('parseRemoteVerboseOutput', () => {
  it('merges fetch and push urls for the same remote', () => {
    const stdout = [
      'origin\thttps://github.com/org/repo.git (fetch)',
      'origin\thttps://github.com/org/repo.git (push)',
      'upstream\thttps://github.com/org/fork.git (fetch)',
      'upstream\thttps://github.com/org/fork.git (push)'
    ].join('\n')

    expect(parseRemoteVerboseOutput(stdout)).toEqual([
      {
        name: 'origin',
        url: 'https://github.com/org/repo.git',
        fetch: 'https://github.com/org/repo.git',
        push: 'https://github.com/org/repo.git'
      },
      {
        name: 'upstream',
        url: 'https://github.com/org/fork.git',
        fetch: 'https://github.com/org/fork.git',
        push: 'https://github.com/org/fork.git'
      }
    ])
  })

  it('returns an empty array for blank output', () => {
    expect(parseRemoteVerboseOutput('')).toEqual([])
  })
})
