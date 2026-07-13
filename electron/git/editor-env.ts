/**
 * Build GIT_*_EDITOR command strings safe for Unix shells and Git for Windows.
 * Normalizes backslashes and quotes paths that contain spaces or shell metacharacters.
 */
export function quoteGitEditorPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  return /[\s"'`$\\]/u.test(normalized) ? `"${normalized.replace(/"/g, '\\"')}"` : normalized
}

export function buildGitNodeEditorCommand(scriptPath: string, nodeBinary = process.execPath): string {
  return `${quoteGitEditorPath(nodeBinary)} ${quoteGitEditorPath(scriptPath)}`
}
