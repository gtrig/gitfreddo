import type { GitCommit } from '@/lib/types'
import {
  allSelectedOnBranchHistory,
  anySelectedOnBranchHistory,
  areContiguousCommits,
  selectedCommitsChronological,
  selectionHasMergeCommit
} from '@/lib/commitSelection'

interface MultiCommitSelectionBarProps {
  commits: GitCommit[]
  allCommits: GitCommit[]
  primaryHash: string
  head: string
  branch: string
  isDetached: boolean
  isClean: boolean
  gitBusy: boolean
  onSelectPrimary: (hash: string) => void
  onCopyAllHashes: (hashes: string[]) => void
  onCompare: (oldestHash: string, newestHash: string, label: string) => void
  onCherryPickAll: (hashes: string[]) => void
  onSquash: (hashes: string[]) => void
}

export function MultiCommitSelectionBar({
  commits,
  allCommits,
  primaryHash,
  head,
  branch,
  isDetached,
  isClean,
  gitBusy,
  onSelectPrimary,
  onCopyAllHashes,
  onCompare,
  onCherryPickAll,
  onSquash
}: MultiCommitSelectionBarProps) {
  const chronological = selectedCommitsChronological(allCommits, commits.map((commit) => commit.hash))
  const hashes = chronological.map((commit) => commit.hash)
  const oldest = chronological[0]!
  const newest = chronological[chronological.length - 1]!
  const branchLabel = isDetached ? 'detached HEAD' : branch || 'current branch'
  const onHistory = head ? allSelectedOnBranchHistory(commits, head, allCommits) : false
  const anyOnHistory = head ? anySelectedOnBranchHistory(commits, head, allCommits) : false
  const hasMerge = selectionHasMergeCommit(commits)
  const contiguous = areContiguousCommits(chronological)

  const cherryPickDisabled = !isClean || gitBusy || anyOnHistory || hasMerge
  const squashDisabled = !isClean || gitBusy || isDetached || !onHistory || !contiguous || hasMerge
  const compareDisabled = gitBusy

  return (
    <div className="shrink-0 border-b border-gf-border bg-gf-surface/40 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-gf-fg-muted">{commits.length} commits selected</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onCopyAllHashes(hashes)}
            className="rounded border border-gf-border-strong px-2 py-0.5 text-[11px] text-gf-fg-muted hover:bg-gf-surface-hover"
          >
            Copy hashes
          </button>
          <button
            type="button"
            disabled={compareDisabled}
            onClick={() =>
              onCompare(
                oldest.hash,
                newest.hash,
                `${commits.length} commits (${oldest.shortHash}..${newest.shortHash})`
              )
            }
            className="rounded border border-gf-border-strong px-2 py-0.5 text-[11px] text-gf-fg-muted hover:bg-gf-surface-hover disabled:opacity-40"
          >
            Compare
          </button>
          <button
            type="button"
            disabled={cherryPickDisabled}
            title={
              anyOnHistory
                ? `Some commits are already on ${branchLabel}`
                : hasMerge
                  ? 'Merge commits cannot be cherry-picked as a group'
                  : undefined
            }
            onClick={() => onCherryPickAll(hashes)}
            className="rounded border border-gf-border-strong px-2 py-0.5 text-[11px] text-gf-fg-muted hover:bg-gf-surface-hover disabled:opacity-40"
          >
            Cherry-pick all
          </button>
          <button
            type="button"
            disabled={squashDisabled}
            title={
              !contiguous
                ? 'Selected commits must be adjacent in history'
                : !onHistory
                  ? `All commits must be on ${branchLabel}`
                  : undefined
            }
            onClick={() => onSquash(hashes)}
            className="rounded border border-gf-border-strong px-2 py-0.5 text-[11px] text-gf-fg-muted hover:bg-gf-surface-hover disabled:opacity-40"
          >
            Squash
          </button>
        </div>
      </div>
      <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">
        {commits.map((commit) => {
          const isPrimary = commit.hash === primaryHash
          return (
            <li key={commit.hash}>
              <button
                type="button"
                onClick={() => onSelectPrimary(commit.hash)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-gf-surface-hover ${
                  isPrimary ? 'bg-gf-accent/15 text-gf-fg' : 'text-gf-fg-muted'
                }`}
              >
                <span className="font-mono text-[11px] text-gf-fg-subtle">{commit.shortHash}</span>
                <span className="min-w-0 truncate">{commit.subject}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
