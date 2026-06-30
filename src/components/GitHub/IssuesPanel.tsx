import { useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useGitHubIssues, useInvalidateGitHubIssues } from '@/hooks/useGitHubIssues'
import { useGitHubRepoContext } from '@/hooks/useGitHubRepos'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'
import { useGitMutations } from '@/hooks/useGitMutations'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { ActionButton, Modal } from '@/components/ui/Modal'
import { slugifyIssueBranch } from '@/lib/github'
import { useToastStore } from '@/stores/toast'

const FILTERS = [
  { id: 'all', label: 'All open' },
  { id: 'mine', label: 'My issues' }
] as const

export function IssuesPanel() {
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { data: ghStatus } = useGitHubStatus()
  const { data: ctx } = useGitHubRepoContext(repoPath, connected)
  const [filterId, setFilterId] = useState<(typeof FILTERS)[number]['id']>('all')
  const { data: issues, isLoading, error } = useGitHubIssues(
    repoPath,
    filterId === 'mine' ? ghStatus?.login ?? undefined : undefined,
    connected && Boolean(ctx)
  )
  const invalidate = useInvalidateGitHubIssues()
  const { createBranch } = useGitMutations()
  const show = useToastStore((s) => s.show)
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  if (!connected) {
    return (
      <aside className="p-4">
        <CollapsibleSection sectionId="sidebar.issues" title="Issues" defaultOpen>
          <p className="text-sm text-gf-fg-subtle">Open a repository to view issues.</p>
        </CollapsibleSection>
      </aside>
    )
  }

  if (!ghStatus?.connected || !ctx) {
    return (
      <aside className="p-4">
        <CollapsibleSection sectionId="sidebar.issues" title="Issues" defaultOpen>
          <p className="text-sm text-gf-fg-subtle">
            {!ghStatus?.connected
              ? 'Connect GitHub in Settings → Integrations.'
              : 'This repository is not linked to GitHub.'}
          </p>
        </CollapsibleSection>
      </aside>
    )
  }

  async function handleCreate() {
    if (!repoPath || !title.trim()) return
    await window.gitfredo.githubCreateIssue(repoPath, { title: title.trim(), body })
    setTitle('')
    setBody('')
    setCreateOpen(false)
    await invalidate(repoPath)
    show('Issue created', 'success')
  }

  async function branchFromIssue(issueNumber: number, issueTitle: string) {
    const branchName = `issue-${issueNumber}-${slugifyIssueBranch(issueTitle)}`
    await createBranch.mutateAsync({ name: branchName })
    show(`Created branch ${branchName}`, 'success')
  }

  return (
    <aside className="p-4">
      <CollapsibleSection
        sectionId="sidebar.issues"
        title="Issues"
        headerActions={<ActionButton onClick={() => setCreateOpen(true)}>+ New</ActionButton>}
      >
        <div className="mb-2 flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterId(f.id)}
              className={`rounded px-2 py-0.5 text-[11px] ${
                filterId === f.id
                  ? 'bg-gf-accent/15 text-gf-accent'
                  : 'text-gf-fg-subtle hover:bg-gf-surface-hover'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {isLoading && <p className="text-sm text-gf-fg-subtle">Loading…</p>}
        {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
        <ul className="space-y-2">
          {(issues ?? []).map((issue) => (
            <li key={issue.number} className="rounded border border-gf-border p-2 text-sm">
              <p className="font-medium text-gf-fg">
                #{issue.number} {issue.title}
              </p>
              <p className="mt-0.5 text-xs text-gf-fg-subtle">@{issue.user}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={issue.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gf-accent hover:underline"
                >
                  Open
                </a>
                <button
                  type="button"
                  onClick={() => void branchFromIssue(issue.number, issue.title)}
                  className="text-xs text-gf-fg-muted hover:text-gf-fg"
                >
                  Branch from issue
                </button>
              </div>
            </li>
          ))}
          {(issues ?? []).length === 0 && !isLoading && (
            <p className="text-sm text-gf-fg-subtle">No open issues.</p>
          )}
        </ul>
      </CollapsibleSection>

      <Modal open={createOpen} title="Create issue" onClose={() => setCreateOpen(false)}>
        <div className="space-y-3 p-4">
          <label className="block text-sm">
            <span className="text-gf-fg-muted">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gf-fg-muted">Body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            />
          </label>
          <div className="flex justify-end gap-2">
            <ActionButton onClick={() => setCreateOpen(false)}>Cancel</ActionButton>
            <ActionButton variant="primary" onClick={() => void handleCreate()}>
              Create
            </ActionButton>
          </div>
        </div>
      </Modal>
    </aside>
  )
}
