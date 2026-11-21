import { execSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import * as gitRunner from '../git-runner'
import {
  classifyPorcelainV2Line,
  parseCleanPreviewOutput,
  parsePorcelainV2Line,
  stageAdd,
  stageReset,
  workingClean,
  workingCleanPreview,
  workingRemove,
  workingStatus
} from './status'
import { REMOVE_HAS_LOCAL_CHANGES } from '../../../shared/working'

function newRepo(prefix: string, withCommit = true): string {
  const repo = mkdtempSync(join(tmpdir(), prefix))
  execSync('git init -b main', { cwd: repo, stdio: 'ignore' })
  execSync('git config user.email "t@e.com"', { cwd: repo, stdio: 'ignore' })
  execSync('git config user.name "T"', { cwd: repo, stdio: 'ignore' })
  if (withCommit) {
    writeFileSync(join(repo, 'README.md'), 'hello\n')
    execSync('git add README.md && git commit -m init', { cwd: repo, stdio: 'ignore' })
  }
  return repo
}

const cachedNames = (repo: string) =>
  execSync('git diff --cached --name-only', { cwd: repo, encoding: 'utf8' }).trim()

describe('workingStatus path and upstream handling', () => {
  it('keeps leading and trailing spaces in untracked file names', async () => {
    const repo = newRepo('gf-status-spaces-')
    writeFileSync(join(repo, ' padded name '), 'x\n')

    const status = await workingStatus(repo, 'git')
    expect(status.untracked.map((file) => file.path)).toEqual([' padded name '])
  })

  it('reports commits ahead of the upstream as ahead, not behind', async () => {
    const repo = newRepo('gf-status-ahead-')
    const remote = mkdtempSync(join(tmpdir(), 'gf-status-ahead-remote-'))
    execSync(`git init --bare "${remote}"`, { stdio: 'ignore' })
    execSync(`git remote add origin "${remote}" && git push -u origin main`, { cwd: repo, stdio: 'ignore' })
    writeFileSync(join(repo, 'README.md'), 'ahead\n')
    execSync('git commit -am ahead', { cwd: repo, stdio: 'ignore' })

    const status = await workingStatus(repo, 'git')
    expect(status).toMatchObject({ ahead: 1, behind: 0 })
  })

  it('does not run an extra rev-list when git already reported ahead/behind', async () => {
    const repo = newRepo('gf-status-ab-')
    const remote = mkdtempSync(join(tmpdir(), 'gf-status-ab-remote-'))
    execSync(`git init --bare "${remote}"`, { stdio: 'ignore' })
    execSync(`git remote add origin "${remote}" && git push -u origin main`, { cwd: repo, stdio: 'ignore' })
    const spy = vi.spyOn(gitRunner, 'runGitOrThrow')
    try {
      const status = await workingStatus(repo, 'git')
      expect(status).toMatchObject({ ahead: 0, behind: 0 })
      expect(spy.mock.calls.some(([args]) => args.includes('rev-list'))).toBe(false)
    } finally {
      spy.mockRestore()
    }
  })
})

describe('stageAdd', () => {
  it('refuses an empty path list instead of staging everything', async () => {
    const repo = newRepo('gf-add-empty-')
    writeFileSync(join(repo, 'a.txt'), 'a\n')
    await expect(stageAdd(repo, 'git', [])).rejects.toThrow(/no files/i)
    expect(cachedNames(repo)).toBe('')
  })

  it('stages everything only when asked explicitly', async () => {
    const repo = newRepo('gf-add-all-')
    writeFileSync(join(repo, 'a.txt'), 'a\n')
    writeFileSync(join(repo, 'b.txt'), 'b\n')
    await stageAdd(repo, 'git', [], true)
    expect(cachedNames(repo).split('\n')).toEqual(['a.txt', 'b.txt'])
  })
})

describe('stageReset', () => {
  it('unstages everything on a branch with no commits yet', async () => {
    const repo = newRepo('gf-reset-unborn-', false)
    writeFileSync(join(repo, 'a.txt'), 'a\n')
    writeFileSync(join(repo, 'b.txt'), 'b\n')
    execSync('git add a.txt b.txt', { cwd: repo, stdio: 'ignore' })

    await stageReset(repo, 'git', [])
    expect(cachedNames(repo)).toBe('')
    expect(existsSync(join(repo, 'a.txt'))).toBe(true)
  })

  it('unstages chosen paths on a branch with no commits yet', async () => {
    const repo = newRepo('gf-reset-unborn-paths-', false)
    writeFileSync(join(repo, 'a.txt'), 'a\n')
    writeFileSync(join(repo, 'b.txt'), 'b\n')
    execSync('git add a.txt b.txt', { cwd: repo, stdio: 'ignore' })

    await stageReset(repo, 'git', ['a.txt'])
    expect(cachedNames(repo)).toBe('b.txt')
  })
})

describe('workingRemove', () => {
  it('refuses to drop local modifications unless forced', async () => {
    const repo = newRepo('gf-remove-')
    writeFileSync(join(repo, 'README.md'), 'edited\n')
    execSync('git add README.md', { cwd: repo, stdio: 'ignore' })
    writeFileSync(join(repo, 'README.md'), 'edited again\n')

    await expect(workingRemove(repo, 'git', ['README.md'])).rejects.toThrow(REMOVE_HAS_LOCAL_CHANGES)
    expect(readFileSync(join(repo, 'README.md'), 'utf8')).toBe('edited again\n')

    await workingRemove(repo, 'git', ['README.md'], true)
    expect(existsSync(join(repo, 'README.md'))).toBe(false)
  })

  it('removes a clean tracked file without forcing', async () => {
    const repo = newRepo('gf-remove-clean-')
    await workingRemove(repo, 'git', ['README.md'])
    expect(existsSync(join(repo, 'README.md'))).toBe(false)
  })
})

describe('workingClean', () => {
  it('deletes only the previewed paths', async () => {
    const repo = newRepo('gf-clean-paths-')
    writeFileSync(join(repo, 'previewed.txt'), 'x\n')
    writeFileSync(join(repo, 'appeared-later.txt'), 'y\n')

    await workingClean(repo, 'git', false, ['previewed.txt'])
    expect(existsSync(join(repo, 'previewed.txt'))).toBe(false)
    expect(existsSync(join(repo, 'appeared-later.txt'))).toBe(true)
  })

  it('does nothing when the preview was empty', async () => {
    const repo = newRepo('gf-clean-empty-')
    writeFileSync(join(repo, 'new.txt'), 'x\n')
    await workingClean(repo, 'git', false, [])
    expect(existsSync(join(repo, 'new.txt'))).toBe(true)
  })
})

describe('parseCleanPreviewOutput', () => {
  it('parses would-remove lines', () => {
    const output = [
      'Would remove temp.txt',
      'Would remove build/output.log',
      ''
    ].join('\n')

    expect(parseCleanPreviewOutput(output)).toEqual(['temp.txt', 'build/output.log'])
  })

  it('returns empty array for empty output', () => {
    expect(parseCleanPreviewOutput('')).toEqual([])
    expect(parseCleanPreviewOutput('\n\n')).toEqual([])
  })

  it('unquotes C-quoted would-remove paths', () => {
    expect(parseCleanPreviewOutput('Would remove "tmp/\\342\\232\\241.txt"\n')).toEqual([
      'tmp/⚡.txt'
    ])
  })
})

describe('parsePorcelainV2Line', () => {
  it('parses an ordinary modified file', () => {
    const line =
      '1 M. N... 100644 100644 100644 abc def src/App.tsx'
    expect(parsePorcelainV2Line(line)).toEqual({
      path: 'src/App.tsx',
      status: 'modified'
    })
  })

  it('parses a rename with similarity score and tab-separated paths', () => {
    const line =
      '2 R. N... 100644 100644 100644 abc def R93 src/components/Branches/CheckoutRemoteModal.tsx\tsrc/components/actions/CheckoutRemoteModal.tsx'
    expect(parsePorcelainV2Line(line)).toEqual({
      path: 'src/components/Branches/CheckoutRemoteModal.tsx',
      oldPath: 'src/components/actions/CheckoutRemoteModal.tsx',
      status: 'renamed'
    })
  })

  it('parses paths that contain spaces', () => {
    const line = '1 M. N... 100644 100644 100644 abc def docs/my file.md'
    expect(parsePorcelainV2Line(line)).toEqual({
      path: 'docs/my file.md',
      status: 'modified'
    })
  })

  it('unquotes C-quoted paths with non-ASCII bytes', () => {
    const line =
      '1 .M N... 100644 100644 100644 abc def "resources/views/pages/reviews/\\342\\232\\241dashboard.blade.php"'
    expect(parsePorcelainV2Line(line)).toEqual({
      path: 'resources/views/pages/reviews/⚡dashboard.blade.php',
      status: 'modified'
    })
  })

  it('unquotes C-quoted rename paths', () => {
    const line =
      '2 R. N... 100644 100644 100644 abc def R100 "resources/\\342\\232\\241new.blade.php"\t"resources/\\342\\232\\241old.blade.php"'
    expect(parsePorcelainV2Line(line)).toEqual({
      path: 'resources/⚡new.blade.php',
      oldPath: 'resources/⚡old.blade.php',
      status: 'renamed'
    })
  })

  it('marks gitlink entries as submodules', () => {
    const line = '1 M. N... 160000 160000 160000 abc def vendor/lib'
    expect(parsePorcelainV2Line(line)).toEqual({
      path: 'vendor/lib',
      status: 'modified',
      isSubmodule: true,
      submoduleStatus: 'ahead'
    })
  })

  it('reads submodule state from the porcelain S<c><m><u> field', () => {
    const at = (sub: string) =>
      parsePorcelainV2Line(`1 .M ${sub} 160000 160000 160000 abc def vendor/lib`)?.submoduleStatus
    expect(at('SC..')).toBe('ahead')
    expect(at('SCM.')).toBe('ahead')
    expect(at('S.M.')).toBe('dirty')
    expect(at('S..U')).toBe('dirty')
  })

  it('parses added, deleted, untracked, and conflicted files', () => {
    expect(parsePorcelainV2Line('1 A. N... 100644 100644 100644 abc def new.ts')?.status).toBe(
      'added'
    )
    expect(parsePorcelainV2Line('1 .D N... 100644 100644 100644 abc def gone.ts')?.status).toBe(
      'deleted'
    )
    expect(
      parsePorcelainV2Line(
        '1 ?? N... 100644 100644 100644 0000000000000000000000000000000000000000 0000000000000000000000000000000000000000 new-dir/'
      )?.status
    ).toBe('untracked')
    expect(
      parsePorcelainV2Line(
        'u UU N... 100644 100644 100644 abc def 100644 100644 100644 100644 conflict.ts'
      )?.status
    ).toBe('conflicted')
  })

  it('returns null for malformed lines', () => {
    expect(parsePorcelainV2Line('bad line')).toBeNull()
  })
})

describe('classifyPorcelainV2Line', () => {
  const modifiedLine =
    '1 M. N... 100644 100644 100644 abc def src/App.tsx'
  const unstagedOnlyLine =
    '1 .M N... 100644 100644 100644 abc def src/App.tsx'
  const stagedAndUnstagedLine =
    '1 MM N... 100644 100644 100644 abc def src/App.tsx'
  const addedThenModifiedLine =
    '1 AM N... 100644 100644 100644 abc def src/new.ts'

  it('puts staged-only changes in staged', () => {
    expect(classifyPorcelainV2Line(modifiedLine)).toEqual({
      staged: { path: 'src/App.tsx', status: 'modified' },
      unstaged: null,
      conflicted: null
    })
  })

  it('puts unstaged-only changes in unstaged', () => {
    expect(classifyPorcelainV2Line(unstagedOnlyLine)).toEqual({
      staged: null,
      unstaged: { path: 'src/App.tsx', status: 'modified' },
      conflicted: null
    })
  })

  it('puts partially staged files in both staged and unstaged', () => {
    expect(classifyPorcelainV2Line(stagedAndUnstagedLine)).toEqual({
      staged: { path: 'src/App.tsx', status: 'modified' },
      unstaged: { path: 'src/App.tsx', status: 'modified' },
      conflicted: null
    })
  })

  it('uses side-specific status when index and worktree differ', () => {
    expect(classifyPorcelainV2Line(addedThenModifiedLine)).toEqual({
      staged: { path: 'src/new.ts', status: 'added' },
      unstaged: { path: 'src/new.ts', status: 'modified' },
      conflicted: null
    })
  })

  it('classifies conflicted porcelain lines', () => {
    const conflictLine =
      'u UU N... 100644 100644 100644 abc def 100644 100644 100644 100644 conflict.ts'
    const parsed = parsePorcelainV2Line(conflictLine)
    expect(classifyPorcelainV2Line(conflictLine)).toEqual({
      staged: null,
      unstaged: null,
      conflicted: parsed
    })
  })
})

describe('workingStatus integration', () => {
  it('lists staged and unstaged entries when a staged file is edited again', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'gf-status-'))
    execSync('git init', { cwd: repo, stdio: 'ignore' })
    execSync('git config user.email "t@e.com"', { cwd: repo, stdio: 'ignore' })
    execSync('git config user.name "T"', { cwd: repo, stdio: 'ignore' })
    writeFileSync(join(repo, 'foo.txt'), 'line1\n')
    execSync('git add foo.txt', { cwd: repo, stdio: 'ignore' })
    execSync('git commit -m init', { cwd: repo, stdio: 'ignore' })
    writeFileSync(join(repo, 'foo.txt'), 'line1\nline2\n')
    execSync('git add foo.txt', { cwd: repo, stdio: 'ignore' })
    writeFileSync(join(repo, 'foo.txt'), 'line1\nline2\nline3\n')

    const status = await workingStatus(repo, 'git')

    expect(status.staged).toEqual([{ path: 'foo.txt', status: 'modified' }])
    expect(status.unstaged).toEqual([{ path: 'foo.txt', status: 'modified' }])
  })

  it('lists files whose names contain non-ASCII characters', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'gf-status-unicode-'))
    execSync('git init', { cwd: repo, stdio: 'ignore' })
    execSync('git config user.email "t@e.com"', { cwd: repo, stdio: 'ignore' })
    execSync('git config user.name "T"', { cwd: repo, stdio: 'ignore' })
    mkdirSync(join(repo, 'resources', 'views'), { recursive: true })
    const relative = 'resources/views/⚡dashboard.blade.php'
    writeFileSync(join(repo, relative), 'one\n')
    execSync('git add . && git commit -m init', { cwd: repo, stdio: 'ignore' })
    writeFileSync(join(repo, relative), 'two\n')

    const status = await workingStatus(repo, 'git')
    expect(status.unstaged).toEqual([{ path: relative, status: 'modified' }])
  })
})

describe('workingCleanPreview integration', () => {
  it('lists untracked files from git clean dry-run', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'gf-clean-preview-'))
    execSync('git init', { cwd: repo, stdio: 'ignore' })
    execSync('git config user.email "t@e.com"', { cwd: repo, stdio: 'ignore' })
    execSync('git config user.name "T"', { cwd: repo, stdio: 'ignore' })
    writeFileSync(join(repo, 'README.md'), 'hello\n')
    execSync('git add README.md && git commit -m init', { cwd: repo, stdio: 'ignore' })
    writeFileSync(join(repo, 'tmp.txt'), 'temp\n')

    const preview = await workingCleanPreview(repo, 'git', false)
    expect(preview).toEqual(['tmp.txt'])
  })
})
