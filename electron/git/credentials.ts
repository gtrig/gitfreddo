import { chmod, writeFile, mkdir } from 'fs/promises'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { loadGitHubToken } from '../github/token-store'

const SETTINGS_DIR = join(homedir(), '.config', 'gitfredo')
const INSTALLED_ASKPASS_PATH = join(SETTINGS_DIR, 'github-askpass.cjs')

const ASKPASS_SOURCE = join(dirname(fileURLToPath(import.meta.url)), 'github-askpass.cjs')

const ASKPASS_CONTENT = `#!/usr/bin/env node
const token = process.env.GITFREDO_GITHUB_TOKEN || ''
process.stdout.write('x-access-token\\n' + token)
`

async function ensureAskpassScript(): Promise<string> {
  await mkdir(SETTINGS_DIR, { recursive: true })
  try {
    await writeFile(INSTALLED_ASKPASS_PATH, ASKPASS_CONTENT, { flag: 'wx' })
    await chmod(INSTALLED_ASKPASS_PATH, 0o755)
  } catch {
    // already exists
  }
  return INSTALLED_ASKPASS_PATH
}

export function getAskpassSourcePath(): string {
  return ASKPASS_SOURCE
}

export async function buildGitEnv(): Promise<NodeJS.ProcessEnv> {
  const token = await loadGitHubToken()
  if (!token?.trim()) {
    return { ...process.env }
  }

  const askpassPath = await ensureAskpassScript()
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: askpassPath,
    GITFREDO_GITHUB_TOKEN: token
  }
}
