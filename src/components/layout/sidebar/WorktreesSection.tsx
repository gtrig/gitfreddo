import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GitWorktreeEntry } from '@/lib/types'
import { SidebarSection } from '@/components/layout/sidebar/SidebarSection'
import { SidebarIconWorktree } from '@/components/layout/sidebar/SidebarIcons'
import { SidebarTreeRow } from '@/components/layout/sidebar/SidebarTreeRow'
import { LoadingRow } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/Modal'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { useContextMenu } from '@/hooks/useContextMenu'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { matchesFilter } from '@/lib/branchTree'
import { copyToClipboard } from '@/lib/clipboard'
import { worktreeContextMenuItems } from '@/lib/sidebarContextMenus'
import { worktreeLabel } from '@/lib/worktreePaths'
import { AddWorktreeModal } from '@/components/actions/AddWorktreeModal'

interface WorktreesSectionProps {
  worktrees: GitWorktreeEntry[] | undefined
  filter: string
  isLoading: boolean
  error: Error | null
}

export function WorktreesSection({
  worktrees,
  filter,
  isLoading,
  error
}: WorktreesSectionProps) {
  const { t } = useTranslation()
  const activePath = useWorkspaceStore((s) => s.activePath)
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace)
  const closeWorkspace = useWorkspaceStore((s) => s.closeWorkspace)
  const tabs = useWorkspaceStore((s) => s.tabs)
  const showToast = useToastStore((s) => s.show)

  const filtered = useMemo(
    () =>
      (worktrees ?? []).filter((entry) => {
        const label = worktreeLabel(entry)
        return matchesFilter(label, filter) || matchesFilter(entry.path, filter)
      }),
    [worktrees, filter]
  )

  const { state: menuState, openMenu, closeMenu } = useContextMenu()
  const { worktreeRemove, worktreePrune } = useGitMutations()

  const [addOpen, setAddOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<GitWorktreeEntry | null>(null)
  const [forceRemove, setForceRemove] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  async function handleOpenInTab(path: string) {
    const normalized = await window.gitfreddo.normalizeRepoPath(path)
    const existing = tabs.find((tab) => tab.path === normalized)
    if (existing) {
      await useWorkspaceStore.getState().switchWorkspace(normalized)
    } else {
      await openWorkspace(normalized)
    }
  }

  async function handleRemove(entry: GitWorktreeEntry, force: boolean) {
    try {
      await worktreeRemove.mutateAsync({ path: entry.path, force })
      const normalized = await window.gitfreddo.normalizeRepoPath(entry.path)
      if (tabs.some((tab) => tab.path === normalized)) {
        await closeWorkspace(normalized)
      }
      showToast(t('sidebar.worktreeRemoved'), 'success')
      setPendingRemove(null)
      setForceRemove(false)
      setRemoveError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!force && /clean|dirty|modified|uncommitted/i.test(message)) {
        setRemoveError(message)
        setForceRemove(true)
      } else {
        showToast(message || t('sidebar.failedRemoveWorktree'), 'error')
        setPendingRemove(null)
        setForceRemove(false)
        setRemoveError(null)
      }
    }
  }

  return (
    <>
      <SidebarSection
        sectionId="sidebar.worktrees"
        title={t('sidebar.worktrees')}
        icon={<SidebarIconWorktree className="h-3.5 w-3.5" />}
        count={filtered.length}
        onAdd={() => setAddOpen(true)}
        addTitle={t('sidebar.addWorktree')}
        menuItems={[
          {
            id: 'prune',
            label: t('sidebar.pruneStaleWorktrees'),
            onClick: () =>
              void worktreePrune
                .mutateAsync(undefined)
                .then(() => showToast(t('sidebar.worktreesPruned'), 'success'))
          }
        ]}
      >
        {isLoading && <LoadingRow />}
        {error && <p className="px-2 text-xs text-red-400">{error.message}</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="px-2 py-1 text-xs text-gf-fg-subtle">{t('sidebar.noWorktrees')}</p>
        )}
        <div className="space-y-0.5">
          {filtered.map((entry) => {
            const label = worktreeLabel(entry)
            const pathBasename = entry.path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || entry.path
            const isCurrentTab = activePath === entry.path
            const worktreeMenuItems = worktreeContextMenuItems(entry, {
              onOpenInTab: (path) => void handleOpenInTab(path),
              onRemove: (wt) => {
                setForceRemove(false)
                setRemoveError(null)
                setPendingRemove(wt)
              },
              onCopyPath: (path) => void copyToClipboard(path)
            })
            return (
              <SidebarTreeRow
                key={entry.path}
                icon={<SidebarIconWorktree className="h-3.5 w-3.5" />}
                label={label}
                isCurrent={isCurrentTab}
                title={entry.path}
                suffix={
                  entry.isMain ? (
                    <span className="shrink-0 text-[10px] text-gf-fg-subtle">{t('sidebar.main')}</span>
                  ) : (
                    <span className="shrink-0 truncate text-[10px] text-gf-fg-subtle max-w-[4rem]">
                      {pathBasename}
                    </span>
                  )
                }
                menuItems={worktreeMenuItems}
                openMenu={openMenu}
                onClick={() => void handleOpenInTab(entry.path)}
              />
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
      </SidebarSection>

      <AddWorktreeModal open={addOpen} onClose={() => setAddOpen(false)} />

      {pendingRemove && (
        <ConfirmDialog
          open
          title={t('sidebar.removeWorktree')}
          message={
            forceRemove
              ? t('sidebar.forceRemoveWorktreeMessage', { path: pendingRemove.path })
              : removeError
                ? t('sidebar.forceRemoveAnyway', { error: removeError })
                : t('sidebar.removeWorktreeMessage', { path: pendingRemove.path })
          }
          confirmLabel={forceRemove ? t('sidebar.forceRemove') : t('common.remove')}
          busy={worktreeRemove.isPending}
          onConfirm={() => void handleRemove(pendingRemove, forceRemove)}
          onCancel={() => {
            setPendingRemove(null)
            setForceRemove(false)
            setRemoveError(null)
          }}
        />
      )}
    </>
  )
}
