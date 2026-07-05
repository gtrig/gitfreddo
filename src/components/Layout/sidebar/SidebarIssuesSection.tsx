import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SidebarSection } from '@/components/Layout/sidebar/SidebarSection'
import { SidebarIconIssues } from '@/components/Layout/sidebar/SidebarIcons'
import { SidebarTreeRow } from '@/components/Layout/sidebar/SidebarTreeRow'
import { ActionButton, Modal } from '@/components/Ui/Modal'
import { ContextMenu } from '@/components/Ui/ContextMenu'
import { useGitHubIssues, useInvalidateGitHubIssues } from '@/hooks/useGitHubIssues'
import { useGitHubRepoContext } from '@/hooks/useGitHubRepos'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { slugifyIssueBranch } from '@/lib/git/github'
import { useContextMenu } from '@/hooks/useContextMenu'
import { issueContextMenuItems } from '@/lib/context-menus/sidebarContextMenus'
import { EditIssueModal } from '@/components/GitHub/EditIssueModal'
import type { GitHubIssue } from '@shared/github'

const FILTER_IDS = ['all', 'mine'] as const

export function SidebarIssuesSection() {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { data: ghStatus } = useGitHubStatus()
  const { data: ctx } = useGitHubRepoContext(repoPath, connected)
  const [filterId, setFilterId] = useState<(typeof FILTER_IDS)[number]>('all')
  const { data: issues, isLoading, error } = useGitHubIssues(
    repoPath,
    filterId === 'mine' ? ghStatus?.login ?? undefined : undefined,
    connected && Boolean(ctx)
  )
  const invalidate = useInvalidateGitHubIssues()
  const { createBranch } = useGitMutations()
  const show = useToastStore((s) => s.show)
  const [createOpen, setCreateOpen] = useState(false)
  const [editIssue, setEditIssue] = useState<GitHubIssue | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const { state: menuState, openMenu, closeMenu } = useContextMenu()

  const canUseGitHub = connected && ghStatus?.connected && ctx
  const count = canUseGitHub ? (issues ?? []).length : 0

  async function handleCreate() {
    if (!repoPath || !title.trim()) return
    await window.gitfreddo.githubCreateIssue(repoPath, { title: title.trim(), body })
    setTitle('')
    setBody('')
    setCreateOpen(false)
    await invalidate(repoPath)
    show(t('sidebar.issueCreated'), 'success')
  }

  async function branchFromIssue(issueNumber: number, issueTitle: string) {
    const branchName = `issue-${issueNumber}-${slugifyIssueBranch(issueTitle)}`
    await createBranch.mutateAsync({ name: branchName })
    show(t('sidebar.branchCreated', { name: branchName }), 'success')
  }

  async function updateIssueState(issue: GitHubIssue, state: 'open' | 'closed') {
    if (!repoPath) return
    await window.gitfreddo.githubUpdateIssue(repoPath, issue.number, { state })
    await invalidate(repoPath)
    show(t('github.issue.updated'), 'success')
  }

  return (
    <>
      <SidebarSection
        sectionId="sidebar.issues"
        title={t('sidebar.issues')}
        icon={<SidebarIconIssues className="h-3.5 w-3.5" />}
        count={count}
        defaultOpen={false}
        footer
        onAdd={canUseGitHub ? () => setCreateOpen(true) : undefined}
        addTitle={t('sidebar.createIssue')}
      >
        {!connected && (
          <p className="px-2 text-xs text-gf-fg-subtle">{t('sidebar.openRepoForIssues')}</p>
        )}
        {connected && !ghStatus?.connected && (
          <p className="px-2 text-xs text-gf-fg-subtle">{t('sidebar.connectGitHub')}</p>
        )}
        {connected && ghStatus?.connected && !ctx && (
          <p className="px-2 text-xs text-gf-fg-subtle">{t('sidebar.notLinkedGitHub')}</p>
        )}
        {canUseGitHub && (
          <>
            <div className="mb-2 flex flex-wrap gap-1 px-2">
              {FILTER_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilterId(id)}
                  className={`rounded px-2 py-0.5 text-[10px] ${
                    filterId === id
                      ? 'bg-gf-accent/15 text-gf-accent'
                      : 'text-gf-fg-subtle hover:bg-gf-surface-hover'
                  }`}
                >
                  {id === 'all' ? t('sidebar.filterAllOpen') : t('sidebar.filterMyIssues')}
                </button>
              ))}
            </div>
            {isLoading && <p className="px-2 text-xs text-gf-fg-subtle">{t('common.loading')}</p>}
            {error && <p className="px-2 text-xs text-red-400">{(error as Error).message}</p>}
            <div className="space-y-0.5">
              {(issues ?? []).map((issue) => {
                const issueMenuItems = issueContextMenuItems(
                  issue,
                  {
                    onBranchFromIssue: (issueNumber, issueTitle) =>
                      void branchFromIssue(issueNumber, issueTitle),
                    onEdit: setEditIssue,
                    onClose: (entry) => void updateIssueState(entry, 'closed'),
                    onReopen: (entry) => void updateIssueState(entry, 'open')
                  },
                  t
                )
                return (
                  <SidebarTreeRow
                    key={issue.number}
                    icon={<SidebarIconIssues className="h-3.5 w-3.5" />}
                    label={`#${issue.number} ${issue.title}`}
                    menuItems={issueMenuItems}
                    openMenu={openMenu}
                    onClick={() => window.open(issue.htmlUrl, '_blank', 'noopener,noreferrer')}
                  />
                )
              })}
              {(issues ?? []).length === 0 && !isLoading && (
                <p className="px-2 py-1 text-xs text-gf-fg-subtle">{t('sidebar.noOpenIssues')}</p>
              )}
            </div>
          </>
        )}
      </SidebarSection>

      {menuState && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={menuState.items}
          onClose={closeMenu}
        />
      )}

      {canUseGitHub && (
        <Modal open={createOpen} title={t('modals.createIssue.title')} onClose={() => setCreateOpen(false)}>
          <div className="space-y-3 p-4">
            <label className="block text-sm">
              <span className="text-gf-fg-muted">{t('sidebar.title')}</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gf-fg-muted">{t('sidebar.body')}</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
              />
            </label>
            <div className="flex justify-end gap-2">
              <ActionButton onClick={() => setCreateOpen(false)}>{t('common.cancel')}</ActionButton>
              <ActionButton variant="primary" onClick={() => void handleCreate()}>
                {t('common.create')}
              </ActionButton>
            </div>
          </div>
        </Modal>
      )}

      {editIssue && repoPath && (
        <EditIssueModal
          open
          issue={editIssue}
          repoPath={repoPath}
          onClose={() => setEditIssue(null)}
          onUpdated={() => invalidate(repoPath)}
        />
      )}
    </>
  )
}
