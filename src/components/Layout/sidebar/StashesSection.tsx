import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GitStashEntry } from '@/lib/types'
import { SidebarSection } from '@/components/Layout/sidebar/SidebarSection'
import { SidebarIconStash } from '@/components/Layout/sidebar/SidebarIcons'
import { SidebarTreeRow } from '@/components/Layout/sidebar/SidebarTreeRow'
import { LoadingRow } from '@/components/Ui/Spinner'
import { ContextMenu } from '@/components/Ui/ContextMenu'
import { useContextMenu } from '@/hooks/useContextMenu'
import { useGitMutations } from '@/hooks/useGitMutations'
import { matchesFilter } from '@/lib/workspace/branchTree'
import { stashContextMenuItems } from '@/lib/context-menus/sidebarContextMenus'
import { StashBranchModal } from '@/components/Stash/StashBranchModal'

interface StashesSectionProps {
  stashes: GitStashEntry[] | undefined
  filter: string
  isLoading: boolean
  error: Error | null
  selectedIndex: number | null
  onSelect: (index: number, hash: string) => void
}

export function StashesSection({
  stashes,
  filter,
  isLoading,
  error,
  selectedIndex,
  onSelect
}: StashesSectionProps) {
  const { t } = useTranslation()
  const filtered = useMemo(
    () =>
      (stashes ?? []).filter((stash) =>
        matchesFilter(stash.message || `stash@{${stash.index}}`, filter)
      ),
    [stashes, filter]
  )
  const { state: menuState, openMenu, closeMenu } = useContextMenu()
  const { stashApply, stashPop, stashDrop } = useGitMutations()
  const [branchStashIndex, setBranchStashIndex] = useState<number | null>(null)

  return (
    <SidebarSection
      sectionId="sidebar.stashes"
      title={t('sidebar.stashes')}
      icon={<SidebarIconStash className="h-3.5 w-3.5" />}
      count={filtered.length}
    >
      {isLoading && <LoadingRow />}
      {error && <p className="px-2 text-xs text-red-400">{error.message}</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="px-2 py-1 text-xs text-gf-fg-subtle">{t('sidebar.noStashes')}</p>
      )}
      <div className="space-y-0.5">
        {filtered.map((stash) => {
          const label = stash.message || `(stash@{${stash.index}})`
          const stashMenuItems = stashContextMenuItems(stash.index, stash.hash, label, {
            onSelect,
            onApply: (index) => void stashApply.mutateAsync({ index }),
            onPop: (index) => void stashPop.mutateAsync({ index }),
            onDrop: (index) => void stashDrop.mutateAsync({ index }),
            onBranch: (index) => setBranchStashIndex(index)
          })
          return (
            <SidebarTreeRow
              key={stash.index}
              icon={<SidebarIconStash className="h-3.5 w-3.5" />}
              label={label}
              isSelected={selectedIndex === stash.index}
              title={label}
              menuItems={stashMenuItems}
              openMenu={openMenu}
              onClick={() => onSelect(stash.index, stash.hash)}
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

      {branchStashIndex !== null && (
        <StashBranchModal
          open
          stashIndex={branchStashIndex}
          onClose={() => setBranchStashIndex(null)}
        />
      )}
    </SidebarSection>
  )
}
