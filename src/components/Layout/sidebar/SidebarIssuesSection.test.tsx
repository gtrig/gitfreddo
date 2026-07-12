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

const createBranchMutate = vi.fn(async () => undefined)

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

describe('SidebarIssuesSection', () => {
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
})
