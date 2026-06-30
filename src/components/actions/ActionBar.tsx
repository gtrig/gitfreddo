import type { ReactNode } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useResolvedRemote } from '@/hooks/useAppSettings'
import { ConflictPanel } from '@/components/ConflictPanel/ConflictPanel'
import { useMergeStatus } from '@/hooks/useGit'
import { Spinner } from '@/components/ui/Spinner'
import {
  HeaderIconFetch,
  HeaderIconPull,
  HeaderIconPush,
  HeaderIconStash
} from '@/components/actions/HeaderIcons'

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
  const connected = useWorkspaceStore((s) => s.connected)
  const { fetch, pull, push, stashPush } = useGitMutations()
  const defaultRemote = useResolvedRemote()
  const { data: mergeStatus } = useMergeStatus(connected)

  if (!connected) return null

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <ActionBarButton
          loading={stashPush.isPending}
          onClick={() => void stashPush.mutateAsync({})}
          icon={<HeaderIconStash className={iconClass} />}
        >
          Stash
        </ActionBarButton>
        <ActionBarButton
          loading={fetch.isPending}
          onClick={() => void fetch.mutateAsync({ remote: defaultRemote })}
          icon={<HeaderIconFetch className={iconClass} />}
        >
          Fetch
        </ActionBarButton>
        <ActionBarButton
          loading={pull.isPending}
          onClick={() => void pull.mutateAsync({ remote: defaultRemote })}
          icon={<HeaderIconPull className={iconClass} />}
        >
          Pull
        </ActionBarButton>
        <ActionBarButton
          loading={push.isPending}
          onClick={() => void push.mutateAsync({ remote: defaultRemote })}
          icon={<HeaderIconPush className={iconClass} />}
        >
          Push
        </ActionBarButton>
      </div>
      {mergeStatus?.inProgress && <ConflictPanel />}
    </>
  )
}
