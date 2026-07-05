import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GitSubmoduleEntry } from '@/lib/types'
import { SidebarSection } from '@/components/Layout/sidebar/SidebarSection'
import { SidebarIconSubmodule } from '@/components/Layout/sidebar/SidebarIcons'
import { SidebarTreeRow } from '@/components/Layout/sidebar/SidebarTreeRow'
import { LoadingRow } from '@/components/Ui/Spinner'
import { ConfirmDialog } from '@/components/Ui/Modal'
import { ContextMenu } from '@/components/Ui/ContextMenu'
import { useContextMenu } from '@/hooks/useContextMenu'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useRepoStatus } from '@/hooks/useGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { matchesFilter } from '@/lib/workspace/branchTree'
import {
  submoduleContextMenuItems,
  submodulesSectionContextMenuItems
} from '@/lib/context-menus/submoduleContextMenus'
import { submoduleRowLabel, submoduleStatusColor, submoduleStatusLabel } from '@/lib/git/submoduleStatus'
import { AddSubmoduleModal } from '@/components/Submodules/AddSubmoduleModal'
import { EditSubmoduleUrlModal } from '@/components/Submodules/EditSubmoduleUrlModal'

interface SubmodulesSectionProps {
  submodules: GitSubmoduleEntry[] | undefined
  filter: string
  isLoading: boolean
  error: Error | null
}

export function SubmodulesSection({
  submodules,
  filter,
  isLoading,
  error
}: SubmodulesSectionProps) {
  const { t } = useTranslation()
  const { data: repoStatus } = useRepoStatus()
  const activePath = useWorkspaceStore((s) => s.activePath)
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace)
  const showToast = useToastStore((s) => s.show)

  const filtered = useMemo(
    () =>
      (submodules ?? []).filter((entry) => {
        const label = submoduleRowLabel(entry.path, entry.branch)
        return (
          matchesFilter(label, filter) ||
          matchesFilter(entry.path, filter) ||
          matchesFilter(entry.url, filter)
        )
      }),
    [submodules, filter]
  )

  const { state: menuState, openMenu, closeMenu } = useContextMenu()
  const {
    submoduleInit,
    submoduleUpdate,
    submoduleSync,
    submoduleDeinit,
    submoduleRemove,
    stageAdd
  } = useGitMutations()

  const [addOpen, setAddOpen] = useState(false)
  const [editUrlEntry, setEditUrlEntry] = useState<GitSubmoduleEntry | null>(null)
  const [pendingDeinit, setPendingDeinit] = useState<GitSubmoduleEntry | null>(null)
  const [pendingRemove, setPendingRemove] = useState<GitSubmoduleEntry | null>(null)
  const [forceAction, setForceAction] = useState(false)

  async function resolveSubmoduleAbsolutePath(path: string): Promise<string> {
    if (!repoStatus?.root) return path
    const joined = `${repoStatus.root.replace(/[/\\]+$/, '')}/${path}`
    return window.gitfreddo.normalizeRepoPath(joined)
  }

  async function handleOpenInTab(path: string) {
    const absolute = await resolveSubmoduleAbsolutePath(path)
    const tabs = useWorkspaceStore.getState().tabs
    const existing = tabs.find((tab) => tab.path === absolute)
    if (existing) {
      await useWorkspaceStore.getState().switchWorkspace(absolute)
    } else {
      await openWorkspace(absolute)
    }
  }

  async function handleDeinit(entry: GitSubmoduleEntry, force: boolean) {
    try {
      await submoduleDeinit.mutateAsync({ path: entry.path, force })
      showToast(t('sidebar.submoduleDeinitialized'), 'success')
      setPendingDeinit(null)
      setForceAction(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      showToast(message || t('sidebar.failedDeinitSubmodule'), 'error')
      if (!force) setForceAction(true)
    }
  }

  async function handleRemove(entry: GitSubmoduleEntry, force: boolean) {
    try {
      await submoduleRemove.mutateAsync({ path: entry.path, force })
      showToast(t('sidebar.submoduleRemoved'), 'success')
      setPendingRemove(null)
      setForceAction(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      showToast(message || t('sidebar.failedRemoveSubmodule'), 'error')
      if (!force) setForceAction(true)
    }
  }

  const sectionMenuItems = submodulesSectionContextMenuItems(
    {
      onUpdateAll: () =>
        void submoduleUpdate
          .mutateAsync({ init: true, recursive: true })
          .then(() => showToast(t('sidebar.submodulesUpdated'), 'success'))
          .catch((err) =>
            showToast(err instanceof Error ? err.message : String(err), 'error')
          ),
      onSyncAll: () =>
        void submoduleSync
          .mutateAsync({ recursive: true })
          .then(() => showToast(t('sidebar.submodulesSynced'), 'success'))
          .catch((err) =>
            showToast(err instanceof Error ? err.message : String(err), 'error')
          )
    },
    t
  )

  return (
    <>
      <SidebarSection
        sectionId="sidebar.submodules"
        title={t('sidebar.submodules')}
        icon={<SidebarIconSubmodule className="h-3.5 w-3.5" />}
        count={filtered.length}
        onAdd={() => setAddOpen(true)}
        addTitle={t('sidebar.addSubmodule')}
        menuItems={sectionMenuItems}
      >
        {isLoading && <LoadingRow />}
        {error && <p className="px-2 text-xs text-red-400">{error.message}</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="px-2 py-1 text-xs text-gf-fg-subtle">{t('sidebar.noSubmodules')}</p>
        )}
        <div className="space-y-0.5">
          {filtered.map((entry) => {
            const pathBasename =
              entry.path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || entry.path
            const isCurrentTab = Boolean(
              activePath && (activePath === entry.path || activePath.endsWith(`/${entry.path}`))
            )
            const rowMenuItems = submoduleContextMenuItems(
              entry,
              {
                onOpenInTab: (path) => void handleOpenInTab(path),
                onInit:
                  entry.status === 'uninitialized'
                    ? () =>
                        void submoduleInit
                          .mutateAsync({ paths: [entry.path] })
                          .then(() => showToast(t('sidebar.submoduleInitialized'), 'success'))
                    : undefined,
                onUpdate: () =>
                  void submoduleUpdate
                    .mutateAsync({ paths: [entry.path], init: true })
                    .then(() => showToast(t('sidebar.submoduleUpdated'), 'success')),
                onSync: () =>
                  void submoduleSync
                    .mutateAsync({ paths: [entry.path] })
                    .then(() => showToast(t('sidebar.submoduleSynced'), 'success')),
                onSetUrl: () => setEditUrlEntry(entry),
                onStage:
                  entry.status === 'ahead' || entry.status === 'dirty'
                    ? () => void stageAdd.mutateAsync({ paths: [entry.path] })
                    : undefined,
                onDeinit: () => {
                  setForceAction(false)
                  setPendingDeinit(entry)
                },
                onRemove: () => {
                  setForceAction(false)
                  setPendingRemove(entry)
                }
              },
              t
            )
            return (
              <SidebarTreeRow
                key={entry.path}
                icon={<SidebarIconSubmodule className="h-3.5 w-3.5" />}
                label={submoduleRowLabel(entry.path, entry.branch)}
                isCurrent={isCurrentTab}
                title={`${entry.path}\n${entry.url}`}
                suffix={
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <span
                      className={`font-mono text-[10px] ${submoduleStatusColor(entry.status)}`}
                    >
                      {submoduleStatusLabel(entry.status)}
                    </span>
                    <span className="truncate text-[10px] text-gf-fg-subtle max-w-[4rem]">
                      {pathBasename}
                    </span>
                  </span>
                }
                menuItems={rowMenuItems}
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

      <AddSubmoduleModal open={addOpen} onClose={() => setAddOpen(false)} />

      {editUrlEntry && (
        <EditSubmoduleUrlModal
          open
          submodulePath={editUrlEntry.path}
          currentUrl={editUrlEntry.url}
          onClose={() => setEditUrlEntry(null)}
        />
      )}

      {pendingDeinit && (
        <ConfirmDialog
          open
          title={t('sidebar.deinitSubmodule')}
          message={
            forceAction
              ? t('sidebar.forceDeinitSubmoduleMessage', { path: pendingDeinit.path })
              : t('sidebar.deinitSubmoduleMessage', { path: pendingDeinit.path })
          }
          confirmLabel={forceAction ? t('sidebar.forceDeinit') : t('sidebar.deinitSubmodule')}
          busy={submoduleDeinit.isPending}
          onConfirm={() => void handleDeinit(pendingDeinit, forceAction)}
          onCancel={() => {
            setPendingDeinit(null)
            setForceAction(false)
          }}
        />
      )}

      {pendingRemove && (
        <ConfirmDialog
          open
          title={t('sidebar.removeSubmodule')}
          message={
            forceAction
              ? t('sidebar.forceRemoveSubmoduleMessage', { path: pendingRemove.path })
              : t('sidebar.removeSubmoduleMessage', { path: pendingRemove.path })
          }
          confirmLabel={forceAction ? t('sidebar.forceRemove') : t('common.remove')}
          busy={submoduleRemove.isPending}
          onConfirm={() => void handleRemove(pendingRemove, forceAction)}
          onCancel={() => {
            setPendingRemove(null)
            setForceAction(false)
          }}
        />
      )}
    </>
  )
}
