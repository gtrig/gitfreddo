import type { ForgeProvider } from '@/lib/forge/detect'

export interface ForgeConnectionStatus {
  connected?: boolean
}

export function getConnectedForges(status: {
  github?: ForgeConnectionStatus
  bitbucket?: ForgeConnectionStatus
  gitlab?: ForgeConnectionStatus
}): ForgeProvider[] {
  const connected: ForgeProvider[] = []
  if (status.github?.connected) connected.push('github')
  if (status.bitbucket?.connected) connected.push('bitbucket')
  if (status.gitlab?.connected) connected.push('gitlab')
  return connected
}
