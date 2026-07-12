import '@testing-library/jest-dom/vitest'
import { createGitFreddoMock } from './mocks/gitfreddo'

if (typeof window !== 'undefined') {
  window.gitfreddo = createGitFreddoMock()

  // @tanstack/react-virtual uses ResizeObserver to determine the scroll container
  // size. jsdom does not implement ResizeObserver, so the virtualizer would see a
  // 0px viewport and render no items. This stub immediately fires the callback with
  // a realistic viewport size so virtualized lists render their windowed items in tests.
  global.ResizeObserver = class ResizeObserver {
    private callback: ResizeObserverCallback
    constructor(cb: ResizeObserverCallback) {
      this.callback = cb
    }
    observe(target: Element) {
      this.callback(
        [
          {
            target,
            contentRect: { height: 500, width: 800 } as DOMRectReadOnly,
            borderBoxSize: [{ blockSize: 500, inlineSize: 800 }],
            contentBoxSize: [{ blockSize: 500, inlineSize: 800 }],
            devicePixelContentBoxSize: [{ blockSize: 500, inlineSize: 800 }]
          }
        ] as ResizeObserverEntry[],
        this
      )
    }
    unobserve() {}
    disconnect() {}
  }
}
