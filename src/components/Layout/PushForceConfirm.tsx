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

  const branch = params.branch?.trim()
  const remote = params.remote?.trim() || t('actions.forcePush.theRemote')
  // Without a branch name, use the sentence written for that case rather than
  // dropping a phrase into "your local {{branch}}".
  const message = branch
    ? t('actions.forcePush.message', { branch, remote })
    : t('actions.forcePush.messageNoBranch', { remote })

  return (
    <ConfirmDialog
      open
      title={t('actions.forcePush.title')}
      message={message}
      confirmLabel={t('actions.forcePush.confirm')}
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
