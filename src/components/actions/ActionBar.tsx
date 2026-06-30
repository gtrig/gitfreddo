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
          className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
        >
          Stash
        </button>
        <button
          type="button"
          onClick={() => void fetch.mutateAsync({ remote: defaultRemote })}
          className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
        >
          Fetch
        </button>
        <button
          type="button"
          onClick={() => void pull.mutateAsync({ remote: defaultRemote })}
          className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
        >
          Pull
        </button>
        <button
          type="button"
          onClick={() => void push.mutateAsync({ remote: defaultRemote })}
          className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
        >
          Push
        </button>
      </div>
      <CommitModal open={commitOpen} onClose={() => setCommitOpen(false)} />
      {mergeStatus?.inProgress && <ConflictPanel />}
    </>
  )
}
