/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidebarIssuesSection } from './SidebarIssuesSection'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useForgeContext } from '@/hooks/useForgeContext'
import { useGitHubIssues } from '@/hooks/useGitHubIssues'
import { useBitbucketIssues } from '@/hooks/useBitbucketIssues'
import { useToastStore } from '@/stores/toast'

const createBranchMutate = vi.fn(async () => undefined)
const showToast = vi.fn()

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
vi.mock('@/hooks/useGitHubIssues', () => ({
  useGitHubIssues: vi.fn(() => ({
    data: [
      {
        number: 1,
        title: 'Fix bug',
        state: 'open',
        htmlUrl: 'https://github.com/t/r/issues/1',
        user: 'test',
        body: '',
        labels: []
      }
    ],
    isLoading: false,
    error: null
  })),
  useInvalidateGitHubIssues: vi.fn(() => vi.fn())
}))
vi.mock('@/hooks/useBitbucketIssues', () => ({
  useBitbucketIssues: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  useInvalidateBitbucketIssues: vi.fn(() => vi.fn())
}))
vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    createBranch: { mutateAsync: createBranchMutate, isPending: false }
  })
}))
vi.mock('@/components/GitHub/EditIssueModal', () => ({
  EditIssueModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Edit issue</div> : null
}))
vi.mock('@/components/Bitbucket/EditIssueModal', () => ({
  EditIssueModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Edit issue</div> : null
}))

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

describe('SidebarIssuesSection', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })
  beforeEach(() => {
    localStorage.clear()
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    vi.mocked(useForgeContext).mockReturnValue({
      provider: 'github',
      expectedProvider: 'github',
      connected: true,
      login: 'testuser'
    } as ReturnType<typeof useForgeContext>)
    vi.mocked(useGitHubIssues).mockReturnValue({
      data: [
        {
          number: 1,
          title: 'Fix bug',
          state: 'open',
          htmlUrl: 'https://github.com/t/r/issues/1',
          user: 'test',
          body: '',
          labels: []
        }
      ],
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useGitHubIssues>)
    createBranchMutate.mockClear()
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock({
      githubCreateIssue: vi.fn(async () => ({
        number: 2,
        title: 'New bug',
        state: 'open',
        htmlUrl: 'https://github.com/t/r/issues/2',
        user: 'test',
        body: '',
        labels: []
      })),
      githubUpdateIssue: vi.fn(async () => ({
        number: 1,
        title: 'Fix bug',
        state: 'closed',
        htmlUrl: 'https://github.com/t/r/issues/1',
        user: 'test',
        body: '',
        labels: []
      }))
    })
  })

  async function expandSection() {
    await userEvent.click(screen.getByRole('button', { name: 'Issues' }))
  }

  it('renders issues section with count', () => {
    renderWithProviders(<SidebarIssuesSection />)
    expect(screen.getByText('Issues')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('opens the create issue dialog', async () => {
    renderWithProviders(<SidebarIssuesSection />)
    await userEvent.click(screen.getByRole('button', { name: /create issue/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('creates an issue from the modal form', async () => {
    renderWithProviders(<SidebarIssuesSection />)
    await userEvent.click(screen.getByRole('button', { name: /create issue/i }))
    await userEvent.type(screen.getAllByRole('textbox')[0]!, 'New bug')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))
    expect(window.gitfreddo.githubCreateIssue).toHaveBeenCalledWith('/tmp/repo', {
      title: 'New bug',
      body: ''
    })
  })

  it('filters issues to mine', async () => {
    renderWithProviders(<SidebarIssuesSection />)
    await expandSection()
    await userEvent.click(screen.getByRole('button', { name: /my issues/i }))
    expect(useGitHubIssues).toHaveBeenLastCalledWith('/tmp/repo', 'testuser', true)
  })

  it('creates a branch from an issue context menu', async () => {
    renderWithProviders(<SidebarIssuesSection />)
    await expandSection()
    fireEvent.contextMenu(screen.getByText(/#1 Fix bug/))
    await userEvent.click(screen.getByRole('menuitem', { name: /branch from issue/i }))
    expect(createBranchMutate).toHaveBeenCalledWith({ name: 'issue-1-fix-bug' })
  })

  it('closes an issue from the context menu', async () => {
    renderWithProviders(<SidebarIssuesSection />)
    await expandSection()
    fireEvent.contextMenu(screen.getByText(/#1 Fix bug/))
    await userEvent.click(screen.getByRole('menuitem', { name: /close issue/i }))
    expect(window.gitfreddo.githubUpdateIssue).toHaveBeenCalledWith('/tmp/repo', 1, { state: 'closed' })
  })

  it('shows loading state while issues are fetched', async () => {
    vi.mocked(useGitHubIssues).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    } as unknown as ReturnType<typeof useGitHubIssues>)
    renderWithProviders(<SidebarIssuesSection />)
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
    renderWithProviders(<SidebarIssuesSection />)
    await expandSection()
    expect(screen.getByText(/connect/i)).toBeInTheDocument()
  })

  it('prompts to open a repository when workspace is disconnected', async () => {
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      connected: false,
      workspacePath: null,
      workspacePickerOpen: false
    })
    renderWithProviders(<SidebarIssuesSection />)
    await expandSection()
    expect(screen.getByText(/open a repository/i)).toBeInTheDocument()
  })

  it('shows not-linked message when forge is connected but repo is unlinked', async () => {
    vi.mocked(useForgeContext).mockReturnValue({
      provider: null,
      expectedProvider: 'github',
      connected: true,
      login: 'testuser'
    } as ReturnType<typeof useForgeContext>)
    renderWithProviders(<SidebarIssuesSection />)
    await expandSection()
    expect(screen.getByText('forge.notLinked')).toBeInTheDocument()
  })

  it('shows empty state when there are no open issues', async () => {
    vi.mocked(useGitHubIssues).mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useGitHubIssues>)
    renderWithProviders(<SidebarIssuesSection />)
    await expandSection()
    expect(screen.getByText(/no open issues/i)).toBeInTheDocument()
  })

  it('shows fetch error message', async () => {
    vi.mocked(useGitHubIssues).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Issues API failed')
    } as unknown as ReturnType<typeof useGitHubIssues>)
    renderWithProviders(<SidebarIssuesSection />)
    await expandSection()
    expect(screen.getByText('Issues API failed')).toBeInTheDocument()
  })

  it('opens edit modal from the issue context menu', async () => {
    renderWithProviders(<SidebarIssuesSection />)
    await expandSection()
    fireEvent.contextMenu(screen.getByText(/#1 Fix bug/))
    await userEvent.click(screen.getByRole('menuitem', { name: /edit issue/i }))
    expect(screen.getByText('Edit issue')).toBeInTheDocument()
  })

  it('reopens a closed issue from the context menu', async () => {
    vi.mocked(useGitHubIssues).mockReturnValue({
      data: [
        {
          number: 3,
          title: 'Closed issue',
          state: 'closed',
          htmlUrl: 'https://github.com/t/r/issues/3',
          user: 'test',
          body: '',
          labels: []
        }
      ],
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useGitHubIssues>)
    renderWithProviders(<SidebarIssuesSection />)
    await expandSection()
    fireEvent.contextMenu(screen.getByText(/#3 Closed issue/))
    await userEvent.click(screen.getByRole('menuitem', { name: /reopen issue/i }))
    expect(window.gitfreddo.githubUpdateIssue).toHaveBeenCalledWith('/tmp/repo', 3, { state: 'open' })
  })

  it('cancels the create issue dialog', async () => {
    renderWithProviders(<SidebarIssuesSection />)
    await userEvent.click(screen.getByRole('button', { name: /create issue/i }))
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('creates bitbucket issues and closes them from the context menu', async () => {
    vi.mocked(useForgeContext).mockReturnValue({
      provider: 'bitbucket',
      expectedProvider: 'bitbucket',
      connected: true,
      login: 'bb-user'
    } as ReturnType<typeof useForgeContext>)
    vi.mocked(useBitbucketIssues).mockReturnValue({
      data: [
        {
          number: 10,
          title: 'BB issue',
          state: 'open',
          htmlUrl: 'https://bitbucket.org/acme/app/issues/10',
          user: 'bb-user',
          body: ''
        }
      ],
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useBitbucketIssues>)
    window.gitfreddo = createGitFreddoMock({
      bitbucketCreateIssue: vi.fn(async () => ({
        number: 11,
        title: 'New BB',
        state: 'open',
        htmlUrl: 'https://bitbucket.org/acme/app/issues/11',
        user: 'bb-user',
        body: '',
        labels: []
      })),
      bitbucketUpdateIssue: vi.fn(async () => ({
        number: 10,
        title: 'BB issue',
        state: 'closed',
        htmlUrl: 'https://bitbucket.org/acme/app/issues/10',
        user: 'bb-user',
        body: '',
        labels: []
      }))
    })

    renderWithProviders(<SidebarIssuesSection />)
    await userEvent.click(screen.getByRole('button', { name: /create issue/i }))
    await userEvent.type(screen.getAllByRole('textbox')[0]!, 'New BB')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))
    expect(window.gitfreddo.bitbucketCreateIssue).toHaveBeenCalledWith('/tmp/repo', {
      title: 'New BB',
      body: ''
    })

    await expandSection()
    fireEvent.contextMenu(screen.getByText(/#10 BB issue/))
    await userEvent.click(screen.getByRole('menuitem', { name: /close issue/i }))
    expect(window.gitfreddo.bitbucketUpdateIssue).toHaveBeenCalledWith('/tmp/repo', 10, {
      state: 'closed'
    })
  })

  it('opens the issue in the browser when a row is clicked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    renderWithProviders(<SidebarIssuesSection />)
    await expandSection()
    await userEvent.click(screen.getByText(/#1 Fix bug/))
    expect(openSpy).toHaveBeenCalledWith(
      'https://github.com/t/r/issues/1',
      '_blank',
      'noopener,noreferrer'
    )
    openSpy.mockRestore()
  })

  it('virtualizes long issue lists', async () => {
    vi.mocked(useGitHubIssues).mockReturnValue({
      data: Array.from({ length: 55 }, (_, index) => ({
        number: index + 1,
        title: `Issue ${index + 1}`,
        state: 'open',
        htmlUrl: `https://github.com/t/r/issues/${index + 1}`,
        user: 'test',
        body: '',
        labels: []
      })),
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useGitHubIssues>)
    renderWithProviders(<SidebarIssuesSection />)
    await expandSection()
    expect(screen.getByText(/#1 Issue 1/)).toBeInTheDocument()
    expect(screen.getByText(/#55 Issue 55/)).toBeInTheDocument()
  })
})
