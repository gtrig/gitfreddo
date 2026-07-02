import { create } from 'zustand'

const STORAGE_KEY = 'gitfreddo:sidebar-layout'

export const LEFT_MIN = 200
export const LEFT_MAX = 480
export const LEFT_DEFAULT = 280

export const RIGHT_MIN = 220
export const RIGHT_MAX = 520
export const RIGHT_DEFAULT = 300

export const CENTER_MIN = 320

interface SidebarLayout {
  leftWidth: number
  rightWidth: number
}

interface LayoutState extends SidebarLayout {
  setLeftWidth: (width: number) => void
  setRightWidth: (width: number) => void
  adjustLeftWidth: (delta: number) => void
  adjustRightWidth: (delta: number) => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function readStoredLayout(): SidebarLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { leftWidth: LEFT_DEFAULT, rightWidth: RIGHT_DEFAULT }
    }
    const parsed = JSON.parse(raw) as Partial<SidebarLayout>
    return {
      leftWidth: clamp(Number(parsed.leftWidth) || LEFT_DEFAULT, LEFT_MIN, LEFT_MAX),
      rightWidth: clamp(Number(parsed.rightWidth) || RIGHT_DEFAULT, RIGHT_MIN, RIGHT_MAX)
    }
  } catch {
    return { leftWidth: LEFT_DEFAULT, rightWidth: RIGHT_DEFAULT }
  }
}

function persistLayout(layout: SidebarLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // ignore storage errors
  }
}

const initial = readStoredLayout()

export const useLayoutStore = create<LayoutState>((set, get) => ({
  leftWidth: initial.leftWidth,
  rightWidth: initial.rightWidth,

  setLeftWidth: (width) => {
    const leftWidth = clamp(width, LEFT_MIN, LEFT_MAX)
    set({ leftWidth })
    persistLayout({ leftWidth, rightWidth: get().rightWidth })
  },

  setRightWidth: (width) => {
    const rightWidth = clamp(width, RIGHT_MIN, RIGHT_MAX)
    set({ rightWidth })
    persistLayout({ leftWidth: get().leftWidth, rightWidth })
  },

  adjustLeftWidth: (delta) => {
    get().setLeftWidth(get().leftWidth + delta)
  },

  adjustRightWidth: (delta) => {
    get().setRightWidth(get().rightWidth - delta)
  }
}))
