import { detectForgeFromRemote, type ForgeProvider } from '@/lib/forge/detect'
import type { TimelineRef } from '@/lib/timeline/timelineRefs'
import type { GitBranch, GitRemote } from '@/lib/types'

export type TimelineRemoteProvider = ForgeProvider | 'unknown'

export interface BranchTracking {
  upstream?: string
  ahead: number
}

export interface TimelineRefLocation {
  showLocal: boolean
  remoteProvider: TimelineRemoteProvider | null
}

export function remoteNameFromRefLabel(label: string): string | null {
  const slash = label.indexOf('/')
  if (slash <= 0) return null
  return label.slice(0, slash)
}

export function buildBranchTracking(
  branches: readonly GitBranch[]
): Map<string, BranchTracking> {
  const map = new Map<string, BranchTracking>()
  for (const branch of branches) {
    if (branch.isRemote) continue
    map.set(branch.name, { upstream: branch.upstream, ahead: branch.ahead })
  }
  return map
}

export function buildRemoteProviders(
  remotes: readonly GitRemote[]
): Map<string, ForgeProvider | null> {
  const map = new Map<string, ForgeProvider | null>()
  for (const remote of remotes) {
    map.set(remote.name, detectForgeFromRemote(remote.url))
  }
  return map
}

function resolveRemoteProvider(
  remoteName: string | null,
  remoteProviders: ReadonlyMap<string, ForgeProvider | null>
): TimelineRemoteProvider | null {
  if (!remoteName) return null
  if (!remoteProviders.has(remoteName)) return 'unknown'
  const provider = remoteProviders.get(remoteName) ?? null
  return provider ?? 'unknown'
}

export function timelineRefLocation(
  timelineRef: TimelineRef,
  options: {
    branchTracking: ReadonlyMap<string, BranchTracking>
    remoteProviders: ReadonlyMap<string, ForgeProvider | null>
  }
): TimelineRefLocation {
  if (timelineRef.kind === 'tag') {
    return { showLocal: false, remoteProvider: null }
  }

  if (timelineRef.kind === 'remote') {
    return {
      showLocal: false,
      remoteProvider: resolveRemoteProvider(
        remoteNameFromRefLabel(timelineRef.label),
        options.remoteProviders
      )
    }
  }

  const tracking = options.branchTracking.get(timelineRef.label)
  const upstream = tracking?.upstream
  // Only show a forge icon when the tip is already on the remote (not ahead).
  const remoteProvider =
    upstream && (tracking?.ahead ?? 0) === 0
      ? resolveRemoteProvider(remoteNameFromRefLabel(upstream), options.remoteProviders)
      : null

  return { showLocal: true, remoteProvider }
}
