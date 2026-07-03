import { describe, expect, it, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { ActionBar } from './ActionBar'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'

describe('ActionBar', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, processExited: false, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      processExited: false,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
  })

  it('renders push and pull when connected', () => {
    renderWithProviders(<ActionBar />)
    expect(screen.getByRole('button', { name: /push/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pull/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fetch/i })).toBeInTheDocument()
  })

  it('renders nothing when not connected', () => {
    useWorkspaceStore.setState({ connected: false, tabs: [], activePath: null })
    const { container } = renderWithProviders(<ActionBar />)
    expect(container).toBeEmptyDOMElement()
  })
})
