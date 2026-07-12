/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BitbucketIntegrationCard } from './BitbucketIntegrationCard'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

const invalidate = vi.fn()
const setStatus = vi.fn()

vi.mock('@/hooks/useBitbucketStatus', () => ({
  useBitbucketStatus: vi.fn(),
  useInvalidateBitbucketStatus: vi.fn(() => invalidate),
  useSetBitbucketStatus: vi.fn(() => setStatus)
}))

describe('BitbucketIntegrationCard', () => {
  afterEach(() => cleanup())
  beforeEach(async () => {
    invalidate.mockClear()
    setStatus.mockClear()
    window.gitfreddo = createGitFreddoMock()
    const { useBitbucketStatus } = await import('@/hooks/useBitbucketStatus')
    vi.mocked(useBitbucketStatus).mockReturnValue({
      data: { connected: false, login: null, avatarUrl: null, authType: null, sshKeyTitle: null },
      isLoading: false
    } as ReturnType<typeof useBitbucketStatus>)
  })

  it('renders Bitbucket connect section', () => {
    renderWithProviders(<BitbucketIntegrationCard />)
    expect(screen.getByRole('heading', { name: 'Bitbucket' })).toBeInTheDocument()
  })

  it('connects with OAuth', async () => {
    vi.mocked(window.gitfreddo.bitbucketConnect).mockResolvedValue({
      connected: true,
      login: 'alice',
      avatarUrl: null,
      authType: 'oauth',
      sshKeyTitle: null
    })

    renderWithProviders(<BitbucketIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /connect with bitbucket/i }))

    await waitFor(() => {
      expect(window.gitfreddo.bitbucketConnect).toHaveBeenCalled()
      expect(setStatus).toHaveBeenCalled()
      expect(invalidate).toHaveBeenCalled()
    })
  })

  it('connects with app password credentials', async () => {
    vi.mocked(window.gitfreddo.bitbucketConnectAppPassword).mockResolvedValue({
      connected: true,
      login: 'alice',
      avatarUrl: null,
      authType: 'app_password',
      sshKeyTitle: null
    })

    renderWithProviders(<BitbucketIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /app password/i }))
    await userEvent.type(screen.getByPlaceholderText(/bitbucket username/i), 'alice')
    await userEvent.type(screen.getByPlaceholderText(/app password/i), 'secret-token')
    await userEvent.click(screen.getByRole('button', { name: /connect with app password/i }))

    await waitFor(() => {
      expect(window.gitfreddo.bitbucketConnectAppPassword).toHaveBeenCalledWith('alice', 'secret-token')
    })
  })

  it('disconnects when already connected', async () => {
    const { useBitbucketStatus } = await import('@/hooks/useBitbucketStatus')
    vi.mocked(useBitbucketStatus).mockReturnValue({
      data: {
        connected: true,
        login: 'alice',
        avatarUrl: null,
        authType: 'app_password',
        sshKeyTitle: 'GitFreddo key'
      },
      isLoading: false
    } as ReturnType<typeof useBitbucketStatus>)

    renderWithProviders(<BitbucketIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /^disconnect$/i }))

    await waitFor(() => {
      expect(window.gitfreddo.bitbucketDisconnect).toHaveBeenCalled()
      expect(invalidate).toHaveBeenCalled()
    })
  })
})
