import type { ContextMenuItem } from '@/components/Ui/ContextMenu'
import { remoteNameFromUpstream } from '@/lib/git/remote'

export interface PushTarget {
  name: string
  /** The remote a plain Push uses. */
  isDefault: boolean
  /** The remote the current branch tracks. */
  isUpstream: boolean
}

/** Remotes to offer for a push: the default first, then alphabetical. */
export function buildPushTargets(
  remotes: readonly { name: string }[],
  defaultRemote: string,
  currentBranchUpstream?: string
): PushTarget[] {
  const upstreamRemote = currentBranchUpstream ? remoteNameFromUpstream(currentBranchUpstream) : ''
  return remotes
    .map((remote) => ({
      name: remote.name,
      isDefault: remote.name === defaultRemote,
      isUpstream: remote.name === upstreamRemote
    }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name))
}

export interface PushMenuLabels {
  pushTo: (remote: string) => string
  upstreamSuffix: string
  setAsUpstream: string
}

/** Items for the Push ▾ menu: one "Push to <remote>" per remote, then the upstream toggle. */
export function buildPushMenuItems(
  targets: readonly PushTarget[],
  options: {
    setUpstream: boolean
    labels: PushMenuLabels
    onPush: (remote: string) => void
    onToggleSetUpstream: () => void
  }
): ContextMenuItem[] {
  const { labels } = options
  return [
    ...targets.map((target) => ({
      id: `push-${target.name}`,
      label: target.isUpstream
        ? `${labels.pushTo(target.name)} ${labels.upstreamSuffix}`
        : labels.pushTo(target.name),
      onClick: () => options.onPush(target.name)
    })),
    { id: 'sep-upstream', label: '', separator: true, onClick: () => undefined },
    {
      id: 'set-upstream',
      label: labels.setAsUpstream,
      checked: options.setUpstream,
      keepOpen: true,
      onClick: options.onToggleSetUpstream
    }
  ]
}
