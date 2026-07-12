/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkspaceHub } from './WorkspaceHub'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

describe('WorkspaceHub', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.getRecentRepos).mockResolvedValue(['/tmp/recent-repo'])
    vi.mocked(window.gitfreddo.openWorkspace).mockResolvedValue('/tmp/picked')
    vi.mocked(window.gitfreddo.initRepository).mockResolvedValue('/tmp/new-repo')
    vi.mocked(window.gitfreddo.cloneRepository).mockResolvedValue('/tmp/cloned')
  })

  it('renders open-repo action cards on page variant', () => {
    renderWithProviders(
      <WorkspaceHub variant="page" onOpen={async () => undefined} />
    )
    expect(screen.getByText('Open a folder')).toBeInTheDocument()
    expect(screen.getByText('Initialize a new repository')).toBeInTheDocument()
    expect(screen.getByText('Clone a repository')).toBeInTheDocument()
    expect(screen.getByText('Create on GitHub')).toBeInTheDocument()
  })

  it('renders modal variant with close action', () => {
    renderWithProviders(
      <WorkspaceHub variant="modal" open onOpen={async () => undefined} onClose={() => undefined} />
    )
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('navigates clone flow', async () => {
    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)

    await userEvent.click(screen.getAllByText('Clone a repository')[0]!)
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getAllByText('Open a folder').length).toBeGreaterThan(0)
  })

  it('opens a folder from the hub', async () => {
    const onOpen = vi.fn(async () => undefined)
    renderWithProviders(<WorkspaceHub variant="page" onOpen={onOpen} />)

    await userEvent.click(screen.getAllByText('Open a folder')[0]!)
    expect(window.gitfreddo.openWorkspace).toHaveBeenCalled()
  })
})
