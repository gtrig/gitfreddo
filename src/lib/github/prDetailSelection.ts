export type PullRequestDetailPane =
  | { kind: 'overview' }
  | { kind: 'commits' }
  | { kind: 'files' }
  | { kind: 'file'; path: string }

export function isPullRequestFilePane(
  pane: PullRequestDetailPane
): pane is { kind: 'file'; path: string } {
  return pane.kind === 'file'
}

export function isPullRequestFilesPane(pane: PullRequestDetailPane): boolean {
  return pane.kind === 'files' || pane.kind === 'file'
}
