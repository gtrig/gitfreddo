import { useState } from 'react'
import { useMergeStatus } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useResolvedRemote } from '@/hooks/useAppSettings'
import { useWorkspaceStore } from '@/stores/workspace'
import { Spinner } from '@/components/ui/Spinner'
import { ConflictResolverModal } from '@/components/DiffViewer/ConflictResolverModal'
import type { GitMergeStatus } from '@/lib/types'

const OPERATION_LABELS: Record<NonNullable<GitMergeStatus['kind']>, string> = {
  merge: 'Merge',
  rebase: 'Rebase',
  'cherry-pick': 'Cherry-pick'
}

export function ConflictPanel() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: operationStatus } = useMergeStatus(connected)
  const defaultRemote = useResolvedRemote()
  const {
    mergeAbort,
    mergeContinue,
    rebaseAbort,
    rebaseContinue,
    rebaseSkip,
    cherryPickAbort,
    cherryPickContinue,
    cherryPickSkip,
    stageAdd
  } = useGitMutations()
  const [resolvePath, setResolvePath] = useState<string | null>(null)

  if (!operationStatus?.inProgress || !operationStatus.kind) return null

  const kind = operationStatus.kind
  const title = OPERATION_LABELS[kind]
  const busy =
    stageAdd.isPending ||
    mergeContinue.isPending ||
    mergeAbort.isPending ||
    rebaseContinue.isPending ||
    rebaseAbort.isPending ||
    rebaseSkip.isPending ||
    cherryPickContinue.isPending ||
    cherryPickAbort.isPending ||
    cherryPickSkip.isPending

  async function markResolvedAndContinue() {
    if (operationStatus!.conflictedPaths.length > 0) {
      await stageAdd.mutateAsync({ paths: operationStatus!.conflictedPaths })
    }
    if (kind === 'merge') {
      await mergeContinue.mutateAsync({})
    } else if (kind === 'rebase') {
      await rebaseContinue.mutateAsync({})
    } else {
      await cherryPickContinue.mutateAsync({})
    }
  }

  function abort() {
    if (kind === 'merge') {
      void mergeAbort.mutateAsync({})
    } else if (kind === 'rebase') {
      void rebaseAbort.mutateAsync({})
    } else {
      void cherryPickAbort.mutateAsync({})
    }
  }

  function skip() {
    if (kind === 'rebase') {
      void rebaseSkip.mutateAsync({})
    } else if (kind === 'cherry-pick') {
      void cherryPickSkip.mutateAsync({})
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg border border-orange-500/40 bg-gf-bg p-4 shadow-xl">
      <h3 className="text-sm font-semibold text-orange-300">{title} in progress</h3>
      <p className="mt-1 text-xs text-gf-fg-muted">
        {operationStatus.conflictedPaths.length > 0
          ? `${operationStatus.conflictedPaths.length} conflicted file(s)`
          : 'Resolve conflicts then continue'}
      </p>
      {kind === 'merge' && defaultRemote && (
        <p className="mt-1 text-[10px] text-gf-fg-subtle">Default remote: {defaultRemote}</p>
      )}
      {operationStatus.conflictedPaths.length > 0 && (
        <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-gf-fg-muted">
          {operationStatus.conflictedPaths.map((path) => (
            <li key={path} className="flex items-center justify-between gap-2 py-0.5">
              <span className="truncate">{path}</span>
              <button
                type="button"
                onClick={() => setResolvePath(path)}
                className="shrink-0 text-gf-accent-fg hover:text-gf-accent-fg"
              >
                Resolve
              </button>
              <button
                type="button"
                onClick={() => void window.gitfreddo.openInEditor(path)}
                className="shrink-0 text-gf-fg-subtle hover:text-gf-fg"
              >
                Editor
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void markResolvedAndContinue()}
          className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {(stageAdd.isPending ||
            mergeContinue.isPending ||
            rebaseContinue.isPending ||
            cherryPickContinue.isPending) && (
            <Spinner size="sm" className="border-white/30 border-t-white" />
          )}
          Mark resolved & continue
        </button>
        {kind !== 'merge' && (
          <button
            type="button"
            disabled={busy}
            onClick={skip}
            className="inline-flex items-center gap-1.5 rounded border border-gf-border-strong px-2 py-1 text-xs text-gf-fg-muted hover:text-white disabled:opacity-50"
          >
            {(rebaseSkip.isPending || cherryPickSkip.isPending) && <Spinner size="sm" />}
            Skip
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={abort}
          className="inline-flex items-center gap-1.5 rounded border border-gf-border-strong px-2 py-1 text-xs text-gf-fg-muted hover:text-white disabled:opacity-50"
        >
          {(mergeAbort.isPending || rebaseAbort.isPending || cherryPickAbort.isPending) && (
            <Spinner size="sm" />
          )}
          Abort
        </button>
      </div>
      {resolvePath && (
        <ConflictResolverModal
          open
          path={resolvePath}
          onClose={() => setResolvePath(null)}
        />
      )}
    </div>
  )
}
