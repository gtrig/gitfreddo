/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { SidebarIssuesSection } from './SidebarIssuesSection'
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
vi.mock('@/hooks/useGitHubIssues', () => ({
  useGitHubIssues: vi.fn(() => ({
    data: [{ number: 1, title: 'Fix bug', state: 'open', htmlUrl: 'https://github.com/t/r/issues/1', repository: { owner: 't', repo: 'r' }, user: 'test', body: '', labels: [] }],
    isLoading: false,
    error: null
  })),
  useInvalidateGitHubIssues: vi.fn(() => vi.fn())
}))
vi.mock('@/hooks/useBitbucketIssues', () => ({
  useBitbucketIssues: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  useInvalidateBitbucketIssues: vi.fn(() => vi.fn())
}))

describe('SidebarIssuesSection', () => {
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
  it('renders issues section with count', () => {
    renderWithProviders(<SidebarIssuesSection />)
    expect(screen.getByText('Issues')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
