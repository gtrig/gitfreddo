import { chmod, mkdir, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { loadGitHubToken } from '../github/token-store'

const SETTINGS_DIR = join(homedir(), '.config', 'gitfredo')
const INSTALLED_ASKPASS_PATH = join(SETTINGS_DIR, 'github-askpass.cjs')

/** Keep in sync with electron/git/github-askpass.cjs */
const ASKPASS_SCRIPT = `#!/usr/bin/env node
const token = process.env.GITFREDO_GITHUB_TOKEN || ''
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
    GITFREDO_GITHUB_TOKEN: token
  }
}
