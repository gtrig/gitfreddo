export interface ForgeOAuthBuildEnv {
  githubClientId: string
  bitbucketClientId: string
  bitbucketClientSecret: string
  gitlabClientId: string
  gitlabClientSecret: string
  gitlabHost: string
}

export function firstNonEmpty(...values: Array<string | undefined | null>): string {
  for (const value of values) {
    const trimmed = value?.trim() ?? ''
    if (trimmed) return trimmed
  }
  return ''
}

/**
 * Runtime values (process.env / .env) win; build-time baked values fill gaps for release installs.
 */
export function resolveForgeOAuthEnv(
  runtime: NodeJS.ProcessEnv | Record<string, string | undefined>,
  build: ForgeOAuthBuildEnv
): ForgeOAuthBuildEnv {
  return {
    githubClientId: firstNonEmpty(runtime.GITHUB_CLIENT_ID, build.githubClientId),
    bitbucketClientId: firstNonEmpty(runtime.BITBUCKET_CLIENT_ID, build.bitbucketClientId),
    bitbucketClientSecret: firstNonEmpty(
      runtime.BITBUCKET_CLIENT_SECRET,
      build.bitbucketClientSecret
    ),
    gitlabClientId: firstNonEmpty(runtime.GITLAB_CLIENT_ID, build.gitlabClientId),
    gitlabClientSecret: firstNonEmpty(runtime.GITLAB_CLIENT_SECRET, build.gitlabClientSecret),
    gitlabHost: firstNonEmpty(runtime.GITLAB_HOST, build.gitlabHost)
  }
}

/**
 * Values injected at compile time via electron.vite `define` (see electron.vite.config.ts).
 * Distinct from runtime `GITHUB_CLIENT_ID` so local `.env` loading still works in dev.
 */
export function getBuildTimeForgeOAuthEnv(): ForgeOAuthBuildEnv {
  return {
    githubClientId: process.env.GITFREDDO_BUILD_GITHUB_CLIENT_ID ?? '',
    bitbucketClientId: process.env.GITFREDDO_BUILD_BITBUCKET_CLIENT_ID ?? '',
    bitbucketClientSecret: process.env.GITFREDDO_BUILD_BITBUCKET_CLIENT_SECRET ?? '',
    gitlabClientId: process.env.GITFREDDO_BUILD_GITLAB_CLIENT_ID ?? '',
    gitlabClientSecret: process.env.GITFREDDO_BUILD_GITLAB_CLIENT_SECRET ?? '',
    gitlabHost: process.env.GITFREDDO_BUILD_GITLAB_HOST ?? ''
  }
}

export function getResolvedForgeOAuthEnv(
  runtime: NodeJS.ProcessEnv = process.env
): ForgeOAuthBuildEnv {
  return resolveForgeOAuthEnv(runtime, getBuildTimeForgeOAuthEnv())
}
