import { useMergeStatus } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkspaceStore } from '@/stores/workspace'

export function ConflictPanel() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: mergeStatus } = useMergeStatus(connected)
  const { mergeAbort, mergeContinue, stageAdd } = useGitMutations()

  if (!mergeStatus?.inProgress) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg border border-orange-500/40 bg-zinc-900 p-4 shadow-xl">
      <h3 className="text-sm font-semibold text-orange-300">Merge in progress</h3>
      <p className="mt-1 text-xs text-zinc-400">
        {mergeStatus.conflictedPaths.length > 0
          ? `${mergeStatus.conflictedPaths.length} conflicted file(s)`
          : 'Resolve conflicts then continue'}
      </p>
      {mergeStatus.conflictedPaths.length > 0 && (
        <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-zinc-300">
          {mergeStatus.conflictedPaths.map((path) => (
            <li key={path} className="flex items-center justify-between gap-2 py-0.5">
              <span className="truncate">{path}</span>
              <button
                type="button"
                onClick={() => void window.gitfredo.openInEditor(path)}
                className="shrink-0 text-sky-400 hover:text-sky-300"
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            void stageAdd.mutateAsync({ paths: mergeStatus.conflictedPaths }).then(() =>
              mergeContinue.mutateAsync({})
            )
          }
          className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500"
        >
          Mark resolved & continue
        </button>
        <button
          type="button"
          onClick={() => void mergeAbort.mutateAsync({})}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-white"
        >
          Abort
        </button>
      </div>
    </div>
  )
}
