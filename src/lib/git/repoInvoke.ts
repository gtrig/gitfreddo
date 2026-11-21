import type { GitFreddoAPI } from '@shared/ipc'
import { useWorkspaceStore } from '@/stores/workspace'

/** The renderer's active repo tab, as the default target for git IPC. */
export function activeRepoPath(): string | undefined {
  return useWorkspaceStore.getState().activePath ?? undefined
}

/**
 * `window.gitfreddo.invoke` that always names the target repo, so a call never
 * lands in whichever tab the main process last considered active.
 * Pass `repoPath` explicitly to pin a multi-step flow to the tab it started in.
 */
export const repoInvoke = ((method: string, params?: unknown, repoPath?: string) =>
  window.gitfreddo.invoke(method, params, repoPath ?? activeRepoPath())) as GitFreddoAPI['invoke']
