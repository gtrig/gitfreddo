import { useMemo, useRef, useState } from 'react'
import type { BranchCheckoutParams } from '@shared/git'
import { localBranchCheckoutParams } from '@/lib/git/branchCheckout'
import { useTranslation } from 'react-i18next'
import type { GitBranch, GitRemote } from '@/lib/types'
import type { BranchTreeNode } from '@/lib/workspace/branchTree'
import {
  buildLocalBranchTree,
  buildRemoteBranchGroups,
  countBranchTreeNodes,
  filterBranchTree,
  matchesFilter,
  parseRemoteBranchName,
  remoteBranchShortName
} from '@/lib/workspace/branchTree'
import { SidebarSection } from '@/components/Layout/sidebar/SidebarSection'
import {
  SidebarIconBranch,
  SidebarIconLocal,
  SidebarIconOrigin,
  SidebarIconRemote
} from '@/components/Layout/sidebar/SidebarIcons'
import { SidebarFolderRow, SidebarTreeRow } from '@/components/Layout/sidebar/SidebarTreeRow'
import { LoadingRow } from '@/components/Ui/Spinner'
import { ConfirmDialog } from '@/components/Ui/Modal'
import { ContextMenu } from '@/components/Ui/ContextMenu'
import { useContextMenu } from '@/hooks/useContextMenu'
import { useGitMutations } from '@/hooks/useGitMutations'
import { ForgeCreatePrModal } from '@/components/Forge/ForgeCreatePrModal'
import { useForgePullRequestActions } from '@/hooks/useForgePullRequestActions'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { MergeBranchDialog } from '@/components/Branches/MergeBranchDialog'
import { SquashMergeIntoModal } from '@/components/Branches/SquashMergeIntoModal'
import { RenameBranchModal } from '@/components/Branches/RenameBranchModal'
import { SetUpstreamModal } from '@/components/Branches/SetUpstreamModal'
import { CheckoutRemoteModal } from '@/components/Branches/CheckoutRemoteModal'
import { AddRemoteModal } from '@/components/Remotes/AddRemoteModal'
import { EditRemoteUrlModal } from '@/components/Remotes/EditRemoteUrlModal'
import { RenameRemoteModal } from '@/components/Remotes/RenameRemoteModal'
import { AddWorktreeModal } from '@/components/Worktrees/AddWorktreeModal'
import {
  folderContextMenuItems,
  localBranchContextMenuItems,
  remoteBranchContextMenuItems,
  remoteFolderContextMenuItems
} from '@/lib/context-menus/sidebarContextMenus'
import { BranchVisibilityToggle } from '@/components/Layout/sidebar/BranchVisibilityToggle'
import { branchVisibilityKey } from '@/lib/timeline/branchVisibility'
import { useBranchVisibilityStore } from '@/stores/branchVisibility'
import { useVirtualizer } from '@tanstack/react-virtual'
import { flattenVisibleBranchTree } from '@/lib/ui/flattenVisibleBranchTree'
import { shouldVirtualize, COMPACT_ROW_HEIGHT, VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'

interface LocalBranchesSectionProps {
  branches: GitBranch[] | undefined
  filter: string
  isLoading: boolean
  error: Error | null
  checkoutPending: boolean
  isDetached?: boolean
  head?: string
  onSelectCommit: (hash: string) => void
  onCheckout: (params: BranchCheckoutParams) => void
  onCreateBranch: () => void
}

function BranchTree({
  nodes,
  depth,
  filter,
  folderPrefix,
  openFolders,
  toggleFolder,
  onSelectCommit,
  onCheckout,
  onMerge,
  onSquashMergeInto,
  onRename,
  onDelete,
  onCreatePr,
  onCheckoutInWorktree,
  onSetUpstream,
  onUnsetUpstream,
  isBranchHidden,
  onToggleGraphVisibility,
  openMenu
}: {
  nodes: BranchTreeNode[]
  depth: number
  filter: string
  folderPrefix?: string
  openFolders: Set<string>
  toggleFolder: (path: string) => void
  onSelectCommit: (hash: string) => void
  onCheckout: (params: BranchCheckoutParams) => void
  onMerge: (name: string) => void
  onSquashMergeInto?: (name: string) => void
  onRename: (name: string) => void
  onDelete: (name: string) => void
  onCreatePr?: (name: string) => void
  onCheckoutInWorktree?: (name: string) => void
  onSetUpstream?: (name: string) => void
  onUnsetUpstream?: (name: string) => void
  isBranchHidden: (branchKey: string) => boolean
  onToggleGraphVisibility: (branchKey: string) => void
  openMenu: ReturnType<typeof useContextMenu>['openMenu']
}) {
  const { t } = useTranslation()
  return (
    <>
      {nodes.map((node) => {
        if (node.type === 'folder') {
          const path = folderPrefix ? `${folderPrefix}/${node.name}` : node.name
          const open = openFolders.has(path) || Boolean(filter.trim())
          return (
            <div key={path}>
              <SidebarFolderRow
                name={node.name}
                depth={depth}
                open={open}
                onToggle={() => toggleFolder(path)}
                menuItems={folderContextMenuItems(node.name, open, () => toggleFolder(path), t)}
                openMenu={openMenu}
              />
              {open && node.children && (
                <BranchTree
                  nodes={node.children}
                  depth={depth + 1}
                  filter={filter}
                  folderPrefix={path}
                  openFolders={openFolders}
                  toggleFolder={toggleFolder}
                  onSelectCommit={onSelectCommit}
                  onCheckout={onCheckout}
                  onMerge={onMerge}
                  onSquashMergeInto={onSquashMergeInto}
                  onRename={onRename}
                  onDelete={onDelete}
                  onCreatePr={onCreatePr}
                  onCheckoutInWorktree={onCheckoutInWorktree}
                  onSetUpstream={onSetUpstream}
                  onUnsetUpstream={onUnsetUpstream}
                  isBranchHidden={isBranchHidden}
                  onToggleGraphVisibility={onToggleGraphVisibility}
                  openMenu={openMenu}
                />
              )}
            </div>
          )
        }

        const branch = node.branch!
        const displayName = branch.name.includes('/') ? node.name : branch.name
        const visibilityKey = branchVisibilityKey(branch)
        const hiddenInGraph = isBranchHidden(visibilityKey)
        const branchMenuItems = localBranchContextMenuItems(
          branch,
          {
            onCheckout,
            onSelectCommit,
            onMerge,
            onSquashMergeInto,
            onRename,
            onDelete,
            onCreatePr,
            onCheckoutInWorktree,
            onSetUpstream,
            onUnsetUpstream,
            onToggleGraphVisibility,
            isHiddenInGraph: hiddenInGraph
          },
          t
        )
        return (
          <SidebarTreeRow
            key={branch.name}
            icon={<SidebarIconBranch className="h-3.5 w-3.5" />}
            label={displayName}
            depth={depth}
            isCurrent={branch.isCurrent}
            title={t('sidebar.branchClickHint')}
            labelClassName={hiddenInGraph ? 'opacity-60' : ''}
            suffix={
              branch.ahead > 0 || branch.behind > 0 ? (
                <span className="shrink-0 text-[10px] text-gf-fg-subtle">
                  {branch.ahead > 0 && `↑${branch.ahead}`}
                  {branch.behind > 0 && ` ↓${branch.behind}`}
                </span>
              ) : undefined
            }
            trailingAction={
              <BranchVisibilityToggle
                hidden={hiddenInGraph}
                disabled={branch.isCurrent}
                onToggle={() => onToggleGraphVisibility(visibilityKey)}
              />
            }
            menuItems={branchMenuItems}
            openMenu={openMenu}
            onClick={() => onSelectCommit(branch.head)}
            onDoubleClick={() => {
              if (!branch.isCurrent) onCheckout(localBranchCheckoutParams(branch.name))
            }}
          />
        )
      })}
    </>
  )
}

export function LocalBranchesSection({
  branches,
  filter,
  isLoading,
  error,
  checkoutPending,
  isDetached = false,
  head = '',
  onSelectCommit,
  onCheckout,
  onCreateBranch
}: LocalBranchesSectionProps) {
  const { t } = useTranslation()
  const localBranches = useMemo(
    () => (branches ?? []).filter((b) => !b.isRemote),
    [branches]
  )
  const tree = useMemo(() => buildLocalBranchTree(localBranches), [localBranches])
  const filteredTree = useMemo(() => filterBranchTree(tree, filter), [tree, filter])
  const showDetachedHead = isDetached && matchesFilter('HEAD', filter)
  const count = countBranchTreeNodes(filteredTree) + (showDetachedHead ? 1 : 0)
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set())
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [renameBranch, setRenameBranch] = useState<string | null>(null)
  const [mergeSource, setMergeSource] = useState<string | null>(null)
  const [squashMergeSource, setSquashMergeSource] = useState<string | null>(null)
  const [prBranch, setPrBranch] = useState<string | null>(null)
  const [worktreeBranch, setWorktreeBranch] = useState<string | null>(null)
  const [upstreamBranch, setUpstreamBranch] = useState<string | null>(null)
  const { state: menuState, openMenu, closeMenu } = useContextMenu()
  const { deleteBranch, unsetUpstream } = useGitMutations()
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const toggleBranchVisibility = useBranchVisibilityStore((s) => s.toggleBranchVisibility)
  const isBranchHidden = useBranchVisibilityStore((s) => s.isBranchHidden)
  const { canCreatePr, provider, submitPullRequest } = useForgePullRequestActions(repoPath, true)
  const show = useToastStore((s) => s.show)

  const defaultBase =
    localBranches.find((b) => b.name === 'main')?.name ??
    localBranches[0]?.name ??
    'main'

  function toggleFolder(path: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const flatBranchItems = useMemo(
    () => flattenVisibleBranchTree(filteredTree, openFolders, filter),
    [filteredTree, openFolders, filter]
  )
  const totalFlatCount = flatBranchItems.length + (showDetachedHead ? 1 : 0)
  const useVirtualization = shouldVirtualize(totalFlatCount)

  const localScrollRef = useRef<HTMLDivElement>(null)
  const localVirtualizer = useVirtualizer({
    count: useVirtualization ? totalFlatCount : 0,
    getScrollElement: () => localScrollRef.current,
    estimateSize: () => COMPACT_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  return (
    <SidebarSection
      sectionId="sidebar.local"
      title={t('sidebar.local')}
      icon={<SidebarIconLocal className="h-3.5 w-3.5" />}
      count={count}
      onAdd={onCreateBranch}
      addTitle={t('sidebar.createBranch')}
    >
      {isLoading && <LoadingRow />}
      {checkoutPending && <LoadingRow label={t('sidebar.checkingOut')} />}
      {error && <p className="px-2 text-xs text-red-400">{error.message}</p>}
      {!isLoading && count === 0 && (
        <p className="px-2 py-1 text-xs text-gf-fg-subtle">{t('sidebar.noLocalBranches')}</p>
      )}
      {useVirtualization ? (
        <div ref={localScrollRef} className="overflow-y-auto" style={{ maxHeight: '50vh' }}>
          <div style={{ height: localVirtualizer.getTotalSize(), position: 'relative' }}>
            {localVirtualizer.getVirtualItems().map((virtualItem) => {
              const adjustedIndex = virtualItem.index
              if (showDetachedHead && head && adjustedIndex === 0) {
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
                      icon={<SidebarIconBranch className="h-3.5 w-3.5" />}
                      label={t('common.head')}
                      labelClassName="text-emerald-400"
                      title={t('sidebar.detachedHead')}
                      onClick={() => onSelectCommit(head)}
                    />
                  </div>
                )
              }
              const flatIndex = showDetachedHead ? adjustedIndex - 1 : adjustedIndex
              const item = flatBranchItems[flatIndex]
              if (!item) return null
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`
                  }}
                >
                  {item.kind === 'folder' ? (
                    (() => {
                      const folderPath = item.id.replace(/^folder:/, '')
                      const open = openFolders.has(folderPath) || Boolean(filter.trim())
                      return (
                        <SidebarFolderRow
                          name={item.node.name}
                          depth={item.depth}
                          open={open}
                          onToggle={() => toggleFolder(folderPath)}
                          menuItems={folderContextMenuItems(item.node.name, open, () => toggleFolder(folderPath), t)}
                          openMenu={openMenu}
                        />
                      )
                    })()
                  ) : (
                    (() => {
                      const branch = item.node.branch!
                      const displayName = branch.name.includes('/') ? item.node.name : branch.name
                      const visibilityKey = branchVisibilityKey(branch)
                      const hiddenInGraph = isBranchHidden(visibilityKey)
                      const branchMenuItems = localBranchContextMenuItems(
                        branch,
                        {
                          onCheckout,
                          onSelectCommit,
                          onMerge: setMergeSource,
                          onSquashMergeInto: setSquashMergeSource,
                          onRename: setRenameBranch,
                          onDelete: setPendingDelete,
                          onCreatePr: canCreatePr ? setPrBranch : undefined,
                          onCheckoutInWorktree: setWorktreeBranch,
                          onSetUpstream: setUpstreamBranch,
                          onUnsetUpstream: (name) => void unsetUpstream.mutateAsync({ branch: name }),
                          onToggleGraphVisibility: toggleBranchVisibility,
                          isHiddenInGraph: hiddenInGraph
                        },
                        t
                      )
                      return (
                        <SidebarTreeRow
                          icon={<SidebarIconBranch className="h-3.5 w-3.5" />}
                          label={displayName}
                          depth={item.depth}
                          isCurrent={branch.isCurrent}
                          title={t('sidebar.branchClickHint')}
                          labelClassName={hiddenInGraph ? 'opacity-60' : ''}
                          suffix={
                            branch.ahead > 0 || branch.behind > 0 ? (
                              <span className="shrink-0 text-[10px] text-gf-fg-subtle">
                                {branch.ahead > 0 && `↑${branch.ahead}`}
                                {branch.behind > 0 && ` ↓${branch.behind}`}
                              </span>
                            ) : undefined
                          }
                          trailingAction={
                            <BranchVisibilityToggle
                              hidden={hiddenInGraph}
                              disabled={branch.isCurrent}
                              onToggle={() => toggleBranchVisibility(visibilityKey)}
                            />
                          }
                          menuItems={branchMenuItems}
                          openMenu={openMenu}
                          onClick={() => onSelectCommit(branch.head)}
                          onDoubleClick={() => {
                            if (!branch.isCurrent) onCheckout(localBranchCheckoutParams(branch.name))
                          }}
                        />
                      )
                    })()
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-0.5">
          {showDetachedHead && head ? (
            <SidebarTreeRow
              icon={<SidebarIconBranch className="h-3.5 w-3.5" />}
              label={t('common.head')}
              labelClassName="text-emerald-400"
              title={t('sidebar.detachedHead')}
              onClick={() => onSelectCommit(head)}
            />
          ) : null}
          <BranchTree
            nodes={filteredTree}
            depth={0}
            filter={filter}
            openFolders={openFolders}
            toggleFolder={toggleFolder}
            onSelectCommit={onSelectCommit}
            onCheckout={onCheckout}
            onMerge={setMergeSource}
            onSquashMergeInto={setSquashMergeSource}
            onRename={setRenameBranch}
            onDelete={setPendingDelete}
            onCreatePr={canCreatePr ? setPrBranch : undefined}
            onCheckoutInWorktree={setWorktreeBranch}
            onSetUpstream={setUpstreamBranch}
            onUnsetUpstream={(name) => void unsetUpstream.mutateAsync({ branch: name })}
            isBranchHidden={isBranchHidden}
            onToggleGraphVisibility={toggleBranchVisibility}
            openMenu={openMenu}
          />
        </div>
      )}

      {menuState && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={menuState.items}
          onClose={closeMenu}
        />
      )}
      {mergeSource && <MergeBranchDialog sourceBranch={mergeSource} onClose={() => setMergeSource(null)} />}
      {squashMergeSource && (
        <SquashMergeIntoModal
          sourceBranch={squashMergeSource}
          onClose={() => setSquashMergeSource(null)}
        />
      )}
      {renameBranch && (
        <RenameBranchModal
          open
          currentName={renameBranch}
          onClose={() => setRenameBranch(null)}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          open
          title={t('sidebar.deleteBranch')}
          message={t('sidebar.deleteBranchConfirm', { name: pendingDelete })}
          confirmLabel={t('common.delete')}
          busy={deleteBranch.isPending}
          onConfirm={async () => {
            await deleteBranch.mutateAsync({ name: pendingDelete, force: true })
            setPendingDelete(null)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {prBranch && repoPath && provider && (
        <ForgeCreatePrModal
          provider={provider}
          open
          onClose={() => setPrBranch(null)}
          defaultHead={prBranch}
          defaultBase={defaultBase}
          onSubmit={async (params) => {
            await submitPullRequest(params)
            show(t('sidebar.pullRequestCreated'), 'success')
            setPrBranch(null)
          }}
        />
      )}
      {worktreeBranch && (
        <AddWorktreeModal
          open
          initialBranch={worktreeBranch}
          onClose={() => setWorktreeBranch(null)}
        />
      )}
      {upstreamBranch && (
        <SetUpstreamModal
          open
          branchName={upstreamBranch}
          currentUpstream={localBranches.find((b) => b.name === upstreamBranch)?.upstream}
          onClose={() => setUpstreamBranch(null)}
        />
      )}
    </SidebarSection>
  )
}

interface RemoteBranchesSectionProps {
  branches: GitBranch[] | undefined
  remotes: GitRemote[] | undefined
  filter: string
  isLoading: boolean
  error: Error | null
  onSelectCommit: (hash: string) => void
}

export function RemoteBranchesSection({
  branches,
  remotes,
  filter,
  isLoading,
  error,
  onSelectCommit
}: RemoteBranchesSectionProps) {
  const { t } = useTranslation()
  const remoteBranches = useMemo(
    () =>
      (branches ?? []).filter((branch) => {
        if (!branch.isRemote || branch.name.endsWith('/HEAD')) return false
        const parsed = parseRemoteBranchName(branch.name)
        if (!parsed) return false
        return matchesFilter(`${parsed.remote}/${parsed.branch}`, filter)
      }),
    [branches, filter]
  )

  const grouped = useMemo(() => {
    const map = buildRemoteBranchGroups(remoteBranches)

    for (const remote of remotes ?? []) {
      if (matchesFilter(remote.name, filter) && !map.has(remote.name)) {
        map.set(remote.name, [])
      }
    }

    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [remoteBranches, remotes, filter])

  const count = grouped.reduce((sum, [, list]) => sum + list.length, 0)
  const [collapsedRemotes, setCollapsedRemotes] = useState<Set<string>>(() => new Set())
  const [checkoutRemote, setCheckoutRemote] = useState<string | null>(null)
  const [pendingDeleteRemote, setPendingDeleteRemote] = useState<GitBranch | null>(null)
  const [pendingRemoveRemote, setPendingRemoveRemote] = useState<string | null>(null)
  const [addRemoteOpen, setAddRemoteOpen] = useState(false)
  const [editRemote, setEditRemote] = useState<GitRemote | null>(null)
  const [renameRemote, setRenameRemote] = useState<string | null>(null)
  const { state: menuState, openMenu, closeMenu } = useContextMenu()
  const { fetch, deleteRemoteBranch, remoteRemove } = useGitMutations()
  const toggleBranchVisibility = useBranchVisibilityStore((s) => s.toggleBranchVisibility)
  const isBranchHidden = useBranchVisibilityStore((s) => s.isBranchHidden)

  function toggleRemote(name: string) {
    setCollapsedRemotes((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function openEditRemote(name: string) {
    const remote = remotes?.find((entry) => entry.name === name)
    if (remote) {
      setEditRemote(remote)
    }
  }

  return (
    <SidebarSection
      sectionId="sidebar.remote"
      title={t('sidebar.remote')}
      icon={<SidebarIconRemote className="h-3.5 w-3.5" />}
      count={count || grouped.length}
      onAdd={() => setAddRemoteOpen(true)}
      addTitle={t('sidebar.addRemote')}
    >
      {isLoading && <LoadingRow />}
      {error && <p className="px-2 text-xs text-red-400">{error.message}</p>}
      {!isLoading && grouped.length === 0 && (
        <p className="px-2 py-1 text-xs text-gf-fg-subtle">{t('sidebar.noRemotes')}</p>
      )}
      <div className="space-y-0.5">
        {grouped.map(([remote, list]) => {
          const open = !collapsedRemotes.has(remote) || Boolean(filter.trim())
          return (
            <div key={remote}>
              <SidebarFolderRow
                name={remote}
                depth={0}
                open={open}
                onToggle={() => toggleRemote(remote)}
                menuItems={remoteFolderContextMenuItems(
                  remote,
                  open,
                  {
                    onToggle: () => toggleRemote(remote),
                    onFetch: (remoteName) => void fetch.mutateAsync({ remote: remoteName }),
                    onEditUrl: openEditRemote,
                    onRename: setRenameRemote,
                    onDelete: setPendingRemoveRemote
                  },
                  t
                )}
                openMenu={openMenu}
              />
              {open && list.length === 0 && (
                <p
                  style={{ paddingLeft: '22px' }}
                  className="py-1 pr-2 text-[10px] text-gf-fg-subtle"
                >
                  {t('sidebar.fetchToLoad')}
                </p>
              )}
              {open &&
                list.map((branch) => {
                  const visibilityKey = branchVisibilityKey(branch)
                  const hiddenInGraph = isBranchHidden(visibilityKey)
                  const remoteBranchMenuItems = remoteBranchContextMenuItems(
                    branch,
                    {
                      onSelectCommit,
                      onCheckout: setCheckoutRemote,
                      onDeleteRemote: (remoteBranch) => {
                        const match = remoteBranches.find((item) => item.name === remoteBranch)
                        if (match) setPendingDeleteRemote(match)
                      },
                      onToggleGraphVisibility: toggleBranchVisibility,
                      isHiddenInGraph: hiddenInGraph
                    },
                    t
                  )
                  return (
                    <SidebarTreeRow
                      key={branch.name}
                      icon={<SidebarIconOrigin className="h-3.5 w-3.5" />}
                      label={remoteBranchShortName(branch.name)}
                      depth={1}
                      title={t('sidebar.clickFocusCommit')}
                      labelClassName={hiddenInGraph ? 'opacity-60' : ''}
                      menuItems={remoteBranchMenuItems}
                      openMenu={openMenu}
                      onClick={() => onSelectCommit(branch.head)}
                      trailingAction={
                        <BranchVisibilityToggle
                          hidden={hiddenInGraph}
                          onToggle={() => toggleBranchVisibility(visibilityKey)}
                        />
                      }
                    />
                  )
                })}
            </div>
          )
        })}
      </div>

      {menuState && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={menuState.items}
          onClose={closeMenu}
        />
      )}

      {checkoutRemote && (
        <CheckoutRemoteModal
          open
          remoteBranch={checkoutRemote}
          onClose={() => setCheckoutRemote(null)}
        />
      )}

      {pendingDeleteRemote && (
        <ConfirmDialog
          open
          title={t('sidebar.deleteRemoteBranch')}
          message={t('sidebar.deleteRemoteBranchConfirm', {
            name: remoteBranchShortName(pendingDeleteRemote.name)
          })}
          confirmLabel={t('common.delete')}
          busy={deleteRemoteBranch.isPending}
          onConfirm={async () => {
            const parsed = parseRemoteBranchName(pendingDeleteRemote.name)
            if (parsed) {
              await deleteRemoteBranch.mutateAsync({
                remote: parsed.remote,
                branch: parsed.branch
              })
            }
            setPendingDeleteRemote(null)
          }}
          onCancel={() => setPendingDeleteRemote(null)}
        />
      )}

      {pendingRemoveRemote && (
        <ConfirmDialog
          open
          title={t('sidebar.deleteRemote')}
          message={t('sidebar.deleteRemoteConfirm', { name: pendingRemoveRemote })}
          confirmLabel={t('common.delete')}
          busy={remoteRemove.isPending}
          onConfirm={async () => {
            await remoteRemove.mutateAsync({ name: pendingRemoveRemote })
            setPendingRemoveRemote(null)
          }}
          onCancel={() => setPendingRemoveRemote(null)}
        />
      )}

      <AddRemoteModal open={addRemoteOpen} onClose={() => setAddRemoteOpen(false)} />

      {editRemote && (
        <EditRemoteUrlModal
          open
          remoteName={editRemote.name}
          currentUrl={editRemote.url}
          onClose={() => setEditRemote(null)}
        />
      )}

      {renameRemote && (
        <RenameRemoteModal
          open
          currentName={renameRemote}
          onClose={() => setRenameRemote(null)}
        />
      )}
    </SidebarSection>
  )
}
