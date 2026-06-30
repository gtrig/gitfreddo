import { useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useGitHubPullRequests, useInvalidateGitHubPullRequests } from '@/hooks/useGitHubPullRequests'
import { useGitHubRepoContext } from '@/hooks/useGitHubRepos'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'
import { useBranches } from '@/hooks/useGit'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { ActionButton } from '@/components/ui/Modal'
import { CreatePrModal, MergePrButton } from '@/components/GitHub/CreatePrModal'
import { useToastStore } from '@/stores/toast'

export function PullRequestsPanel() {
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

  if (!connected) {
    return (
      <aside className="p-4">
        <CollapsibleSection sectionId="sidebar.pull-requests" title="Pull requests" defaultOpen>
          <p className="text-sm text-gf-fg-subtle">Open a repository to view pull requests.</p>
        </CollapsibleSection>
      </aside>
    )
  }

  if (!ghStatus?.connected) {
    return (
      <aside className="p-4">
        <CollapsibleSection sectionId="sidebar.pull-requests" title="Pull requests" defaultOpen>
          <p className="text-sm text-gf-fg-subtle">Connect GitHub in Settings → Integrations.</p>
        </CollapsibleSection>
      </aside>
    )
  }

  if (!ctx) {
    return (
      <aside className="p-4">
        <CollapsibleSection sectionId="sidebar.pull-requests" title="Pull requests" defaultOpen>
          <p className="text-sm text-gf-fg-subtle">This repository is not linked to GitHub.</p>
        </CollapsibleSection>
      </aside>
    )
  }

  return (
    <aside className="p-4">
      <CollapsibleSection
        sectionId="sidebar.pull-requests"
        title="Pull requests"
        headerActions={
          <ActionButton onClick={() => setCreateOpen(true)}>+ New</ActionButton>
        }
      >
        {isLoading && <p className="text-sm text-gf-fg-subtle">Loading…</p>}
        {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
        <ul className="space-y-2">
          {(prs ?? []).map((pr) => (
            <li key={pr.number} className="rounded border border-gf-border p-2 text-sm">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpandedPr(expandedPr === pr.number ? null : pr.number)}
              >
                <p className="font-medium text-gf-fg">
                  #{pr.number} {pr.title}
                </p>
                <p className="mt-0.5 text-xs text-gf-fg-subtle">
                  {pr.head.ref} → {pr.base.ref} · @{pr.user}
                </p>
              </button>
              {expandedPr === pr.number && (
                <div className="mt-2 space-y-2 border-t border-gf-border pt-2">
                  {pr.body && (
                    <p className="whitespace-pre-wrap text-xs text-gf-fg-muted">{pr.body}</p>
                  )}
                  <a
                    href={pr.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-gf-accent hover:underline"
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
            <p className="text-sm text-gf-fg-subtle">No open pull requests.</p>
          )}
        </ul>
      </CollapsibleSection>

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
    </aside>
  )
}
