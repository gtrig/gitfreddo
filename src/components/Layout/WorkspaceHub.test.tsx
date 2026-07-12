/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkspaceHub } from './WorkspaceHub'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * estimateSize(),
        size: estimateSize()
      })),
    getTotalSize: () => count * estimateSize(),
    measureElement: vi.fn()
  }))
}))

describe('WorkspaceHub', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock({
      getRecentRepos: vi.fn(async () => ['/tmp/recent-repo', '/other/project']),
      openWorkspace: vi.fn(async () => '/tmp/picked'),
      initRepository: vi.fn(async () => '/tmp/new-repo'),
      cloneRepository: vi.fn(async () => '/tmp/cloned'),
      pickDirectory: vi.fn(async () => '/tmp/clone-parent')
    })
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

  it('initializes a new repository', async () => {
    const onOpen = vi.fn(async () => undefined)
    renderWithProviders(<WorkspaceHub variant="page" onOpen={onOpen} />)

    await userEvent.click(screen.getByRole('button', { name: /initialize a new repository/i }))
    await waitFor(() => {
      expect(window.gitfreddo.initRepository).toHaveBeenCalled()
      expect(onOpen).toHaveBeenCalledWith('/tmp/new-repo')
    })
  })

  it('filters recent repositories by search query', async () => {
    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)

    await screen.findByRole('button', { name: /recent-repo/i })
    await userEvent.type(screen.getByPlaceholderText(/filter recent repositories/i), 'other')
    expect(screen.getByRole('button', { name: /project/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /recent-repo/i })).not.toBeInTheDocument()
  })

  it('opens a recent repository from the list', async () => {
    const onOpen = vi.fn(async () => undefined)
    renderWithProviders(<WorkspaceHub variant="page" onOpen={onOpen} />)

    await userEvent.click(await screen.findByRole('button', { name: /recent-repo/i }))
    expect(onOpen).toHaveBeenCalledWith('/tmp/recent-repo')
  })
})
