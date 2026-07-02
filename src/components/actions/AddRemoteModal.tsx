import { useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useToastStore } from '@/stores/toast'
import { RepoPicker } from '@/components/GitHub/RepoPicker'
import { CreateGitHubRepoModal } from '@/components/GitHub/CreateGitHubRepoModal'

interface AddRemoteModalProps {
  open: boolean
  onClose: () => void
}

export function AddRemoteModal({ open, onClose }: AddRemoteModalProps) {
  const { remoteAdd } = useGitMutations()
  const show = useToastStore((s) => s.show)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [browseOpen, setBrowseOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  function handleClose() {
    setName('')
    setUrl('')
    setBrowseOpen(false)
    setCreateOpen(false)
    onClose()
  }

  async function addRemote(remoteName: string, remoteUrl: string) {
    await remoteAdd.mutateAsync({ name: remoteName, url: remoteUrl })
    show(`Added remote "${remoteName}"`, 'success')
    handleClose()
  }

  async function addFromRepo(repo: { cloneUrl: string; name: string; fullName: string }) {
    const remoteName = name.trim() || repo.name || 'origin'
    await addRemote(remoteName, repo.cloneUrl)
  }

  return (
    <>
      <Modal open={open} title="Add remote" onClose={handleClose}>
        <div className="space-y-3 p-4">
          <label className="block text-sm">
            <span className="text-gf-fg-muted">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
              placeholder="origin"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gf-fg-muted">URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
              placeholder="https://github.com/user/repo.git"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => setBrowseOpen(true)}>Browse GitHub</ActionButton>
            <ActionButton onClick={() => setCreateOpen(true)}>Create on GitHub</ActionButton>
          </div>
          <div className="flex justify-end gap-2">
            <ActionButton onClick={handleClose}>Cancel</ActionButton>
            <ActionButton
              loading={remoteAdd.isPending}
              disabled={!name.trim() || !url.trim()}
              onClick={() => void addRemote(name.trim(), url.trim())}
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
              setUrl(repo.cloneUrl)
              if (!name) {
                setName(repo.fullName.split('/').pop() ?? 'origin')
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
          setUrl(repo.cloneUrl)
          if (!name.trim()) {
            setName(repo.name)
          }
          await addFromRepo(repo)
        }}
      />
    </>
  )
}
