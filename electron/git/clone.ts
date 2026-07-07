import { existsSync } from 'fs'
import { join } from 'path'
import { repoNameFromUrl } from '../../shared/git'
import type { SubmoduleRecursion } from '../../shared/submodule-types'
import { buildCloneArgs } from '../../shared/git/commands'
import { emitLog } from './log-bus'
import { runGitOrThrow } from './git-runner'

export { repoNameFromUrl }

export async function cloneRepository(
  url: string,
  parentDir: string,
  gitBinaryPath = 'git',
  submoduleRecursion: SubmoduleRecursion = 'on-demand'
): Promise<string> {
  const trimmedUrl = url.trim()
  if (!trimmedUrl) {
    throw new Error('Repository URL is required')
  }

  const folderName = repoNameFromUrl(trimmedUrl)
  const targetPath = join(parentDir, folderName)

  if (existsSync(targetPath)) {
    throw new Error(`"${folderName}" already exists in the selected folder`)
  }

  emitLog('app', 'info', `Cloning repository`, `${trimmedUrl}\n→ ${targetPath}`)

  try {
    await runGitOrThrow(
      buildCloneArgs({ url: trimmedUrl, targetPath, submoduleRecursion }),
      { cwd: parentDir, gitBinaryPath }
    )
    emitLog('app', 'info', 'Repository cloned', targetPath)
    return targetPath
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    emitLog('app', 'error', 'Git clone failed', detail)
    throw error instanceof Error ? error : new Error(detail)
  }
}
