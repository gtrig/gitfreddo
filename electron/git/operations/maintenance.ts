import { runGit, runGitOrThrow } from '../git-runner'

export interface UnreachableCommit {
  hash: string
  shortHash: string
  subject: string
  authorDate: string
}

export interface UnreachableSummary {
  commits: UnreachableCommit[]
  totalCommitCount: number
  blobCount: number
  treeCount: number
}

export interface PruneResult {
  removedCommitCount: number
}

const PREVIEW_LIMIT = 100

const FSCK_COMMIT_RE = /^unreachable commit ([0-9a-f]{40})$/i
const FSCK_BLOB_RE = /^unreachable blob /i
const FSCK_TREE_RE = /^unreachable tree /i

export function parseFsckUnreachable(stdout: string): {
  commitHashes: string[]
  blobCount: number
  treeCount: number
} {
  const commitHashes: string[] = []
  let blobCount = 0
  let treeCount = 0

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    const commitMatch = trimmed.match(FSCK_COMMIT_RE)
    if (commitMatch) {
      commitHashes.push(commitMatch[1]!.toLowerCase())
      continue
    }
    if (FSCK_BLOB_RE.test(trimmed)) {
      blobCount++
      continue
    }
    if (FSCK_TREE_RE.test(trimmed)) {
      treeCount++
    }
  }

  return { commitHashes, blobCount, treeCount }
}

async function runFsckUnreachable(cwd: string, gitBinaryPath: string): Promise<string> {
  const result = await runGit(['fsck', '--unreachable', '--no-reflogs'], { cwd, gitBinaryPath })
  if (result.code !== 0 && !result.stdout.trim()) {
    throw new Error(result.stderr.trim() || 'git fsck failed')
  }
  return result.stdout
}

async function commitDetails(
  cwd: string,
  gitBinaryPath: string,
  hash: string
): Promise<UnreachableCommit> {
  const out = await runGitOrThrow(
    ['show', '-s', '--format=%H%n%h%n%s%n%aI', hash],
    { cwd, gitBinaryPath }
  )
  const [fullHash, shortHash, subject, authorDate] = out.trim().split('\n')
  return {
    hash: fullHash ?? hash,
    shortHash: shortHash ?? hash.slice(0, 7),
    subject: subject ?? '(no subject)',
    authorDate: authorDate ?? ''
  }
}

export async function listUnreachableCommits(
  cwd: string,
  gitBinaryPath: string
): Promise<UnreachableSummary> {
  const stdout = await runFsckUnreachable(cwd, gitBinaryPath)
  const { commitHashes, blobCount, treeCount } = parseFsckUnreachable(stdout)

  const previewHashes = commitHashes.slice(0, PREVIEW_LIMIT)
  const commits: UnreachableCommit[] = []

  for (const hash of previewHashes) {
    try {
      commits.push(await commitDetails(cwd, gitBinaryPath, hash))
    } catch {
      commits.push({
        hash,
        shortHash: hash.slice(0, 7),
        subject: '(unreadable commit)',
        authorDate: ''
      })
    }
  }

  return {
    commits,
    totalCommitCount: commitHashes.length,
    blobCount,
    treeCount
  }
}

export async function pruneStaleObjects(
  cwd: string,
  gitBinaryPath: string
): Promise<PruneResult> {
  const beforeStdout = await runFsckUnreachable(cwd, gitBinaryPath)
  const beforeCount = parseFsckUnreachable(beforeStdout).commitHashes.length

  await runGitOrThrow(['reflog', 'expire', '--expire=now', '--all'], { cwd, gitBinaryPath })
  await runGitOrThrow(['gc', '--prune=now'], { cwd, gitBinaryPath })

  const afterStdout = await runFsckUnreachable(cwd, gitBinaryPath)
  const afterCount = parseFsckUnreachable(afterStdout).commitHashes.length

  return { removedCommitCount: Math.max(0, beforeCount - afterCount) }
}
