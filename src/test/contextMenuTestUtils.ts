import type { ContextMenuItem } from '@/components/Ui/ContextMenu'

export function clickAllMenuItems(items: ContextMenuItem[]): void {
  for (const item of items) {
    if (item.separator || item.disabled) continue
    item.onClick()
  }
}
