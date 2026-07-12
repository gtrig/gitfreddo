import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockBuildFromTemplate = vi.fn((template) => template)
const mockSetApplicationMenu = vi.fn()
const mockShowOpenDialog = vi.fn()

vi.mock('electron', () => ({
  app: { name: 'GitFreddo' },
  BrowserWindow: class BrowserWindow {},
  Menu: {
    buildFromTemplate: (template: unknown) => mockBuildFromTemplate(template),
    setApplicationMenu: (menu: unknown) => mockSetApplicationMenu(menu)
  },
  dialog: {
    showOpenDialog: (...args: unknown[]) => mockShowOpenDialog(...args)
  },
  shell: {
    openExternal: vi.fn()
  }
}))

import { buildAppMenu, getMainWindow, pickGitBinary, setMainWindow } from './menu'

function findMenuItem(template: unknown[], label: string): { click?: () => void } | undefined {
  for (const entry of template) {
    const item = entry as { label?: string; submenu?: unknown[]; click?: () => void }
    if (item.label === label) return item
    if (item.submenu) {
      const nested = findMenuItem(item.submenu, label)
      if (nested) return nested
    }
  }
  return undefined
}

describe('menu window accessors', () => {
  beforeEach(() => {
    setMainWindow(null)
  })

  it('stores and returns the main window reference', () => {
    const window = { isDestroyed: () => false } as import('electron').BrowserWindow
    setMainWindow(window)
    expect(getMainWindow()).toBe(window)
    setMainWindow(null)
    expect(getMainWindow()).toBeNull()
  })
})

describe('buildAppMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setMainWindow(null)
  })

  it('builds and installs the application menu', () => {
    buildAppMenu()

    expect(mockBuildFromTemplate).toHaveBeenCalledOnce()
    expect(mockSetApplicationMenu).toHaveBeenCalledOnce()
    const template = mockBuildFromTemplate.mock.calls[0]![0] as unknown[]
    expect(findMenuItem(template, 'File')).toBeDefined()
    expect(findMenuItem(template, 'Help')).toBeDefined()
  })

  it('sends menu actions to the main window webContents', () => {
    const send = vi.fn()
    setMainWindow({
      isDestroyed: () => false,
      webContents: { send }
    } as unknown as import('electron').BrowserWindow)

    buildAppMenu()
    const template = mockBuildFromTemplate.mock.calls[0]![0] as unknown[]
    findMenuItem(template, 'Open Repository…')?.click?.()
    findMenuItem(template, 'Refresh')?.click?.()

    expect(send).toHaveBeenCalledWith('app:menu', 'open-workspace')
    expect(send).toHaveBeenCalledWith('app:menu', 'refresh')
  })

  it('does not send when the main window is destroyed', () => {
    const send = vi.fn()
    setMainWindow({
      isDestroyed: () => true,
      webContents: { send }
    } as unknown as import('electron').BrowserWindow)

    buildAppMenu()
    const template = mockBuildFromTemplate.mock.calls[0]![0] as unknown[]
    findMenuItem(template, 'Undo Last Git Action')?.click?.()

    expect(send).not.toHaveBeenCalled()
  })
})

describe('pickGitBinary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the selected git binary path', async () => {
    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/usr/local/bin/git']
    })

    await expect(pickGitBinary()).resolves.toBe('/usr/local/bin/git')
    expect(mockShowOpenDialog).toHaveBeenCalledWith({ properties: ['openFile'] })
  })

  it('returns null when the dialog is canceled', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })
    await expect(pickGitBinary()).resolves.toBeNull()
  })

  it('returns null when no file is selected', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: [] })
    await expect(pickGitBinary()).resolves.toBeNull()
  })
})
