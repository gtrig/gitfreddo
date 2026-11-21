import { execSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { composeCommits } from './compose'

const git = (cwd: string, command: string) =>
  execSync(`git ${command}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

function initRepo(dir: string, withCommit = true) {
  git(dir, 'init -b main')
  git(dir, 'config user.email "test@example.com"')
  git(dir, 'config user.name "Test"')
  git(dir, 'config commit.gpgsign false')
  if (withCommit) {
    writeFileSync(join(dir, 'a.txt'), 'one\ntwo\nthree\nfour\nfive\nsix\nseven\n')
    writeFileSync(join(dir, 'old.txt'), 'rename me\n'.repeat(5))
    git(dir, 'add -A')
    git(dir, 'commit -m initial')
  }
}

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gitfreddo-compose-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('composeCommits', () => {
  it('commits only the staged hunks of a partially staged file', async () => {
    initRepo(dir)
    writeFileSync(join(dir, 'a.txt'), 'ONE\ntwo\nthree\nfour\nfive\nsix\nseven\n')
    git(dir, 'add a.txt')
    writeFileSync(join(dir, 'a.txt'), 'ONE\ntwo\nthree\nfour\nfive\nsix\nSEVEN\n')

    const result = await composeCommits(dir, 'git', [{ files: ['a.txt'], message: 'Uppercase one' }])

    expect(result.created).toBe(1)
    expect(git(dir, 'show HEAD:a.txt')).toBe('ONE\ntwo\nthree\nfour\nfive\nsix\nseven\n')
    expect(readFileSync(join(dir, 'a.txt'), 'utf8')).toContain('SEVEN')
    expect(git(dir, 'status --porcelain')).toBe(' M a.txt\n')
  })

  it('keeps a staged rename together in one commit', async () => {
    initRepo(dir)
    git(dir, 'mv old.txt new.txt')

    await composeCommits(dir, 'git', [{ files: ['new.txt'], message: 'Rename old to new' }])

    expect(git(dir, 'show --name-status --format= -M HEAD').trim()).toMatch(/^R\d+\s+old\.txt\s+new\.txt$/)
    expect(git(dir, 'status --porcelain')).toBe('')
  })

  it('creates one commit per proposal in order', async () => {
    initRepo(dir)
    writeFileSync(join(dir, 'b.txt'), 'b\n')
    writeFileSync(join(dir, 'c.txt'), 'c\n')
    git(dir, 'add b.txt c.txt')

    const result = await composeCommits(dir, 'git', [
      { files: ['b.txt'], message: 'Add b' },
      { files: ['c.txt'], message: 'Add c\n\nWith body.' }
    ])

    expect(result.created).toBe(2)
    expect(git(dir, 'log -2 --format=%s').trim().split('\n')).toEqual(['Add c', 'Add b'])
    expect(git(dir, 'show --name-only --format= HEAD~1').trim()).toBe('b.txt')
    expect(git(dir, 'log -1 --format=%b').trim()).toBe('With body.')
  })

  it('works on a branch with no commits yet', async () => {
    initRepo(dir, false)
    writeFileSync(join(dir, 'x.txt'), 'x\n')
    writeFileSync(join(dir, 'y.txt'), 'y\n')
    git(dir, 'add x.txt y.txt')

    const result = await composeCommits(dir, 'git', [
      { files: ['x.txt'], message: 'Add x' },
      { files: ['y.txt'], message: 'Add y' }
    ])

    expect(result.created).toBe(2)
    expect(git(dir, 'log --format=%s').trim().split('\n')).toEqual(['Add y', 'Add x'])
  })

  it('restores the remaining staged changes when a commit fails part-way', async () => {
    initRepo(dir)
    writeFileSync(join(dir, 'b.txt'), 'b\n')
    writeFileSync(join(dir, 'c.txt'), 'c\n')
    git(dir, 'add b.txt c.txt')
    const hook = join(dir, '.git', 'hooks', 'commit-msg')
    writeFileSync(hook, '#!/bin/sh\ngrep -q "Add c" "$1" && exit 1\nexit 0\n')
    chmodSync(hook, 0o755)

    await expect(
      composeCommits(dir, 'git', [
        { files: ['b.txt'], message: 'Add b' },
        { files: ['c.txt'], message: 'Add c' }
      ])
    ).rejects.toThrow(/1 of 2 commits/)

    expect(git(dir, 'log -1 --format=%s').trim()).toBe('Add b')
    expect(git(dir, 'diff --cached --name-only').trim()).toBe('c.txt')
  })

  it('rejects an empty proposal list without touching the index', async () => {
    initRepo(dir)
    writeFileSync(join(dir, 'b.txt'), 'b\n')
    git(dir, 'add b.txt')

    await expect(composeCommits(dir, 'git', [])).rejects.toThrow(/no commits/i)
    expect(git(dir, 'diff --cached --name-only').trim()).toBe('b.txt')
  })
})
