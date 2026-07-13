import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolve } from 'path'
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
})

describe('deleteRepoFile', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  it('deletes a file inside the repository', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-workspace-files-'))
    const filePath = join(tempDir, 'notes.txt')
    writeFileSync(filePath, 'delete me\n')

    await deleteRepoFile(tempDir, 'notes.txt')
    expect(existsSync(filePath)).toBe(false)
  })
})
