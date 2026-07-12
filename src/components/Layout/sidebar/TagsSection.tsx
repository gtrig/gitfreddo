import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GitRemote, GitTag } from '@/lib/types'
import { SidebarSection } from '@/components/Layout/sidebar/SidebarSection'
import { SidebarIconTag } from '@/components/Layout/sidebar/SidebarIcons'
import { SidebarTreeRow } from '@/components/Layout/sidebar/SidebarTreeRow'
import { LoadingRow } from '@/components/Ui/Spinner'
import { ContextMenu } from '@/components/Ui/ContextMenu'
import { useContextMenu } from '@/hooks/useContextMenu'
import { useGitMutations } from '@/hooks/useGitMutations'
import { matchesFilter } from '@/lib/workspace/branchTree'
import { useVirtualizer } from '@tanstack/react-virtual'
import { COMPACT_ROW_HEIGHT, VIRTUAL_OVERSCAN, shouldVirtualize } from '@/lib/ui/virtualList'
import { tagCheckoutRef } from '@/lib/format/tagNames'
import { detachedRefCheckoutParams } from '@/lib/git/branchCheckout'
import { tagContextMenuItems } from '@/lib/context-menus/sidebarContextMenus'
import { CreateTagModal } from '@/components/Tags/CreateTagModal'
import { RenameTagModal } from '@/components/Tags/RenameTagModal'
import { DeleteTagModal } from '@/components/Tags/DeleteTagModal'

interface TagsSectionProps {
  tags: GitTag[] | undefined
  remotes: GitRemote[] | undefined
  filter: string
  isLoading: boolean
  error: Error | null
  onSelectCommit: (hash: string) => void
}

interface PendingDelete {
  tag: GitTag
  remote?: string
}

export function TagsSection({
  tags,
  remotes,
  filter,
  isLoading,
  error,
  onSelectCommit
}: TagsSectionProps) {
  const { t } = useTranslation()
  const filtered = useMemo(
    () => (tags ?? []).filter((tag) => matchesFilter(tag.name, filter)),
    [tags, filter]
  )
  const { state: menuState, openMenu, closeMenu } = useContextMenu()
  const { checkout, pushTag } = useGitMutations()
  const scrollRef = useRef<HTMLDivElement>(null)
  const useVirtualization = shouldVirtualize(filtered.length)

  const virtualizer = useVirtualizer({
    count: useVirtualization ? filtered.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => COMPACT_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [renameTag, setRenameTag] = useState<GitTag | null>(null)

  const defaultRemote = remotes?.[0]?.name

  return (
    <>
      <SidebarSection
        sectionId="sidebar.tags"
        title={t('sidebar.tags')}
        icon={<SidebarIconTag className="h-3.5 w-3.5" />}
        count={filtered.length}
        onAdd={() => setCreateOpen(true)}
        addTitle={t('sidebar.createTag')}
      >
        {isLoading && <LoadingRow />}
        {error && <p className="px-2 text-xs text-red-400">{error.message}</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="px-2 py-1 text-xs text-gf-fg-subtle">{t('sidebar.noTags')}</p>
        )}
        {useVirtualization ? (
          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ maxHeight: '40vh' }}
          >
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const tag = filtered[virtualItem.index]!
                const label = tag.name
                const title = tag.message
                  ? `${label} — ${tag.message}`
                  : `${label} @ ${tag.target.slice(0, 7)}`
                const tagMenuItems = tagContextMenuItems(
                  tag,
                  {
                    defaultRemote,
                    onSelectCommit,
                    onCheckout: (params) => void checkout.mutateAsync(params),
                    onPush: (name, remote) => void pushTag.mutateAsync({ name, remote }),
                    onRename: (tag) => setRenameTag(tag),
                    onDelete: (tag, remote) => setPendingDelete({ tag, remote })
                  },
                  t
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
                      icon={<SidebarIconTag className="h-3.5 w-3.5" />}
                      label={label}
                      title={title}
                      suffix={
                        tag.isAnnotated ? (
                          <span className="text-[10px] text-gf-fg-subtle">{t('sidebar.annotated')}</span>
                        ) : undefined
                      }
                      menuItems={tagMenuItems}
                      openMenu={openMenu}
                      onClick={() => onSelectCommit(tag.target)}
                      onDoubleClick={() => {
                        if (!tag.isRemote) {
                          void checkout.mutateAsync(detachedRefCheckoutParams(tagCheckoutRef(tag.name)))
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
            {filtered.map((tag) => {
              const label = tag.name
              const title = tag.message
                ? `${label} — ${tag.message}`
                : `${label} @ ${tag.target.slice(0, 7)}`
              const tagMenuItems = tagContextMenuItems(
                tag,
                {
                  defaultRemote,
                  onSelectCommit,
                  onCheckout: (params) => void checkout.mutateAsync(params),
                  onPush: (name, remote) => void pushTag.mutateAsync({ name, remote }),
                  onRename: (tag) => setRenameTag(tag),
                  onDelete: (tag, remote) => setPendingDelete({ tag, remote })
                },
                t
              )
              return (
                <SidebarTreeRow
                  key={`${tag.isRemote ? 'remote' : 'local'}:${tag.name}`}
                  icon={<SidebarIconTag className="h-3.5 w-3.5" />}
                  label={label}
                  title={title}
                  suffix={
                    tag.isAnnotated ? (
                      <span className="text-[10px] text-gf-fg-subtle">{t('sidebar.annotated')}</span>
                    ) : undefined
                  }
                  menuItems={tagMenuItems}
                  openMenu={openMenu}
                  onClick={() => onSelectCommit(tag.target)}
                  onDoubleClick={() => {
                    if (!tag.isRemote) {
                      void checkout.mutateAsync(detachedRefCheckoutParams(tagCheckoutRef(tag.name)))
                    }
                  }}
                />
              )
            })}
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
      </SidebarSection>

      <CreateTagModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {renameTag && !renameTag.isRemote && (
        <RenameTagModal
          open
          currentName={renameTag.name}
          onClose={() => setRenameTag(null)}
        />
      )}

      {pendingDelete && (
        <DeleteTagModal
          open
          tag={pendingDelete.tag}
          remote={pendingDelete.remote}
          defaultRemote={defaultRemote}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </>
  )
}
