export function buildPrSeed(title: string, body: string): string | undefined {
  const trimmedTitle = title.trim()
  const trimmedBody = body.trim()
  if (!trimmedTitle && !trimmedBody) {
    return undefined
  }

  const parts = []
  if (trimmedTitle) {
    parts.push(`Title: ${trimmedTitle}`)
  }
  if (trimmedBody) {
    parts.push(`Description:\n${trimmedBody}`)
  }
  return parts.join('\n\n')
}

export function buildBranchOptions(
  branches: Array<{ name: string; isRemote: boolean }>,
  preferred: string
): string[] {
  const names = branches
    .filter((branch) => !branch.isRemote)
    .map((branch) => branch.name)
    .sort((a, b) => a.localeCompare(b))

  if (preferred.trim() && !names.includes(preferred)) {
    return [preferred, ...names]
  }

  return names
}
