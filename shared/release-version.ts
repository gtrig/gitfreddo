import { versionFromReleaseTag } from './release.ts'

const ZERO_SHA = '0'.repeat(40)

export function normalizeReleaseTag(tag: string): string | null {
  const version = versionFromReleaseTag(tag)
  if (!version) {
    return null
  }

  const trimmed = tag.trim()
  return trimmed.startsWith('v') ? trimmed : `v${version}`
}

export function packageVersionMatchesReleaseTag(tag: string, packageVersion: string): boolean {
  const tagVersion = versionFromReleaseTag(tag)
  if (!tagVersion) {
    return false
  }

  return tagVersion === packageVersion.trim()
}

export function parseReleaseTagsFromPrePush(input: string): string[] {
  const tags: string[] = []

  for (const line of input.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    const parts = trimmed.split(/\s+/)
    if (parts.length < 4) {
      continue
    }

    const localRef = parts[0]
    const localSha = parts[1]

    if (localSha === ZERO_SHA || !localRef.startsWith('refs/tags/v')) {
      continue
    }

    tags.push(localRef.slice('refs/tags/'.length))
  }

  return tags
}

export function findReleaseTagVersionMismatches(
  tags: string[],
  packageVersion: string
): string[] {
  return tags.filter((tag) => !packageVersionMatchesReleaseTag(tag, packageVersion))
}
