/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { TimelineRefStack } from './TimelineRefStack'
import { renderWithProviders } from '@/test/render'
import type { TimelineRef } from '@/lib/timeline/timelineRefs'

const mainRef: TimelineRef = {
  kind: 'branch',
  label: 'main',
  fullRef: 'refs/heads/main',
  sourceOrder: 0
}

const featureRef: TimelineRef = {
  kind: 'branch',
  label: 'feature',
  fullRef: 'refs/heads/feature',
  sourceOrder: 1
}

const tagRef: TimelineRef = {
  kind: 'tag',
  label: 'v1.0',
  fullRef: 'refs/tags/v1.0',
  sourceOrder: 2
}

describe('TimelineRefStack', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders branch ref badges for the current branch at head', () => {
    renderWithProviders(
      <TimelineRefStack
        refs={[mainRef]}
        isHeadCommit
        currentBranch="main"
        isDetached={false}
      />
    )
    expect(screen.getByText('main')).toBeInTheDocument()
  })

  it('returns null when there are no refs and head is not detached', () => {
    const { container } = renderWithProviders(
      <TimelineRefStack refs={[]} isHeadCommit={false} currentBranch="main" />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows detached head badge without branch refs', () => {
    renderWithProviders(
      <TimelineRefStack refs={[]} isHeadCommit isDetached currentBranch="" />
    )
    expect(screen.getByText(/^HEAD$/i)).toBeInTheDocument()
  })

  it('shows overflow count and hover menu for extra refs', async () => {
    renderWithProviders(
      <TimelineRefStack
        refs={[mainRef, featureRef, tagRef]}
        isHeadCommit
        currentBranch="main"
        isDetached={false}
      />
    )

    expect(screen.getByText('+2')).toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByText('+2').closest('div')!)
    expect(await screen.findByText('feature')).toBeInTheDocument()
    expect(screen.getByText('v1.0')).toBeInTheDocument()
  })

  it('calls onRefDoubleClick for primary and overflow refs', async () => {
    const onRefDoubleClick = vi.fn()
    renderWithProviders(
      <TimelineRefStack
        refs={[mainRef, featureRef]}
        isHeadCommit
        currentBranch="main"
        onRefDoubleClick={onRefDoubleClick}
      />
    )

    fireEvent.doubleClick(screen.getByText('main'))
    expect(onRefDoubleClick).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ label: 'main' })
    )

    fireEvent.mouseEnter(screen.getByText('+1').closest('div')!)
    fireEvent.doubleClick(await screen.findByText('feature'))
    expect(onRefDoubleClick).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ label: 'feature' })
    )
  })

  it('calls onRefContextMenu when a ref badge is right-clicked', () => {
    const onRefContextMenu = vi.fn()
    renderWithProviders(
      <TimelineRefStack
        refs={[mainRef, featureRef]}
        isHeadCommit
        currentBranch="main"
        onRefContextMenu={onRefContextMenu}
      />
    )

    fireEvent.contextMenu(screen.getByText('main'))
    expect(onRefContextMenu).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ label: 'main' })
    )
  })

  it('hides overflow menu after mouse leave delay', async () => {
    renderWithProviders(
      <TimelineRefStack
        refs={[mainRef, featureRef]}
        isHeadCommit
        currentBranch="main"
      />
    )

    const anchor = screen.getByText('+1').closest('div')!
    fireEvent.mouseEnter(anchor)
    expect(await screen.findByText('feature')).toBeInTheDocument()

    fireEvent.mouseLeave(anchor)
    vi.advanceTimersByTime(150)
    await waitFor(() => {
      expect(screen.queryByText('feature')).not.toBeInTheDocument()
    })
  })

  it('uses split refs when not at head commit', () => {
    renderWithProviders(
      <TimelineRefStack refs={[featureRef, mainRef]} currentBranch="main" />
    )
    expect(screen.getByText('feature')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })
})
