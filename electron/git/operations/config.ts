import { runGitOrThrow } from '../git-runner'

export type GitConfigScope = 'local' | 'global'

const COMMON_KEYS = [
  'user.name',
  'user.email',
  'commit.gpgsign',
  'pull.rebase',
  'init.defaultBranch',
  'core.editor',
  'merge.tool'
]

export async function configGet(
  cwd: string,
  gitBinaryPath: string,
  key: string,
  scope: GitConfigScope = 'local'
): Promise<string | null> {
  try {
    const args = ['config', scope === 'global' ? '--global' : '--local', key]
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
  const args = ['config', scope === 'global' ? '--global' : '--local', key, value]
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
  const args = ['config', scope === 'global' ? '--global' : '--local', '--list']
  const stdout =
    scope === 'local'
      ? await runGitOrThrow(args, { cwd, gitBinaryPath })
      : await runGitOrThrow(args, { cwd: process.cwd(), gitBinaryPath })

  const result: Record<string, string> = {}
  for (const line of stdout.split('\n')) {
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq)
    if (COMMON_KEYS.includes(key) || key.startsWith('user.')) {
      result[key] = line.slice(eq + 1)
    }
  }
  return result
}
