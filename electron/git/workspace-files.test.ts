import { describe, expect, it } from 'vitest'
import { resolve } from 'path'
import { resolveRepoFile } from './workspace-files'

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
