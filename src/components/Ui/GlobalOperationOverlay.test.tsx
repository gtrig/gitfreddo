import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { GlobalOperationOverlay } from '@/components/Ui/GlobalOperationOverlay'
import { useOperationStore } from '@/stores/operation'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'

describe('GlobalOperationOverlay', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    useOperationStore.setState({ count: 0, message: null })
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      connected: false,
      processExited: false,
      workspacePath: null,
      workspacePickerOpen: false
    })
  })

  it('renders nothing when idle', () => {
    const { container } = renderWithProviders(<GlobalOperationOverlay />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows overlay during global operations', () => {
    useOperationStore.setState({ count: 1, message: 'Pushing…' })
    const { container } = renderWithProviders(<GlobalOperationOverlay />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByText('Pushing…')).toBeInTheDocument()
  })

  it('shows opening message while a tab is connecting', () => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/repo', connected: false, connecting: true, processExited: false }]
    })
    const { container } = renderWithProviders(<GlobalOperationOverlay />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})
