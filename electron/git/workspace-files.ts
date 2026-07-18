import { existsSync, realpathSync } from 'fs'
import { unlink } from 'fs/promises'
import { isAbsolute, join, relative, resolve } from 'path'
import { canonicalizePath, normalizeRepoPath } from './repo-path'

/**
 * Resolve a repo-relative path and reject escapes (including via symlinks).
 * Non-existent leaf paths are allowed when every existing ancestor stays inside the repo.
 */
export function resolveRepoFile(repoPath: string, relativePath: string): string {
  if (isAbsolute(relativePath)) {
    throw new Error('Path escapes repository root')
  }

  const normalized = normalizeRepoPath(repoPath)
  const rootReal = canonicalizePath(normalized)
  const full = resolve(rootReal, relativePath)
  const lexicalRel = relative(rootReal, full)
  if (lexicalRel.startsWith('..') || isAbsolute(lexicalRel)) {
    throw new Error('Path escapes repository root')
  }

  const parts = lexicalRel.split(/[/\\]/).filter((part) => part.length > 0)
  let current = rootReal
  for (let index = 0; index < parts.length; index += 1) {
    const next = join(current, parts[index]!)
    if (!existsSync(next)) {
      return join(current, ...parts.slice(index))
    }
    let realNext: string
    try {
      realNext = realpathSync.native(next)
    } catch {
      throw new Error('Path escapes repository root')
    }
    const realRel = relative(rootReal, realNext)
    if (realRel.startsWith('..') || isAbsolute(realRel)) {
      throw new Error('Path escapes repository root')
    }
    current = realNext
  }
  return current
}

export async function deleteRepoFile(repoPath: string, relativePath: string): Promise<void> {
  await unlink(resolveRepoFile(repoPath, relativePath))
}
