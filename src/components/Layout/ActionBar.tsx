import type { ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline'
import { useWorkspaceStore } from '@/stores/workspace'
import { useGitMutations } from '@/hooks/useGitMutations'
import { usePushRemote } from '@/hooks/usePushRemote'
import { useResolvedRemote, useAppSettings } from '@/hooks/useAppSettings'
import { Spinner } from '@/components/Ui/Spinner'
import { PushForceConfirm } from '@/components/Layout/PushForceConfirm'
import { StashPushModal } from '@/components/Stash/StashPushModal'

const iconClass = 'h-3.5 w-3.5 shrink-0'

function ActionBarButton({
  onClick,
  loading,
  icon,
  children,
  variant = 'secondary'
}: {
  onClick: () => void
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
  variant?: 'primary' | 'secondary'
}) {
  const base =
    variant === 'primary'
      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
      : 'border border-gf-border-strong text-gf-fg-muted hover:bg-gf-bg'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded px-3 py-1 text-xs font-medium disabled:opacity-50 ${base}`}
    >
      {loading ? (
        <Spinner size="sm" className={variant === 'primary' ? 'border-white/30 border-t-white' : ''} />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}

export function ActionBar() {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const [stashOpen, setStashOpen] = useState(false)
  const { fetch, pull, stashPush } = useGitMutations()
  const { pushRemote, isPushPending, forceConfirm, confirmForcePush, cancelForcePush } =
    usePushRemote()
  const defaultRemote = useResolvedRemote()
  const { data: settings } = useAppSettings()

  if (!connected) return null

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <ActionBarButton
          loading={stashPush.isPending}
          onClick={() => setStashOpen(true)}
          icon={<ArchiveBoxIcon aria-hidden className={iconClass} />}
        >
          {t('actions.stash')}
        </ActionBarButton>
        <ActionBarButton
          loading={fetch.isPending}
          onClick={() => void fetch.mutateAsync({ remote: defaultRemote })}
          icon={<ArrowPathIcon aria-hidden className={iconClass} />}
        >
          {t('actions.fetch')}
        </ActionBarButton>
        <ActionBarButton
          loading={pull.isPending}
          onClick={() =>
            void pull.mutateAsync({ remote: defaultRemote, rebase: settings?.pullRebase })
          }
          icon={<ArrowDownTrayIcon aria-hidden className={iconClass} />}
        >
          {t('actions.pull')}
        </ActionBarButton>
        <ActionBarButton
          loading={isPushPending}
          onClick={() => pushRemote({ remote: defaultRemote })}
          icon={<ArrowUpTrayIcon aria-hidden className={iconClass} />}
        >
          {t('actions.push')}
        </ActionBarButton>
      </div>
      <PushForceConfirm
        params={forceConfirm}
        busy={isPushPending}
        onConfirm={confirmForcePush}
        onCancel={cancelForcePush}
      />
      <StashPushModal open={stashOpen} onClose={() => setStashOpen(false)} />
    </>
  )
}
