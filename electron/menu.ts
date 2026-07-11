import { BrowserWindow, Menu, app, dialog, shell } from 'electron'
import type { MenuAction } from '../shared/ipc'

export type { MenuAction }

let mainWindow: BrowserWindow | null = null

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

function sendMenuAction(action: MenuAction): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:menu', action)
  }
}

export function buildAppMenu(): void {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { label: 'Settings…', accelerator: 'Cmd+,', click: () => sendMenuAction('open-settings') },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Repository…',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendMenuAction('open-workspace')
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const, label: 'Quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo Last Git Action',
          accelerator: 'CmdOrCtrl+Z',
          click: () => sendMenuAction('undo')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Refresh',
          accelerator: 'CmdOrCtrl+R',
          click: () => sendMenuAction('refresh')
        },
        { type: 'separator' },
        { role: 'reload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const }
      ]
    },
    {
      label: 'Settings',
      visible: !isMac,
      submenu: [
        {
          label: 'Preferences…',
          accelerator: 'CmdOrCtrl+,',
          click: () => sendMenuAction('open-settings')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About GitFreddo',
          click: () => sendMenuAction('open-about')
        },
        { type: 'separator' },
        {
          label: 'Documentation',
          accelerator: 'F1',
          click: () => sendMenuAction('open-docs')
        },
        {
          label: 'Check for Updates…',
          click: () => sendMenuAction('check-for-updates')
        },
        { type: 'separator' },
        {
          label: 'GitFreddo on GitHub',
          click: () => {
            void shell.openExternal('https://github.com/gtrig/gitfreddo')
          }
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

export async function pickGitBinary(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}
