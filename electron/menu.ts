import { BrowserWindow, Menu, app, dialog, shell } from 'electron'

export type MenuAction = 'open-workspace' | 'open-settings' | 'refresh' | 'quit'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window
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
          label: 'GitFredo on GitHub',
          click: () => {
            void shell.openExternal('https://github.com/ArctosWebLabs/GitFredo')
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
