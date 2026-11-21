import { describe, expect, it, afterEach, beforeEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ResizableMainLayout } from './ResizableMainLayout'
import { useLayoutStore } from '@/stores/layout'

/** jsdom has no layout: give the container a width so clamping can run. */
function setContainerWidth(width: number) {
  const container = document.getElementById('resizable-main-layout')!
  Object.defineProperty(container, 'clientWidth', { configurable: true, value: width })
}

function renderLayout(rightVisible = true) {
  return render(
    <ResizableMainLayout
      left={<div>left</div>}
      center={<div>center</div>}
      right={<div>right panel</div>}
      rightVisible={rightVisible}
    />
  )
}

function drag(handle: HTMLElement, from: number, to: number) {
  fireEvent.mouseDown(handle, { clientX: from })
  fireEvent.mouseMove(window, { clientX: to })
  fireEvent.mouseUp(window, { clientX: to })
}

describe('ResizableMainLayout', () => {
  beforeEach(() => {
    useLayoutStore.setState({ leftWidth: 240, rightWidth: 320 })
  })

  afterEach(() => {
    cleanup()
  })

  it('resizes the side columns by dragging, within the window width', () => {
    renderLayout()
    setContainerWidth(1200)
    const [leftHandle, rightHandle] = screen.getAllByRole('separator')

    const leftBefore = useLayoutStore.getState().leftWidth
    drag(leftHandle!, 100, 160)
    expect(useLayoutStore.getState().leftWidth).toBe(leftBefore + 60)

    const rightBefore = useLayoutStore.getState().rightWidth
    drag(rightHandle!, 500, 460)
    expect(useLayoutStore.getState().rightWidth).toBe(rightBefore + 40)

    // A huge drag is capped so the center column keeps its minimum width.
    drag(leftHandle!, 0, 5000)
    expect(useLayoutStore.getState().leftWidth).toBeLessThan(1200 - 360)
    drag(rightHandle!, 5000, 0)
    expect(useLayoutStore.getState().rightWidth).toBeLessThan(1200)
  })

  it('shrinks oversized side columns when the window gets smaller', () => {
    useLayoutStore.setState({ leftWidth: 700, rightWidth: 700 })
    renderLayout()
    setContainerWidth(1000)
    fireEvent(window, new Event('resize'))

    const { leftWidth, rightWidth } = useLayoutStore.getState()
    expect(leftWidth).toBeLessThan(700)
    expect(rightWidth).toBeLessThan(700)
  })

  it('hides the right column when rightVisible is false', () => {
    render(
      <ResizableMainLayout
        left={<div>left</div>}
        center={<div>center</div>}
        right={<div>right panel</div>}
        rightVisible={false}
      />
    )

    expect(screen.getByText('left')).toBeInTheDocument()
    expect(screen.getByText('center')).toBeInTheDocument()
    expect(screen.queryByText('right panel')).not.toBeInTheDocument()
  })

  it('shows the right column by default', () => {
    render(
      <ResizableMainLayout
        left={<div>left</div>}
        center={<div>center</div>}
        right={<div>right panel</div>}
      />
    )

    expect(screen.getByText('right panel')).toBeInTheDocument()
  })
})
