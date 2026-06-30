import { runGitOrThrow } from '../git-runner'
import type { GitCommit, GitLogGraphResult } from '../types'

const LOG_FORMAT = [
  '%H',
  '%P',
  '%s',
  '%B',
  '%an',
  '%ae',
  '%aI',
  '%D'
].join('%x1f')

function parseLogEntry(block: string): GitCommit | null {
  const parts = block.split('\x1f')
  if (parts.length < 8) return null

  const [hash, parentsRaw, subject, body, authorName, authorEmail, authorDate, refsRaw] = parts
  const parents = parentsRaw.trim() ? parentsRaw.trim().split(' ') : []
  const refs = refsRaw
    .trim()
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.replace(/^tag: /, ''))

  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    subject: subject.trim(),
    message: body.trim() || subject.trim(),
    author: { name: authorName, email: authorEmail, date: authorDate },
    refs
  }
}

export async function logGraph(
  cwd: string,
  gitBinaryPath: string,
  maxCount = 500
): Promise<GitLogGraphResult> {
  const stdout = await runGitOrThrow(
    ['log', `--max-count=${maxCount}`, `--format=${LOG_FORMAT}`, '--date-order'],
    { cwd, gitBinaryPath }
  )

  const commits = stdout
    .split('\n')
    .filter(Boolean)
    .map(parseLogEntry)
    .filter((c): c is GitCommit => c !== null)

  return { commits, maxCount }
}

export async function showCommit(
  cwd: string,
  gitBinaryPath: string,
  hash: string
): Promise<string> {
  return runGitOrThrow(['show', '--format=', '--name-status', hash], { cwd, gitBinaryPath })
}
