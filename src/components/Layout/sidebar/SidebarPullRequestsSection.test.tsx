/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidebarPullRequestsSection } from './SidebarPullRequestsSection'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useForgeContext } from '@/hooks/useForgeContext'
import { useGitHubPullRequests } from '@/hooks/useGitHubPullRequests'
import { useBitbucketPullRequests } from '@/hooks/useBitbucketPullRequests'
import { useGitlabPullRequests } from '@/hooks/useGitlabPullRequests'
import { useToastStore } from '@/stores/toast'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * estimateSize(),
        size: estimateSize()
      })),
    getTotalSize: () => count * estimateSize(),
    measureElement: vi.fn()
  }))
}))

vi.mock('@/hooks/useForgeContext', () => ({
  useForgeContext: vi.fn(() => ({
    provider: 'github',
    expectedProvider: 'github',
    connected: true,
    login: 'testuser'
  })),
  forgeConnectKey: () => 'settings.github.connectPrompt',
  forgeNotLinkedKey: () => 'forge.notLinked'
}))
vi.mock('@/hooks/useGitHubPullRequests', () => ({
  useGitHubPullRequests: vi.fn(() => ({
    data: [
      {
        number: 42,
        title: 'Add feature',
        state: 'open',
        htmlUrl: 'https://github.com/t/r/pull/42',
        repository: { owner: 't', repo: 'r' },
        head: { ref: 'feature', sha: 'abc' },
        base: { ref: 'main', sha: 'def' },
        body: '',
        draft: false,
        mergeable: true,
        user: 'test'
      }
    ],
    isLoading: false,
    error: null
  })),
  useInvalidateGitHubPullRequests: vi.fn(() => vi.fn())
}))
vi.mock('@/hooks/useBitbucketPullRequests', () => ({
  useBitbucketPullRequests: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  useInvalidateBitbucketPullRequests: vi.fn(() => vi.fn())
}))
vi.mock('@/hooks/useGit', () => ({
  useBranches: vi.fn(() => ({
    data: [{ name: 'main', head: 'abc', isCurrent: true, isRemote: false, upstream: null }],
    isLoading: false,
    error: null
  }))
}))
vi.mock('@/components/GitHub/CreatePrModal', () => ({
  CreatePrModal: ({
    open,
    onClose,
    onSubmit
  }: {
    open: boolean
    onClose: () => void
    onSubmit: (params: { title: string; body: string; head: string; base: string }) => Promise<void>
  }) =>
    open ? (
      <div role="dialog">
        Create PR
        <button
          type="button"
          onClick={() => void onSubmit({ title: 'T', body: 'B', head: 'feature', base: 'main' })}
        >
          Submit PR
        </button>
        <button type="button" onClick={onClose}>
          Close PR dialog
        </button>
      </div>
    ) : null
}))
vi.mock('@/components/Bitbucket/CreatePrModal', () => ({
  CreatePrModal: ({
    open,
    onClose,
    onSubmit
  }: {
    open: boolean
    onClose: () => void
    onSubmit: (params: { title: string; body: string; head: string; base: string }) => Promise<void>
  }) =>
    open ? (
      <div role="dialog">
        Create PR
        <button
          type="button"
          onClick={() => void onSubmit({ title: 'T', body: 'B', head: 'feature', base: 'main' })}
        >
          Submit PR
        </button>
        <button type="button" onClick={onClose}>
          Close PR dialog
        </button>
      </div>
    ) : null
}))
vi.mock('@/components/GitLab/CreatePrModal', () => ({
  CreatePrModal: ({
    open,
    onClose,
    onSubmit
  }: {
    open: boolean
    onClose: () => void
    onSubmit: (params: { title: string; body: string; head: string; base: string }) => Promise<void>
  }) =>
    open ? (
      <div role="dialog">
        Create PR
        <button
          type="button"
          onClick={() => void onSubmit({ title: 'T', body: 'B', head: 'feature', base: 'main' })}
        >
          Submit PR
        </button>
        <button type="button" onClick={onClose}>
          Close PR dialog
        </button>
      </div>
    ) : null
}))
vi.mock('@/hooks/useGitlabPullRequests', () => ({
  useGitlabPullRequests: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  useInvalidateGitlabPullRequests: vi.fn(() => vi.fn())
}))

describe('SidebarPullRequestsSection', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(useForgeContext).mockReturnValue({
      provider: 'github',
      expectedProvider: 'github',
      connected: true,
      login: 'testuser'
    } as ReturnType<typeof useForgeContext>)
    vi.mocked(useGitHubPullRequests).mockReturnValue({
      data: [
        {
          number: 42,
          title: 'Add feature',
          state: 'open',
          htmlUrl: 'https://github.com/t/r/pull/42',
          repository: { owner: 't', repo: 'r' },
          head: { ref: 'feature', sha: 'abc' },
          base: { ref: 'main', sha: 'def' },
          body: '',
          draft: false,
          mergeable: true,
          user: 'test'
        }
      ],
      isLoading: false,
      error: null
    } as ReturnType<typeof useGitHubPullRequests>)
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock({
      githubMergePullRequest: vi.fn(async () => undefined),
      githubCreatePullRequest: vi.fn(async () => ({
        number: 43,
        title: 'New PR',
        state: 'open',
        htmlUrl: 'https://github.com/t/r/pull/43',
        repository: { owner: 't', repo: 'r' },
        head: { ref: 'feature', sha: 'abc' },
        base: { ref: 'main', sha: 'def' },
        body: '',
        draft: false,
        mergeable: true,
        user: 'test'
      }))
    })
  })

  async function expandSection() {
    await userEvent.click(screen.getByRole('button', { name: 'Pull requests' }))
  }

  it('renders pull requests section with count', () => {
    renderWithProviders(<SidebarPullRequestsSection />)
    expect(screen.getByText('Pull requests')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('opens pull request detail when a row is clicked', async () => {
    const onOpenPrDetail = vi.fn()
    renderWithProviders(<SidebarPullRequestsSection onOpenPrDetail={onOpenPrDetail} />)
    await expandSection()
    await userEvent.click(screen.getByText(/#42 Add feature/))
    expect(onOpenPrDetail).toHaveBeenCalledWith({
      number: 42,
      repository: { owner: 't', repo: 'r' }
    })
  })

  it('opens create pull request modal', async () => {
    renderWithProviders(<SidebarPullRequestsSection />)
    await userEvent.click(screen.getByRole('button', { name: /create pull request/i }))
    expect(screen.getByText('Create PR')).toBeInTheDocument()
  })

  it('merges a pull request from the context menu', async () => {
    renderWithProviders(<SidebarPullRequestsSection />)
    await expandSection()
    fireEvent.contextMenu(screen.getByText(/#42 Add feature/))
    await userEvent.click(screen.getByRole('menuitem', { name: /merge commit/i }))
    expect(window.gitfreddo.githubMergePullRequest).toHaveBeenCalledWith('/tmp/repo', 42, 'merge')
  })

  it('shows loading state while pull requests are fetched', async () => {
    vi.mocked(useGitHubPullRequests).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    } as ReturnType<typeof useGitHubPullRequests>)
    renderWithProviders(<SidebarPullRequestsSection />)
    await expandSection()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('prompts to connect forge when disconnected', async () => {
    vi.mocked(useForgeContext).mockReturnValue({
      provider: 'github',
      expectedProvider: 'github',
      connected: false,
      login: null
    } as ReturnType<typeof useForgeContext>)
    renderWithProviders(<SidebarPullRequestsSection />)
    await expandSection()
    expect(screen.getByText(/settings\.github\.connectPrompt|connect github/i)).toBeInTheDocument()
  })

  it('prompts to open a repository when disconnected from git', async () => {
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      connected: false,
      workspacePath: null,
      workspacePickerOpen: false
    })
    renderWithProviders(<SidebarPullRequestsSection />)
    await expandSection()
    expect(screen.getByText(/open a repository to view pull requests/i)).toBeInTheDocument()
  })

  it('shows empty state when there are no open pull requests', async () => {
    vi.mocked(useGitHubPullRequests).mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useGitHubPullRequests>)
    renderWithProviders(<SidebarPullRequestsSection />)
    await expandSection()
    expect(screen.getByText(/no open pull requests/i)).toBeInTheDocument()
  })

  it('shows fetch error message', async () => {
    vi.mocked(useGitHubPullRequests).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('PR fetch failed')
    } as ReturnType<typeof useGitHubPullRequests>)
    renderWithProviders(<SidebarPullRequestsSection />)
    await expandSection()
    expect(screen.getByText('PR fetch failed')).toBeInTheDocument()
  })

  it('merges with squash and rebase from the context menu', async () => {
    renderWithProviders(<SidebarPullRequestsSection />)
    await expandSection()
    fireEvent.contextMenu(screen.getByText(/#42 Add feature/))
    await userEvent.click(screen.getByRole('menuitem', { name: /squash and merge/i }))
    expect(window.gitfreddo.githubMergePullRequest).toHaveBeenCalledWith('/tmp/repo', 42, 'squash')

    fireEvent.contextMenu(screen.getByText(/#42 Add feature/))
    await userEvent.click(screen.getByRole('menuitem', { name: /rebase and merge/i }))
    expect(window.gitfreddo.githubMergePullRequest).toHaveBeenCalledWith('/tmp/repo', 42, 'rebase')
  })

  it('prompts when forge is connected but repo is not linked', async () => {
    vi.mocked(useForgeContext).mockReturnValue({
      provider: null,
      expectedProvider: 'github',
      connected: true,
      login: 'testuser'
    } as ReturnType<typeof useForgeContext>)
    renderWithProviders(<SidebarPullRequestsSection />)
    await expandSection()
    expect(screen.getByText(/forge\.notLinked|not linked to github/i)).toBeInTheDocument()
  })

  it('renders bitbucket pull requests and opens them externally', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    vi.mocked(useForgeContext).mockReturnValue({
      provider: 'bitbucket',
      expectedProvider: 'bitbucket',
      connected: true,
      login: 'testuser'
    } as ReturnType<typeof useForgeContext>)
    vi.mocked(useBitbucketPullRequests).mockReturnValue({
      data: [
        {
          number: 7,
          title: 'Bitbucket PR',
          state: 'open',
          htmlUrl: 'https://bitbucket.org/t/r/pull-requests/7',
          repository: { owner: 't', repo: 'r' },
          head: { ref: 'feature', sha: 'abc' },
          base: { ref: 'main', sha: 'def' },
          body: '',
          draft: false,
          mergeable: true,
          user: 'test'
        }
      ],
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useBitbucketPullRequests>)
    window.gitfreddo = createGitFreddoMock({
      bitbucketMergePullRequest: vi.fn(async () => undefined)
    })

    renderWithProviders(<SidebarPullRequestsSection />)
    await expandSection()
    await userEvent.click(screen.getByText(/#7 Bitbucket PR/))
    expect(openSpy).toHaveBeenCalledWith(
      'https://bitbucket.org/t/r/pull-requests/7',
      '_blank',
      'noopener,noreferrer'
    )

    fireEvent.contextMenu(screen.getByText(/#7 Bitbucket PR/))
    await userEvent.click(screen.getByRole('menuitem', { name: /merge commit/i }))
    expect(window.gitfreddo.bitbucketMergePullRequest).toHaveBeenCalledWith('/tmp/repo', 7, 'merge')
    openSpy.mockRestore()
  })

  it('opens bitbucket create pull request modal', async () => {
    vi.mocked(useForgeContext).mockReturnValue({
      provider: 'bitbucket',
      expectedProvider: 'bitbucket',
      connected: true,
      login: 'testuser'
    } as ReturnType<typeof useForgeContext>)
    renderWithProviders(<SidebarPullRequestsSection />)
    await userEvent.click(screen.getByRole('button', { name: /create pull request/i }))
    expect(screen.getByText('Create PR')).toBeInTheDocument()
  })

  it('virtualizes very large pull request lists', async () => {
    vi.mocked(useGitHubPullRequests).mockReturnValue({
      data: Array.from({ length: 55 }, (_, index) => ({
        number: index + 1,
        title: `PR ${index + 1}`,
        state: 'open',
        htmlUrl: `https://github.com/t/r/pull/${index + 1}`,
        repository: { owner: 't', repo: 'r' },
        head: { ref: 'feature', sha: 'abc' },
        base: { ref: 'main', sha: 'def' },
        body: '',
        draft: false,
        mergeable: true,
        user: 'test'
      })),
      isLoading: false,
      error: null
    } as ReturnType<typeof useGitHubPullRequests>)
    renderWithProviders(<SidebarPullRequestsSection />)
    await expandSection()
    expect(screen.getByText(/#1 PR 1/)).toBeInTheDocument()
    expect(screen.getByText(/#55 PR 55/)).toBeInTheDocument()
  })

  const pr = (number: number, title: string) => ({
    number,
    title,
    state: 'open',
    htmlUrl: `https://gitlab.com/t/r/-/merge_requests/${number}`,
    repository: { owner: 't', repo: 'r' },
    head: { ref: 'feature', sha: 'abc' },
    base: { ref: 'main', sha: 'def' },
    body: '',
    draft: false,
    mergeable: true,
    user: 'test'
  })

  it.each([
    ['github', 'githubCreatePullRequest'],
    ['bitbucket', 'bitbucketCreatePullRequest'],
    ['gitlab', 'gitlabCreatePullRequest']
  ] as const)('creates a %s pull request, confirms it, and closes the dialog', async (provider, method) => {
    vi.mocked(useForgeContext).mockReturnValue({
      provider,
      expectedProvider: provider,
      connected: true,
      login: 'testuser'
    } as ReturnType<typeof useForgeContext>)
    const show = vi.fn()
    useToastStore.setState({ show })
    window.gitfreddo = createGitFreddoMock({ [method]: vi.fn(async () => ({})) })

    renderWithProviders(<SidebarPullRequestsSection />)
    await userEvent.click(screen.getByRole('button', { name: /create pull request/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit PR' }))
    await vi.waitFor(() =>
      expect(window.gitfreddo[method]).toHaveBeenCalledWith('/tmp/repo', {
        title: 'T',
        body: 'B',
        head: 'feature',
        base: 'main'
      })
    )
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith(expect.any(String), 'success'))
    await userEvent.click(screen.getByRole('button', { name: 'Close PR dialog' }))
    expect(screen.queryByText('Create PR')).not.toBeInTheDocument()
  })

  it('merges GitLab merge requests from the context menu', async () => {
    vi.mocked(useForgeContext).mockReturnValue({
      provider: 'gitlab',
      expectedProvider: 'gitlab',
      connected: true,
      login: 'testuser'
    } as ReturnType<typeof useForgeContext>)
    vi.mocked(useGitlabPullRequests).mockReturnValue({
      data: [pr(9, 'GitLab MR')],
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useGitlabPullRequests>)
    window.gitfreddo = createGitFreddoMock({ gitlabMergePullRequest: vi.fn(async () => undefined) })

    renderWithProviders(<SidebarPullRequestsSection />)
    await expandSection()
    fireEvent.contextMenu(screen.getByText(/#9 GitLab MR/))
    await userEvent.click(screen.getByRole('menuitem', { name: /merge commit/i }))
    expect(window.gitfreddo.gitlabMergePullRequest).toHaveBeenCalledWith('/tmp/repo', 9, 'merge')
  })

  it('opens and merges pull requests from a virtualized list', async () => {
    const onOpenPrDetail = vi.fn()
    vi.mocked(useGitHubPullRequests).mockReturnValue({
      data: Array.from({ length: 55 }, (_, index) => pr(index + 1, `PR ${index + 1}`)),
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useGitHubPullRequests>)
    window.gitfreddo = createGitFreddoMock({ githubMergePullRequest: vi.fn(async () => undefined) })

    renderWithProviders(<SidebarPullRequestsSection onOpenPrDetail={onOpenPrDetail} />)
    await expandSection()
    await userEvent.click(screen.getByText(/#3 PR 3$/))
    expect(onOpenPrDetail).toHaveBeenCalled()
    fireEvent.contextMenu(screen.getByText(/#3 PR 3$/))
    await userEvent.click(screen.getByRole('menuitem', { name: /merge commit/i }))
    expect(window.gitfreddo.githubMergePullRequest).toHaveBeenCalledWith('/tmp/repo', 3, 'merge')
  })

  it('opens Bitbucket pull requests externally from a virtualized list', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    vi.mocked(useForgeContext).mockReturnValue({
      provider: 'bitbucket',
      expectedProvider: 'bitbucket',
      connected: true,
      login: 'testuser'
    } as ReturnType<typeof useForgeContext>)
    vi.mocked(useBitbucketPullRequests).mockReturnValue({
      data: Array.from({ length: 55 }, (_, index) => pr(index + 1, `BB ${index + 1}`)),
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useBitbucketPullRequests>)

    renderWithProviders(<SidebarPullRequestsSection />)
    await expandSection()
    await userEvent.click(screen.getByText(/#4 BB 4$/))
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('/4'), '_blank', 'noopener,noreferrer')
    openSpy.mockRestore()
  })
})

