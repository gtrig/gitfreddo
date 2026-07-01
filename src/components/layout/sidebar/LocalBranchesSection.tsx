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
import { ActionButton } from '@/components/ui/Modal'

interface LocalBranchesSectionProps {
  branches: GitBranch[] | undefined
  filter: string
  isLoading: boolean
  error: Error | null
  checkoutPending: boolean
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
  onCheckout
}: {
  nodes: BranchTreeNode[]
  depth: number
  filter: string
  openFolders: Set<string>
  toggleFolder: (path: string) => void
  onSelectCommit: (hash: string) => void
  onCheckout: (name: string) => void
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
                />
              )}
            </div>
          )
        }

        const branch = node.branch!
        const displayName = branch.name.includes('/') ? node.name : branch.name
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
  const count = countBranchTreeNodes(filteredTree)
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set())

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
      headerActions={
        <ActionButton onClick={onCreateBranch} className="px-1.5 py-0.5 text-[10px]">
          +
        </ActionButton>
      }
    >
      {isLoading && <LoadingRow />}
      {checkoutPending && <LoadingRow label="Checking out…" />}
      {error && <p className="px-2 text-xs text-red-400">{error.message}</p>}
      {!isLoading && count === 0 && (
        <p className="px-2 py-1 text-xs text-gf-fg-subtle">No local branches match filter.</p>
      )}
      <div className="space-y-0.5">
        <BranchTree
          nodes={filteredTree}
          depth={0}
          filter={filter}
          openFolders={openFolders}
          toggleFolder={toggleFolder}
          onSelectCommit={onSelectCommit}
          onCheckout={onCheckout}
        />
      </div>
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

  function toggleRemote(name: string) {
    setCollapsedRemotes((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <SidebarSection
      sectionId="sidebar.remote"
      title="Remote"
      icon={<SidebarIconRemote className="h-3.5 w-3.5" />}
      count={count || grouped.length}
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
                list.map((branch) => (
                  <SidebarTreeRow
                    key={branch.name}
                    icon={<SidebarIconOrigin className="h-3.5 w-3.5" />}
                    label={remoteBranchShortName(branch.name)}
                    depth={1}
                    title="Click to focus commit"
                    onClick={() => onSelectCommit(branch.head)}
                  />
                ))}
            </div>
          )
        })}
      </div>
    </SidebarSection>
  )
}
