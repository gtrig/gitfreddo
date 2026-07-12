import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CreatePrModal as BitbucketCreatePrModal } from '@/components/Bitbucket/CreatePrModal'
import { CreatePrModal as GitHubCreatePrModal } from '@/components/GitHub/CreatePrModal'
import { SidebarSection } from '@/components/Layout/sidebar/SidebarSection'
import { SidebarIconPullRequest } from '@/components/Layout/sidebar/SidebarIcons'
import { SidebarTreeRow } from '@/components/Layout/sidebar/SidebarTreeRow'
import { ContextMenu } from '@/components/Ui/ContextMenu'
import { useBitbucketPullRequests, useInvalidateBitbucketPullRequests } from '@/hooks/useBitbucketPullRequests'
import { useForgeContext, forgeConnectKey, forgeNotLinkedKey } from '@/hooks/useForgeContext'
import { useGitHubPullRequests, useInvalidateGitHubPullRequests } from '@/hooks/useGitHubPullRequests'
import { useBranches } from '@/hooks/useGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { useContextMenu } from '@/hooks/useContextMenu'
import { pullRequestContextMenuItems } from '@/lib/context-menus/sidebarContextMenus'
import { useVirtualizer } from '@tanstack/react-virtual'
import { COMPACT_ROW_HEIGHT, VIRTUAL_OVERSCAN, shouldVirtualize } from '@/lib/ui/virtualList'
import type { BitbucketPullRequest } from '@shared/bitbucket'
import type { GitHubPullRequest } from '@shared/github'

type ForgePullRequest = GitHubPullRequest | BitbucketPullRequest

interface SidebarPullRequestsSectionProps {
  onOpenPrDetail?: (target: {
    number: number
    repository: GitHubPullRequest['repository']
  }) => void
}

export function SidebarPullRequestsSection({ onOpenPrDetail }: SidebarPullRequestsSectionProps) {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const forge = useForgeContext(repoPath, connected)
  const provider = forge.provider ?? forge.expectedProvider
  const { data: ghPrs, isLoading: ghLoading, error: ghError } = useGitHubPullRequests(
    repoPath,
    connected && forge.provider === 'github'
  )
  const { data: bbPrs, isLoading: bbLoading, error: bbError } = useBitbucketPullRequests(
    repoPath,
    connected && forge.provider === 'bitbucket'
  )
  const { data: branches } = useBranches(connected)
  const invalidateGitHub = useInvalidateGitHubPullRequests()
  const invalidateBitbucket = useInvalidateBitbucketPullRequests()
  const show = useToastStore((s) => s.show)
  const [createOpen, setCreateOpen] = useState(false)
  const { state: menuState, openMenu, closeMenu } = useContextMenu()

  const currentBranch = branches?.find((b) => b.isCurrent && !b.isRemote)?.name ?? 'main'
  const defaultBase =
    branches?.find((b) => b.name === 'main' && !b.isRemote)?.name ??
    branches?.find((b) => !b.isRemote)?.name ??
    'main'

  const canUseForge = connected && Boolean(forge.provider) && forge.connected
  const prs: ForgePullRequest[] =
    forge.provider === 'bitbucket' ? (bbPrs ?? []) : forge.provider === 'github' ? (ghPrs ?? []) : []
  const isLoading = forge.provider === 'bitbucket' ? bbLoading : ghLoading
  const error = forge.provider === 'bitbucket' ? bbError : ghError
  const count = canUseForge ? prs.length : 0
  const prsScrollRef = useRef<HTMLDivElement>(null)
  const useVirtualization = shouldVirtualize(prs.length)

  const virtualizer = useVirtualizer({
    count: useVirtualization ? prs.length : 0,
    getScrollElement: () => prsScrollRef.current,
    estimateSize: () => COMPACT_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  async function mergePullRequest(prNumber: number, method: 'merge' | 'squash' | 'rebase') {
    if (!repoPath || !forge.provider) return
    if (forge.provider === 'bitbucket') {
      await window.gitfreddo.bitbucketMergePullRequest(repoPath, prNumber, method)
      await invalidateBitbucket(repoPath)
    } else {
      await window.gitfreddo.githubMergePullRequest(repoPath, prNumber, method)
      await invalidateGitHub(repoPath)
    }
    show(t('sidebar.prMerged', { number: prNumber }), 'success')
  }

  async function createPullRequest(params: {
    title: string
    body: string
    head: string
    base: string
  }) {
    if (!repoPath || !forge.provider) return
    if (forge.provider === 'bitbucket') {
      await window.gitfreddo.bitbucketCreatePullRequest(repoPath, params)
      await invalidateBitbucket(repoPath)
    } else {
      await window.gitfreddo.githubCreatePullRequest(repoPath, params)
      await invalidateGitHub(repoPath)
    }
    show(t('sidebar.pullRequestCreated'), 'success')
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
        onAdd={canUseForge ? () => setCreateOpen(true) : undefined}
        addTitle={t('sidebar.createPullRequest')}
      >
        {!connected && (
          <p className="px-2 text-xs text-gf-fg-subtle">{t('sidebar.openRepoForPr')}</p>
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
        {canUseForge && (
          <>
            {isLoading && <p className="px-2 text-xs text-gf-fg-subtle">{t('common.loading')}</p>}
            {error && <p className="px-2 text-xs text-red-400">{(error as Error).message}</p>}
            {useVirtualization ? (
              <div ref={prsScrollRef} className="overflow-y-auto" style={{ maxHeight: '40vh' }}>
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const pr = prs[virtualItem.index]!
                    const prMenuItems = pullRequestContextMenuItems(
                      pr,
                      {
                        onMerge: (method) => void mergePullRequest(pr.number, method)
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
                          icon={<SidebarIconPullRequest className="h-3.5 w-3.5" />}
                          label={`#${pr.number} ${pr.title}`}
                          suffix={
                            <span className="shrink-0 truncate text-[10px] text-gf-fg-subtle max-w-[6rem]">
                              {pr.head.ref} → {pr.base.ref}
                            </span>
                          }
                          menuItems={prMenuItems}
                          openMenu={openMenu}
                          onClick={() => {
                            if (forge.provider === 'github') {
                              onOpenPrDetail?.({
                                number: pr.number,
                                repository: (pr as GitHubPullRequest).repository
                              })
                            } else {
                              window.open(pr.htmlUrl, '_blank', 'noopener,noreferrer')
                            }
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {prs.map((pr) => {
                  const prMenuItems = pullRequestContextMenuItems(
                    pr,
                    {
                      onMerge: (method) => void mergePullRequest(pr.number, method)
                    },
                    t,
                    forge.provider ?? 'github'
                  )
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
                      onClick={() => {
                        if (forge.provider === 'github') {
                          onOpenPrDetail?.({
                            number: pr.number,
                            repository: (pr as GitHubPullRequest).repository
                          })
                        } else {
                          window.open(pr.htmlUrl, '_blank', 'noopener,noreferrer')
                        }
                      }}
                    />
                  )
                })}
                {prs.length === 0 && !isLoading && (
                  <p className="px-2 py-1 text-xs text-gf-fg-subtle">{t('sidebar.noOpenPullRequests')}</p>
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

      {canUseForge && forge.provider === 'github' && (
        <GitHubCreatePrModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          defaultHead={currentBranch}
          defaultBase={defaultBase}
          onSubmit={createPullRequest}
        />
      )}
      {canUseForge && forge.provider === 'bitbucket' && (
        <BitbucketCreatePrModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          defaultHead={currentBranch}
          defaultBase={defaultBase}
          onSubmit={createPullRequest}
        />
      )}
    </>
  )
}
