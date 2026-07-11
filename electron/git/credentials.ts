import { chmod, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { loadBitbucketToken } from '../bitbucket/token-store'
import { loadGitHubToken } from '../github/token-store'
import { loadSettings } from '../settings'
import { getAppDataDir } from '../paths'

const SETTINGS_DIR = getAppDataDir()
const INSTALLED_ASKPASS_PATH = join(SETTINGS_DIR, 'forge-askpass.cjs')

const ASKPASS_SCRIPT = `#!/usr/bin/env node
const githubToken = process.env.gitfreddo_GITHUB_TOKEN || ''
const bitbucketToken = process.env.gitfreddo_BITBUCKET_TOKEN || ''
const bitbucketLogin = process.env.gitfreddo_BITBUCKET_LOGIN || ''
const bitbucketAuthType = process.env.gitfreddo_BITBUCKET_AUTH_TYPE || 'oauth'
const prompt = (process.argv[2] || '').toLowerCase()

function hostFromPrompt(value) {
  const match = value.match(/https?:\\/\\/([^/'\\"]+)/i) || value.match(/'([^']+)'/i)
  return match ? match[1].toLowerCase() : ''
}

const host = hostFromPrompt(prompt)
const isBitbucket = host.includes('bitbucket.org')
const isGitHub = host.includes('github.com') || host.includes('github')

if (prompt.includes('username')) {
  if (isBitbucket) {
    process.stdout.write(bitbucketAuthType === 'app_password' ? bitbucketLogin : 'x-token-auth')
  } else if (isGitHub && githubToken) {
    process.stdout.write('x-access-token')
  } else if (bitbucketToken) {
    process.stdout.write(bitbucketAuthType === 'app_password' ? bitbucketLogin : 'x-token-auth')
  } else {
    process.stdout.write('x-access-token')
  }
} else if (isBitbucket) {
  process.stdout.write(bitbucketToken)
} else if (isGitHub) {
  process.stdout.write(githubToken)
} else if (bitbucketToken) {
  process.stdout.write(bitbucketToken)
} else {
  process.stdout.write(githubToken)
}
`

async function ensureAskpassScript(): Promise<string> {
  await mkdir(SETTINGS_DIR, { recursive: true })
  await writeFile(INSTALLED_ASKPASS_PATH, ASKPASS_SCRIPT)
  await chmod(INSTALLED_ASKPASS_PATH, 0o755)
  return INSTALLED_ASKPASS_PATH
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

  delete next.gitfreddo_GITHUB_TOKEN
  delete next.gitfreddo_BITBUCKET_TOKEN
  delete next.gitfreddo_BITBUCKET_LOGIN
  delete next.gitfreddo_BITBUCKET_AUTH_TYPE

  return next
}

export async function buildGitEnv(): Promise<NodeJS.ProcessEnv> {
  const [githubToken, bitbucketToken, settings] = await Promise.all([
    loadGitHubToken(),
    loadBitbucketToken(),
    loadSettings()
  ])

  if (!githubToken?.trim() && !bitbucketToken?.trim()) {
    return stripForgeCredentialEnv(process.env)
  }

  const askpassPath = await ensureAskpassScript()
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: askpassPath
  }

  if (githubToken?.trim()) {
    env.gitfreddo_GITHUB_TOKEN = githubToken
  }
  if (bitbucketToken?.trim()) {
    env.gitfreddo_BITBUCKET_TOKEN = bitbucketToken
    env.gitfreddo_BITBUCKET_LOGIN =
      settings.bitbucketAuthLogin?.trim() || settings.bitbucketLogin?.trim() || ''
    env.gitfreddo_BITBUCKET_AUTH_TYPE = settings.bitbucketAuthType ?? 'oauth'
  }

  return env
}
