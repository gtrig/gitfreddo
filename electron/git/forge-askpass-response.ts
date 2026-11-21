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

/** Lowercased host from a git credential prompt, without userinfo or port. */
export function hostFromAskpassPrompt(value: string): string {
  const match = value.match(/https?:\/\/([^/'"\s]+)/i) || value.match(/'([^']+)'/i)
  if (!match) return ''
  return normalizeHost(match[1])
}

/** Strip scheme, userinfo, port and trailing slash; lowercase. */
export function normalizeHost(value: string): string {
  let host = value.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
  host = host.split('/')[0] ?? ''
  const at = host.lastIndexOf('@')
  if (at !== -1) host = host.slice(at + 1)
  return host.replace(/:\d*$/, '')
}

/** Exact host match only — lookalike hosts never receive a forge token. */
function classifyHost(
  host: string,
  gitlabHost: string
): 'bitbucket' | 'github' | 'gitlab' | 'unknown' {
  if (!host) return 'unknown'
  if (host === 'bitbucket.org') return 'bitbucket'
  if (host === 'github.com') return 'github'
  if (host === 'gitlab.com' || host === normalizeHost(gitlabHost)) return 'gitlab'
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
