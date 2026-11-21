import { chmod, mkdir, mkdtemp, rm, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { loadBitbucketToken } from '../bitbucket/token-store'
import { loadGitHubToken } from '../github/token-store'
import { loadGitlabToken } from '../gitlab/token-store'
import { loadSettings } from '../settings'
import { getAppDataDir } from '../paths'
import type { ForgeAskpassSecrets } from './forge-askpass-response'

const SETTINGS_DIR = getAppDataDir()
const INSTALLED_ASKPASS_PATH = join(SETTINGS_DIR, 'forge-askpass.cjs')
/** Old shared plaintext secrets file (pre per-process secrets). Removed at startup. */
const LEGACY_ASKPASS_SECRETS_PATH = join(SETTINGS_DIR, 'forge-askpass-secrets.json')

/** Env var pointing the askpass script at this git process's private secrets file. */
export const ASKPASS_SECRETS_ENV = 'GITFREDDO_ASKPASS_SECRETS'

const FORGE_TOKEN_ENV_KEYS = [
  'gitfreddo_GITHUB_TOKEN',
  'gitfreddo_BITBUCKET_TOKEN',
  'gitfreddo_BITBUCKET_LOGIN',
  'gitfreddo_BITBUCKET_AUTH_TYPE',
  'gitfreddo_GITLAB_TOKEN',
  'gitfreddo_GITLAB_HOST',
  ASKPASS_SECRETS_ENV
] as const

const NETWORK_SUBCOMMANDS = new Set(['clone', 'fetch', 'push', 'pull', 'ls-remote'])
const NETWORK_SUBMODULE_ACTIONS = new Set(['add', 'update'])

/** First git subcommand after any leading `-c key=value` / global flags. */
function gitSubcommandIndex(args: readonly string[]): number {
  let index = 0
  while (index < args.length) {
    const arg = args[index]!
    if (arg === '-c' || arg === '-C') {
      index += 2
      continue
    }
    if (arg.startsWith('-')) {
      index += 1
      continue
    }
    return index
  }
  return -1
}

/** True when git may contact a remote and ask for credentials. */
export function gitCommandNeedsCredentials(args: readonly string[]): boolean {
  const index = gitSubcommandIndex(args)
  if (index === -1) return false
  const subcommand = args[index]!
  if (NETWORK_SUBCOMMANDS.has(subcommand)) return true
  if (subcommand === 'submodule') {
    const action = args.slice(index + 1).find((arg) => !arg.startsWith('-'))
    return action !== undefined && NETWORK_SUBMODULE_ACTIONS.has(action)
  }
  return false
}

/**
 * Standalone askpass script. Mirrors resolveForgeAskpassResponse in
 * forge-askpass-response.ts — a parity test in credentials.test.ts keeps them in sync.
 */
export function buildAskpassScript(): string {
  return `#!/usr/bin/env node
const fs = require('fs')
let secrets = {
  githubToken: '',
  bitbucketToken: '',
  bitbucketLogin: '',
  bitbucketAuthType: 'oauth',
  gitlabToken: '',
  gitlabHost: 'gitlab.com'
}
try {
  const secretsPath = process.env[${JSON.stringify(ASKPASS_SECRETS_ENV)}]
  if (secretsPath) {
    secrets = { ...secrets, ...JSON.parse(fs.readFileSync(secretsPath, 'utf8')) }
  }
} catch {}

function normalizeHost(value) {
  let host = String(value).trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\\/\\//, '')
  host = host.split('/')[0] || ''
  const at = host.lastIndexOf('@')
  if (at !== -1) host = host.slice(at + 1)
  return host.replace(/:\\d*$/, '')
}

function hostFromPrompt(value) {
  const match = value.match(/https?:\\/\\/([^/'"\\s]+)/i) || value.match(/'([^']+)'/i)
  return match ? normalizeHost(match[1]) : ''
}

function classifyHost(host, gitlabHost) {
  if (!host) return 'unknown'
  if (host === 'bitbucket.org') return 'bitbucket'
  if (host === 'github.com') return 'github'
  if (host === 'gitlab.com' || host === normalizeHost(gitlabHost || 'gitlab.com')) return 'gitlab'
  return 'unknown'
}

const prompt = (process.argv[2] || '').toLowerCase()
const provider = classifyHost(hostFromPrompt(prompt), secrets.gitlabHost)

function answer(value) {
  process.stdout.write(value)
  process.exit(0)
}

if (prompt.includes('username')) {
  if (provider === 'bitbucket' && secrets.bitbucketToken) {
    answer(secrets.bitbucketAuthType === 'app_password' ? secrets.bitbucketLogin || '' : 'x-token-auth')
  }
  if (provider === 'gitlab' && secrets.gitlabToken) answer('oauth2')
  if (provider === 'github' && secrets.githubToken) answer('x-access-token')
  process.exit(1)
}
if (provider === 'bitbucket' && secrets.bitbucketToken) answer(secrets.bitbucketToken)
if (provider === 'gitlab' && secrets.gitlabToken) answer(secrets.gitlabToken)
if (provider === 'github' && secrets.githubToken) answer(secrets.githubToken)
process.exit(1)
`
}

let askpassInstall: Promise<string> | null = null

/** Install the (secret-free) askpass script once per app run. */
function ensureAskpassScript(): Promise<string> {
  askpassInstall ??= (async () => {
    await mkdir(SETTINGS_DIR, { recursive: true })
    await writeFile(INSTALLED_ASKPASS_PATH, buildAskpassScript())
    await chmod(INSTALLED_ASKPASS_PATH, 0o755)
    return INSTALLED_ASKPASS_PATH
  })().catch((error: unknown) => {
    askpassInstall = null
    throw error
  })
  return askpassInstall
}

/** Write secrets to a fresh private temp dir. Returns the file path and a cleanup. */
async function writeEphemeralSecrets(
  secrets: ForgeAskpassSecrets
): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), 'gitfreddo-askpass-'))
  await chmod(dir, 0o700)
  const path = join(dir, 'secrets.json')
  await writeFile(path, JSON.stringify(secrets), { mode: 0o600 })
  await chmod(path, 0o600)
  return {
    path,
    cleanup: () => rm(dir, { recursive: true, force: true })
  }
}

/** Delete the old shared plaintext secrets file left by earlier versions. */
export async function removeLegacyAskpassSecrets(): Promise<void> {
  try {
    await unlink(LEGACY_ASKPASS_SECRETS_PATH)
  } catch {
    // already gone
  }
}

function stripForgeCredentialEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next = { ...env }
  const usingForgeAskpass = next.GIT_ASKPASS?.includes('forge-askpass.cjs')

  if (usingForgeAskpass) {
    delete next.GIT_ASKPASS
    if (next.GIT_TERMINAL_PROMPT === '0') {
      delete next.GIT_TERMINAL_PROMPT
    }
  }

  for (const key of FORGE_TOKEN_ENV_KEYS) {
    delete next[key]
  }

  return next
}

/** Remove forge token env vars so git hooks cannot inherit them. */
export function stripForgeTokensFromEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next = { ...env }
  for (const key of FORGE_TOKEN_ENV_KEYS) {
    delete next[key]
  }
  return next
}

export interface PreparedGitEnv {
  env: NodeJS.ProcessEnv
  /** Removes this process's secrets file. Safe to call more than once. */
  cleanup: () => Promise<void>
}

const noopCleanup = async (): Promise<void> => {}

/**
 * Build the env for one git process. Forge tokens are only written (to a private,
 * per-process temp file) when the command can actually prompt for credentials.
 */
export async function prepareGitEnv({
  needsCredentials
}: {
  needsCredentials: boolean
}): Promise<PreparedGitEnv> {
  // Never leave forge tokens in the process env that git (and hooks) inherit.
  const baseEnv = stripForgeCredentialEnv(process.env)
  if (!needsCredentials) {
    return { env: baseEnv, cleanup: noopCleanup }
  }

  const [githubToken, bitbucketToken, gitlabToken, settings] = await Promise.all([
    loadGitHubToken(),
    loadBitbucketToken(),
    loadGitlabToken(),
    loadSettings()
  ])

  if (!githubToken?.trim() && !bitbucketToken?.trim() && !gitlabToken?.trim()) {
    return { env: baseEnv, cleanup: noopCleanup }
  }

  const secrets: ForgeAskpassSecrets = {
    githubToken: githubToken?.trim() || '',
    bitbucketToken: bitbucketToken?.trim() || '',
    bitbucketLogin:
      settings.bitbucketAuthLogin?.trim() || settings.bitbucketLogin?.trim() || '',
    bitbucketAuthType: settings.bitbucketAuthType ?? 'oauth',
    gitlabToken: gitlabToken?.trim() || '',
    gitlabHost:
      settings.gitlabHost?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '') || 'gitlab.com'
  }

  const askpassPath = await ensureAskpassScript()
  const written = await writeEphemeralSecrets(secrets)
  let cleaned = false

  return {
    env: {
      ...baseEnv,
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: askpassPath,
      [ASKPASS_SECRETS_ENV]: written.path
    },
    cleanup: async () => {
      if (cleaned) return
      cleaned = true
      await written.cleanup()
    }
  }
}
