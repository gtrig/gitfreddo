/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { TimelineRemoteProviderIcon } from './ForgeIcons'
import { renderWithProviders } from '@/test/render'

describe('TimelineRemoteProviderIcon', () => {
  afterEach(() => cleanup())

  it.each([
    ['github', 'GitHub'],
    ['gitlab', 'GitLab'],
    ['bitbucket', 'Bitbucket']
  ] as const)('renders %s title', (provider, title) => {
    renderWithProviders(<TimelineRemoteProviderIcon provider={provider} />)
    expect(screen.getByTitle(title)).toBeInTheDocument()
  })

  it('renders a generic remote title for unknown providers', () => {
    renderWithProviders(<TimelineRemoteProviderIcon provider="unknown" />)
    expect(screen.getByTitle('Remote')).toBeInTheDocument()
  })
})
