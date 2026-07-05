import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionButton, Modal } from '@/components/Ui/Modal'
import type { GitHubMergeMethod } from '@shared/github'

interface CreatePrModalProps {
  open: boolean
  onClose: () => void
  defaultHead: string
  defaultBase: string
  onSubmit: (params: { title: string; body: string; head: string; base: string }) => Promise<void>
}

export function CreatePrModal({
  open,
  onClose,
  defaultHead,
  defaultBase,
  onSubmit
}: CreatePrModalProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [head, setHead] = useState(defaultHead)
  const [base, setBase] = useState(defaultBase)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setHead(defaultHead)
      setBase(defaultBase)
    }
  }, [open, defaultHead, defaultBase])

  async function handleSubmit() {
    if (!title.trim()) return
    setBusy(true)
    try {
      await onSubmit({ title: title.trim(), body, head, base })
      setTitle('')
      setBody('')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title={t('github.pr.createTitle')} onClose={onClose}>
      <div className="space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('sidebar.title')}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('github.pr.description')}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="text-gf-fg-muted">{t('github.pr.head')}</span>
            <input
              value={head}
              onChange={(e) => setHead(e.target.value)}
              className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gf-fg-muted">{t('github.pr.base')}</span>
            <input
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose}>{t('common.cancel')}</ActionButton>
          <ActionButton variant="primary" onClick={() => void handleSubmit()} disabled={busy}>
            {busy ? t('common.creating') : t('common.create')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}

export function MergePrButton({
  onMerge
}: {
  onMerge: (method: GitHubMergeMethod) => Promise<void>
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  async function merge(method: GitHubMergeMethod) {
    setBusy(true)
    try {
      await onMerge(method)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      <ActionButton disabled={busy} onClick={() => void merge('merge')}>
        {t('common.merge')}
      </ActionButton>
      <ActionButton disabled={busy} onClick={() => void merge('squash')}>
        {t('github.pr.squash')}
      </ActionButton>
      <ActionButton disabled={busy} onClick={() => void merge('rebase')}>
        {t('github.pr.rebase')}
      </ActionButton>
    </div>
  )
}
