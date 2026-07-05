import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton } from '@/components/Ui/Modal'
import { useRepoStatus } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useToastStore } from '@/stores/toast'

export interface AddSubmoduleModalProps {
  open: boolean
  onClose: () => void
}

export function AddSubmoduleModal({ open, onClose }: AddSubmoduleModalProps) {
  const { t } = useTranslation()
  const { data: repoStatus } = useRepoStatus(open)
  const { submoduleAdd } = useGitMutations()
  const showToast = useToastStore((s) => s.show)

  const [url, setUrl] = useState('')
  const [path, setPath] = useState('')
  const [branch, setBranch] = useState('')
  const [showBranch, setShowBranch] = useState(false)

  useEffect(() => {
    if (!open) return
    setUrl('')
    setPath('')
    setBranch('')
    setShowBranch(false)
  }, [open])

  function handleClose() {
    onClose()
  }

  const canSubmit = url.trim().length > 0 && path.trim().length > 0

  return (
    <Modal open={open} title={t('modals.addSubmodule.title')} onClose={handleClose}>
      <div className="space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('modals.addSubmodule.url')}</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            placeholder="https://github.com/user/repo.git"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('modals.addSubmodule.path')}</span>
          <div className="mt-1 flex gap-2">
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="min-w-0 flex-1 rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5 font-mono text-xs"
              placeholder="vendor/lib"
            />
            <ActionButton
              onClick={async () => {
                const picked = await window.gitfreddo.pickDirectory(
                  repoStatus?.root || undefined
                )
                if (picked && repoStatus?.root && picked.startsWith(repoStatus.root)) {
                  const relative = picked.slice(repoStatus.root.length).replace(/^[/\\]+/, '')
                  setPath(relative || path)
                } else if (picked) {
                  setPath(picked)
                }
              }}
            >
              {t('modals.addSubmodule.browse')}
            </ActionButton>
          </div>
        </label>
        <button
          type="button"
          className="text-xs text-gf-fg-subtle hover:text-gf-fg"
          onClick={() => setShowBranch((v) => !v)}
        >
          {showBranch
            ? t('modals.addSubmodule.hideBranch')
            : t('modals.addSubmodule.showBranch')}
        </button>
        {showBranch && (
          <label className="block text-sm">
            <span className="text-gf-fg-muted">{t('modals.addSubmodule.branch')}</span>
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
              placeholder="main"
            />
          </label>
        )}
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            loading={submoduleAdd.isPending}
            disabled={!canSubmit}
            onClick={async () => {
              if (!canSubmit) return
              try {
                await submoduleAdd.mutateAsync({
                  url: url.trim(),
                  path: path.trim(),
                  ...(branch.trim() ? { branch: branch.trim() } : {})
                })
                showToast(t('modals.addSubmodule.created'), 'success')
                handleClose()
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                showToast(message || t('modals.addSubmodule.failed'), 'error')
              }
            }}
          >
            {t('modals.addSubmodule.add')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
