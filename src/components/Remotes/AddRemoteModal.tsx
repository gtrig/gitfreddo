import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton } from '@/components/Ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useToastStore } from '@/stores/toast'
import { useConnectedForges } from '@/hooks/useConnectedForges'
import { forgeDisplayName } from '@/hooks/useForgeContext'
import type { ForgeProvider } from '@/lib/forge/detect'
import { RepoPicker as GitHubRepoPicker } from '@/components/GitHub/RepoPicker'
import { CreateGitHubRepoModal } from '@/components/GitHub/CreateGitHubRepoModal'
import { RepoPicker as BitbucketRepoPicker } from '@/components/Bitbucket/RepoPicker'
import { CreateBitbucketRepoModal } from '@/components/Bitbucket/CreateBitbucketRepoModal'
import { RepoPicker as GitlabRepoPicker } from '@/components/GitLab/RepoPicker'
import { CreateGitlabRepoModal } from '@/components/GitLab/CreateGitlabRepoModal'

interface AddRemoteModalProps {
  open: boolean
  onClose: () => void
}

type ForgeRepo = { cloneUrl: string; name: string; fullName: string }

function remoteNameFromRepo(repo: ForgeRepo, currentName: string): string {
  if (currentName.trim()) return currentName.trim()
  return repo.name || repo.fullName.split('/').pop() || 'origin'
}

export function AddRemoteModal({ open, onClose }: AddRemoteModalProps) {
  const { t } = useTranslation()
  const { remoteAdd } = useGitMutations()
  const show = useToastStore((s) => s.show)
  const connectedForges = useConnectedForges()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [browseOpen, setBrowseOpen] = useState(false)
  const [browseTab, setBrowseTab] = useState<ForgeProvider>('github')
  const [createOpen, setCreateOpen] = useState(false)
  const [createProvider, setCreateProvider] = useState<ForgeProvider>('github')

  useEffect(() => {
    if (!connectedForges.length) return
    if (!connectedForges.includes(browseTab)) {
      setBrowseTab(connectedForges[0]!)
    }
    if (!connectedForges.includes(createProvider)) {
      setCreateProvider(connectedForges[0]!)
    }
  }, [browseTab, connectedForges, createProvider])

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

  async function addFromRepo(repo: ForgeRepo) {
    await addRemote(remoteNameFromRepo(repo, name), repo.cloneUrl)
  }

  function applyRepoSelection(repo: { fullName: string; cloneUrl: string }) {
    setUrl(repo.cloneUrl)
    if (!name.trim()) {
      setName(repo.fullName.split('/').pop() ?? 'origin')
    }
    setBrowseOpen(false)
  }

  function openBrowse() {
    setBrowseTab(connectedForges[0] ?? 'github')
    setBrowseOpen(true)
  }

  function openCreate(provider: ForgeProvider) {
    setCreateProvider(provider)
    setCreateOpen(true)
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
          {connectedForges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={openBrowse}>
                {t('modals.addRemote.browseRepositories')}
              </ActionButton>
              {connectedForges.map((provider) => (
                <ActionButton key={provider} onClick={() => openCreate(provider)}>
                  {t('modals.addRemote.createOn', { provider: forgeDisplayName(provider) })}
                </ActionButton>
              ))}
            </div>
          )}
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
          {connectedForges.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {connectedForges.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setBrowseTab(tab)}
                  className={`rounded border px-3 py-1.5 text-xs capitalize ${
                    browseTab === tab
                      ? 'border-gf-accent bg-gf-accent/10 text-gf-fg'
                      : 'border-gf-border-strong text-gf-fg-muted hover:bg-gf-bg'
                  }`}
                >
                  {t(`workspace.hub.cloneTab.${tab}`)}
                </button>
              ))}
            </div>
          )}
          {browseTab === 'github' && (
            <GitHubRepoPicker
              selectedFullName={null}
              compact
              onSelect={applyRepoSelection}
            />
          )}
          {browseTab === 'bitbucket' && (
            <BitbucketRepoPicker
              selectedFullName={null}
              compact
              onSelect={applyRepoSelection}
            />
          )}
          {browseTab === 'gitlab' && (
            <GitlabRepoPicker
              selectedFullName={null}
              compact
              onSelect={applyRepoSelection}
            />
          )}
          <div className="flex justify-end gap-2 border-t border-gf-border pt-3">
            <ActionButton onClick={() => openCreate(browseTab)}>
              {t('modals.addRemote.createNewRepo')}
            </ActionButton>
          </div>
        </div>
      </Modal>

      <CreateGitHubRepoModal
        open={createOpen && createProvider === 'github'}
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
      <CreateBitbucketRepoModal
        open={createOpen && createProvider === 'bitbucket'}
        onClose={() => setCreateOpen(false)}
        submitLabel={t('modals.addRemote.createAndAdd')}
        onCreated={async (repo) => {
          setUrl(repo.cloneUrl)
          if (!name.trim()) {
            setName(repo.name)
          }
          await addFromRepo(repo)
        }}
      />
      <CreateGitlabRepoModal
        open={createOpen && createProvider === 'gitlab'}
        onClose={() => setCreateOpen(false)}
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
