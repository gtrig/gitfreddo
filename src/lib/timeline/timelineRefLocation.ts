import { detectForgeFromRemote, type ForgeProvider } from '@/lib/forge/detect'
import type { TimelineRef } from '@/lib/timeline/timelineRefs'
import type { GitBranch, GitRemote } from '@/lib/types'

export type TimelineRemoteProvider = ForgeProvider | 'unknown'

export interface TimelineRefLocation {
  showLocal: boolean
  remoteProvider: TimelineRemoteProvider | null
}

export function remoteNameFromRefLabel(label: string): string | null {
  const slash = label.indexOf('/')
  if (slash <= 0) return null
  return label.slice(0, slash)
}

export function buildBranchUpstreams(
  branches: readonly GitBranch[]
): Map<string, string | undefined> {
  const map = new Map<string, string | undefined>()
  for (const branch of branches) {
    if (branch.isRemote) continue
    map.set(branch.name, branch.upstream)
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
    branchUpstreams: ReadonlyMap<string, string | undefined>
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

  const upstream = options.branchUpstreams.get(timelineRef.label)
  const remoteProvider = upstream
    ? resolveRemoteProvider(remoteNameFromRefLabel(upstream), options.remoteProviders)
    : null

  return { showLocal: true, remoteProvider }
}
