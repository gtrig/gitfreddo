function normalizeGitignorePath(path: string): string {
  return path.replace(/^\//, '')
}

function stripTrailingSlash(path: string): string {
  return path.replace(/\/+$/, '')
}

export function formatGitignorePath(path: string, directory = false): string {
  const normalized = normalizeGitignorePath(path)
  if (!directory) return normalized
  return normalized.endsWith('/') ? normalized : `${normalized}/`
}

export function gitignoreHasEntry(content: string, path: string, directory = false): boolean {
  const normalized = formatGitignorePath(path, directory)
  const target = stripTrailingSlash(normalized)
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .some((line) => {
      const candidate = stripTrailingSlash(line.replace(/^\//, ''))
      return candidate === target
    })
}

export function appendGitignoreEntry(
  content: string,
  path: string,
  directory = false
): string {
  const entry = formatGitignorePath(path, directory)
  if (gitignoreHasEntry(content, entry, directory)) {
    return content
  }
  if (!content) {
    return `${entry}\n`
  }
  const suffix = content.endsWith('\n') ? '' : '\n'
  return `${content}${suffix}${entry}\n`
}
