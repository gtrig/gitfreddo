import { useMemo } from 'react'
import type { GitStashEntry } from '@/lib/types'
import { SidebarSection } from '@/components/layout/sidebar/SidebarSection'
import { SidebarIconStash } from '@/components/layout/sidebar/SidebarIcons'
import { SidebarTreeRow } from '@/components/layout/sidebar/SidebarTreeRow'
import { LoadingRow } from '@/components/ui/Spinner'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { useContextMenu } from '@/hooks/useContextMenu'
import { useGitMutations } from '@/hooks/useGitMutations'
import { matchesFilter } from '@/lib/branchTree'
import { stashContextMenuItems } from '@/lib/sidebarContextMenus'

interface StashesSectionProps {
  stashes: GitStashEntry[] | undefined
  filter: string
  isLoading: boolean
  error: Error | null
  selectedIndex: number | null
  onSelect: (index: number) => void
}

export function StashesSection({
  stashes,
  filter,
  isLoading,
  error,
  selectedIndex,
  onSelect
}: StashesSectionProps) {
  const filtered = useMemo(
    () =>
      (stashes ?? []).filter((stash) =>
        matchesFilter(stash.message || `stash@{${stash.index}}`, filter)
      ),
    [stashes, filter]
  )
  const { state: menuState, openMenu, closeMenu } = useContextMenu()
  const { stashApply, stashPop, stashDrop } = useGitMutations()

  return (
    <SidebarSection
      sectionId="sidebar.stashes"
      title="Stashes"
      icon={<SidebarIconStash className="h-3.5 w-3.5" />}
      count={filtered.length}
    >
      {isLoading && <LoadingRow />}
      {error && <p className="px-2 text-xs text-red-400">{error.message}</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="px-2 py-1 text-xs text-gf-fg-subtle">No stashes.</p>
      )}
      <div className="space-y-0.5">
        {filtered.map((stash) => {
          const label = stash.message || `(stash@{${stash.index}})`
          return (
            <SidebarTreeRow
              key={stash.index}
              icon={<SidebarIconStash className="h-3.5 w-3.5" />}
              label={label}
              isSelected={selectedIndex === stash.index}
              title={label}
              onClick={() => onSelect(stash.index)}
              onContextMenu={(event) =>
                openMenu(
                  event,
                  stashContextMenuItems(stash.index, label, {
                    onSelect,
                    onApply: (index) => void stashApply.mutateAsync({ index }),
                    onPop: (index) => void stashPop.mutateAsync({ index }),
                    onDrop: (index) => void stashDrop.mutateAsync({ index })
                  })
                )
              }
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
  )
}
