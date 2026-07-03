import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton, FieldLabel, TextArea, Select } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useToastStore } from '@/stores/toast'
import type { GitCommit } from '@/lib/types'

const REBASE_ACTIONS = ['pick', 'reword', 'edit', 'squash', 'fixup', 'drop'] as const

interface RebaseSequenceModalProps {
  open: boolean
  commits: GitCommit[]
  onClose: () => void
}

function defaultTodoLine(action: string, commit: GitCommit): string {
  return `${action} ${commit.hash} ${commit.subject}`
}

export function RebaseSequenceModal({ open, commits, onClose }: RebaseSequenceModalProps) {
  const { t } = useTranslation()
  const { rebaseInteractive } = useGitMutations()
  const showToast = useToastStore((s) => s.show)
  const [lines, setLines] = useState<string[]>([])

  const chronological = [...commits].reverse()
  const baseHash = chronological[0]?.hash ?? ''
  const hasMerge = commits.some((commit) => commit.parents.length > 1)

  useEffect(() => {
    if (!open) return
    setLines(chronological.map((commit) => defaultTodoLine('pick', commit)))
  }, [open, commits])

  function handleClose() {
    setLines([])
    onClose()
  }

  async function handleSubmit() {
    const todoLines = lines.map((line) => line.trim()).filter(Boolean)
    if (!baseHash || todoLines.length === 0) {
      showToast(t('modals.rebaseSequence.emptyTodo'), 'error')
      return
    }

    try {
      await rebaseInteractive.mutateAsync({ baseHash, todoLines })
      showToast(t('modals.rebaseSequence.started'), 'success')
      handleClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  return (
    <Modal open={open} title={t('modals.rebaseSequence.title')} onClose={handleClose} size="lg">
      <div className="space-y-3">
        {hasMerge && (
          <p className="text-xs text-amber-400">{t('modals.rebaseSequence.mergeWarning')}</p>
        )}
        <p className="text-xs text-gf-fg-subtle">
          {t('modals.rebaseSequence.editTodo')}{' '}
          <span className="font-mono text-gf-fg-muted">{baseHash.slice(0, 7)}</span>
        </p>

        <div>
          <FieldLabel>{t('modals.rebaseSequence.todoLines')}</FieldLabel>
          <TextArea
            rows={Math.min(12, Math.max(4, lines.length + 1))}
            value={lines.join('\n')}
            onChange={(event) => setLines(event.target.value.split('\n'))}
            className="font-mono text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {REBASE_ACTIONS.map((action) => (
            <Select
              key={action}
              defaultValue=""
              className="w-auto text-xs"
              onChange={(event) => {
                const value = event.target.value
                if (!value) return
                setLines((current) =>
                  current.map((line) => {
                    const hash = line.trim().split(/\s+/)[1]
                    const commit = chronological.find((item) => item.hash === hash)
                    if (!commit) return line
                    return defaultTodoLine(value, commit)
                  })
                )
                event.target.value = ''
              }}
            >
              <option value="">{t('modals.rebaseSequence.setAllTo', { action })}</option>
              <option value={action}>{action}</option>
            </Select>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            variant="primary"
            loading={rebaseInteractive.isPending}
            disabled={!baseHash || lines.every((line) => !line.trim())}
            onClick={() => void handleSubmit()}
          >
            {t('modals.rebaseSequence.startRebase')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
