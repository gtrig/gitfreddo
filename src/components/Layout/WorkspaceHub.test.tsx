/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkspaceHub } from './WorkspaceHub'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@/components/GitHub/RepoPicker', () => ({
  RepoPicker: ({
    onSelect
  }: {
    onSelect: (repo: { fullName: string; cloneUrl: string }) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({ fullName: 'octo/repo', cloneUrl: 'https://github.com/octo/repo.git' })
      }
    >
      Pick GitHub repo
    </button>
  )
}))

vi.mock('@/components/Bitbucket/RepoPicker', () => ({
  RepoPicker: ({
    onSelect
  }: {
    onSelect: (repo: { fullName: string; cloneUrl: string }) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({
          fullName: 'team/repo',
          cloneUrl: 'https://bitbucket.org/team/repo.git'
        })
      }
    >
      Pick Bitbucket repo
    </button>
  )
}))

vi.mock('@/components/GitHub/CreateGitHubRepoModal', () => ({
  CreateGitHubRepoModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Create GitHub repo</div> : null
}))

vi.mock('@/components/Bitbucket/CreateBitbucketRepoModal', () => ({
  CreateBitbucketRepoModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Create Bitbucket repo</div> : null
}))

vi.mock('@/components/GitHub/ForkGitHubRepoModal', () => ({
  ForkGitHubRepoModal: ({
    open,
    onForked
  }: {
    open: boolean
    onForked: (repo: { cloneUrl: string }) => void
  }) =>
    open ? (
      <div role="dialog">
        Fork GitHub repo
        <button type="button" onClick={() => onForked({ cloneUrl: 'https://github.com/me/fork.git' })}>
          Fork
        </button>
      </div>
    ) : null
}))

vi.mock('@/components/Bitbucket/ForkBitbucketRepoModal', () => ({
  ForkBitbucketRepoModal: ({
    open,
    onForked
  }: {
    open: boolean
    onForked: (repo: { cloneUrl: string }) => void
  }) =>
    open ? (
      <div role="dialog">
        Fork Bitbucket repo
        <button
          type="button"
          onClick={() => onForked({ cloneUrl: 'https://bitbucket.org/me/fork.git' })}
        >
          Fork
        </button>
      </div>
    ) : null
}))

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

  it('clones a repository from a URL', async () => {
    const onOpen = vi.fn(async () => undefined)
    renderWithProviders(<WorkspaceHub variant="page" onOpen={onOpen} />)

    await userEvent.click(screen.getAllByText('Clone a repository')[0]!)
    await userEvent.type(
      screen.getByLabelText(/repository url/i),
      'https://github.com/octo/demo.git'
    )
    await userEvent.click(screen.getByRole('button', { name: /^clone$/i }))

    await waitFor(() => {
      expect(window.gitfreddo.cloneRepository).toHaveBeenCalledWith(
        'https://github.com/octo/demo.git',
        '/tmp'
      )
      expect(onOpen).toHaveBeenCalledWith('/tmp/cloned')
    })
  })

  it('validates clone form inputs', async () => {
    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)

    await userEvent.click(screen.getAllByText('Clone a repository')[0]!)
    await userEvent.click(screen.getByRole('button', { name: /^clone$/i }))
    expect(screen.getByText(/enter a repository url/i)).toBeInTheDocument()
  })

  it('requires a parent folder when recents are empty', async () => {
    window.gitfreddo = createGitFreddoMock({
      getRecentRepos: vi.fn(async () => []),
      pickDirectory: vi.fn(async () => '/tmp/clone-parent')
    })

    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)

    await userEvent.click(screen.getAllByText('Clone a repository')[0]!)
    await userEvent.type(
      screen.getByLabelText(/repository url/i),
      'https://github.com/octo/demo.git'
    )
    await userEvent.click(screen.getByRole('button', { name: /^clone$/i }))
    expect(screen.getByText(/choose a parent folder first/i)).toBeInTheDocument()
  })

  it('picks a clone parent folder', async () => {
    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)

    await userEvent.click(screen.getAllByText('Clone a repository')[0]!)
    await userEvent.click(screen.getByRole('button', { name: /browse/i }))
    expect(window.gitfreddo.pickDirectory).toHaveBeenCalled()
  })

  it('opens create-on-GitHub modal from the hub', async () => {
    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /create on github/i }))
    expect(screen.getByText('Create GitHub repo')).toBeInTheDocument()
  })

  it('opens create-on-Bitbucket modal from the hub', async () => {
    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /create on bitbucket/i }))
    expect(screen.getByText('Create Bitbucket repo')).toBeInTheDocument()
  })

  it('clones from the GitHub picker tab', async () => {
    const onOpen = vi.fn(async () => undefined)
    renderWithProviders(<WorkspaceHub variant="page" onOpen={onOpen} />)

    await userEvent.click(screen.getAllByText('Clone a repository')[0]!)
    await userEvent.click(screen.getByRole('button', { name: /^github$/i }))
    await userEvent.click(screen.getByRole('button', { name: /pick github repo/i }))
    await userEvent.click(screen.getByRole('button', { name: /^clone$/i }))

    await waitFor(() => {
      expect(window.gitfreddo.cloneRepository).toHaveBeenCalledWith(
        'https://github.com/octo/repo.git',
        '/tmp'
      )
    })
  })

  it('closes the modal variant on Escape', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <WorkspaceHub variant="modal" open onOpen={vi.fn()} onClose={onClose} />
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows no matches when recent filter excludes all repos', async () => {
    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)

    await screen.findByRole('button', { name: /recent-repo/i })
    await userEvent.type(screen.getByPlaceholderText(/filter recent repositories/i), 'zzzzz')
    expect(screen.getByText(/no repositories match your filter/i)).toBeInTheDocument()
  })

  it('returns null when modal variant is closed', () => {
    const { container } = renderWithProviders(
      <WorkspaceHub variant="modal" open={false} onOpen={vi.fn()} onClose={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('closes modal variant from the close button', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <WorkspaceHub variant="modal" open onOpen={vi.fn()} onClose={onClose} />
    )
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows no recents message when history is empty', async () => {
    window.gitfreddo = createGitFreddoMock({
      getRecentRepos: vi.fn(async () => [])
    })
    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)
    expect(await screen.findByText(/no recent repositories/i)).toBeInTheDocument()
  })

  it('shows predicted clone folder name', async () => {
    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)
    await userEvent.click(screen.getAllByText('Clone a repository')[0]!)
    await userEvent.type(
      screen.getByLabelText(/repository url/i),
      'https://github.com/octo/demo.git'
    )
    expect(screen.getByText(/will create/i)).toBeInTheDocument()
  })

  it('opens fork dialog for GitHub URLs', async () => {
    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)
    await userEvent.click(screen.getAllByText('Clone a repository')[0]!)
    await userEvent.type(
      screen.getByLabelText(/repository url/i),
      'https://github.com/octo/demo.git'
    )
    await userEvent.click(screen.getByRole('button', { name: /fork to my account/i }))
    expect(screen.getByText('Fork GitHub repo')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^fork$/i }))
    expect(screen.getByLabelText(/repository url/i)).toHaveValue('https://github.com/me/fork.git')
  })

  it('clones from the Bitbucket picker tab', async () => {
    const onOpen = vi.fn(async () => undefined)
    renderWithProviders(<WorkspaceHub variant="page" onOpen={onOpen} />)

    await userEvent.click(screen.getAllByText('Clone a repository')[0]!)
    await userEvent.click(screen.getByRole('button', { name: /^bitbucket$/i }))
    await userEvent.click(screen.getByRole('button', { name: /pick bitbucket repo/i }))
    await userEvent.click(screen.getByRole('button', { name: /^clone$/i }))

    await waitFor(() => {
      expect(window.gitfreddo.cloneRepository).toHaveBeenCalledWith(
        'https://bitbucket.org/team/repo.git',
        '/tmp'
      )
    })
  })

  it('opens create repo modal from clone GitHub tab', async () => {
    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)
    await userEvent.click(screen.getAllByText('Clone a repository')[0]!)
    await userEvent.click(screen.getByRole('button', { name: /^github$/i }))
    await userEvent.click(screen.getByRole('button', { name: /create new repository/i }))
    expect(screen.getByText('Create GitHub repo')).toBeInTheDocument()
  })

  it('virtualizes very large recent repository lists', async () => {
    window.gitfreddo = createGitFreddoMock({
      getRecentRepos: vi.fn(async () =>
        Array.from({ length: 55 }, (_, index) => `/tmp/repo-${index}`)
      )
    })
    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)
    expect(await screen.findByRole('button', { name: /repo-0/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /repo-54/i })).toBeInTheDocument()
  })

  it('surfaces errors from open folder, init, clone, and recent actions', async () => {
    window.gitfreddo = createGitFreddoMock({
      getRecentRepos: vi.fn(async () => ['/tmp/recent-repo']),
      openWorkspace: vi.fn(async () => {
        throw new Error('Open failed')
      }),
      initRepository: vi.fn(async () => {
        throw new Error('Init failed')
      }),
      cloneRepository: vi.fn(async () => {
        throw new Error('Clone failed')
      })
    })
    const onOpen = vi.fn(async () => {
      throw new Error('Recent failed')
    })

    renderWithProviders(<WorkspaceHub variant="page" onOpen={onOpen} />)

    await userEvent.click(screen.getAllByText('Open a folder')[0]!)
    expect(await screen.findByText('Open failed')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /initialize a new repository/i }))
    expect(await screen.findByText('Init failed')).toBeInTheDocument()

    await userEvent.click(screen.getAllByText('Clone a repository')[0]!)
    await userEvent.type(
      screen.getByLabelText(/repository url/i),
      'https://github.com/octo/demo.git'
    )
    await userEvent.click(screen.getByRole('button', { name: /^clone$/i }))
    expect(await screen.findByText('Clone failed')).toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: /recent-repo/i }))
    expect(await screen.findByText('Recent failed')).toBeInTheDocument()
  })

  it('validates repo selection on forge clone tabs', async () => {
    renderWithProviders(<WorkspaceHub variant="page" onOpen={vi.fn()} />)
    await userEvent.click(screen.getAllByText('Clone a repository')[0]!)
    await userEvent.click(screen.getByRole('button', { name: /^github$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^clone$/i }))
    expect(screen.getByText(/select a repository/i)).toBeInTheDocument()
  })
})
