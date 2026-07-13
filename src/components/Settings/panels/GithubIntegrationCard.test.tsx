/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GithubIntegrationCard } from './GithubIntegrationCard'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useToastStore } from '@/stores/toast'

const invalidate = vi.fn()
const setStatus = vi.fn()

vi.mock('@/hooks/useGitHubStatus', () => ({
  useGitHubStatus: vi.fn(),
  useInvalidateGitHubStatus: vi.fn(() => invalidate),
  useSetGitHubStatus: vi.fn(() => setStatus)
}))

describe('GithubIntegrationCard', () => {
  afterEach(() => cleanup())
  beforeEach(async () => {
    invalidate.mockClear()
    setStatus.mockClear()
    window.gitfreddo = createGitFreddoMock()
    useToastStore.setState({ message: null, tone: 'info', show: vi.fn(), clear: vi.fn() })
    const { useGitHubStatus } = await import('@/hooks/useGitHubStatus')
    vi.mocked(useGitHubStatus).mockReturnValue({
      data: { connected: false, login: null, avatarUrl: null, sshKeyTitle: null },
      isLoading: false
    } as ReturnType<typeof useGitHubStatus>)
  })

  it('renders GitHub connect section', () => {
    renderWithProviders(<GithubIntegrationCard />)
    expect(screen.getByRole('heading', { name: 'GitHub' })).toBeInTheDocument()
  })

  it('connects with GitHub OAuth', async () => {
    vi.mocked(window.gitfreddo.githubConnect).mockResolvedValue({
      connected: true,
      login: 'octo',
      avatarUrl: null,
      sshKeyTitle: null
    })

    renderWithProviders(<GithubIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /connect with github/i }))

    await waitFor(() => {
      expect(window.gitfreddo.githubConnect).toHaveBeenCalled()
      expect(setStatus).toHaveBeenCalled()
      expect(invalidate).toHaveBeenCalled()
    })
  })

  it('disconnects when already connected', async () => {
    const { useGitHubStatus } = await import('@/hooks/useGitHubStatus')
    vi.mocked(useGitHubStatus).mockReturnValue({
      data: { connected: true, login: 'octo', avatarUrl: null, sshKeyTitle: 'GitFreddo key' },
      isLoading: false
    } as ReturnType<typeof useGitHubStatus>)

    renderWithProviders(<GithubIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /^disconnect$/i }))

    await waitFor(() => {
      expect(window.gitfreddo.githubDisconnect).toHaveBeenCalled()
      expect(invalidate).toHaveBeenCalled()
    })
  })

  it('connects with a personal access token', async () => {
    vi.mocked(window.gitfreddo.githubConnectPat).mockResolvedValue({
      connected: true,
      login: 'pat-user',
      avatarUrl: null,
      sshKeyTitle: null
    })

    renderWithProviders(<GithubIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /token/i }))
    await userEvent.type(screen.getByPlaceholderText(/ghp_/i), 'ghp_testtoken')
    await userEvent.click(screen.getByRole('button', { name: /connect with token/i }))

    await waitFor(() => {
      expect(window.gitfreddo.githubConnectPat).toHaveBeenCalledWith('ghp_testtoken')
      expect(setStatus).toHaveBeenCalled()
    })
  })

  it('shows device-code progress during OAuth connect', async () => {
    let progressHandler: ((next: { userCode: string; verificationUri: string }) => void) | null = null
    vi.mocked(window.gitfreddo.onGitHubConnectProgress).mockImplementation((handler) => {
      progressHandler = handler
      return vi.fn()
    })
    vi.mocked(window.gitfreddo.githubConnect).mockImplementation(
      () =>
        new Promise((resolve) => {
          progressHandler?.({ userCode: 'ABCD-1234', verificationUri: 'https://github.com/login/device' })
          setTimeout(
            () =>
              resolve({
                connected: true,
                login: 'octo',
                avatarUrl: null,
                sshKeyTitle: null
              }),
            50
          )
        })
    )

    renderWithProviders(<GithubIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /connect with github/i }))

    expect(await screen.findByText('ABCD-1234')).toBeInTheDocument()
  })

  it('uploads an SSH key when connected', async () => {
    const { useGitHubStatus } = await import('@/hooks/useGitHubStatus')
    vi.mocked(useGitHubStatus).mockReturnValue({
      data: { connected: true, login: 'octo', avatarUrl: null, sshKeyTitle: null },
      isLoading: false
    } as ReturnType<typeof useGitHubStatus>)
    vi.mocked(window.gitfreddo.githubUploadSshKey).mockResolvedValue({
      title: 'GitFreddo key',
      publicKey: 'ssh-rsa AAAAB3...'
    })

    renderWithProviders(<GithubIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /upload ssh key/i }))

    await waitFor(() => {
      expect(window.gitfreddo.githubUploadSshKey).toHaveBeenCalled()
      expect(invalidate).toHaveBeenCalled()
    })
  })

  it('shows connect errors in a toast', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    vi.mocked(window.gitfreddo.githubConnect).mockRejectedValue(new Error('OAuth denied'))

    renderWithProviders(<GithubIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /connect with github/i }))

    await waitFor(() => {
      expect(show).toHaveBeenCalledWith('OAuth denied', 'error')
    })
  })
})
