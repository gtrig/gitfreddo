import { runGitOrThrow } from '../git-runner'

export async function rebaseStart(
  cwd: string,
  gitBinaryPath: string,
  onto: string
): Promise<void> {
  await runGitOrThrow(['rebase', onto], { cwd, gitBinaryPath })
}

export async function rebaseAbort(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(['rebase', '--abort'], { cwd, gitBinaryPath })
}

export async function rebaseContinue(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(['rebase', '--continue'], { cwd, gitBinaryPath })
}

export async function cherryPick(
  cwd: string,
  gitBinaryPath: string,
  hash: string
): Promise<void> {
  await runGitOrThrow(['cherry-pick', hash], { cwd, gitBinaryPath })
}

export async function resetRepo(
  cwd: string,
  gitBinaryPath: string,
  mode: 'soft' | 'mixed' | 'hard',
  ref?: string
): Promise<void> {
  const args = ['reset', `--${mode}`]
  if (ref) args.push(ref)
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}
