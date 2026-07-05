import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton, FieldLabel, TextInput } from '@/components/Ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useToastStore } from '@/stores/toast'

export interface StashPushOptions {
  message?: string
  includeUntracked?: boolean
  includeIgnored?: boolean
  paths?: string[]
}

interface StashPushModalProps {
  open: boolean
  initialMessage?: string
  onClose: () => void
}

export function StashPushModal({ open, initialMessage = '', onClose }: StashPushModalProps) {
  const { t } = useTranslation()
  const { stashPush } = useGitMutations()
  const showToast = useToastStore((s) => s.show)
  const [message, setMessage] = useState(initialMessage)
  const [includeUntracked, setIncludeUntracked] = useState(false)
  const [includeIgnored, setIncludeIgnored] = useState(false)
  const [paths, setPaths] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setMessage(initialMessage)
    setIncludeUntracked(false)
    setIncludeIgnored(false)
    setPaths([])
  }, [open, initialMessage])

  async function handlePickPaths() {
    const picked = await window.gitfreddo.pickFiles()
    if (picked?.length) setPaths(picked)
  }

  async function handleSubmit() {
    try {
      await stashPush.mutateAsync({
        message: message.trim() || undefined,
        includeUntracked,
        includeIgnored,
        paths: paths.length > 0 ? paths : undefined
      })
      showToast(t('workingTree.stashCreated'), 'success')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  return (
    <Modal open={open} title={t('workingTree.createStash')} onClose={onClose}>
      <div className="space-y-3 p-4">
        <div>
          <FieldLabel>{t('workingTree.stashMessageOptional')}</FieldLabel>
          <TextInput
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('workingTree.commitSummary')}
            disabled={stashPush.isPending}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gf-fg-muted">
          <input
            type="checkbox"
            checked={includeUntracked}
            onChange={(e) => setIncludeUntracked(e.target.checked)}
            disabled={stashPush.isPending}
          />
          {t('workingTree.includeUntracked')}
        </label>
        <label className="flex items-center gap-2 text-sm text-gf-fg-muted">
          <input
            type="checkbox"
            checked={includeIgnored}
            onChange={(e) => setIncludeIgnored(e.target.checked)}
            disabled={stashPush.isPending}
          />
          {t('workingTree.includeIgnored')}
        </label>
        <div className="space-y-2">
          <ActionButton onClick={() => void handlePickPaths()} disabled={stashPush.isPending}>
            {t('workingTree.stashPickPaths')}
          </ActionButton>
          {paths.length > 0 && (
            <ul className="max-h-32 overflow-y-auto rounded border border-gf-border bg-gf-bg-deep p-2 text-xs font-mono text-gf-fg-muted">
              {paths.map((path) => (
                <li key={path} className="truncate">
                  {path}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose} disabled={stashPush.isPending}>
            {t('common.cancel')}
          </ActionButton>
          <ActionButton
            variant="primary"
            loading={stashPush.isPending}
            onClick={() => void handleSubmit()}
          >
            {t('workingTree.createStash')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
