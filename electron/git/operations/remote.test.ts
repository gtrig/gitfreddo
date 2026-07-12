import { execFileSync } from 'child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchRemote,
  pullRemote,
  remoteAdd,
  remoteList,
  remoteNameFromUpstream,
  remoteRemove,
  remoteRename,
  remoteSetUrl,
  parseRemoteVerboseOutput,
  pushRemote,
  resolveRemoteName
} from './remote'
import * as gitRunner from '../git-runner'
import { runGitOrThrow } from '../git-runner'

describe('resolveRemoteName', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the requested remote when it exists', async () => {
    const spy = vi.spyOn(gitRunner, 'runGitOrThrow').mockImplementation(async (args) => {
      if (args[0] === 'remote' && args[1] === '-v') {
        return 'origin\thttps://github.com/org/repo.git (fetch)\n'
      }
      return ''
    })

    await expect(resolveRemoteName('/tmp/repo', 'git', 'origin')).resolves.toBe('origin')
    expect(spy).toHaveBeenCalled()
  })

  it('falls back to the upstream remote', async () => {
    const spy = vi.spyOn(gitRunner, 'runGitOrThrow').mockImplementation(async (args) => {
      if (args[0] === 'remote' && args[1] === '-v') {
        return [
          'origin\thttps://github.com/org/repo.git (fetch)',
          'upstream\thttps://github.com/org/fork.git (fetch)'
        ].join('\n')
      }
      if (args[0] === 'rev-parse' && args[1] === '--abbrev-ref') {
        return 'upstream/main'
      }
      return ''
    })

    await expect(resolveRemoteName('/tmp/repo', 'git')).resolves.toBe('upstream')
    expect(spy).toHaveBeenCalled()
  })

  it('uses the only configured remote when no upstream exists', async () => {
    vi.spyOn(gitRunner, 'runGitOrThrow').mockImplementation(async (args) => {
      if (args[0] === 'remote' && args[1] === '-v') {
        return 'origin\thttps://github.com/org/repo.git (fetch)\n'
      }
      if (args[0] === 'rev-parse' && args[1] === '--abbrev-ref') {
        throw new Error('no upstream')
      }
      return ''
    })

    await expect(resolveRemoteName('/tmp/repo', 'git')).resolves.toBe('origin')
  })

  it('throws when the requested remote is missing and multiple remotes exist', async () => {
    vi.spyOn(gitRunner, 'runGitOrThrow').mockImplementation(async (args) => {
      if (args[0] === 'remote' && args[1] === '-v') {
        return [
          'origin\thttps://github.com/org/repo.git (fetch)',
          'upstream\thttps://github.com/org/fork.git (fetch)'
        ].join('\n')
      }
      throw new Error('no upstream')
    })

    await expect(resolveRemoteName('/tmp/repo', 'git', 'missing')).rejects.toThrow(
      /not configured/i
    )
  })

  it('throws when no remote is configured', async () => {
    vi.spyOn(gitRunner, 'runGitOrThrow').mockResolvedValue('')

    await expect(resolveRemoteName('/tmp/repo', 'git')).rejects.toThrow(/no remote configured/i)
  })
})

describe('remoteList and remote management', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  it('lists, renames, updates, and removes remotes', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-remote-mgmt-'))
    const run = (args: string[]) => runGitOrThrow(args, { cwd: tempDir!, gitBinaryPath: 'git' })

    await run(['init', '-b', 'main'])
    await remoteAdd(tempDir, 'git', 'origin', 'https://example.com/a.git')
    expect(await remoteList(tempDir, 'git')).toEqual([
      expect.objectContaining({ name: 'origin', url: 'https://example.com/a.git' })
    ])

    await remoteSetUrl(tempDir, 'git', 'origin', 'https://example.com/b.git', true)
    await remoteRename(tempDir, 'git', 'origin', 'backup')
    expect((await remoteList(tempDir, 'git'))[0]?.name).toBe('backup')

    await remoteRemove(tempDir, 'git', 'backup')
    expect(await remoteList(tempDir, 'git')).toEqual([])
  })
})

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

  it('pushes all branches when pushAll is requested', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-push-all-'))
    bareRemote = mkdtempSync(join(tmpdir(), 'gitfreddo-push-all-bare-'))
    const run = (cwd: string, args: string[]) =>
      runGitOrThrow(args, { cwd, gitBinaryPath: 'git' })

    execFileSync('git', ['init', '--bare', bareRemote])
    await run(tempDir, ['init', '-b', 'main'])
    await run(tempDir, ['config', 'user.email', 'test@example.com'])
    await run(tempDir, ['config', 'user.name', 'Test'])
    await run(tempDir, ['remote', 'add', 'origin', bareRemote])
    writeFileSync(join(tempDir, 'README.md'), '# push all\n')
    await run(tempDir, ['add', 'README.md'])
    await run(tempDir, ['commit', '-m', 'initial'])
    await run(tempDir, ['branch', 'feature'])
    await pushRemote(tempDir, 'git', 'origin', undefined, false, false, true)

    const remoteBranches = (await run(bareRemote, ['branch', '--list']))
      .trim()
      .split('\n')
      .map((branch) => branch.trim())
    expect(remoteBranches).toEqual(expect.arrayContaining(['main', 'feature']))
  })

  it('rejects push from detached HEAD', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-push-detached-'))
    bareRemote = mkdtempSync(join(tmpdir(), 'gitfreddo-push-detached-bare-'))
    const run = (cwd: string, args: string[]) =>
      runGitOrThrow(args, { cwd, gitBinaryPath: 'git' })

    execFileSync('git', ['init', '--bare', bareRemote])
    await run(tempDir, ['init', '-b', 'main'])
    await run(tempDir, ['config', 'user.email', 'test@example.com'])
    await run(tempDir, ['config', 'user.name', 'Test'])
    await run(tempDir, ['remote', 'add', 'origin', bareRemote])
    writeFileSync(join(tempDir, 'README.md'), '# detached\n')
    await run(tempDir, ['add', 'README.md'])
    await run(tempDir, ['commit', '-m', 'initial'])
    const head = (await run(tempDir, ['rev-parse', 'HEAD'])).trim()
    await run(tempDir, ['checkout', '--detach', head])

    await expect(pushRemote(tempDir, 'git', 'origin', 'main')).rejects.toThrow(/detached HEAD/i)
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

  it('handles fetch-only and push-only remotes', () => {
    const stdout = [
      'origin\thttps://github.com/org/repo.git (fetch)',
      'push-only\thttps://push.example.com/repo.git (push)',
      'fetch-only\thttps://fetch.example.com/repo.git (fetch)'
    ].join('\n')

    expect(parseRemoteVerboseOutput(stdout)).toEqual([
      {
        name: 'origin',
        url: 'https://github.com/org/repo.git',
        fetch: 'https://github.com/org/repo.git',
        push: ''
      },
      {
        name: 'push-only',
        url: 'https://push.example.com/repo.git',
        fetch: '',
        push: 'https://push.example.com/repo.git'
      },
      {
        name: 'fetch-only',
        url: 'https://fetch.example.com/repo.git',
        fetch: 'https://fetch.example.com/repo.git',
        push: ''
      }
    ])
  })

  it('ignores malformed lines without a remote name or url', () => {
    const stdout = ['', '   ', 'origin\thttps://github.com/org/repo.git (fetch)'].join('\n')

    expect(parseRemoteVerboseOutput(stdout)).toEqual([
      {
        name: 'origin',
        url: 'https://github.com/org/repo.git',
        fetch: 'https://github.com/org/repo.git',
        push: ''
      }
    ])
  })
})

describe('fetchRemote', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves the remote and runs git fetch', async () => {
    const spy = vi.spyOn(gitRunner, 'runGitOrThrow').mockImplementation(async (args) => {
      if (args[0] === 'remote' && args[1] === '-v') {
        return 'origin\thttps://github.com/org/repo.git (fetch)\n'
      }
      return ''
    })

    await fetchRemote('/tmp/repo', 'git', { remote: 'origin', tags: true })

    expect(spy).toHaveBeenCalledWith(
      expect.arrayContaining(['fetch', 'origin', '--tags']),
      expect.objectContaining({ cwd: '/tmp/repo', gitBinaryPath: 'git' })
    )
  })

  it('uses an explicit remote name without resolving upstream', async () => {
    const spy = vi.spyOn(gitRunner, 'runGitOrThrow').mockImplementation(async (args) => {
      if (args[0] === 'fetch') return ''
      throw new Error(`unexpected: ${args.join(' ')}`)
    })

    await fetchRemote('/tmp/repo', 'git', { remote: 'upstream', tagsOnly: true, refspec: 'refs/heads/main' })

    expect(spy).toHaveBeenCalledWith(
      expect.arrayContaining(['fetch', 'upstream']),
      expect.objectContaining({ cwd: '/tmp/repo', gitBinaryPath: 'git' })
    )
  })
})

describe('pullRemote', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves the remote and runs git pull with rebase', async () => {
    const spy = vi.spyOn(gitRunner, 'runGitOrThrow').mockImplementation(async (args) => {
      if (args[0] === 'remote' && args[1] === '-v') {
        return 'origin\thttps://github.com/org/repo.git (fetch)\n'
      }
      return ''
    })

    await pullRemote('/tmp/repo', 'git', 'origin', 'main', true)

    expect(spy).toHaveBeenCalledWith(
      expect.arrayContaining(['pull', '--rebase', 'origin', 'main']),
      expect.objectContaining({ cwd: '/tmp/repo', gitBinaryPath: 'git' })
    )
  })

  it('pulls without rebase when requested', async () => {
    const spy = vi.spyOn(gitRunner, 'runGitOrThrow').mockImplementation(async (args) => {
      if (args[0] === 'remote' && args[1] === '-v') {
        return 'origin\thttps://github.com/org/repo.git (fetch)\n'
      }
      return ''
    })

    await pullRemote('/tmp/repo', 'git', 'origin', 'main', false)

    expect(spy).toHaveBeenCalledWith(
      expect.arrayContaining(['pull', 'origin', 'main']),
      expect.objectContaining({ cwd: '/tmp/repo', gitBinaryPath: 'git' })
    )
    const pullCall = spy.mock.calls.find((call) => call[0]?.[0] === 'pull')
    expect(pullCall?.[0]).not.toContain('--rebase')
  })
})
