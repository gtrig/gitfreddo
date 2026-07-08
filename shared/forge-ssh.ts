export const GITFREDDO_SSH_KEY_PREFIX = 'GitFreddo'

export function isGitFreddoSshKeyLabel(label: string): boolean {
  return label.trim().startsWith(GITFREDDO_SSH_KEY_PREFIX)
}

export function findGitFreddoSshKeyLabel(labels: string[]): string | null {
  const match = labels.map((label) => label.trim()).find(isGitFreddoSshKeyLabel)
  return match ?? null
}
