import {
  buildApplyPatchArgs,
  buildCommitArgs,
  buildDiffCachedNameStatusArgs,
  buildDiffCachedPatchArgs,
  buildReadTreeEmptyArgs,
  buildResetIndexArgs,
  buildRevParseHeadArgs
} from '../../../shared/git/commands'
import type { ComposeCommitProposal, ComposeCommitsResult } from '../../../shared/git/ipc/results'
import { runGit, runGitOrThrow } from '../git-runner'

/** Map each staged path to every path its change touches (a rename's source too). */
export function stagedPathGroups(nameStatusZ: string): Map<string, string[]> {
  const fields = nameStatusZ.split('\0').filter((field) => field.length > 0)
  const groups = new Map<string, string[]>()
  for (let index = 0; index < fields.length; ) {
    const status = fields[index]!
    if (status.startsWith('R') || status.startsWith('C')) {
      const source = fields[index + 1]!
      const target = fields[index + 2]!
      groups.set(target, status.startsWith('R') ? [source, target] : [target])
      index += 3
    } else {
      const path = fields[index + 1]!
      groups.set(path, [path])
      index += 2
    }
  }
  return groups
}

export type ComposeProposalInput = ComposeCommitProposal

async function hasHead(cwd: string, gitBinaryPath: string): Promise<boolean> {
  const result = await runGit(buildRevParseHeadArgs(), { cwd, gitBinaryPath })
  return result.code === 0
}

async function unstageAll(cwd: string, gitBinaryPath: string): Promise<void> {
  const args = (await hasHead(cwd, gitBinaryPath)) ? buildResetIndexArgs() : buildReadTreeEmptyArgs()
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

async function applyToIndex(cwd: string, gitBinaryPath: string, patch: string): Promise<void> {
  await runGitOrThrow(buildApplyPatchArgs({ patch }), { cwd, gitBinaryPath, input: patch })
}

/**
 * Split the current index into several commits, one per proposal.
 *
 * Works from the staged content (not the working tree), so partially staged files
 * keep their unstaged hunks out of the commit and staged renames stay whole. If a
 * commit fails part-way, the not-yet-committed staged changes are put back.
 */
export async function composeCommits(
  cwd: string,
  gitBinaryPath: string,
  proposals: readonly ComposeCommitProposal[]
): Promise<ComposeCommitsResult> {
  if (proposals.length === 0) {
    throw new Error('There are no commits to create.')
  }

  const groups = stagedPathGroups(
    await runGitOrThrow(buildDiffCachedNameStatusArgs(), { cwd, gitBinaryPath })
  )
  const patches: string[] = []
  for (const proposal of proposals) {
    const paths = [...new Set(proposal.files.flatMap((file) => groups.get(file) ?? [file]))]
    patches.push(
      paths.length > 0
        ? await runGitOrThrow(buildDiffCachedPatchArgs({ paths }), { cwd, gitBinaryPath })
        : ''
    )
  }

  await unstageAll(cwd, gitBinaryPath)

  let created = 0
  for (let index = 0; index < proposals.length; index += 1) {
    const patch = patches[index]!
    if (!patch.trim()) continue
    try {
      await applyToIndex(cwd, gitBinaryPath, patch)
      await runGitOrThrow(buildCommitArgs({ message: proposals[index]!.message }), {
        cwd,
        gitBinaryPath
      })
      created += 1
    } catch (error) {
      await unstageAll(cwd, gitBinaryPath).catch(() => undefined)
      for (const remaining of patches.slice(index)) {
        if (remaining.trim()) {
          await applyToIndex(cwd, gitBinaryPath, remaining).catch(() => undefined)
        }
      }
      const detail = error instanceof Error ? error.message : String(error)
      const total = patches.filter((candidate) => candidate.trim()).length
      throw new Error(`Created ${created} of ${total} commits: ${detail}`)
    }
  }

  return { created }
}
