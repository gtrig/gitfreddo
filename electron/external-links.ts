import { shell, type WebContents } from 'electron'

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function registerExternalLinkHandlers(contents: WebContents): void {
  contents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  contents.on('will-navigate', (event, url) => {
    if (!isHttpUrl(url)) return

    const current = contents.getURL()
    if (!current || url === current) return

    try {
      if (new URL(current).origin === new URL(url).origin) return
    } catch {
      // Open unknown URLs externally.
    }

    event.preventDefault()
    void shell.openExternal(url)
  })
}
