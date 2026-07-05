import { execSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  classifyPorcelainV2Line,
  parseCleanPreviewOutput,
  parsePorcelainV2Line,
  workingStatus
} from './status'

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

  it('marks gitlink entries as submodules', () => {
    const line = '1 M. N... 160000 160000 160000 abc def vendor/lib'
    expect(parsePorcelainV2Line(line)).toEqual({
      path: 'vendor/lib',
      status: 'modified',
      isSubmodule: true,
      submoduleStatus: 'ahead'
    })
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
})
