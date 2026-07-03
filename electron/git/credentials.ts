import { chmod, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { loadGitHubToken } from '../github/token-store'
import { getAppDataDir } from '../paths'

const SETTINGS_DIR = getAppDataDir()
const INSTALLED_ASKPASS_PATH = join(SETTINGS_DIR, 'github-askpass.cjs')

const ASKPASS_SCRIPT = `#!/usr/bin/env node
const token = process.env.gitfreddo_GITHUB_TOKEN || ''
const prompt = (process.argv[2] || '').toLowerCase()

if (prompt.includes('username')) {
  process.stdout.write('x-access-token')
} else {
  process.stdout.write(token)
}
`

async function ensureAskpassScript(): Promise<string> {
  await mkdir(SETTINGS_DIR, { recursive: true })
  await writeFile(INSTALLED_ASKPASS_PATH, ASKPASS_SCRIPT)
  await chmod(INSTALLED_ASKPASS_PATH, 0o755)
  return INSTALLED_ASKPASS_PATH
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
    gitfreddo_GITHUB_TOKEN: token
  }
}
