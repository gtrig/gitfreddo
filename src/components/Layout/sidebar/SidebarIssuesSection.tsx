import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditIssueModal as BitbucketEditIssueModal } from '@/components/Bitbucket/EditIssueModal'
import { EditIssueModal as GitHubEditIssueModal } from '@/components/GitHub/EditIssueModal'
import { EditIssueModal as GitlabEditIssueModal } from '@/components/GitLab/EditIssueModal'
import { SidebarSection } from '@/components/Layout/sidebar/SidebarSection'
import { SidebarIconIssues } from '@/components/Layout/sidebar/SidebarIcons'
import { SidebarTreeRow } from '@/components/Layout/sidebar/SidebarTreeRow'
import { ActionButton, Modal } from '@/components/Ui/Modal'
import { ContextMenu } from '@/components/Ui/ContextMenu'
import { useBitbucketIssues, useInvalidateBitbucketIssues } from '@/hooks/useBitbucketIssues'
import { useGitlabIssues, useInvalidateGitlabIssues } from '@/hooks/useGitlabIssues'
import { useForgeContext, forgeConnectKey, forgeNotLinkedKey } from '@/hooks/useForgeContext'
import { useGitHubIssues, useInvalidateGitHubIssues } from '@/hooks/useGitHubIssues'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { slugifyIssueBranch } from '@/lib/git/github'
import { useContextMenu } from '@/hooks/useContextMenu'
import { issueContextMenuItems } from '@/lib/context-menus/sidebarContextMenus'
import { useVirtualizer } from '@tanstack/react-virtual'
import { COMPACT_ROW_HEIGHT, VIRTUAL_OVERSCAN, shouldVirtualize } from '@/lib/ui/virtualList'
import type { BitbucketIssue } from '@shared/bitbucket'
import type { GitHubIssue } from '@shared/github'
import type { GitlabIssue } from '@shared/gitlab'

const FILTER_IDS = ['all', 'mine'] as const
type ForgeIssue = GitHubIssue | BitbucketIssue | GitlabIssue

export function SidebarIssuesSection() {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const forge = useForgeContext(repoPath, connected)
  const provider = forge.provider ?? forge.expectedProvider
  const [filterId, setFilterId] = useState<(typeof FILTER_IDS)[number]>('all')
  const assignee = filterId === 'mine' ? (forge.login ?? undefined) : undefined
  const { data: ghIssues, isLoading: ghLoading, error: ghError } = useGitHubIssues(
    repoPath,
    assignee,
    connected && forge.provider === 'github'
  )
  const { data: bbIssues, isLoading: bbLoading, error: bbError, unavailableReason: bbIssuesUnavailable } =
    useBitbucketIssues(
    repoPath,
    assignee,
    connected && forge.provider === 'bitbucket'
  )
  const { data: glIssues, isLoading: glLoading, error: glError } = useGitlabIssues(
    repoPath,
    assignee,
    connected && forge.provider === 'gitlab'
  )
  const invalidateGitHub = useInvalidateGitHubIssues()
  const invalidateBitbucket = useInvalidateBitbucketIssues()
  const invalidateGitlab = useInvalidateGitlabIssues()
  const { createBranch } = useGitMutations()
  const show = useToastStore((s) => s.show)
  const [createOpen, setCreateOpen] = useState(false)
  const [editIssue, setEditIssue] = useState<ForgeIssue | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const { state: menuState, openMenu, closeMenu } = useContextMenu()

  const canUseForge = connected && Boolean(forge.provider) && forge.connected
  const issues: ForgeIssue[] =
    forge.provider === 'bitbucket'
      ? (bbIssues ?? [])
      : forge.provider === 'gitlab'
        ? (glIssues ?? [])
        : forge.provider === 'github'
          ? (ghIssues ?? [])
          : []
  const isLoading =
    forge.provider === 'bitbucket' ? bbLoading : forge.provider === 'gitlab' ? glLoading : ghLoading
  const error =
    forge.provider === 'bitbucket' ? bbError : forge.provider === 'gitlab' ? glError : ghError
  const issuesUnavailable =
    forge.provider === 'bitbucket' ? bbIssuesUnavailable : null
  const count = canUseForge && !issuesUnavailable ? issues.length : 0
  const issuesScrollRef = useRef<HTMLDivElement>(null)
  const useVirtualization = shouldVirtualize(issues.length)

  const virtualizer = useVirtualizer({
    count: useVirtualization ? issues.length : 0,
    getScrollElement: () => issuesScrollRef.current,
    estimateSize: () => COMPACT_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  async function handleCreate() {
    if (!repoPath || !title.trim() || !forge.provider) return
    if (forge.provider === 'bitbucket') {
      await window.gitfreddo.bitbucketCreateIssue(repoPath, { title: title.trim(), body })
      await invalidateBitbucket(repoPath)
    } else if (forge.provider === 'gitlab') {
      await window.gitfreddo.gitlabCreateIssue(repoPath, { title: title.trim(), body })
      await invalidateGitlab(repoPath)
    } else {
      await window.gitfreddo.githubCreateIssue(repoPath, { title: title.trim(), body })
      await invalidateGitHub(repoPath)
    }
    setTitle('')
    setBody('')
    setCreateOpen(false)
    show(t('sidebar.issueCreated'), 'success')
  }

  async function branchFromIssue(issueNumber: number, issueTitle: string) {
    const branchName = `issue-${issueNumber}-${slugifyIssueBranch(issueTitle)}`
    await createBranch.mutateAsync({ name: branchName })
    show(t('sidebar.branchCreated', { name: branchName }), 'success')
  }

  async function updateIssueState(issue: ForgeIssue, state: 'open' | 'closed') {
    if (!repoPath || !forge.provider) return
    if (forge.provider === 'bitbucket') {
      await window.gitfreddo.bitbucketUpdateIssue(repoPath, issue.number, { state })
      await invalidateBitbucket(repoPath)
      show(t('bitbucket.issue.updated'), 'success')
    } else if (forge.provider === 'gitlab') {
      await window.gitfreddo.gitlabUpdateIssue(repoPath, issue.number, { state })
      await invalidateGitlab(repoPath)
      show(t('gitlab.issue.updated'), 'success')
    } else {
      await window.gitfreddo.githubUpdateIssue(repoPath, issue.number, { state })
      await invalidateGitHub(repoPath)
      show(t('github.issue.updated'), 'success')
    }
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
        onAdd={canUseForge && !issuesUnavailable ? () => setCreateOpen(true) : undefined}
        addTitle={t('sidebar.createIssue')}
      >
        {!connected && (
          <p className="px-2 text-xs text-gf-fg-subtle">{t('sidebar.openRepoForIssues')}</p>
        )}
        {connected && forge.provider && !forge.connected && (
          <p className="px-2 text-xs text-gf-fg-subtle">{t(forgeConnectKey(forge.provider))}</p>
        )}
        {connected && !forge.provider && provider && !forge.connected && (
          <p className="px-2 text-xs text-gf-fg-subtle">{t(forgeConnectKey(provider))}</p>
        )}
        {connected && forge.connected && !forge.provider && (
          <p className="px-2 text-xs text-gf-fg-subtle">{t(forgeNotLinkedKey(provider))}</p>
        )}
        {canUseForge && issuesUnavailable && (
          <p className="px-2 text-xs text-gf-fg-subtle">
            {t(
              issuesUnavailable === 'retired'
                ? 'bitbucket.issue.unavailableRetired'
                : 'bitbucket.issue.unavailableNotEnabled'
            )}
          </p>
        )}
        {canUseForge && !issuesUnavailable && (
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
            {useVirtualization ? (
              <div ref={issuesScrollRef} className="overflow-y-auto" style={{ maxHeight: '40vh' }}>
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const issue = issues[virtualItem.index]!
                    const issueMenuItems = issueContextMenuItems(
                      issue,
                      {
                        onBranchFromIssue: (issueNumber, issueTitle) =>
                          void branchFromIssue(issueNumber, issueTitle),
                        onEdit: setEditIssue,
                        onClose: (entry) => void updateIssueState(entry, 'closed'),
                        onReopen: (entry) => void updateIssueState(entry, 'open')
                      },
                      t,
                      forge.provider ?? 'github'
                    )
                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute', top: 0, left: 0, width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`
                        }}
                      >
                        <SidebarTreeRow
                          icon={<SidebarIconIssues className="h-3.5 w-3.5" />}
                          label={`#${issue.number} ${issue.title}`}
                          menuItems={issueMenuItems}
                          openMenu={openMenu}
                          onClick={() => window.open(issue.htmlUrl, '_blank', 'noopener,noreferrer')}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {issues.map((issue) => {
                  const issueMenuItems = issueContextMenuItems(
                    issue,
                    {
                      onBranchFromIssue: (issueNumber, issueTitle) =>
                        void branchFromIssue(issueNumber, issueTitle),
                      onEdit: setEditIssue,
                      onClose: (entry) => void updateIssueState(entry, 'closed'),
                      onReopen: (entry) => void updateIssueState(entry, 'open')
                    },
                    t,
                    forge.provider ?? 'github'
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
                {issues.length === 0 && !isLoading && (
                  <p className="px-2 py-1 text-xs text-gf-fg-subtle">{t('sidebar.noOpenIssues')}</p>
                )}
              </div>
            )}
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

      {canUseForge && !issuesUnavailable && (
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

      {editIssue && repoPath && forge.provider === 'github' && (
        <GitHubEditIssueModal
          open
          issue={editIssue as GitHubIssue}
          repoPath={repoPath}
          onClose={() => setEditIssue(null)}
          onUpdated={() => invalidateGitHub(repoPath)}
        />
      )}
      {editIssue && repoPath && forge.provider === 'bitbucket' && (
        <BitbucketEditIssueModal
          open
          issue={editIssue as BitbucketIssue}
          repoPath={repoPath}
          onClose={() => setEditIssue(null)}
          onUpdated={() => invalidateBitbucket(repoPath)}
        />
      )}
      {editIssue && repoPath && forge.provider === 'gitlab' && (
        <GitlabEditIssueModal
          open
          issue={editIssue as GitlabIssue}
          repoPath={repoPath}
          onClose={() => setEditIssue(null)}
          onUpdated={() => invalidateGitlab(repoPath)}
        />
      )}
    </>
  )
}
