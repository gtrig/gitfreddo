/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { ToolsMenu } from './ToolsMenu'

describe('ToolsMenu', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    useWorkspaceStore.setState({
      connected: true,
      activePath: '/tmp/repo',
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
  })

  it('renders menu trigger', () => {
    renderWithProviders(<ToolsMenu />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens the tools menu and launches pickaxe search', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ToolsMenu />)

    await user.click(screen.getByRole('button', { name: /git tools/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: /pickaxe/i }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('disables the trigger when disconnected', () => {
    useWorkspaceStore.setState({ connected: false })
    renderWithProviders(<ToolsMenu />)
    expect(screen.getByRole('button', { name: /git tools/i })).toBeDisabled()
  })
})
