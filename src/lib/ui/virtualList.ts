/** Items below this count render with a plain .map(); virtualizer is only activated at or above it. */
export const VIRTUALIZE_THRESHOLD = 50

/** Line height for monospace code lines (matches Tailwind `leading-5`). */
export const CODE_LINE_HEIGHT = 20

/** Row height for compact sidebar/timeline rows (matches Tailwind ~`h-7`). */
export const COMPACT_ROW_HEIGHT = 28

/** Row height for file-list rows (matches Tailwind ~`py-1.5 text-sm`). */
export const FILE_ROW_HEIGHT = 32

/** Overscan rows rendered above and below the visible window. */
export const VIRTUAL_OVERSCAN = 8

/** Whether the given count exceeds the threshold that warrants virtualization. */
export function shouldVirtualize(count: number): boolean {
  return count >= VIRTUALIZE_THRESHOLD
}
