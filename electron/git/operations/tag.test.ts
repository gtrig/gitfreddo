import { resolve } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseTagLine, parseTagRef, tagCreate } from './tag'
import * as gitRunner from '../git-runner'

const FIXTURE_REPO = resolve(__dirname, '../../../test/fixtures/minimal-repo')

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

describe('tagCreate', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes -s when signing an annotated tag', async () => {
    const spy = vi.spyOn(gitRunner, 'runGitOrThrow').mockResolvedValue('')
    await tagCreate(FIXTURE_REPO, 'git', 'v-sign-test', 'HEAD', 'Signed release', true)
    expect(spy).toHaveBeenCalledWith(
      ['tag', '-s', '-a', 'v-sign-test', '-m', 'Signed release', 'HEAD'],
      expect.objectContaining({ cwd: FIXTURE_REPO })
    )
  })

  it('rejects signing without a message', async () => {
    await expect(tagCreate(FIXTURE_REPO, 'git', 'v-sign-light', 'HEAD', undefined, true)).rejects.toThrow(
      /annotated tag message/i
    )
  })
})
