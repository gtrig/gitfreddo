/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { CreatePrModal } from './CreatePrModal'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useGit', () => ({
  useBranches: vi.fn(() => ({
    data: [
      { name: 'main', isCurrent: true, isRemote: false, head: 'abc' },
      { name: 'feature', isCurrent: false, isRemote: false, head: 'def' }
    ],
    isLoading: false
  }))
}))
vi.mock('@/hooks/useAppSettings', () => ({ useAiEnabled: vi.fn(() => false) }))
vi.mock('@/hooks/useAiFill', () => ({ useAiFill: vi.fn(() => ({ fill: vi.fn(), isLoading: false })) }))

describe('Bitbucket CreatePrModal', () => {
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

  it('renders create pull request dialog', () => {
    renderWithProviders(
      <CreatePrModal
        open
        defaultHead="feature"
        defaultBase="main"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
