/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { BitbucketIntegrationCard } from './BitbucketIntegrationCard'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useBitbucketStatus', () => ({
  useBitbucketStatus: vi.fn(() => ({ data: { connected: false, login: null }, isLoading: false })),
  useInvalidateBitbucketStatus: vi.fn(() => vi.fn()),
  useSetBitbucketStatus: vi.fn(() => vi.fn())
}))

describe('BitbucketIntegrationCard', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
  })
  it('renders Bitbucket connect section', () => {
    renderWithProviders(<BitbucketIntegrationCard />)
    expect(screen.getByRole('heading', { name: 'Bitbucket' })).toBeInTheDocument()
  })
})
