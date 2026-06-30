import { chmod, mkdir, readFile, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { loadGitHubToken } from '../github/token-store'

const SETTINGS_DIR = join(homedir(), '.config', 'gitfredo')
const INSTALLED_ASKPASS_PATH = join(SETTINGS_DIR, 'github-askpass.cjs')

const ASKPASS_SOURCE = join(dirname(fileURLToPath(import.meta.url)), 'github-askpass.cjs')

async function ensureAskpassScript(): Promise<string> {
  await mkdir(SETTINGS_DIR, { recursive: true })
  const source = await readFile(ASKPASS_SOURCE, 'utf8')
  await writeFile(INSTALLED_ASKPASS_PATH, source)
  await chmod(INSTALLED_ASKPASS_PATH, 0o755)
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
