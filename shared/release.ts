/** Map a git release tag (e.g. v1.2.3) to the semver used in package.json. */
export function versionFromReleaseTag(tag: string): string | null {
  const trimmed = tag.trim()
  if (!trimmed) return null

  const version = trimmed.startsWith('v') ? trimmed.slice(1) : trimmed
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(version)) {
    return null
  }

  return version
}
