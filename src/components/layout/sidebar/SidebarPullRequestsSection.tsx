import { useState } from 'react'
import { SidebarSection } from '@/components/layout/sidebar/SidebarSection'
import { SidebarIconPullRequest } from '@/components/layout/sidebar/SidebarIcons'
import { ActionButton } from '@/components/ui/Modal'
import { CreatePrModal, MergePrButton } from '@/components/GitHub/CreatePrModal'
import { useGitHubPullRequests, useInvalidateGitHubPullRequests } from '@/hooks/useGitHubPullRequests'
import { useGitHubRepoContext } from '@/hooks/useGitHubRepos'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'
import { useBranches } from '@/hooks/useGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'

export function SidebarPullRequestsSection() {
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { data: ghStatus } = useGitHubStatus()
  const { data: ctx } = useGitHubRepoContext(repoPath, connected)
  const { data: prs, isLoading, error } = useGitHubPullRequests(repoPath, connected && Boolean(ctx))
  const { data: branches } = useBranches(connected)
  const invalidate = useInvalidateGitHubPullRequests()
  const show = useToastStore((s) => s.show)
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedPr, setExpandedPr] = useState<number | null>(null)

  const currentBranch = branches?.find((b) => b.isCurrent && !b.isRemote)?.name ?? 'main'
  const defaultBase =
    branches?.find((b) => b.name === 'main' && !b.isRemote)?.name ??
    branches?.find((b) => !b.isRemote)?.name ??
    'main'

  const canUseGitHub = connected && ghStatus?.connected && ctx
  const count = canUseGitHub ? (prs ?? []).length : 0

  return (
    <>
      <SidebarSection
        sectionId="sidebar.pull-requests"
        title="Pull requests"
        icon={<SidebarIconPullRequest className="h-3.5 w-3.5" />}
        count={count}
        defaultOpen={false}
        footer
        headerActions={
          canUseGitHub ? (
            <ActionButton onClick={() => setCreateOpen(true)} className="px-1.5 py-0.5 text-[10px]">
              +
            </ActionButton>
          ) : undefined
        }
      >
        {!connected && (
          <p className="px-2 text-xs text-gf-fg-subtle">Open a repository to view pull requests.</p>
        )}
        {connected && !ghStatus?.connected && (
          <p className="px-2 text-xs text-gf-fg-subtle">Connect GitHub in Settings → Integrations.</p>
        )}
        {connected && ghStatus?.connected && !ctx && (
          <p className="px-2 text-xs text-gf-fg-subtle">This repository is not linked to GitHub.</p>
        )}
        {canUseGitHub && (
          <>
            {isLoading && <p className="px-2 text-xs text-gf-fg-subtle">Loading…</p>}
            {error && <p className="px-2 text-xs text-red-400">{(error as Error).message}</p>}
            <ul className="space-y-1">
              {(prs ?? []).map((pr) => (
                <li key={pr.number} className="rounded px-2 py-1.5 text-xs hover:bg-gf-surface-hover/40">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setExpandedPr(expandedPr === pr.number ? null : pr.number)}
                  >
                    <p className="truncate font-medium text-gf-fg">
                      #{pr.number} {pr.title}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-gf-fg-subtle">
                      {pr.head.ref} → {pr.base.ref}
                    </p>
                  </button>
                  {expandedPr === pr.number && (
                    <div className="mt-2 space-y-2 border-t border-gf-border pt-2">
                      <a
                        href={pr.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-gf-accent hover:underline"
                      >
                        Open on GitHub
                      </a>
                      <MergePrButton
                        onMerge={async (method) => {
                          if (!repoPath) return
                          await window.gitfredo.githubMergePullRequest(repoPath, pr.number, method)
                          await invalidate(repoPath)
                          show(`PR #${pr.number} merged`, 'success')
                        }}
                      />
                    </div>
                  )}
                </li>
              ))}
              {(prs ?? []).length === 0 && !isLoading && (
                <p className="px-2 text-xs text-gf-fg-subtle">No open pull requests.</p>
              )}
            </ul>
          </>
        )}
      </SidebarSection>

      {canUseGitHub && (
        <CreatePrModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          defaultHead={currentBranch}
          defaultBase={defaultBase}
          onSubmit={async (params) => {
            if (!repoPath) return
            await window.gitfredo.githubCreatePullRequest(repoPath, params)
            await invalidate(repoPath)
            show('Pull request created', 'success')
          }}
        />
      )}
    </>
  )
}
