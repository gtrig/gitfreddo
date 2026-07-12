/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { TagsSection } from './TagsSection'

describe('TagsSection', () => {
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
  it('renders section content', () => {
    renderWithProviders(<TagsSection tags={[{ name: "v1.0.0", target: "abc", isAnnotated: false, isRemote: false }]} remotes={[]} filter="" isLoading={false} error={null} onSelectCommit={vi.fn()} />)
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
  })

  it('filters tags by name', () => {
    renderWithProviders(
      <TagsSection
        tags={[
          { name: 'v1.0.0', target: 'abc', isAnnotated: false, isRemote: false },
          { name: 'v2.0.0', target: 'def', isAnnotated: false, isRemote: false }
        ]}
        remotes={[]}
        filter="v2"
        isLoading={false}
        error={null}
        onSelectCommit={vi.fn()}
      />
    )
    expect(screen.getByText('v2.0.0')).toBeInTheDocument()
    expect(screen.queryByText('v1.0.0')).not.toBeInTheDocument()
  })

  it('shows loading and error states', () => {
    const { rerender } = renderWithProviders(
      <TagsSection
        tags={[]}
        remotes={[]}
        filter=""
        isLoading
        error={null}
        onSelectCommit={vi.fn()}
      />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(
      <TagsSection
        tags={[]}
        remotes={[]}
        filter=""
        isLoading={false}
        error={new Error('Failed to load tags')}
        onSelectCommit={vi.fn()}
      />
    )
    expect(screen.getByText('Failed to load tags')).toBeInTheDocument()
  })
})
