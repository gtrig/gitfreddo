import { versionFromReleaseTag } from './release.ts'

export function normalizeReleaseTag(tag: string): string | null {
  const version = versionFromReleaseTag(tag)
  if (!version) {
    return null
  }

  const trimmed = tag.trim()
  return trimmed.startsWith('v') ? trimmed : `v${version}`
}
