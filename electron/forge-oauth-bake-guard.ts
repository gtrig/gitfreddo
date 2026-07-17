/**
 * Env keys that electron.vite bakes into the main bundle for packaged OAuth.
 * Values must be present in the release CI job env (from Actions secrets).
 */
export const FORGE_OAUTH_BAKE_ENV_KEYS = [
  'GITHUB_CLIENT_ID',
  'BITBUCKET_CLIENT_ID',
  'BITBUCKET_CLIENT_SECRET',
  'GITLAB_CLIENT_ID',
  'GITLAB_CLIENT_SECRET'
] as const

export type ForgeOAuthBakeEnvKey = (typeof FORGE_OAUTH_BAKE_ENV_KEYS)[number]

/** Returns bake keys that are missing or blank (never returns secret values). */
export function missingForgeOAuthBakeEnvKeys(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>
): ForgeOAuthBakeEnvKey[] {
  return FORGE_OAUTH_BAKE_ENV_KEYS.filter((key) => !(env[key]?.trim() ?? ''))
}

export function formatMissingForgeOAuthBakeEnvError(missing: readonly string[]): string {
  return [
    'Forge OAuth bake env is incomplete; release installers would ship without credentials.',
    `Missing or empty: ${missing.join(', ')}.`,
    'Set repository Actions secrets (exact names):',
    '  GITFREDDO_GITHUB_CLIENT_ID → GITHUB_CLIENT_ID',
    '  BITBUCKET_CLIENT_ID, BITBUCKET_CLIENT_SECRET',
    '  GITLAB_CLIENT_ID, GITLAB_CLIENT_SECRET',
    'Secrets must be repository secrets (not an unused Environment). Then re-run the Release workflow.'
  ].join('\n')
}
