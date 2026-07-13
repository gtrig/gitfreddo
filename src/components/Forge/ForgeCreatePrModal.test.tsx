/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { ForgeCreatePrModal } from './ForgeCreatePrModal'

describe('ForgeCreatePrModal', () => {
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
  it('renders the GitHub dialog', () => {
    renderWithProviders(<ForgeCreatePrModal provider="github" open onClose={vi.fn()} defaultHead="feature" defaultBase="main" onSubmit={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders the Bitbucket dialog', () => {
    renderWithProviders(<ForgeCreatePrModal provider="bitbucket" open onClose={vi.fn()} defaultHead="feature" defaultBase="main" onSubmit={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders the GitLab dialog', () => {
    renderWithProviders(<ForgeCreatePrModal provider="gitlab" open onClose={vi.fn()} defaultHead="feature" defaultBase="main" onSubmit={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
