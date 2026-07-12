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
  CreatePrModal: ({ open }: { open: boolean }) => (open ? <div role="dialog">Create PR</div> : null)
}))
vi.mock('@/components/Bitbucket/CreatePrModal', () => ({
  CreatePrModal: ({ open }: { open: boolean }) => (open ? <div role="dialog">Create PR</div> : null)
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
})
