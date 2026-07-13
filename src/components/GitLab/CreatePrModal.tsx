import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AiActionButton } from '@/components/Ui/AiActionButton'
import { ActionButton, Modal, Select } from '@/components/Ui/Modal'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useBranches } from '@/hooks/useGit'
import { useToastStore } from '@/stores/toast'
import { useWorkspaceStore } from '@/stores/workspace'
import { parsePullRequestResponse } from '@shared/ai'
import type { GitlabMergeMethod } from '@shared/gitlab'

function buildPrSeed(title: string, body: string): string | undefined {
  const trimmedTitle = title.trim()
  const trimmedBody = body.trim()
  if (!trimmedTitle && !trimmedBody) {
    return undefined
  }

  const parts = []
  if (trimmedTitle) {
    parts.push(`Title: ${trimmedTitle}`)
  }
  if (trimmedBody) {
    parts.push(`Description:\n${trimmedBody}`)
  }
  return parts.join('\n\n')
}

function buildBranchOptions(
  branches: Array<{ name: string; isRemote: boolean }>,
  preferred: string
): string[] {
  const names = branches
    .filter((branch) => !branch.isRemote)
    .map((branch) => branch.name)
    .sort((a, b) => a.localeCompare(b))

  if (preferred.trim() && !names.includes(preferred)) {
    return [preferred, ...names]
  }

  return names
}

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
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: branches } = useBranches(connected && open)
  const aiEnabled = useAiEnabled()
  const aiFill = useAiFill()
  const showToast = useToastStore((s) => s.show)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [head, setHead] = useState(defaultHead)
  const [base, setBase] = useState(defaultBase)
  const [busy, setBusy] = useState(false)

  const headOptions = useMemo(
    () => buildBranchOptions(branches ?? [], defaultHead),
    [branches, defaultHead]
  )
  const baseOptions = useMemo(
    () => buildBranchOptions(branches ?? [], defaultBase),
    [branches, defaultBase]
  )

  useEffect(() => {
    if (open) {
      setHead(defaultHead)
      setBase(defaultBase)
    }
  }, [open, defaultHead, defaultBase])

  async function handleAiFill() {
    try {
      const text = await aiFill.mutateAsync({
        purpose: 'pull_request',
        context: {
          headBranch: head.trim(),
          baseBranch: base.trim(),
          currentText: buildPrSeed(title, body)
        }
      })
      const proposal = parsePullRequestResponse(text)
      setTitle(proposal.title)
      setBody(proposal.body)
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

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
    <Modal open={open} title={t('gitlab.pr.createTitle')} onClose={onClose}>
      <div className="space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('sidebar.title')}</span>
          <div className="relative mt-1">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5 pr-9"
            />
            {aiEnabled && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <AiActionButton
                  variant="icon"
                  onClick={() => void handleAiFill()}
                  disabled={aiFill.isPending || busy}
                  loading={aiFill.isPending}
                  aria-label={t('gitlab.pr.fillWithAi')}
                  title={t('gitlab.pr.fillWithAi')}
                />
              </div>
            )}
          </div>
        </label>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('gitlab.pr.description')}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="text-gf-fg-muted">{t('gitlab.pr.head')}</span>
            <Select
              value={head}
              onChange={(e) => setHead(e.target.value)}
              className="mt-1 bg-gf-bg px-2 py-1.5"
            >
              {headOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            <span className="text-gf-fg-muted">{t('gitlab.pr.base')}</span>
            <Select
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="mt-1 bg-gf-bg px-2 py-1.5"
            >
              {baseOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
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
  onMerge: (method: GitlabMergeMethod) => Promise<void>
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  async function merge(method: GitlabMergeMethod) {
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
        {t('gitlab.pr.squash')}
      </ActionButton>
      <ActionButton disabled={busy} onClick={() => void merge('rebase')}>
        {t('gitlab.pr.rebase')}
      </ActionButton>
    </div>
  )
}
