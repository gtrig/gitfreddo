import { existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { deleteRepoFile, resolveRepoFile } from './workspace-files'

describe('resolveRepoFile', () => {
  const repo = resolve('/tmp/repo')

  it('resolves paths inside the repository', () => {
    expect(resolveRepoFile(repo, 'src/index.ts')).toBe(resolve(repo, 'src/index.ts'))
  })

  it('rejects paths that escape via parent segments', () => {
    expect(() => resolveRepoFile(repo, '../outside/secret')).toThrow('Path escapes repository root')
  })

  it('rejects sibling directories whose names extend the repo prefix', () => {
    expect(() => resolveRepoFile(repo, '../repo-evil/secret')).toThrow('Path escapes repository root')
  })

  it('rejects absolute relative paths', () => {
    expect(() => resolveRepoFile(repo, '/etc/passwd')).toThrow('Path escapes repository root')
  })

  it('rejects symlink escapes that point outside the repository', () => {
    const root = mkdtempSync(join(tmpdir(), 'gf-ws-symlink-'))
    const outside = mkdtempSync(join(tmpdir(), 'gf-ws-outside-'))
    try {
      writeFileSync(join(outside, 'secret.txt'), 'secret\n')
      symlinkSync(outside, join(root, 'link'))
      expect(() => resolveRepoFile(root, 'link/secret.txt')).toThrow('Path escapes repository root')
    } finally {
      rmSync(root, { recursive: true, force: true })
      rmSync(outside, { recursive: true, force: true })
    }
  })
})

describe('deleteRepoFile', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
    }
    tempDir = null
  })

  it('deletes a file inside the repository', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-workspace-files-'))
    const filePath = join(tempDir, 'notes.txt')
    writeFileSync(filePath, 'delete me\n')

    await deleteRepoFile(tempDir, 'notes.txt')
    expect(existsSync(filePath)).toBe(false)
  })
})
