import { useMemo, useState } from 'react'
import type { GitBranch, GitRemote } from '@/lib/types'
import type { BranchTreeNode } from '@/lib/branchTree'
import {
  buildLocalBranchTree,
  buildRemoteBranchGroups,
  countBranchTreeNodes,
  filterBranchTree,
  matchesFilter,
  parseRemoteBranchName,
  remoteBranchShortName
} from '@/lib/branchTree'
import { SidebarSection } from '@/components/layout/sidebar/SidebarSection'
import {
  SidebarIconBranch,
  SidebarIconLocal,
  SidebarIconOrigin,
  SidebarIconRemote
} from '@/components/layout/sidebar/SidebarIcons'
import { SidebarFolderRow, SidebarTreeRow } from '@/components/layout/sidebar/SidebarTreeRow'
import { LoadingRow } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/Modal'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { useContextMenu } from '@/hooks/useContextMenu'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useGitHubRepoContext } from '@/hooks/useGitHubRepos'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'
import { useWorkspaceStore } from '@/stores/workspace'
import { useInvalidateGitHubPullRequests } from '@/hooks/useGitHubPullRequests'
import { useToastStore } from '@/stores/toast'
import { MergeBranchDialog } from '@/components/BranchSidebar/MergeBranchDialog'
import { CreatePrModal } from '@/components/GitHub/CreatePrModal'
import { RenameBranchModal } from '@/components/actions/RenameBranchModal'
import { SetUpstreamModal } from '@/components/actions/SetUpstreamModal'
import { CheckoutRemoteModal } from '@/components/actions/CheckoutRemoteModal'
import { AddRemoteModal } from '@/components/actions/AddRemoteModal'
import { EditRemoteUrlModal } from '@/components/actions/EditRemoteUrlModal'
import { AddWorktreeModal } from '@/components/actions/AddWorktreeModal'
import {
  folderContextMenuItems,
  localBranchContextMenuItems,
  remoteBranchContextMenuItems,
  remoteFolderContextMenuItems
} from '@/lib/sidebarContextMenus'

interface LocalBranchesSectionProps {
  branches: GitBranch[] | undefined
  filter: string
  isLoading: boolean
  error: Error | null
  checkoutPending: boolean
  isDetached?: boolean
  head?: string
  onSelectCommit: (hash: string) => void
  onCheckout: (name: string) => void
  onCreateBranch: () => void
}

function BranchTree({
  nodes,
  depth,
  filter,
  openFolders,
  toggleFolder,
  onSelectCommit,
  onCheckout,
  onMerge,
  onRename,
  onDelete,
  onCreatePr,
  onCheckoutInWorktree,
  onSetUpstream,
  onUnsetUpstream,
  openMenu
}: {
  nodes: BranchTreeNode[]
  depth: number
  filter: string
  openFolders: Set<string>
  toggleFolder: (path: string) => void
  onSelectCommit: (hash: string) => void
  onCheckout: (name: string) => void
  onMerge: (name: string) => void
  onRename: (name: string) => void
  onDelete: (name: string) => void
  onCreatePr?: (name: string) => void
  onCheckoutInWorktree?: (name: string) => void
  onSetUpstream?: (name: string) => void
  onUnsetUpstream?: (name: string) => void
  openMenu: ReturnType<typeof useContextMenu>['openMenu']
}) {
  return (
    <>
      {nodes.map((node) => {
        if (node.type === 'folder') {
          const path = `${depth}:${node.name}`
          const open = openFolders.has(path) || Boolean(filter.trim())
          return (
            <div key={path}>
              <SidebarFolderRow
                name={node.name}
                depth={depth}
                open={open}
                onToggle={() => toggleFolder(path)}
                menuItems={folderContextMenuItems(node.name, open, () => toggleFolder(path))}
                openMenu={openMenu}
              />
              {open && node.children && (
                <BranchTree
                  nodes={node.children}
                  depth={depth + 1}
                  filter={filter}
                  openFolders={openFolders}
                  toggleFolder={toggleFolder}
                  onSelectCommit={onSelectCommit}
                  onCheckout={onCheckout}
                  onMerge={onMerge}
                  onRename={onRename}
                  onDelete={onDelete}
                  onCreatePr={onCreatePr}
                  onCheckoutInWorktree={onCheckoutInWorktree}
                  onSetUpstream={onSetUpstream}
                  onUnsetUpstream={onUnsetUpstream}
                  openMenu={openMenu}
                />
              )}
            </div>
          )
        }

        const branch = node.branch!
        const displayName = branch.name.includes('/') ? node.name : branch.name
        const branchMenuItems = localBranchContextMenuItems(branch, {
          onCheckout,
          onSelectCommit,
          onMerge,
          onRename,
          onDelete,
          onCreatePr,
          onCheckoutInWorktree,
          onSetUpstream,
          onUnsetUpstream
        })
        return (
          <SidebarTreeRow
            key={branch.name}
            icon={<SidebarIconBranch className="h-3.5 w-3.5" />}
            label={displayName}
            depth={depth}
            isCurrent={branch.isCurrent}
            title="Click to focus commit · Double-click to checkout"
            suffix={
              branch.ahead > 0 || branch.behind > 0 ? (
                <span className="shrink-0 text-[10px] text-gf-fg-subtle">
                  {branch.ahead > 0 && `↑${branch.ahead}`}
                  {branch.behind > 0 && ` ↓${branch.behind}`}
                </span>
              ) : undefined
            }
            menuItems={branchMenuItems}
            openMenu={openMenu}
            onClick={() => onSelectCommit(branch.head)}
            onDoubleClick={() => {
              if (!branch.isCurrent) onCheckout(branch.name)
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
  const [prBranch, setPrBranch] = useState<string | null>(null)
  const [worktreeBranch, setWorktreeBranch] = useState<string | null>(null)
  const [upstreamBranch, setUpstreamBranch] = useState<string | null>(null)
  const { state: menuState, openMenu, closeMenu } = useContextMenu()
  const { deleteBranch, unsetUpstream } = useGitMutations()
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { data: ghStatus } = useGitHubStatus()
  const { data: ghCtx } = useGitHubRepoContext(repoPath, true)
  const invalidatePrs = useInvalidateGitHubPullRequests()
  const show = useToastStore((s) => s.show)

  const defaultBase =
    localBranches.find((b) => b.name === 'main')?.name ??
    localBranches[0]?.name ??
    'main'
  const canCreatePr = Boolean(ghStatus?.connected && ghCtx)

  function toggleFolder(path: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <SidebarSection
      sectionId="sidebar.local"
      title="Local"
      icon={<SidebarIconLocal className="h-3.5 w-3.5" />}
      count={count}
      onAdd={onCreateBranch}
      addTitle="Create branch"
    >
      {isLoading && <LoadingRow />}
      {checkoutPending && <LoadingRow label="Checking out…" />}
      {error && <p className="px-2 text-xs text-red-400">{error.message}</p>}
      {!isLoading && count === 0 && (
        <p className="px-2 py-1 text-xs text-gf-fg-subtle">No local branches match filter.</p>
      )}
      <div className="space-y-0.5">
        {showDetachedHead && head ? (
          <SidebarTreeRow
            icon={<SidebarIconBranch className="h-3.5 w-3.5" />}
            label="HEAD"
            labelClassName="text-emerald-400"
            title="Detached HEAD"
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
          onRename={setRenameBranch}
          onDelete={setPendingDelete}
          onCreatePr={canCreatePr ? setPrBranch : undefined}
          onCheckoutInWorktree={setWorktreeBranch}
          onSetUpstream={setUpstreamBranch}
          onUnsetUpstream={(name) => void unsetUpstream.mutateAsync({ branch: name })}
          openMenu={openMenu}
        />
      </div>

      {menuState && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={menuState.items}
          onClose={closeMenu}
        />
      )}
      {mergeSource && <MergeBranchDialog sourceBranch={mergeSource} onClose={() => setMergeSource(null)} />}
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
          title="Delete branch"
          message={`Delete branch "${pendingDelete}"?`}
          confirmLabel="Delete"
          busy={deleteBranch.isPending}
          onConfirm={async () => {
            await deleteBranch.mutateAsync({ name: pendingDelete, force: true })
            setPendingDelete(null)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {prBranch && repoPath && (
        <CreatePrModal
          open
          onClose={() => setPrBranch(null)}
          defaultHead={prBranch}
          defaultBase={defaultBase}
          onSubmit={async (params) => {
            await window.gitfredo.githubCreatePullRequest(repoPath, params)
            await invalidatePrs(repoPath)
            show('Pull request created', 'success')
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
  const [addRemoteOpen, setAddRemoteOpen] = useState(false)
  const [editRemote, setEditRemote] = useState<GitRemote | null>(null)
  const { state: menuState, openMenu, closeMenu } = useContextMenu()
  const { fetch, deleteRemoteBranch } = useGitMutations()

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
      title="Remote"
      icon={<SidebarIconRemote className="h-3.5 w-3.5" />}
      count={count || grouped.length}
      onAdd={() => setAddRemoteOpen(true)}
      addTitle="Add remote"
    >
      {isLoading && <LoadingRow />}
      {error && <p className="px-2 text-xs text-red-400">{error.message}</p>}
      {!isLoading && grouped.length === 0 && (
        <p className="px-2 py-1 text-xs text-gf-fg-subtle">No remotes configured.</p>
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
                menuItems={remoteFolderContextMenuItems(remote, open, {
                  onToggle: () => toggleRemote(remote),
                  onFetch: (remoteName) => void fetch.mutateAsync({ remote: remoteName }),
                  onEditUrl: openEditRemote
                })}
                openMenu={openMenu}
              />
              {open && list.length === 0 && (
                <p
                  style={{ paddingLeft: '22px' }}
                  className="py-1 pr-2 text-[10px] text-gf-fg-subtle"
                >
                  Fetch to load branches
                </p>
              )}
              {open &&
                list.map((branch) => {
                  const remoteBranchMenuItems = remoteBranchContextMenuItems(branch, {
                    onSelectCommit,
                    onCheckout: setCheckoutRemote,
                    onDeleteRemote: (remoteBranch) => {
                      const match = remoteBranches.find((item) => item.name === remoteBranch)
                      if (match) setPendingDeleteRemote(match)
                    }
                  })
                  return (
                    <SidebarTreeRow
                      key={branch.name}
                      icon={<SidebarIconOrigin className="h-3.5 w-3.5" />}
                      label={remoteBranchShortName(branch.name)}
                      depth={1}
                      title="Click to focus commit"
                      menuItems={remoteBranchMenuItems}
                      openMenu={openMenu}
                      onClick={() => onSelectCommit(branch.head)}
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
          title="Delete remote branch"
          message={`Delete remote branch "${remoteBranchShortName(pendingDeleteRemote.name)}"?`}
          confirmLabel="Delete"
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

      <AddRemoteModal open={addRemoteOpen} onClose={() => setAddRemoteOpen(false)} />

      {editRemote && (
        <EditRemoteUrlModal
          open
          remoteName={editRemote.name}
          currentUrl={editRemote.url}
          onClose={() => setEditRemote(null)}
        />
      )}
    </SidebarSection>
  )
}
