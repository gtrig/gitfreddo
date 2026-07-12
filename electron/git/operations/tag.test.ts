import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseTagLine, parseTagRef, tagCreate, tagDelete, tagList, tagPush, tagRename } from './tag'
import * as gitRunner from '../git-runner'
import { runGitOrThrow } from '../git-runner'

function initRepo(dir: string) {
  execSync('git init -b main', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.email "test@example.com"', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' })
  writeFileSync(join(dir, 'README.md'), 'initial\n')
  execSync('git add README.md', { cwd: dir, stdio: 'ignore' })
  execSync('git commit -m "initial"', { cwd: dir, stdio: 'ignore' })
}

describe('parseTagRef', () => {
  it('parses local tags', () => {
    expect(parseTagRef('refs/tags/v1.0.0')).toEqual({
      name: 'v1.0.0',
      isRemote: false
    })
  })

  it('parses remote tags', () => {
    expect(parseTagRef('refs/remotes/origin/tags/v1.0.0')).toEqual({
      name: 'origin/v1.0.0',
      isRemote: true,
      remote: 'origin'
    })
  })

  it('ignores unrelated refs', () => {
    expect(parseTagRef('refs/heads/main')).toBeNull()
  })
})

describe('parseTagLine', () => {
  const separator = '\t'

  it('parses lightweight local tags', () => {
    const line = [
      'refs/tags/v1.0.0',
      'abc1234567890abcdef1234567890abcdef123456',
      '',
      'commit',
      '2024-01-15 10:00:00 +0000',
      ''
    ].join(separator)

    expect(parseTagLine(line)).toEqual({
      name: 'v1.0.0',
      target: 'abc1234567890abcdef1234567890abcdef123456',
      message: undefined,
      isAnnotated: false,
      isRemote: false,
      remote: undefined,
      createdAt: '2024-01-15 10:00:00 +0000'
    })
  })

  it('parses annotated local tags', () => {
    const line = [
      'refs/tags/v2.0.0',
      'tagobject1234567890abcdef1234567890abcd',
      'abc1234567890abcdef1234567890abcdef123456',
      'tag',
      '2024-02-01 12:00:00 +0000',
      'Release v2.0.0'
    ].join(separator)

    expect(parseTagLine(line)).toEqual({
      name: 'v2.0.0',
      target: 'abc1234567890abcdef1234567890abcdef123456',
      message: 'Release v2.0.0',
      isAnnotated: true,
      isRemote: false,
      remote: undefined,
      createdAt: '2024-02-01 12:00:00 +0000'
    })
  })

  it('parses remote tags', () => {
    const line = [
      'refs/remotes/origin/tags/v1.0.0',
      'abc1234567890abcdef1234567890abcdef123456',
      '',
      'commit',
      '2024-01-15 10:00:00 +0000',
      ''
    ].join(separator)

    expect(parseTagLine(line)).toEqual({
      name: 'origin/v1.0.0',
      target: 'abc1234567890abcdef1234567890abcdef123456',
      message: undefined,
      isAnnotated: false,
      isRemote: true,
      remote: 'origin',
      createdAt: '2024-01-15 10:00:00 +0000'
    })
  })
})

describe('parseTagLine edge cases', () => {
  it('returns null for blank or malformed lines', () => {
    expect(parseTagLine('')).toBeNull()
    expect(parseTagLine('refs/tags/v1.0.0\tabc')).toBeNull()
    expect(parseTagLine('refs/heads/main\tabc\t\tcommit\t2024-01-01\t')).toBeNull()
  })

  it('strips trailing newlines before parsing', () => {
    const line = [
      'refs/tags/v1.0.0',
      'abc1234567890abcdef1234567890abcdef123456',
      '',
      'commit',
      '2024-01-15 10:00:00 +0000',
      ''
    ].join('\t')

    expect(parseTagLine(`${line}\n`)).toEqual(parseTagLine(line))
  })
})

describe('tagCreate', () => {
  let repoDir: string

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), 'gf-tag-'))
    initRepo(repoDir)
  })

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('passes -s when signing an annotated tag', async () => {
    const spy = vi.spyOn(gitRunner, 'runGitOrThrow').mockResolvedValue('')
    await tagCreate(repoDir, 'git', 'v-sign-test', 'HEAD', 'Signed release', true)
    expect(spy).toHaveBeenCalledWith(
      ['tag', '-s', '-a', 'v-sign-test', '-m', 'Signed release', 'HEAD'],
      expect.objectContaining({ cwd: repoDir })
    )
  })

  it('rejects signing without a message', async () => {
    await expect(tagCreate(repoDir, 'git', 'v-sign-light', 'HEAD', undefined, true)).rejects.toThrow(
      /annotated tag message/i
    )
  })

  it('creates a lightweight tag without signing', async () => {
    const spy = vi.spyOn(gitRunner, 'runGitOrThrow').mockResolvedValue('')
    await tagCreate(repoDir, 'git', 'v-light', 'HEAD')
    expect(spy).toHaveBeenCalledWith(
      ['tag', 'v-light', 'HEAD'],
      expect.objectContaining({ cwd: repoDir })
    )
  })

  it('creates an annotated tag with a message', async () => {
    await tagCreate(repoDir, 'git', 'v-annotated', 'HEAD', 'Release notes')
    const tags = await tagList(repoDir, 'git')
    expect(tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'v-annotated',
          isAnnotated: true,
          message: 'Release notes'
        })
      ])
    )
  })

  it('rejects blank tag names', async () => {
    await expect(tagCreate(repoDir, 'git', '   ', 'HEAD')).rejects.toThrow(/tag name is required/i)
  })
})

describe('tagList', () => {
  it('returns an empty list when no tags exist', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-tag-list-empty-'))
    try {
      initRepo(repoDir)
      await expect(tagList(repoDir, 'git')).resolves.toEqual([])
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
    }
  })

  it('lists lightweight and annotated tags', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-tag-list-'))
    try {
      initRepo(repoDir)
      const head = (await runGitOrThrow(['rev-parse', 'HEAD'], { cwd: repoDir })).trim()
      await runGitOrThrow(['tag', 'v-light', head], { cwd: repoDir })
      await runGitOrThrow(['tag', '-a', 'v-annotated', '-m', 'annotated', head], { cwd: repoDir })

      const tags = await tagList(repoDir, 'git')
      expect(tags.map((tag) => tag.name).sort()).toEqual(['v-annotated', 'v-light'])
      expect(tags.find((tag) => tag.name === 'v-annotated')?.isAnnotated).toBe(true)
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
    }
  })
})

describe('tagDelete', () => {
  let repoDir: string

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), 'gf-tag-delete-'))
    initRepo(repoDir)
  })

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('deletes a local tag', async () => {
    const spy = vi.spyOn(gitRunner, 'runGitOrThrow').mockResolvedValue('')
    await tagDelete(repoDir, 'git', 'v1.0.0')
    expect(spy).toHaveBeenCalledWith(['tag', '-d', 'v1.0.0'], expect.objectContaining({ cwd: repoDir }))
  })

  it('deletes a remote tag without deleting the local copy', async () => {
    const bareRemote = mkdtempSync(join(tmpdir(), 'gf-tag-remote-delete-'))
    try {
      execSync(`git init --bare "${bareRemote}"`, { stdio: 'ignore' })
      execSync(`git remote add origin "${bareRemote}"`, { cwd: repoDir, stdio: 'ignore' })
      const head = (await runGitOrThrow(['rev-parse', 'HEAD'], { cwd: repoDir })).trim()
      await runGitOrThrow(['tag', 'v-remote', head], { cwd: repoDir })
      await runGitOrThrow(['push', 'origin', 'v-remote'], { cwd: repoDir })

      await tagDelete(repoDir, 'git', 'v-remote', 'origin', false)

      const localTags = (await runGitOrThrow(['tag', '--list'], { cwd: repoDir })).trim()
      expect(localTags).toBe('v-remote')
      const remoteTags = (await runGitOrThrow(['ls-remote', '--tags', 'origin'], { cwd: repoDir })).trim()
      expect(remoteTags).toBe('')
    } finally {
      rmSync(bareRemote, { recursive: true, force: true })
    }
  })

  it('rejects blank tag names', async () => {
    await expect(tagDelete(repoDir, 'git', '   ')).rejects.toThrow(/tag name is required/i)
  })
})

describe('tagPush and tagRename', () => {
  it('pushes a single tag and all tags to a remote', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-tag-push-'))
    const bareRemote = mkdtempSync(join(tmpdir(), 'gf-tag-push-bare-'))
    try {
      execSync(`git init --bare "${bareRemote}"`, { stdio: 'ignore' })
      initRepo(repoDir)
      execSync(`git remote add origin "${bareRemote}"`, { cwd: repoDir, stdio: 'ignore' })
      const head = (await runGitOrThrow(['rev-parse', 'HEAD'], { cwd: repoDir })).trim()
      await runGitOrThrow(['tag', 'v-one', head], { cwd: repoDir })
      await runGitOrThrow(['tag', 'v-two', head], { cwd: repoDir })

      await tagPush(repoDir, 'git', 'v-one', 'origin')
      let remoteTags = (await runGitOrThrow(['ls-remote', '--tags', 'origin'], { cwd: repoDir })).trim()
      expect(remoteTags).toContain('refs/tags/v-one')
      expect(remoteTags).not.toContain('refs/tags/v-two')

      await tagPush(repoDir, 'git', undefined, 'origin')
      remoteTags = (await runGitOrThrow(['ls-remote', '--tags', 'origin'], { cwd: repoDir })).trim()
      expect(remoteTags).toContain('refs/tags/v-two')
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
      rmSync(bareRemote, { recursive: true, force: true })
    }
  })

  it('renames a local tag', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-tag-rename-'))
    try {
      initRepo(repoDir)
      const spy = vi.spyOn(gitRunner, 'runGitOrThrow').mockResolvedValue('')
      await tagRename(repoDir, 'git', 'v-old', 'v-new')
      expect(spy).toHaveBeenCalledWith(
        ['tag', 'v-old', 'v-new'],
        expect.objectContaining({ cwd: repoDir })
      )
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
      vi.restoreAllMocks()
    }
  })
})
