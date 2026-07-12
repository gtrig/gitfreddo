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
  it('renders dialog', () => {
    renderWithProviders(<ForgeCreatePrModal provider="github" open onClose={vi.fn()} defaultHead="feature" defaultBase="main" onSubmit={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
