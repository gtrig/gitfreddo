/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { SidebarFolderRow, SidebarTreeRow } from './SidebarTreeRow'
import { SidebarIconBranch } from './SidebarIcons'
import { renderWithProviders } from '@/test/render'

function expectNodeAfter(earlier: HTMLElement, later: HTMLElement) {
  expect(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
}

describe('SidebarTreeRow', () => {
  afterEach(() => cleanup())

  it('renders row label', () => {
    renderWithProviders(
      <SidebarTreeRow icon={<SidebarIconBranch />} label="main" onClick={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /main/i })).toBeInTheDocument()
  })

  it('places the more-actions button after the label', () => {
    renderWithProviders(
      <SidebarTreeRow
        icon={<SidebarIconBranch />}
        label="main"
        menuItems={[{ id: 'a', label: 'Action', onClick: vi.fn() }]}
        openMenu={vi.fn()}
        onClick={vi.fn()}
      />
    )

    expectNodeAfter(
      screen.getByRole('button', { name: /^main$/i }),
      screen.getByRole('button', { name: /more actions/i })
    )
  })

  it('places the trailing action before the more-actions button', () => {
    renderWithProviders(
      <SidebarTreeRow
        icon={<SidebarIconBranch />}
        label="main"
        trailingAction={<button type="button">Hide from graph</button>}
        menuItems={[{ id: 'a', label: 'Action', onClick: vi.fn() }]}
        openMenu={vi.fn()}
        onClick={vi.fn()}
      />
    )

    expectNodeAfter(
      screen.getByRole('button', { name: /hide from graph/i }),
      screen.getByRole('button', { name: /more actions/i })
    )
  })

  it('omits the icon slot when icon is not provided', () => {
    const { container } = renderWithProviders(
      <SidebarTreeRow label="feature" onClick={vi.fn()} />
    )
    expect(container.querySelector('svg')).toBeNull()
    expect(screen.getByRole('button', { name: /feature/i })).toBeInTheDocument()
  })
})

describe('SidebarFolderRow', () => {
  afterEach(() => cleanup())

  it('places the more-actions button after the folder name', () => {
    renderWithProviders(
      <SidebarFolderRow
        name="origin"
        open
        onToggle={vi.fn()}
        menuItems={[{ id: 'a', label: 'Action', onClick: vi.fn() }]}
        openMenu={vi.fn()}
      />
    )

    expectNodeAfter(
      screen.getByRole('button', { name: /^origin$/i }),
      screen.getByRole('button', { name: /more actions/i })
    )
  })

  it('renders a custom folder icon when provided', () => {
    renderWithProviders(
      <SidebarFolderRow
        name="origin"
        open
        onToggle={vi.fn()}
        icon={<span data-testid="custom-folder-icon" />}
      />
    )
    expect(screen.getByTestId('custom-folder-icon')).toBeInTheDocument()
  })
})
