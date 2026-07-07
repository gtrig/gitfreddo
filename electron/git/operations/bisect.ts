import {
  buildBisectBadArgs,
  buildBisectGoodArgs,
  buildBisectResetArgs,
  buildBisectStartArgs,
  bisectLog,
  buildRevParseHeadArgs
} from '../../../shared/git/commands'
import { readGitMetadataFile } from '../git-dir'
import { runCommand, runGitOrThrow } from '../git-runner'

export interface GitBisectStatus {
  active: boolean
  good?: string
  bad?: string
  current?: string
  remaining?: number
}

export async function bisectStatus(
  cwd: string,
  gitBinaryPath: string
): Promise<GitBisectStatus> {
  const logExists = Boolean(await readGitMetadataFile(cwd, gitBinaryPath, 'BISECT_LOG'))
  if (!logExists) {
    return { active: false }
  }

  const result = await runCommand(bisectLog, undefined as never, { cwd, gitBinaryPath })
  const lines = result.stdout.trim().split('\n').filter(Boolean)
  const good = lines.find((line) => line.startsWith('good'))
  const bad = lines.find((line) => line.startsWith('bad'))

  const head = (await runGitOrThrow(buildRevParseHeadArgs(), { cwd, gitBinaryPath })).trim()

  return {
    active: true,
    good: good?.split(/\s+/)[1],
    bad: bad?.split(/\s+/)[1],
    current: head
  }
}

export async function bisectStart(
  cwd: string,
  gitBinaryPath: string,
  badRef: string,
  goodRef?: string
): Promise<void> {
  await runGitOrThrow(buildBisectStartArgs({ badRef, goodRef }), { cwd, gitBinaryPath })
}

export async function bisectGood(cwd: string, gitBinaryPath: string, ref?: string): Promise<void> {
  await runGitOrThrow(buildBisectGoodArgs(ref), { cwd, gitBinaryPath })
}

export async function bisectBad(cwd: string, gitBinaryPath: string, ref?: string): Promise<void> {
  await runGitOrThrow(buildBisectBadArgs(ref), { cwd, gitBinaryPath })
}

export async function bisectReset(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(buildBisectResetArgs(), { cwd, gitBinaryPath })
}
