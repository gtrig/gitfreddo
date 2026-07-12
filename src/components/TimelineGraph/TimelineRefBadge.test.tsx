/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { TimelineDetachedHeadBadge, TimelineRefBadge } from './TimelineRefBadge'
import { renderWithProviders } from '@/test/render'

describe('TimelineRefBadge', () => {
  afterEach(() => cleanup())
  it('renders detached head badge', () => {
    renderWithProviders(<TimelineDetachedHeadBadge />)
    expect(screen.getByTitle(/detached/i)).toBeInTheDocument()
  })
  it('renders branch ref badge', () => {
    renderWithProviders(
      <TimelineRefBadge
        timelineRef={{ kind: 'branch', label: 'main', fullRef: 'refs/heads/main', sourceOrder: 0 }}
      />
    )
    expect(screen.getByText('main')).toBeInTheDocument()
  })
})
