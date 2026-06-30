import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { repoNameFromUrl } from '../../shared/git'
import { emitLog } from './log-bus'

export { repoNameFromUrl }

export async function cloneRepository(
  url: string,
  parentDir: string,
  gitBinaryPath = 'git'
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

  return new Promise((resolve, reject) => {
    const child = spawn(gitBinaryPath, ['clone', '--', trimmedUrl, targetPath], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    child.on('error', (error) => {
      emitLog('app', 'error', 'Git clone failed', error.message)
      reject(new Error(`Failed to run git: ${error.message}`))
    })

    child.on('close', (code) => {
      if (code === 0) {
        emitLog('app', 'info', 'Repository cloned', targetPath)
        resolve(targetPath)
        return
      }
      const detail = stderr.trim() || `git clone exited with code ${code ?? 1}`
      emitLog('app', 'error', 'Git clone failed', detail)
      reject(new Error(detail))
    })
  })
}
