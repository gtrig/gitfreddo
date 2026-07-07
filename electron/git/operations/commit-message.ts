import { mkdtemp, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildCommitFileArgs } from '../../../shared/git/commands'
import { runGitOrThrow } from '../git-runner'

export const NON_INTERACTIVE_GIT_ENV: NodeJS.ProcessEnv = {
  GIT_EDITOR: 'true',
  GIT_TERMINAL_PROMPT: '0'
}

/** Commit using a message file (avoids opening an interactive editor). */
export async function commitWithMessageFile(
  cwd: string,
  gitBinaryPath: string,
  message: string
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'gitfreddo-commit-'))
  const msgPath = join(dir, 'COMMIT_EDITMSG')
  try {
    const text = message.endsWith('\n') ? message : `${message}\n`
    await writeFile(msgPath, text, 'utf8')
    await runGitOrThrow(buildCommitFileArgs(msgPath), { cwd, gitBinaryPath })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function continueGitOperation(
  cwd: string,
  gitBinaryPath: string,
  continueArgs: string[],
  message?: string
): Promise<void> {
  if (message?.trim()) {
    await commitWithMessageFile(cwd, gitBinaryPath, message.trim())
    return
  }
  await runGitOrThrow(continueArgs, {
    cwd,
    gitBinaryPath,
    env: NON_INTERACTIVE_GIT_ENV
  })
}
