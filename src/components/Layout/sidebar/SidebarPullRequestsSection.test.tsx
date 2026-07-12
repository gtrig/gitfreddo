/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { SidebarPullRequestsSection } from './SidebarPullRequestsSection'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useForgeContext', () => ({
  useForgeContext: vi.fn(() => ({
    provider: 'github',
    expectedProvider: 'github',
    connected: true,
    login: 'testuser'
  })),
  forgeConnectKey: 'forge.connect',
  forgeNotLinkedKey: 'forge.notLinked'
}))
vi.mock('@/hooks/useGitHubPullRequests', () => ({
  useGitHubPullRequests: vi.fn(() => ({
    data: [{ number: 42, title: 'Add feature', state: 'open', htmlUrl: 'https://github.com/t/r/pull/42', repository: { owner: 't', repo: 'r' }, head: { ref: 'feature', sha: 'abc' }, base: { ref: 'main', sha: 'def' }, body: '', draft: false, mergeable: true, user: 'test' }],
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
  useBranches: vi.fn(() => ({ data: [], isLoading: false, error: null }))
}))

describe('SidebarPullRequestsSection', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
  })
  it('renders pull requests section with count', () => {
    renderWithProviders(<SidebarPullRequestsSection />)
    expect(screen.getByText('Pull requests')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
