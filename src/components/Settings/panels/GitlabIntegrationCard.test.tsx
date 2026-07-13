/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GitlabIntegrationCard } from './GitlabIntegrationCard'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useToastStore } from '@/stores/toast'
import type { GitlabConnectProgress } from '@shared/gitlab'

const invalidate = vi.fn()
const setStatus = vi.fn()

vi.mock('@/hooks/useGitlabStatus', () => ({
  useGitlabStatus: vi.fn(),
  useInvalidateGitlabStatus: vi.fn(() => invalidate),
  useSetGitlabStatus: vi.fn(() => setStatus)
}))

const disconnectedStatus = {
  connected: false,
  login: null,
  avatarUrl: null,
  authType: null,
  sshKeyTitle: null,
  host: ''
}

describe('GitlabIntegrationCard', () => {
  afterEach(() => cleanup())
  beforeEach(async () => {
    invalidate.mockClear()
    setStatus.mockClear()
    window.gitfreddo = createGitFreddoMock()
    useToastStore.setState({ message: null, tone: 'info', show: vi.fn(), clear: vi.fn() })
    const { useGitlabStatus } = await import('@/hooks/useGitlabStatus')
    vi.mocked(useGitlabStatus).mockReturnValue({
      data: disconnectedStatus,
      isLoading: false
    } as ReturnType<typeof useGitlabStatus>)
  })

  it('renders the GitLab connect section', () => {
    renderWithProviders(<GitlabIntegrationCard />)
    expect(screen.getByRole('heading', { name: 'GitLab' })).toBeInTheDocument()
  })

  it('connects with OAuth', async () => {
    vi.mocked(window.gitfreddo.gitlabConnect).mockResolvedValue({
      connected: true,
      login: 'alice',
      avatarUrl: null,
      authType: 'oauth',
      sshKeyTitle: null,
      host: ''
    })

    renderWithProviders(<GitlabIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /connect with gitlab/i }))

    await waitFor(() => {
      expect(window.gitfreddo.gitlabConnect).toHaveBeenCalled()
      expect(setStatus).toHaveBeenCalled()
      expect(invalidate).toHaveBeenCalled()
    })
  })

  it('connects with a personal access token and self-managed host', async () => {
    vi.mocked(window.gitfreddo.gitlabConnectPat).mockResolvedValue({
      connected: true,
      login: 'alice',
      avatarUrl: null,
      authType: 'pat',
      sshKeyTitle: null,
      host: 'gitlab.example.com'
    })

    renderWithProviders(<GitlabIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /^token$/i }))
    await userEvent.type(screen.getByPlaceholderText(/gitlab\.com/i), 'gitlab.example.com')
    await userEvent.type(screen.getByPlaceholderText(/glpat/i), 'glpat-secret')
    await userEvent.click(screen.getByRole('button', { name: /connect with token/i }))

    await waitFor(() => {
      expect(window.gitfreddo.gitlabConnectPat).toHaveBeenCalledWith(
        'glpat-secret',
        'gitlab.example.com'
      )
    })
  })

  it('disconnects when already connected', async () => {
    const { useGitlabStatus } = await import('@/hooks/useGitlabStatus')
    vi.mocked(useGitlabStatus).mockReturnValue({
      data: {
        connected: true,
        login: 'alice',
        avatarUrl: null,
        authType: 'pat',
        sshKeyTitle: 'GitFreddo key',
        host: ''
      },
      isLoading: false
    } as ReturnType<typeof useGitlabStatus>)

    renderWithProviders(<GitlabIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /^disconnect$/i }))

    await waitFor(() => {
      expect(window.gitfreddo.gitlabDisconnect).toHaveBeenCalled()
      expect(invalidate).toHaveBeenCalled()
    })
  })

  it('uploads an SSH key when connected', async () => {
    const { useGitlabStatus } = await import('@/hooks/useGitlabStatus')
    vi.mocked(useGitlabStatus).mockReturnValue({
      data: {
        connected: true,
        login: 'alice',
        avatarUrl: 'https://avatar.example/alice',
        authType: 'pat',
        sshKeyTitle: null,
        host: ''
      },
      isLoading: false
    } as ReturnType<typeof useGitlabStatus>)
    vi.mocked(window.gitfreddo.gitlabUploadSshKey).mockResolvedValue({
      title: 'GitFreddo key',
      publicKey: 'ssh-ed25519 AAAA...'
    })

    renderWithProviders(<GitlabIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /upload ssh key/i }))

    await waitFor(() => {
      expect(window.gitfreddo.gitlabUploadSshKey).toHaveBeenCalled()
      expect(invalidate).toHaveBeenCalled()
    })
  })

  it('shows connect errors in a toast', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    vi.mocked(window.gitfreddo.gitlabConnect).mockRejectedValue(new Error('OAuth denied'))

    renderWithProviders(<GitlabIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /connect with gitlab/i }))

    await waitFor(() => {
      expect(show).toHaveBeenCalledWith('OAuth denied', 'error')
    })
  })

  it('shows OAuth progress while connecting', async () => {
    let progressHandler: ((next: GitlabConnectProgress) => void) | null = null
    vi.mocked(window.gitfreddo.onGitlabConnectProgress).mockImplementation((handler) => {
      progressHandler = handler
      return vi.fn()
    })
    vi.mocked(window.gitfreddo.gitlabConnect).mockImplementation(
      () =>
        new Promise((resolve) => {
          progressHandler?.({
            status: 'waiting',
            authorizationUri: 'https://gitlab.com/oauth/authorize'
          })
          setTimeout(
            () =>
              resolve({
                connected: true,
                login: 'alice',
                avatarUrl: null,
                authType: 'oauth',
                sshKeyTitle: null,
                host: ''
              }),
            50
          )
        })
    )

    renderWithProviders(<GitlabIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /connect with gitlab/i }))

    expect(await screen.findByText(/gitlab\.com\/oauth\/authorize/i)).toBeInTheDocument()
  })
})
