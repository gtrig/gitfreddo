export function remoteNameFromUpstream(upstream: string): string {
  const slash = upstream.indexOf('/')
  return slash > 0 ? upstream.slice(0, slash) : upstream
}

export function resolveDefaultRemote(
  settingsRemote: string,
  remotes: { name: string }[],
  currentBranchUpstream?: string
): string {
  const names = new Set(remotes.map((remote) => remote.name))

  if (names.has(settingsRemote)) {
    return settingsRemote
  }

  if (currentBranchUpstream) {
    const upstreamRemote = remoteNameFromUpstream(currentBranchUpstream)
    if (names.has(upstreamRemote)) {
      return upstreamRemote
    }
  }

  if (remotes.length === 1) {
    return remotes[0]!.name
  }

  return settingsRemote
}
