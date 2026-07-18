import {
  buildConfigGetArgs,
  buildConfigListArgs,
  buildConfigSetArgs
} from '../../../shared/git/commands'
import { runGitOrThrow } from '../git-runner'

export type GitConfigScope = 'local' | 'global'

const ALLOWED_CONFIG_KEYS = new Set([
  'user.name',
  'user.email',
  'commit.gpgsign',
  'pull.rebase',
  'init.defaultBranch',
  'core.editor',
  'core.hooksPath',
  'merge.tool'
])

const COMMON_KEYS = [...ALLOWED_CONFIG_KEYS]

export function assertWritableConfigKey(key: string, scope: GitConfigScope): void {
  const trimmed = key.trim()
  if (!trimmed) {
    throw new Error('Config key is required')
  }
  if (scope === 'global') {
    throw new Error('Setting global git config from the app is not allowed')
  }
  if (ALLOWED_CONFIG_KEYS.has(trimmed) || trimmed.startsWith('user.')) {
    return
  }
  throw new Error(`Config key is not allowed: ${trimmed}`)
}

export async function configGet(
  cwd: string,
  gitBinaryPath: string,
  key: string,
  scope: GitConfigScope = 'local'
): Promise<string | null> {
  try {
    const args = buildConfigGetArgs({ key, scope })
    if (scope === 'local') {
      return (await runGitOrThrow(args, { cwd, gitBinaryPath })).trim()
    }
    return (await runGitOrThrow(args, { cwd: process.cwd(), gitBinaryPath })).trim()
  } catch {
    return null
  }
}

export async function configSet(
  cwd: string,
  gitBinaryPath: string,
  key: string,
  value: string,
  scope: GitConfigScope = 'local'
): Promise<void> {
  assertWritableConfigKey(key, scope)
  const args = buildConfigSetArgs({ key, value, scope })
  if (scope === 'local') {
    await runGitOrThrow(args, { cwd, gitBinaryPath })
  } else {
    await runGitOrThrow(args, { cwd: process.cwd(), gitBinaryPath })
  }
}

export async function configList(
  cwd: string,
  gitBinaryPath: string,
  scope: GitConfigScope = 'local'
): Promise<Record<string, string>> {
  const args = buildConfigListArgs(scope)
  const stdout =
    scope === 'local'
      ? await runGitOrThrow(args, { cwd, gitBinaryPath })
      : await runGitOrThrow(args, { cwd: process.cwd(), gitBinaryPath })

  const result: Record<string, string> = {}
  for (const line of stdout.split('\n')) {
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const configKey = line.slice(0, eq)
    if (COMMON_KEYS.includes(configKey) || configKey.startsWith('user.')) {
      result[configKey] = line.slice(eq + 1)
    }
  }
  return result
}
