import { existsSync, lstatSync, readlinkSync, realpathSync } from 'fs'
import { unlink } from 'fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'path'
import { canonicalizePath, normalizeRepoPath } from './repo-path'

/**
 * Resolve a repo-relative path and reject escapes (including via symlinks).
 * Non-existent leaf paths are allowed when every existing ancestor stays inside the repo.
 */
const MAX_SYMLINK_HOPS = 40

function isBrokenSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink()
  } catch {
    return false
  }
}

export function resolveRepoFile(repoPath: string, relativePath: string, hops = 0): string {
  if (hops > MAX_SYMLINK_HOPS) {
    throw new Error('Too many symbolic links')
  }
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
      if (isBrokenSymlink(next)) {
        // A link to a path that doesn't exist yet: writing would create its target,
        // so the target must stay inside the repo too.
        const target = resolve(dirname(next), readlinkSync(next))
        const targetRel = relative(rootReal, target)
        if (targetRel.startsWith('..') || isAbsolute(targetRel)) {
          throw new Error('Path escapes repository root')
        }
        return resolveRepoFile(
          rootReal,
          join(targetRel, ...parts.slice(index + 1)),
          hops + 1
        )
      }
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
