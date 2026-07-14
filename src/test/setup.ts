import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { vi } from 'vitest'
import { createGitFreddoMock } from './mocks/gitfreddo'

// CodeMirror does not measure under jsdom; keep existing textarea-based assertions.
vi.mock('@/components/Ui/CodeEditor', () => ({
  CodeEditor: ({
    value,
    onChange,
    className,
    rows,
    'aria-label': ariaLabel
  }: {
    value: string
    onChange: (value: string) => void
    className?: string
    rows?: number
    'aria-label'?: string
  }) =>
    createElement('textarea', {
      value,
      rows,
      className,
      'aria-label': ariaLabel ?? 'Code editor',
      onChange: (event: { target: { value: string } }) => onChange(event.target.value)
    })
}))

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
