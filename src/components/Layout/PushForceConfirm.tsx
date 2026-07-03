import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/Ui/Modal'
import type { PushParams } from '@/hooks/usePushRemote'

interface PushForceConfirmProps {
  params: PushParams | null
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function PushForceConfirm({ params, busy, onConfirm, onCancel }: PushForceConfirmProps) {
  const { t } = useTranslation()

  if (!params) return null

  const branch = params.branch?.trim() || t('actions.forcePush.currentBranch')
  const remote = params.remote?.trim() || t('actions.forcePush.theRemote')

  return (
    <ConfirmDialog
      open
      title={t('actions.forcePush.title')}
      message={t('actions.forcePush.message', { branch, remote })}
      confirmLabel={t('actions.forcePush.confirm')}
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
