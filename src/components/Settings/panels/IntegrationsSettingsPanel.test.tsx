/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { IntegrationsSettingsPanel } from './IntegrationsSettingsPanel'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useGitHubStatus', () => ({
  useGitHubStatus: vi.fn(() => ({ data: { connected: false, login: null }, isLoading: false })),
  useInvalidateGitHubStatus: vi.fn(() => vi.fn()),
  useSetGitHubStatus: vi.fn(() => vi.fn())
}))
vi.mock('@/hooks/useBitbucketStatus', () => ({
  useBitbucketStatus: vi.fn(() => ({ data: { connected: false, login: null }, isLoading: false })),
  useInvalidateBitbucketStatus: vi.fn(() => vi.fn()),
  useSetBitbucketStatus: vi.fn(() => vi.fn())
}))

describe('IntegrationsSettingsPanel', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
  })
  it('renders integration intro', () => {
    renderWithProviders(<IntegrationsSettingsPanel />)
    expect(screen.getByRole('heading', { name: 'GitHub' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bitbucket' })).toBeInTheDocument()
  })
})
