export function remoteNameFromUpstream(upstream: string): string {
  const slash = upstream.indexOf('/')
  return slash > 0 ? upstream.slice(0, slash) : upstream
}

export function isNonFastForwardPushError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /non-fast-forward|updates were rejected because the tip of your current branch is behind|updates were rejected because the remote contains work/i.test(
    message
  )
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
