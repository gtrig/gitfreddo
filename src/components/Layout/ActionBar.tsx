import type { ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { useWorkspaceStore } from '@/stores/workspace'
import { useGitMutations } from '@/hooks/useGitMutations'
import { usePushRemote } from '@/hooks/usePushRemote'
import { useResolvedRemote, useAppSettings } from '@/hooks/useAppSettings'
import { useUndoLast } from '@/hooks/useUndoLast'
import { Spinner } from '@/components/Ui/Spinner'
import { PushForceConfirm } from '@/components/Layout/PushForceConfirm'
import { StashPushModal } from '@/components/Stash/StashPushModal'
import { ContextMenu } from '@/components/Ui/ContextMenu'
import { useBranches, useRemotes } from '@/hooks/useGit'
import { buildPushMenuItems, buildPushTargets } from '@/lib/git/pushTargets'
import { runMutation } from '@/lib/ui/runMutation'
import { reportToast } from '@/stores/toast'

const iconClass = 'h-3.5 w-3.5 shrink-0'

function ActionBarButton({
  onClick,
  loading,
  icon,
  children,
  variant = 'secondary',
  title
}: {
  onClick: () => void
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
  variant?: 'primary' | 'secondary'
  title?: string
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
      title={title}
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

/** "▾" next to Push: pick which remote to push to (shown only with 2+ remotes). */
function PushRemoteMenuButton({
  defaultRemote,
  disabled,
  onPush
}: {
  defaultRemote: string
  disabled?: boolean
  onPush: (remote: string, setUpstream: boolean) => void
}) {
  const { t } = useTranslation()
  const { data: remotes } = useRemotes()
  const { data: branches } = useBranches()
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [setUpstream, setSetUpstream] = useState(false)

  if (!Array.isArray(remotes) || remotes.length < 2) return null

  const current = Array.isArray(branches) ? branches.find((branch) => branch.isCurrent) : undefined
  const items = buildPushMenuItems(buildPushTargets(remotes, defaultRemote, current?.upstream), {
    setUpstream,
    labels: {
      pushTo: (remote) => t('actions.pushTo', { remote }),
      upstreamSuffix: t('actions.upstreamMarker'),
      setAsUpstream: t('actions.setAsUpstream')
    },
    onPush: (remote) => onPush(remote, setUpstream),
    onToggleSetUpstream: () => setSetUpstream((value) => !value)
  })

  return (
    <>
      <button
        type="button"
        aria-label={t('actions.chooseRemote')}
        title={t('actions.chooseRemote')}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        disabled={disabled}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          setMenu({ x: rect.left, y: rect.bottom + 4 })
        }}
        className="-ml-1.5 inline-flex items-center rounded-r border border-l-0 border-gf-border-strong px-1.5 py-1 text-gf-fg-muted hover:bg-gf-bg disabled:opacity-50"
      >
        <ChevronDownIcon aria-hidden className="h-3 w-3" />
      </button>
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={items} onClose={() => setMenu(null)} />
      )}
    </>
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
  const { performUndo, isUndoing } = useUndoLast()

  if (!connected) return null

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <ActionBarButton
          loading={isUndoing}
          onClick={() => void performUndo()}
          icon={<ArrowUturnLeftIcon aria-hidden className={iconClass} />}
          title={t('actions.undoShortcut')}
        >
          {t('actions.undo')}
        </ActionBarButton>
        <div className="inline-flex items-stretch">
          <ActionBarButton
            loading={isPushPending}
            onClick={() => pushRemote({ remote: defaultRemote })}
            icon={<ArrowUpTrayIcon aria-hidden className={iconClass} />}
          >
            {t('actions.push')}
          </ActionBarButton>
          <PushRemoteMenuButton
            defaultRemote={defaultRemote}
            disabled={isPushPending}
            onPush={(remote, setUpstream) => pushRemote({ remote, setUpstream })}
          />
        </div>
        <ActionBarButton
          loading={pull.isPending}
          onClick={() =>
            void runMutation(pull.mutateAsync({
              remote: defaultRemote,
              rebase: settings?.pullMode === 'rebase',
              ffOnly: settings?.pullMode === 'ff-only'
            }), reportToast)
          }
          icon={<ArrowDownTrayIcon aria-hidden className={iconClass} />}
        >
          {t('actions.pull')}
        </ActionBarButton>
        <ActionBarButton
          loading={fetch.isPending}
          onClick={() => void runMutation(fetch.mutateAsync({ remote: defaultRemote }), reportToast)}
          icon={<ArrowPathIcon aria-hidden className={iconClass} />}
        >
          {t('actions.fetch')}
        </ActionBarButton>
        <ActionBarButton
          loading={stashPush.isPending}
          onClick={() => setStashOpen(true)}
          icon={<ArchiveBoxIcon aria-hidden className={iconClass} />}
        >
          {t('actions.stash')}
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
