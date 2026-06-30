import { useMemo, useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useStashList, useWorkingStatus } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { ActionButton } from '@/components/ui/Modal'
import { LoadingRow, Spinner } from '@/components/ui/Spinner'
import { AiFillTextInput } from '@/components/ui/AiFillField'

export function StashSidebar() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: stashes, isLoading, error } = useStashList(connected)
  const { data: working } = useWorkingStatus(connected)
  const { stashPush, stashPop, stashApply, stashDrop } = useGitMutations()
  const selectStash = useSelectionStore((s) => s.selectStash)
  const [stashMessage, setStashMessage] = useState('')

  const changedPaths = useMemo(() => {
    if (!working) return []
    return [...working.unstaged, ...working.untracked, ...working.conflicted].map((f) => f.path)
  }, [working])

  if (!connected) {
    return (
      <aside className="p-4">
        <CollapsibleSection sectionId="sidebar.stash" title="Stash" defaultOpen>
          <p className="text-sm text-gf-fg-subtle">Open a repository to view stashes.</p>
        </CollapsibleSection>
      </aside>
    )
  }

  return (
    <aside className="p-4">
      <CollapsibleSection sectionId="sidebar.stash" title="Stash" defaultOpen>
        <div className="mb-3 space-y-2">
          <AiFillTextInput
            label="Stash message (optional)"
            value={stashMessage}
            onChange={setStashMessage}
            purpose="stash_message"
            context={{ filePaths: changedPaths, branch: working?.branch }}
            placeholder="WIP on feature"
          />
          <ActionButton
            loading={stashPush.isPending}
            onClick={() =>
              void stashPush
                .mutateAsync({ message: stashMessage.trim() || undefined })
                .then(() => setStashMessage(''))
            }
          >
            Push stash
          </ActionButton>
        </div>

        {isLoading && <LoadingRow />}
        {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
        {!isLoading && (stashes ?? []).length === 0 && (
          <p className="text-sm text-gf-fg-subtle">No stashes.</p>
        )}
        <ul className="space-y-1">
          {(stashes ?? []).map((stash) => (
            <li key={stash.index} className="rounded border border-gf-border p-2">
              <button
                type="button"
                onClick={() => selectStash(stash.index)}
                className="w-full text-left text-sm text-gf-fg-muted hover:text-white"
              >
                <span className="text-xs text-gf-fg-subtle">stash@{'{'}{stash.index}{'}'}</span>
                <p className="mt-0.5 truncate">{stash.message || '(no message)'}</p>
              </button>
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  disabled={stashApply.isPending}
                  onClick={() => void stashApply.mutateAsync({ index: stash.index })}
                  className="inline-flex items-center gap-1 rounded bg-gf-surface px-2 py-0.5 text-[10px] text-gf-fg-muted hover:text-white disabled:opacity-50"
                >
                  {stashApply.isPending &&
                    (stashApply.variables as { index: number } | undefined)?.index === stash.index && (
                    <Spinner size="sm" />
                  )}
                  Apply
                </button>
                <button
                  type="button"
                  disabled={stashPop.isPending}
                  onClick={() => void stashPop.mutateAsync({ index: stash.index })}
                  className="inline-flex items-center gap-1 rounded bg-gf-surface px-2 py-0.5 text-[10px] text-gf-fg-muted hover:text-white disabled:opacity-50"
                >
                  {stashPop.isPending &&
                    (stashPop.variables as { index: number } | undefined)?.index === stash.index && (
                    <Spinner size="sm" />
                  )}
                  Pop
                </button>
                <button
                  type="button"
                  disabled={stashDrop.isPending}
                  onClick={() => void stashDrop.mutateAsync({ index: stash.index })}
                  className="inline-flex items-center gap-1 rounded bg-gf-surface px-2 py-0.5 text-[10px] text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  {stashDrop.isPending &&
                    (stashDrop.variables as { index: number } | undefined)?.index === stash.index && (
                    <Spinner size="sm" className="border-red-400/30 border-t-red-300" />
                  )}
                  Drop
                </button>
              </div>
            </li>
          ))}
        </ul>
      </CollapsibleSection>
    </aside>
  )
}
