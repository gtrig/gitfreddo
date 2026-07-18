/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { TimelineDetachedHeadBadge, TimelineRefBadge } from './TimelineRefBadge'
import { renderWithProviders } from '@/test/render'
import type { ForgeProvider } from '@/lib/forge/detect'

const providers = new Map<string, ForgeProvider | null>([
  ['origin', 'github'],
  ['gitlab', 'gitlab'],
  ['bb', 'bitbucket'],
  ['other', null],
  ['gitfreddo', 'github']
])

describe('TimelineRefBadge', () => {
  afterEach(() => cleanup())

  it('renders detached head badge', () => {
    renderWithProviders(<TimelineDetachedHeadBadge />)
    expect(screen.getByTitle(/detached/i)).toBeInTheDocument()
  })

  it('renders branch ref badge with local icon on the right', () => {
    renderWithProviders(
      <TimelineRefBadge
        timelineRef={{ kind: 'branch', label: 'main', fullRef: 'refs/heads/main', sourceOrder: 0 }}
      />
    )
    expect(screen.getByText('main')).toBeInTheDocument()
    expect(screen.getByTitle('Local')).toBeInTheDocument()
  })

  it('places the current-head checkmark inside the badge', () => {
    const { container } = renderWithProviders(
      <TimelineRefBadge
        timelineRef={{ kind: 'branch', label: 'main', fullRef: 'refs/heads/main', sourceOrder: 0 }}
        isCurrent
      />
    )
    const badge = container.querySelector('span.inline-flex')
    expect(badge).toBeTruthy()
    expect(badge?.querySelector('[title]')).toBeTruthy()
    expect(screen.getByTitle(/current/i)).toBeInTheDocument()
    expect(badge?.contains(screen.getByTitle(/current/i))).toBe(true)
  })

  it('shows a GitHub icon when the local tip is not ahead of upstream', () => {
    renderWithProviders(
      <TimelineRefBadge
        timelineRef={{ kind: 'branch', label: 'main', fullRef: 'refs/heads/main', sourceOrder: 0 }}
        branchTracking={new Map([['main', { upstream: 'origin/main', ahead: 0 }]])}
        remoteProviders={providers}
      />
    )
    expect(screen.getByTitle('GitHub')).toBeInTheDocument()
    expect(screen.getByTitle('Local')).toBeInTheDocument()
  })

  it('hides the GitHub icon when the local branch is ahead of upstream', () => {
    renderWithProviders(
      <TimelineRefBadge
        timelineRef={{ kind: 'branch', label: 'main', fullRef: 'refs/heads/main', sourceOrder: 0 }}
        branchTracking={new Map([['main', { upstream: 'gitfreddo/main', ahead: 1 }]])}
        remoteProviders={providers}
      />
    )
    expect(screen.getByTitle('Local')).toBeInTheDocument()
    expect(screen.queryByTitle('GitHub')).not.toBeInTheDocument()
  })

  it('shows a GitLab icon when the upstream remote is GitLab', () => {
    renderWithProviders(
      <TimelineRefBadge
        timelineRef={{ kind: 'branch', label: 'a', fullRef: 'refs/heads/a', sourceOrder: 0 }}
        branchTracking={new Map([['a', { upstream: 'gitlab/a', ahead: 0 }]])}
        remoteProviders={providers}
      />
    )
    expect(screen.getByTitle('GitLab')).toBeInTheDocument()
  })

  it('shows a Bitbucket icon when the upstream remote is Bitbucket', () => {
    renderWithProviders(
      <TimelineRefBadge
        timelineRef={{ kind: 'branch', label: 'b', fullRef: 'refs/heads/b', sourceOrder: 0 }}
        branchTracking={new Map([['b', { upstream: 'bb/b', ahead: 0 }]])}
        remoteProviders={providers}
      />
    )
    expect(screen.getByTitle('Bitbucket')).toBeInTheDocument()
  })

  it('falls back to a generic remote title for unknown hosts', () => {
    renderWithProviders(
      <TimelineRefBadge
        timelineRef={{ kind: 'branch', label: 'main', fullRef: 'refs/heads/main', sourceOrder: 0 }}
        branchTracking={new Map([['main', { upstream: 'other/main', ahead: 0 }]])}
        remoteProviders={providers}
      />
    )
    expect(screen.getByTitle('Remote')).toBeInTheDocument()
  })

  it('shows a remote icon without a local icon for remote-only refs', () => {
    renderWithProviders(
      <TimelineRefBadge
        timelineRef={{
          kind: 'remote',
          label: 'origin/feature',
          fullRef: 'refs/remotes/origin/feature',
          sourceOrder: 0
        }}
        remoteProviders={providers}
      />
    )
    expect(screen.getByTitle('GitHub')).toBeInTheDocument()
    expect(screen.queryByTitle('Local')).not.toBeInTheDocument()
  })

  it('does not show location icons on tags', () => {
    renderWithProviders(
      <TimelineRefBadge
        timelineRef={{ kind: 'tag', label: 'v1.0', fullRef: 'refs/tags/v1.0', sourceOrder: 0 }}
        branchTracking={new Map([['v1.0', { upstream: 'origin/v1.0', ahead: 0 }]])}
        remoteProviders={providers}
      />
    )
    expect(screen.getByText('v1.0')).toBeInTheDocument()
    expect(screen.queryByTitle('Local')).not.toBeInTheDocument()
    expect(screen.queryByTitle('GitHub')).not.toBeInTheDocument()
  })
})
