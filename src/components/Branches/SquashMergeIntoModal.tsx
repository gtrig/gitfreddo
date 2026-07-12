import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton, Select, TextArea } from '@/components/Ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useBranches } from '@/hooks/useGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useToastStore } from '@/stores/toast'
import { buildSquashMergeIntoMessage } from '@/lib/git/squashMergeInto'
import type { GitSquashMergeIntoResult } from '@/lib/types'

interface SquashMergeIntoModalProps {
  sourceBranch: string
  onClose: () => void
}

export function SquashMergeIntoModal({ sourceBranch, onClose }: SquashMergeIntoModalProps) {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: branches } = useBranches(connected)
  const targetOptions = useMemo(
    () => (branches ?? []).filter((branch) => !branch.isRemote && branch.name !== sourceBranch),
    [branches, sourceBranch]
  )
  const defaultTarget =
    targetOptions.find((branch) => branch.name === 'main')?.name ??
    targetOptions.find((branch) => branch.name === 'master')?.name ??
    targetOptions[0]?.name ??
    ''
  const [targetBranch, setTargetBranch] = useState(defaultTarget)
  const [message, setMessage] = useState(() => buildSquashMergeIntoMessage(sourceBranch))
  const [error, setError] = useState<string | null>(null)
  const { squashMergeInto } = useGitMutations()
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const showToast = useToastStore((s) => s.show)

  const handleClose = () => {
    setTargetBranch(defaultTarget)
    setMessage(buildSquashMergeIntoMessage(sourceBranch))
    setError(null)
    onClose()
  }

  return (
    <Modal
      open
      title={t('modals.squashMergeInto.title', { branch: sourceBranch })}
      onClose={handleClose}
    >
      <div className="space-y-3 p-4">
        <p className="text-sm text-gf-fg-muted">
          {t('modals.squashMergeInto.description', {
            source: sourceBranch,
            target: targetBranch || t('modals.squashMergeInto.targetPlaceholder')
          })}
        </p>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('modals.squashMergeInto.targetBranch')}</span>
          <Select
            value={targetBranch}
            onChange={(event) => setTargetBranch(event.target.value)}
            className="mt-1 bg-gf-bg px-2 py-1.5"
          >
            {targetOptions.map((branch) => (
              <option key={branch.name} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('modals.squashMergeInto.commitMessage')}</span>
          <TextArea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            className="mt-1"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            loading={squashMergeInto.isPending}
            disabled={!targetBranch}
            onClick={async () => {
              try {
                const result = (await squashMergeInto.mutateAsync({
                  sourceBranch,
                  targetBranch,
                  message: message.trim() || undefined
                })) as GitSquashMergeIntoResult
                handleClose()
                if (result.status === 'conflicts') {
                  const count = result.conflictedPaths.length
                  showToast(
                    count === 1
                      ? t('modals.squashMergeInto.conflictsOne', {
                          file: result.conflictedPaths[0]
                        })
                      : t('modals.squashMergeInto.conflictsMany', { count }),
                    'info'
                  )
                  selectTimelineNode('merge', 'conflicts')
                  return
                }
                showToast(
                  t('modals.squashMergeInto.completed', { target: result.targetBranch }),
                  'success'
                )
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err))
              }
            }}
          >
            {t('modals.squashMergeInto.confirm')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
