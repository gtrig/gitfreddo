import type { GitCommit } from '@/lib/types'

interface MultiCommitSelectionBarProps {
  commits: GitCommit[]
  primaryHash: string
  onSelectPrimary: (hash: string) => void
}

export function MultiCommitSelectionBar({
  commits,
  primaryHash,
  onSelectPrimary
}: MultiCommitSelectionBarProps) {
  return (
    <div className="shrink-0 border-b border-gf-border bg-gf-surface/40 px-4 py-3">
      <p className="text-xs font-medium text-gf-fg-muted">
        {commits.length} commits selected
      </p>
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
