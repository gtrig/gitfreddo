import { chmod, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { loadBitbucketToken } from '../bitbucket/token-store'
import { loadGitHubToken } from '../github/token-store'
import { loadGitlabToken } from '../gitlab/token-store'
import { loadSettings } from '../settings'
import { getAppDataDir } from '../paths'
import type { ForgeAskpassSecrets } from './forge-askpass-response'

const SETTINGS_DIR = getAppDataDir()
const INSTALLED_ASKPASS_PATH = join(SETTINGS_DIR, 'forge-askpass.cjs')
const ASKPASS_SECRETS_PATH = join(SETTINGS_DIR, 'forge-askpass-secrets.json')

const FORGE_TOKEN_ENV_KEYS = [
  'gitfreddo_GITHUB_TOKEN',
  'gitfreddo_BITBUCKET_TOKEN',
  'gitfreddo_BITBUCKET_LOGIN',
  'gitfreddo_BITBUCKET_AUTH_TYPE',
  'gitfreddo_GITLAB_TOKEN',
  'gitfreddo_GITLAB_HOST'
] as const

function buildAskpassScript(secretsPath: string): string {
  const escapedPath = JSON.stringify(secretsPath)
  return `#!/usr/bin/env node
const fs = require('fs')
const secretsPath = ${escapedPath}
let secrets = {
  githubToken: '',
  bitbucketToken: '',
  bitbucketLogin: '',
  bitbucketAuthType: 'oauth',
  gitlabToken: '',
  gitlabHost: 'gitlab.com'
}
try {
  secrets = { ...secrets, ...JSON.parse(fs.readFileSync(secretsPath, 'utf8')) }
} catch {}

const prompt = (process.argv[2] || '').toLowerCase()

function hostFromPrompt(value) {
  const match = value.match(/https?:\\/\\/([^/'\\"]+)/i) || value.match(/'([^']+)'/i)
  return match ? match[1].toLowerCase() : ''
}

function classifyHost(host, gitlabHost) {
  if (host.includes('bitbucket.org')) return 'bitbucket'
  if (host.includes('github.com') || host.includes('github')) return 'github'
  const normalizedGitlab = (gitlabHost || 'gitlab.com').toLowerCase()
  if (host.includes('gitlab.com') || host === normalizedGitlab || host.endsWith('.gitlab.com')) {
    return 'gitlab'
  }
  return 'unknown'
}

const host = hostFromPrompt(prompt)
const provider = classifyHost(host, secrets.gitlabHost)

function fail() {
  process.exit(1)
}

if (prompt.includes('username')) {
  if (provider === 'bitbucket' && secrets.bitbucketToken) {
    process.stdout.write(
      secrets.bitbucketAuthType === 'app_password' ? secrets.bitbucketLogin || '' : 'x-token-auth'
    )
  } else if (provider === 'gitlab' && secrets.gitlabToken) {
    process.stdout.write('oauth2')
  } else if (provider === 'github' && secrets.githubToken) {
    process.stdout.write('x-access-token')
  } else {
    fail()
  }
} else if (provider === 'bitbucket' && secrets.bitbucketToken) {
  process.stdout.write(secrets.bitbucketToken)
} else if (provider === 'gitlab' && secrets.gitlabToken) {
  process.stdout.write(secrets.gitlabToken)
} else if (provider === 'github' && secrets.githubToken) {
  process.stdout.write(secrets.githubToken)
} else {
  fail()
}
`
}

async function ensureAskpassScript(): Promise<string> {
  await mkdir(SETTINGS_DIR, { recursive: true })
  await writeFile(INSTALLED_ASKPASS_PATH, buildAskpassScript(ASKPASS_SECRETS_PATH))
  await chmod(INSTALLED_ASKPASS_PATH, 0o755)
  return INSTALLED_ASKPASS_PATH
}

async function writeAskpassSecrets(secrets: ForgeAskpassSecrets): Promise<void> {
  await mkdir(SETTINGS_DIR, { recursive: true })
  await writeFile(ASKPASS_SECRETS_PATH, JSON.stringify(secrets), { mode: 0o600 })
  await chmod(ASKPASS_SECRETS_PATH, 0o600)
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

export async function buildGitEnv(): Promise<NodeJS.ProcessEnv> {
  const [githubToken, bitbucketToken, gitlabToken, settings] = await Promise.all([
    loadGitHubToken(),
    loadBitbucketToken(),
    loadGitlabToken(),
    loadSettings()
  ])

  // Never leave forge tokens in the process env that git (and hooks) inherit.
  const baseEnv = stripForgeCredentialEnv(process.env)

  if (!githubToken?.trim() && !bitbucketToken?.trim() && !gitlabToken?.trim()) {
    return baseEnv
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

  await writeAskpassSecrets(secrets)
  const askpassPath = await ensureAskpassScript()

  return {
    ...baseEnv,
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: askpassPath
  }
}
