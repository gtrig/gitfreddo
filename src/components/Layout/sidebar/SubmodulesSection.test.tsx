import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { SubmodulesSection } from './SubmodulesSection'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'

describe('SubmodulesSection', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'submodule.list') {
        return [
          {
            path: 'vendor/lib',
            name: 'vendor',
            url: 'https://example.com/lib.git',
            status: 'initialized',
            hasWorkingTree: true
          }
        ]
      }
      if (method === 'repo.status') {
        return { root: '/tmp/repo', head: 'abc', branch: 'main', isDetached: false }
      }
      return undefined
    })
  })

  it('renders submodule rows when data is provided', () => {
    renderWithProviders(
      <SubmodulesSection
        submodules={[
          {
            path: 'vendor/lib',
            name: 'vendor',
            url: 'https://example.com/lib.git',
            status: 'initialized',
            hasWorkingTree: true
          }
        ]}
        filter=""
        isLoading={false}
        error={null}
      />
    )
    expect(screen.getByText('vendor/lib')).toBeInTheDocument()
  })

  it('shows empty state when there are no submodules', () => {
    renderWithProviders(
      <SubmodulesSection submodules={[]} filter="" isLoading={false} error={null} />
    )
    expect(screen.getByText(/no submodules/i)).toBeInTheDocument()
  })
})
