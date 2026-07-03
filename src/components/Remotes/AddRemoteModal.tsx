import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton } from '@/components/Ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useToastStore } from '@/stores/toast'
import { RepoPicker } from '@/components/GitHub/RepoPicker'
import { CreateGitHubRepoModal } from '@/components/GitHub/CreateGitHubRepoModal'

interface AddRemoteModalProps {
  open: boolean
  onClose: () => void
}

export function AddRemoteModal({ open, onClose }: AddRemoteModalProps) {
  const { t } = useTranslation()
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
    show(t('modals.addRemote.added', { name: remoteName }), 'success')
    handleClose()
  }

  async function addFromRepo(repo: { cloneUrl: string; name: string; fullName: string }) {
    const remoteName = name.trim() || repo.name || 'origin'
    await addRemote(remoteName, repo.cloneUrl)
  }

  return (
    <>
      <Modal open={open} title={t('modals.addRemote.title')} onClose={handleClose}>
        <div className="space-y-3 p-4">
          <label className="block text-sm">
            <span className="text-gf-fg-muted">{t('modals.addRemote.name')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
              placeholder="origin"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gf-fg-muted">{t('modals.addRemote.url')}</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
              placeholder="https://github.com/user/repo.git"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => setBrowseOpen(true)}>
              {t('modals.addRemote.browseGitHub')}
            </ActionButton>
            <ActionButton onClick={() => setCreateOpen(true)}>
              {t('modals.addRemote.createOnGitHub')}
            </ActionButton>
          </div>
          <div className="flex justify-end gap-2">
            <ActionButton onClick={handleClose}>{t('common.cancel')}</ActionButton>
            <ActionButton
              loading={remoteAdd.isPending}
              disabled={!name.trim() || !url.trim()}
              onClick={() => void addRemote(name.trim(), url.trim())}
            >
              {t('common.add')}
            </ActionButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={browseOpen}
        title={t('modals.addRemote.browseTitle')}
        onClose={() => setBrowseOpen(false)}
      >
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
            <ActionButton onClick={() => setCreateOpen(true)}>
              {t('modals.addRemote.createNewRepo')}
            </ActionButton>
          </div>
        </div>
      </Modal>

      <CreateGitHubRepoModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        autoInit={false}
        submitLabel={t('modals.addRemote.createAndAdd')}
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
