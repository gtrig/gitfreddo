/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { GithubIntegrationCard } from './GithubIntegrationCard'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useGitHubStatus', () => ({
  useGitHubStatus: vi.fn(() => ({ data: { connected: false, login: null }, isLoading: false })),
  useInvalidateGitHubStatus: vi.fn(() => vi.fn()),
  useSetGitHubStatus: vi.fn(() => vi.fn())
}))

describe('GithubIntegrationCard', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
  })
  it('renders GitHub connect section', () => {
    renderWithProviders(<GithubIntegrationCard />)
    expect(screen.getByRole('heading', { name: 'GitHub' })).toBeInTheDocument()
  })
})
