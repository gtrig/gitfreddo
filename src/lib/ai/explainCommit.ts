import type { AiExplainCommitInput } from '@shared/ai'
import type { GitCommit } from '@/lib/types'

export function buildExplainCommitInputs(
  commits: GitCommit[],
  filePathsByHash: Record<string, string[]> = {}
): AiExplainCommitInput[] {
  return commits.map((commit) => ({
    hash: commit.hash,
    shortHash: commit.shortHash,
    subject: commit.subject,
    author: commit.author.name,
    date: commit.author.date,
    filePaths: filePathsByHash[commit.hash]
  }))
}
