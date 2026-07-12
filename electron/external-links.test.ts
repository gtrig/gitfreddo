import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockOpenExternal = vi.fn()

vi.mock('electron', () => ({
  shell: {
    openExternal: (...args: unknown[]) => mockOpenExternal(...args)
  }
}))

import { registerExternalLinkHandlers } from './external-links'

type WindowOpenHandler = (details: { url: string }) => { action: 'deny' }
type WillNavigateHandler = (event: { preventDefault: () => void }, url: string) => void

function createMockContents(currentUrl = 'file:///app/index.html') {
  let windowOpenHandler: WindowOpenHandler | undefined
  let willNavigateHandler: WillNavigateHandler | undefined

  const contents = {
    getURL: () => currentUrl,
    setWindowOpenHandler: (handler: WindowOpenHandler) => {
      windowOpenHandler = handler
    },
    on: (event: string, handler: WillNavigateHandler) => {
      if (event === 'will-navigate') {
        willNavigateHandler = handler
      }
    }
  }

  registerExternalLinkHandlers(contents as unknown as import('electron').WebContents)

  return {
    openWindow: (url: string) => windowOpenHandler?.({ url }),
    navigate: (url: string) => {
      const event = { preventDefault: vi.fn() }
      willNavigateHandler?.(event, url)
      return event
    }
  }
}

describe('registerExternalLinkHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens http and https links externally from window.open', () => {
    const contents = createMockContents()

    expect(contents.openWindow('https://github.com/gtrig/gitfreddo')).toEqual({ action: 'deny' })
    expect(mockOpenExternal).toHaveBeenCalledWith('https://github.com/gtrig/gitfreddo')
  })

  it('ignores non-http window.open URLs', () => {
    const contents = createMockContents()

    contents.openWindow('file:///etc/passwd')
    contents.openWindow('not-a-url')

    expect(mockOpenExternal).not.toHaveBeenCalled()
  })

  it('prevents cross-origin navigation and opens the URL externally', () => {
    const contents = createMockContents('file:///app/index.html')
    const event = contents.navigate('https://example.com/docs')

    expect(event.preventDefault).toHaveBeenCalled()
    expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com/docs')
  })

  it('allows same-origin navigation without opening externally', () => {
    const contents = createMockContents('https://example.com/app')
    const event = contents.navigate('https://example.com/other')

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(mockOpenExternal).not.toHaveBeenCalled()
  })

  it('ignores navigation to the current URL', () => {
    const contents = createMockContents('https://example.com/app')
    const event = contents.navigate('https://example.com/app')

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(mockOpenExternal).not.toHaveBeenCalled()
  })

  it('ignores non-http navigation attempts', () => {
    const contents = createMockContents('file:///app/index.html')
    const event = contents.navigate('file:///tmp/other.html')

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(mockOpenExternal).not.toHaveBeenCalled()
  })
})
