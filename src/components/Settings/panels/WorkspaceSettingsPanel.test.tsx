import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { WorkspaceSettingsPanel } from './WorkspaceSettingsPanel'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'

describe('WorkspaceSettingsPanel', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      connected: false,
      workspacePath: null,
      workspacePickerOpen: false
    })
  })

  it('prompts to connect a repository when no workspace is open', () => {
    renderWithProviders(<WorkspaceSettingsPanel />)

    expect(
      screen.getByText('Open a repository to manage workspace settings.')
    ).toBeInTheDocument()
  })
})
