import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SidebarSection } from '@/components/layout/sidebar/SidebarSection'
import { SidebarIconPullRequest } from '@/components/layout/sidebar/SidebarIcons'
import { SidebarTreeRow } from '@/components/layout/sidebar/SidebarTreeRow'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { CreatePrModal } from '@/components/GitHub/CreatePrModal'
import { useGitHubPullRequests, useInvalidateGitHubPullRequests } from '@/hooks/useGitHubPullRequests'
import { useGitHubRepoContext } from '@/hooks/useGitHubRepos'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'
import { useBranches } from '@/hooks/useGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { useContextMenu } from '@/hooks/useContextMenu'
import { pullRequestContextMenuItems } from '@/lib/sidebarContextMenus'

export function SidebarPullRequestsSection() {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { data: ghStatus } = useGitHubStatus()
  const { data: ctx } = useGitHubRepoContext(repoPath, connected)
  const { data: prs, isLoading, error } = useGitHubPullRequests(repoPath, connected && Boolean(ctx))
  const { data: branches } = useBranches(connected)
  const invalidate = useInvalidateGitHubPullRequests()
  const show = useToastStore((s) => s.show)
  const [createOpen, setCreateOpen] = useState(false)
  const { state: menuState, openMenu, closeMenu } = useContextMenu()

  const currentBranch = branches?.find((b) => b.isCurrent && !b.isRemote)?.name ?? 'main'
  const defaultBase =
    branches?.find((b) => b.name === 'main' && !b.isRemote)?.name ??
    branches?.find((b) => !b.isRemote)?.name ??
    'main'

  const canUseGitHub = connected && ghStatus?.connected && ctx
  const count = canUseGitHub ? (prs ?? []).length : 0

  async function mergePullRequest(prNumber: number, method: 'merge' | 'squash' | 'rebase') {
    if (!repoPath) return
    await window.gitfreddo.githubMergePullRequest(repoPath, prNumber, method)
    await invalidate(repoPath)
    show(t('sidebar.prMerged', { number: prNumber }), 'success')
  }

  return (
    <>
      <SidebarSection
        sectionId="sidebar.pull-requests"
        title={t('sidebar.pullRequests')}
        icon={<SidebarIconPullRequest className="h-3.5 w-3.5" />}
        count={count}
        defaultOpen={false}
        footer
        onAdd={canUseGitHub ? () => setCreateOpen(true) : undefined}
        addTitle={t('sidebar.createPullRequest')}
      >
        {!connected && (
          <p className="px-2 text-xs text-gf-fg-subtle">{t('sidebar.openRepoForPr')}</p>
        )}
        {connected && !ghStatus?.connected && (
          <p className="px-2 text-xs text-gf-fg-subtle">{t('sidebar.connectGitHub')}</p>
        )}
        {connected && ghStatus?.connected && !ctx && (
          <p className="px-2 text-xs text-gf-fg-subtle">{t('sidebar.notLinkedGitHub')}</p>
        )}
        {canUseGitHub && (
          <>
            {isLoading && <p className="px-2 text-xs text-gf-fg-subtle">{t('common.loading')}</p>}
            {error && <p className="px-2 text-xs text-red-400">{(error as Error).message}</p>}
            <div className="space-y-0.5">
              {(prs ?? []).map((pr) => {
                const prMenuItems = pullRequestContextMenuItems(pr, {
                  onMerge: (method) => void mergePullRequest(pr.number, method)
                })
                return (
                  <SidebarTreeRow
                    key={pr.number}
                    icon={<SidebarIconPullRequest className="h-3.5 w-3.5" />}
                    label={`#${pr.number} ${pr.title}`}
                    suffix={
                      <span className="shrink-0 truncate text-[10px] text-gf-fg-subtle max-w-[6rem]">
                        {pr.head.ref} → {pr.base.ref}
                      </span>
                    }
                    menuItems={prMenuItems}
                    openMenu={openMenu}
                    onClick={() => window.open(pr.htmlUrl, '_blank', 'noopener,noreferrer')}
                  />
                )
              })}
              {(prs ?? []).length === 0 && !isLoading && (
                <p className="px-2 py-1 text-xs text-gf-fg-subtle">{t('sidebar.noOpenPullRequests')}</p>
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
        <CreatePrModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          defaultHead={currentBranch}
          defaultBase={defaultBase}
          onSubmit={async (params) => {
            if (!repoPath) return
            await window.gitfreddo.githubCreatePullRequest(repoPath, params)
            await invalidate(repoPath)
            show(t('sidebar.pullRequestCreated'), 'success')
          }}
        />
      )}
    </>
  )
}
