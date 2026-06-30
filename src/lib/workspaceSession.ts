export interface WorkspaceSessionSnapshot {
  tabPaths: string[]
  activePath: string | null
}

export function workspaceSessionKey(snapshot: WorkspaceSessionSnapshot): string {
  return `${snapshot.tabPaths.join('\u0000')}\u0001${snapshot.activePath ?? ''}`
}

export function snapshotFromSettings(settings: {
  openRepoTabs?: string[]
  activeRepoTab?: string | null
  openWorkspaceTabs?: string[]
  activeWorkspaceTab?: string | null
}): WorkspaceSessionSnapshot {
  return {
    tabPaths: settings.openRepoTabs ?? settings.openWorkspaceTabs ?? [],
    activePath: settings.activeRepoTab ?? settings.activeWorkspaceTab ?? null
  }
}

export function orderPathsForRestore(
  tabPaths: string[],
  activePath: string | null
): { connectOrder: string[]; activePath: string } {
  if (tabPaths.length === 0) {
    throw new Error('No repository tabs to restore')
  }
  const active = activePath && tabPaths.includes(activePath) ? activePath : tabPaths[0]
  const connectOrder = [...tabPaths.filter((path) => path !== active), active]
  return { connectOrder, activePath: active }
}
