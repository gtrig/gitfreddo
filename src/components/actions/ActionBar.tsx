import { useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useDefaultRemote } from '@/hooks/useAppSettings'
import { CommitModal } from '@/components/actions/CommitModal'
import { ConflictPanel } from '@/components/ConflictPanel/ConflictPanel'
import { useMergeStatus } from '@/hooks/useGit'

export function ActionBar() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { fetch, pull, push, stashPush } = useGitMutations()
  const defaultRemote = useDefaultRemote()
  const { data: mergeStatus } = useMergeStatus(connected)
  const [commitOpen, setCommitOpen] = useState(false)

  if (!connected) return null

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCommitOpen(true)}
          className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500"
        >
          Commit
        </button>
        <button
          type="button"
          onClick={() => void stashPush.mutateAsync({})}
          className="rounded border border-gf-border-strong px-3 py-1 text-xs text-gf-fg-muted hover:bg-gf-bg"
        >
          Stash
        </button>
        <button
          type="button"
          onClick={() => void fetch.mutateAsync({ remote: defaultRemote })}
          className="rounded border border-gf-border-strong px-3 py-1 text-xs text-gf-fg-muted hover:bg-gf-bg"
        >
          Fetch
        </button>
        <button
          type="button"
          onClick={() => void pull.mutateAsync({ remote: defaultRemote })}
          className="rounded border border-gf-border-strong px-3 py-1 text-xs text-gf-fg-muted hover:bg-gf-bg"
        >
          Pull
        </button>
        <button
          type="button"
          onClick={() => void push.mutateAsync({ remote: defaultRemote })}
          className="rounded border border-gf-border-strong px-3 py-1 text-xs text-gf-fg-muted hover:bg-gf-bg"
        >
          Push
        </button>
      </div>
      <CommitModal open={commitOpen} onClose={() => setCommitOpen(false)} />
      {mergeStatus?.inProgress && <ConflictPanel />}
    </>
  )
}
