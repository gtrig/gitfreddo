import { EllipsisVerticalIcon } from '@heroicons/react/24/outline'
import type { ContextMenuItem } from '@/components/ui/ContextMenu'
import type { OpenContextMenu } from '@/hooks/useContextMenu'

interface SidebarMenuButtonProps {
  items: ContextMenuItem[]
  onOpenMenu: OpenContextMenu
  className?: string
  title?: string
}

export function SidebarMenuButton({
  items,
  onOpenMenu,
  className = '',
  title = 'More actions'
}: SidebarMenuButtonProps) {
  if (items.filter((item) => !item.separator).length === 0) {
    return null
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-haspopup="menu"
      onClick={(event) => onOpenMenu(event, items)}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onOpenMenu(event, items)
      }}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-gf-fg-subtle hover:bg-gf-surface-hover/60 hover:text-gf-fg ${className}`}
    >
      <EllipsisVerticalIcon aria-hidden className="h-3.5 w-3.5" />
    </button>
  )
}
