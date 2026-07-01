import { useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useRemotes } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { usePushRemote } from '@/hooks/usePushRemote'
import { useResolvedRemote, useAppSettings } from '@/hooks/useAppSettings'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { ActionButton, ConfirmDialog, Modal } from '@/components/ui/Modal'
import { PushForceConfirm } from '@/components/actions/PushForceConfirm'
import { LoadingRow } from '@/components/ui/Spinner'
import { RepoPicker } from '@/components/GitHub/RepoPicker'
import { CreateGitHubRepoModal } from '@/components/GitHub/CreateGitHubRepoModal'
import { useToastStore } from '@/stores/toast'

export function RemotePanel() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: remotes, isLoading, error } = useRemotes(connected)
  const { fetch, pull, remoteAdd, remoteRemove, remoteRename, remoteSetUrl } = useGitMutations()
  const { pushRemote, isPushPending, forceConfirm, confirmForcePush, cancelForcePush } =
    usePushRemote()
  const defaultRemote = useResolvedRemote()
  const { data: settings } = useAppSettings()
  const show = useToastStore((s) => s.show)
  const [addOpen, setAddOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  const [editRemote, setEditRemote] = useState<{ name: string; url: string } | null>(null)
  const [renameRemote, setRenameRemote] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')

  async function addRemoteFromRepo(repo: { cloneUrl: string; name: string; fullName: string }) {
    const remoteName = newName.trim() || repo.name || 'origin'
    await remoteAdd.mutateAsync({ name: remoteName, url: repo.cloneUrl })
    show(`Added remote "${remoteName}" → ${repo.fullName}`, 'success')
    setAddOpen(false)
    setBrowseOpen(false)
    setCreateOpen(false)
    setNewName('')
    setNewUrl('')
  }

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
          <ActionButton
            loading={fetch.isPending}
            onClick={() => void fetch.mutateAsync({ remote: defaultRemote })}
          >
            Fetch
          </ActionButton>
          <ActionButton
            loading={fetch.isPending}
            onClick={() => void fetch.mutateAsync({ remote: defaultRemote, tags: true })}
          >
            Fetch tags
          </ActionButton>
          <ActionButton
            loading={pull.isPending}
            onClick={() =>
              void pull.mutateAsync({ remote: defaultRemote, rebase: settings?.pullRebase })
            }
          >
            Pull
          </ActionButton>
          <ActionButton
            loading={isPushPending}
            onClick={() => pushRemote({ remote: defaultRemote })}
          >
            Push
          </ActionButton>
          <ActionButton
            loading={isPushPending}
            onClick={() => pushRemote({ remote: defaultRemote, pushAll: true })}
          >
            Push all
          </ActionButton>
        </div>
        {isLoading && <LoadingRow />}
        {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
        <ul className="space-y-2">
          {(remotes ?? []).map((remote) => (
            <li key={remote.name} className="rounded border border-gf-border p-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gf-fg">{remote.name}</p>
                  <p className="truncate text-xs text-gf-fg-subtle" title={remote.url}>
                    {remote.url}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <ActionButton
                    className="px-2 py-0.5 text-[10px]"
                    onClick={() => setEditRemote({ name: remote.name, url: remote.url })}
                  >
                    Edit URL
                  </ActionButton>
                  <ActionButton
                    className="px-2 py-0.5 text-[10px]"
                    onClick={() => {
                      setRenameRemote(remote.name)
                      setRenameValue(remote.name)
                    }}
                  >
                    Rename
                  </ActionButton>
                  <ActionButton
                    className="px-2 py-0.5 text-[10px] text-red-400"
                    onClick={() => setPendingRemove(remote.name)}
                  >
                    Remove
                  </ActionButton>
                </div>
              </div>
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
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => setBrowseOpen(true)}>Browse GitHub</ActionButton>
            <ActionButton onClick={() => setCreateOpen(true)}>Create on GitHub</ActionButton>
          </div>
          <div className="flex justify-end gap-2">
            <ActionButton onClick={() => setAddOpen(false)}>Cancel</ActionButton>
            <ActionButton
              loading={remoteAdd.isPending}
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
        <div className="space-y-3 p-4">
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
          <div className="flex justify-end gap-2 border-t border-gf-border pt-3">
            <ActionButton onClick={() => setCreateOpen(true)}>Create new repository</ActionButton>
          </div>
        </div>
      </Modal>

      <CreateGitHubRepoModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        autoInit={false}
        submitLabel="Create & add remote"
        onCreated={async (repo) => {
          setNewUrl(repo.cloneUrl)
          if (!newName.trim()) {
            setNewName(repo.name)
          }
          await addRemoteFromRepo(repo)
        }}
      />

      <PushForceConfirm
        params={forceConfirm}
        busy={isPushPending}
        onConfirm={confirmForcePush}
        onCancel={cancelForcePush}
      />

      {pendingRemove && (
        <ConfirmDialog
          open
          title="Remove remote"
          message={
            pendingRemove === defaultRemote
              ? `Remove remote "${pendingRemove}"? This is your default remote in settings.`
              : `Remove remote "${pendingRemove}"?`
          }
          confirmLabel="Remove"
          busy={remoteRemove.isPending}
          onConfirm={async () => {
            await remoteRemove.mutateAsync({ name: pendingRemove })
            show(`Removed remote "${pendingRemove}"`, 'success')
            setPendingRemove(null)
          }}
          onCancel={() => setPendingRemove(null)}
        />
      )}

      {editRemote && (
        <Modal open title={`Edit URL — ${editRemote.name}`} onClose={() => setEditRemote(null)}>
          <div className="space-y-3 p-4">
            <label className="block text-sm">
              <span className="text-gf-fg-muted">URL</span>
              <input
                value={editRemote.url}
                onChange={(e) => setEditRemote({ ...editRemote, url: e.target.value })}
                className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
              />
            </label>
            <div className="flex justify-end gap-2">
              <ActionButton onClick={() => setEditRemote(null)}>Cancel</ActionButton>
              <ActionButton
                loading={remoteSetUrl.isPending}
                onClick={async () => {
                  await remoteSetUrl.mutateAsync({ name: editRemote.name, url: editRemote.url })
                  show(`Updated URL for "${editRemote.name}"`, 'success')
                  setEditRemote(null)
                }}
              >
                Save
              </ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {renameRemote && (
        <Modal open title="Rename remote" onClose={() => setRenameRemote(null)}>
          <div className="space-y-3 p-4">
            <label className="block text-sm">
              <span className="text-gf-fg-muted">New name</span>
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
              />
            </label>
            <div className="flex justify-end gap-2">
              <ActionButton onClick={() => setRenameRemote(null)}>Cancel</ActionButton>
              <ActionButton
                loading={remoteRename.isPending}
                onClick={async () => {
                  await remoteRename.mutateAsync({ oldName: renameRemote, newName: renameValue })
                  show(`Renamed remote to "${renameValue}"`, 'success')
                  setRenameRemote(null)
                }}
              >
                Rename
              </ActionButton>
            </div>
          </div>
        </Modal>
      )}
    </aside>
  )
}
