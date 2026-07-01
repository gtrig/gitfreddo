import { readGitMetadataFile } from '../git-dir'
import { runGit, runGitOrThrow } from '../git-runner'

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

  const result = await runGit(['bisect', 'log'], { cwd, gitBinaryPath })
  const lines = result.stdout.trim().split('\n').filter(Boolean)
  const good = lines.find((line) => line.startsWith('good'))
  const bad = lines.find((line) => line.startsWith('bad'))

  const head = (await runGitOrThrow(['rev-parse', 'HEAD'], { cwd, gitBinaryPath })).trim()

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
  const args = ['bisect', 'start', badRef]
  if (goodRef?.trim()) args.push(goodRef.trim())
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function bisectGood(cwd: string, gitBinaryPath: string, ref?: string): Promise<void> {
  const args = ['bisect', 'good']
  if (ref?.trim()) args.push(ref.trim())
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function bisectBad(cwd: string, gitBinaryPath: string, ref?: string): Promise<void> {
  const args = ['bisect', 'bad']
  if (ref?.trim()) args.push(ref.trim())
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function bisectReset(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(['bisect', 'reset'], { cwd, gitBinaryPath })
}
