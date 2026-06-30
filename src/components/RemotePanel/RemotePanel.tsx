import { useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useRemotes } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useDefaultRemote } from '@/hooks/useAppSettings'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { ActionButton, Modal } from '@/components/ui/Modal'
import { RepoPicker } from '@/components/GitHub/RepoPicker'

export function RemotePanel() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: remotes, isLoading, error } = useRemotes(connected)
  const { fetch, push, pull, remoteAdd } = useGitMutations()
  const defaultRemote = useDefaultRemote()
  const [addOpen, setAddOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')

  if (!connected) {
    return (
      <aside className="p-4">
        <CollapsibleSection sectionId="sidebar.remotes" title="Remotes" defaultOpen>
          <p className="text-sm text-gf-fg-subtle">Open a repository to view remotes.</p>
        </CollapsibleSection>
      </aside>
    )
  }

  return (
    <aside className="p-4">
      <CollapsibleSection
        sectionId="sidebar.remotes"
        title="Remotes"
        headerActions={<ActionButton onClick={() => setAddOpen(true)}>+ Add</ActionButton>}
      >
        <div className="mb-3 flex flex-wrap gap-1">
          <ActionButton onClick={() => void fetch.mutateAsync({ remote: defaultRemote })}>
            Fetch
          </ActionButton>
          <ActionButton onClick={() => void pull.mutateAsync({ remote: defaultRemote })}>
            Pull
          </ActionButton>
          <ActionButton onClick={() => void push.mutateAsync({ remote: defaultRemote })}>
            Push
          </ActionButton>
        </div>
        {isLoading && <p className="text-sm text-gf-fg-subtle">Loading…</p>}
        {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
        <ul className="space-y-2">
          {(remotes ?? []).map((remote) => (
            <li key={remote.name} className="rounded border border-gf-border p-2 text-sm">
              <p className="font-medium text-gf-fg">{remote.name}</p>
              <p className="truncate text-xs text-gf-fg-subtle" title={remote.url}>
                {remote.url}
              </p>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      <Modal open={addOpen} title="Add remote" onClose={() => setAddOpen(false)}>
        <div className="space-y-3 p-4">
          <label className="block text-sm">
            <span className="text-gf-fg-muted">Name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
              placeholder="origin"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gf-fg-muted">URL</span>
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
              placeholder="https://github.com/user/repo.git"
            />
          </label>
          <ActionButton onClick={() => setBrowseOpen(true)}>Browse GitHub</ActionButton>
          <div className="flex justify-end gap-2">
            <ActionButton onClick={() => setAddOpen(false)}>Cancel</ActionButton>
            <ActionButton
              onClick={async () => {
                await remoteAdd.mutateAsync({ name: newName, url: newUrl })
                setAddOpen(false)
                setNewName('')
                setNewUrl('')
              }}
            >
              Add
            </ActionButton>
          </div>
        </div>
      </Modal>

      <Modal open={browseOpen} title="Browse GitHub repositories" onClose={() => setBrowseOpen(false)}>
        <div className="p-4">
          <RepoPicker
            selectedFullName={null}
            compact
            onSelect={(repo) => {
              setNewUrl(repo.cloneUrl)
              if (!newName) {
                setNewName(repo.fullName.split('/').pop() ?? 'origin')
              }
              setBrowseOpen(false)
            }}
          />
        </div>
      </Modal>
    </aside>
  )
}
