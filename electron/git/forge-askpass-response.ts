export interface ForgeAskpassSecrets {
  githubToken: string
  bitbucketToken: string
  bitbucketLogin: string
  bitbucketAuthType: string
  gitlabToken: string
  gitlabHost: string
}

export interface ForgeAskpassResult {
  stdout: string
  exitCode: number
}

export function hostFromAskpassPrompt(value: string): string {
  const match = value.match(/https?:\/\/([^/'"]+)/i) || value.match(/'([^']+)'/i)
  return match ? match[1].toLowerCase() : ''
}

function classifyHost(
  host: string,
  gitlabHost: string
): 'bitbucket' | 'github' | 'gitlab' | 'unknown' {
  if (host.includes('bitbucket.org')) return 'bitbucket'
  if (host.includes('github.com') || host.includes('github')) return 'github'
  const normalizedGitlab = gitlabHost.toLowerCase()
  if (
    host.includes('gitlab.com') ||
    host === normalizedGitlab ||
    host.endsWith('.gitlab.com')
  ) {
    return 'gitlab'
  }
  return 'unknown'
}

/** Resolve username/password for GIT_ASKPASS. Unknown hosts fail closed (no token fallback). */
export function resolveForgeAskpassResponse(
  promptRaw: string,
  secrets: ForgeAskpassSecrets
): ForgeAskpassResult {
  const prompt = promptRaw.toLowerCase()
  const host = hostFromAskpassPrompt(prompt)
  const provider = classifyHost(host, secrets.gitlabHost || 'gitlab.com')

  if (prompt.includes('username')) {
    if (provider === 'bitbucket' && secrets.bitbucketToken) {
      return {
        stdout:
          secrets.bitbucketAuthType === 'app_password'
            ? secrets.bitbucketLogin
            : 'x-token-auth',
        exitCode: 0
      }
    }
    if (provider === 'gitlab' && secrets.gitlabToken) {
      return { stdout: 'oauth2', exitCode: 0 }
    }
    if (provider === 'github' && secrets.githubToken) {
      return { stdout: 'x-access-token', exitCode: 0 }
    }
    return { stdout: '', exitCode: 1 }
  }

  if (provider === 'bitbucket' && secrets.bitbucketToken) {
    return { stdout: secrets.bitbucketToken, exitCode: 0 }
  }
  if (provider === 'gitlab' && secrets.gitlabToken) {
    return { stdout: secrets.gitlabToken, exitCode: 0 }
  }
  if (provider === 'github' && secrets.githubToken) {
    return { stdout: secrets.githubToken, exitCode: 0 }
  }

  return { stdout: '', exitCode: 1 }
}
