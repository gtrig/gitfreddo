import { useRef } from 'react'
import type { GitCommit } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import { shouldVirtualize, COMPACT_ROW_HEIGHT, VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'
import { ExplainCommitButton } from '@/components/DetailPanel/ExplainCommitWithAi'
import {
  allSelectedOnBranchHistory,
  anySelectedOnBranchHistory,
  areContiguousCommits,
  selectedCommitsChronological,
  selectionHasMergeCommit
} from '@/lib/git/commitSelection'

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
  const { t } = useTranslation()
  const chronological = selectedCommitsChronological(allCommits, commits.map((commit) => commit.hash))
  const hashes = chronological.map((commit) => commit.hash)
  const oldest = chronological[0]!
  const newest = chronological[chronological.length - 1]!
  const branchLabel = isDetached
    ? t('contextMenu.detachedHead')
    : branch || t('contextMenu.currentBranch')
  const onHistory = head ? allSelectedOnBranchHistory(commits, head, allCommits) : false
  const anyOnHistory = head ? anySelectedOnBranchHistory(commits, head, allCommits) : false
  const hasMerge = selectionHasMergeCommit(commits)
  const contiguous = areContiguousCommits(chronological)

  const cherryPickDisabled = !isClean || gitBusy || anyOnHistory || hasMerge
  const squashDisabled = !isClean || gitBusy || isDetached || !onHistory || !contiguous || hasMerge
  const compareDisabled = gitBusy

  const commitsScrollRef = useRef<HTMLUListElement>(null)
  const useVirtualization = shouldVirtualize(commits.length)

  const commitsVirtualizer = useVirtualizer({
    count: useVirtualization ? commits.length : 0,
    getScrollElement: () => commitsScrollRef.current,
    estimateSize: () => COMPACT_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  return (
    <div className="shrink-0 border-b border-gf-border bg-gf-surface/40 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-gf-fg-muted">
          {t('detail.commitsSelected', { count: commits.length })}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onCopyAllHashes(hashes)}
            className="rounded border border-gf-border-strong px-2 py-0.5 text-[11px] text-gf-fg-muted hover:bg-gf-surface-hover"
          >
            {t('detail.copyHashes')}
          </button>
          <button
            type="button"
            disabled={compareDisabled}
            onClick={() =>
              onCompare(
                oldest.hash,
                newest.hash,
                t('detail.compareLabel', {
                  count: commits.length,
                  oldest: oldest.shortHash,
                  newest: newest.shortHash
                })
              )
            }
            className="rounded border border-gf-border-strong px-2 py-0.5 text-[11px] text-gf-fg-muted hover:bg-gf-surface-hover disabled:opacity-40"
          >
            {t('detail.compare')}
          </button>
          <ExplainCommitButton commits={chronological} variant="pill" disabled={gitBusy} />
          <button
            type="button"
            disabled={cherryPickDisabled}
            title={
              anyOnHistory
                ? t('detail.someAlreadyOnBranch', { branch: branchLabel })
                : hasMerge
                  ? t('detail.mergeCannotCherryPickGroup')
                  : undefined
            }
            onClick={() => onCherryPickAll(hashes)}
            className="rounded border border-gf-border-strong px-2 py-0.5 text-[11px] text-gf-fg-muted hover:bg-gf-surface-hover disabled:opacity-40"
          >
            {t('detail.cherryPickAll')}
          </button>
          <button
            type="button"
            disabled={squashDisabled}
            title={
              !contiguous
                ? t('detail.selectionNotContiguous')
                : !onHistory
                  ? t('detail.allMustBeOnBranch', { branch: branchLabel })
                  : undefined
            }
            onClick={() => onSquash(hashes)}
            className="rounded border border-gf-border-strong px-2 py-0.5 text-[11px] text-gf-fg-muted hover:bg-gf-surface-hover disabled:opacity-40"
          >
            {t('detail.squash')}
          </button>
        </div>
      </div>
      <ul ref={commitsScrollRef} className="mt-2 max-h-36 overflow-y-auto">
        {useVirtualization ? (
          <div style={{ height: commitsVirtualizer.getTotalSize(), position: 'relative' }}>
            {commitsVirtualizer.getVirtualItems().map((virtualItem) => {
              const commit = commits[virtualItem.index]!
              const isPrimary = commit.hash === primaryHash
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPrimary(commit.hash)}
                    className={`flex h-full w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-gf-surface-hover ${
                      isPrimary ? 'bg-gf-accent/15 text-gf-fg' : 'text-gf-fg-muted'
                    }`}
                  >
                    <span className="font-mono text-[11px] text-gf-fg-subtle">{commit.shortHash}</span>
                    <span className="min-w-0 truncate">{commit.subject}</span>
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          commits.map((commit) => {
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
          })
        )}
      </ul>
    </div>
  )
}
