import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ResizableMainLayout } from './ResizableMainLayout'

describe('ResizableMainLayout', () => {
  afterEach(() => {
    cleanup()
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
