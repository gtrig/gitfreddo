import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { WorkspaceTabs } from './WorkspaceTabs'
import { renderWithProviders } from '@/test/render'
import { useWorkspaceStore, type WorkspaceTab } from '@/stores/workspace'

function tab(path: string): WorkspaceTab {
  return { path, connected: true, connecting: false }
}

describe('WorkspaceTabs', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [tab('/repos/alpha'), tab('/repos/beta'), tab('/repos/gamma')],
      activePath: '/repos/beta',
      workspacePath: '/repos/beta',
      connected: true,
      workspacePickerOpen: false
    })
  })

  it('reorders tabs via drag and drop', () => {
    renderWithProviders(<WorkspaceTabs />)

    const alpha = screen.getByRole('button', { name: 'alpha' })
    const gamma = screen.getByRole('button', { name: 'gamma' })
    const dataTransfer = {
      setData: () => undefined,
      getData: () => '/repos/alpha',
      effectAllowed: 'move',
      dropEffect: 'move'
    }

    fireEvent.dragStart(alpha, { dataTransfer })
    fireEvent.dragOver(gamma, { dataTransfer })
    fireEvent.drop(gamma, { dataTransfer })

    expect(useWorkspaceStore.getState().tabs.map((item) => item.path)).toEqual([
      '/repos/beta',
      '/repos/gamma',
      '/repos/alpha'
    ])
  })
})
