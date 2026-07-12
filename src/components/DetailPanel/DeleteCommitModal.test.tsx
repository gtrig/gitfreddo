/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { DeleteCommitModal } from './DeleteCommitModal'
import type { GitWorkingStatus } from '@/lib/types'

const commit = {
  hash: 'abc1234567890abcdef1234567890abcdef123456',
  shortHash: 'abc1234',
  parents: [],
  subject: 'First commit',
  body: '',
  message: 'First commit',
  author: { name: 'A', email: 'a@test.com', date: '2024-01-01T00:00:00Z' },
  committer: { name: 'A', email: 'a@test.com', date: '2024-01-01T00:00:00Z' },
  refs: [],
  notes: '',
  signature: null,
  stats: null
}

const secondCommit = {
  ...commit,
  hash: 'def4567890abcdef1234567890abcdef1234567890',
  shortHash: 'def4567',
  subject: 'Second commit'
}

const cleanWorking: GitWorkingStatus = {
  branch: 'main',
  ahead: 0,
  behind: 0,
  staged: [],
  unstaged: [],
  untracked: [],
  conflicted: [],
  isClean: true,
  mergeInProgress: false,
  rebaseInProgress: false,
  cherryPickInProgress: false
}

const resetHeadMutate = vi.fn(async () => undefined)
const dropCommitsMutate = vi.fn(async () => undefined)
const revertCommitMutate = vi.fn(async () => undefined)

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    resetHead: { mutateAsync: resetHeadMutate, isPending: false },
    dropCommits: { mutateAsync: dropCommitsMutate, isPending: false },
    revertCommit: { mutateAsync: revertCommitMutate, isPending: false }
  })
}))

vi.mock('@/hooks/useGit', () => ({
  useWorkingStatus: vi.fn(() => ({
    data: cleanWorking,
    isLoading: false,
    error: null
  }))
}))

import * as git from '@/hooks/useGit'

describe('DeleteCommitModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.clearAllMocks()
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(git.useWorkingStatus).mockReturnValue({
      data: cleanWorking,
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useWorkingStatus>)
  })

  it('renders delete commit dialog for drop action', () => {
    renderWithProviders(
      <DeleteCommitModal open action="drop" commits={[commit]} ahead={0} onClose={vi.fn()} />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('First commit')).toBeInTheDocument()
  })

  it('drops a single commit on confirm', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <DeleteCommitModal open action="drop" commits={[commit]} ahead={0} onClose={onClose} />
    )

    await userEvent.click(screen.getByRole('button', { name: /drop commit/i }))
    await waitFor(() => {
      expect(dropCommitsMutate).toHaveBeenCalledWith({ hashes: [commit.hash] })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('drops multiple commits on confirm', async () => {
    renderWithProviders(
      <DeleteCommitModal
        open
        action="drop"
        commits={[commit, secondCommit]}
        ahead={0}
        onClose={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /drop 2 commits/i }))
    await waitFor(() => {
      expect(dropCommitsMutate).toHaveBeenCalledWith({
        hashes: [commit.hash, secondCommit.hash]
      })
    })
  })

  it('reverts a commit on confirm', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <DeleteCommitModal open action="revert" commits={[commit]} ahead={0} onClose={onClose} />
    )

    await userEvent.click(screen.getByRole('button', { name: /revert commit/i }))
    await waitFor(() => {
      expect(revertCommitMutate).toHaveBeenCalledWith({ hash: commit.hash })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('resets HEAD with selected mode for deleteHead action', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <DeleteCommitModal
        open
        action="deleteHead"
        commits={[commit]}
        ahead={0}
        onClose={onClose}
        initialMode="soft"
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /delete commit/i }))
    await waitFor(() => {
      expect(resetHeadMutate).toHaveBeenCalledWith({ mode: 'soft' })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows remote warning when commits are ahead of upstream', () => {
    renderWithProviders(
      <DeleteCommitModal open action="drop" commits={[commit]} ahead={3} onClose={vi.fn()} />
    )

    expect(screen.getByText(/3 commit/i)).toBeInTheDocument()
  })

  it('does not show remote warning for revert action', () => {
    renderWithProviders(
      <DeleteCommitModal open action="revert" commits={[commit]} ahead={3} onClose={vi.fn()} />
    )

    expect(screen.queryByText(/ahead of its remote/i)).not.toBeInTheDocument()
  })

  it('blocks rewrite when the working tree is dirty', () => {
    vi.mocked(git.useWorkingStatus).mockReturnValue({
      data: { ...cleanWorking, isClean: false, unstaged: [{ path: 'file.txt', status: 'modified' }] },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useWorkingStatus>)

    renderWithProviders(
      <DeleteCommitModal open action="drop" commits={[commit]} ahead={0} onClose={vi.fn()} />
    )

    expect(screen.getByText(/commit or stash/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /drop commit/i })).toBeDisabled()
  })

  it('blocks hard deleteHead when the working tree is dirty', () => {
    vi.mocked(git.useWorkingStatus).mockReturnValue({
      data: { ...cleanWorking, isClean: false, unstaged: [{ path: 'file.txt', status: 'modified' }] },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useWorkingStatus>)

    renderWithProviders(
      <DeleteCommitModal
        open
        action="deleteHead"
        commits={[commit]}
        ahead={0}
        onClose={vi.fn()}
        initialMode="hard"
      />
    )

    expect(screen.getByRole('button', { name: /delete commit/i })).toBeDisabled()
  })

  it('allows soft deleteHead when the working tree is dirty', async () => {
    vi.mocked(git.useWorkingStatus).mockReturnValue({
      data: { ...cleanWorking, isClean: false, unstaged: [{ path: 'file.txt', status: 'modified' }] },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useWorkingStatus>)

    renderWithProviders(
      <DeleteCommitModal
        open
        action="deleteHead"
        commits={[commit]}
        ahead={0}
        onClose={vi.fn()}
        initialMode="soft"
      />
    )

    expect(screen.getByRole('button', { name: /delete commit/i })).not.toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /delete commit/i }))
    await waitFor(() => {
      expect(resetHeadMutate).toHaveBeenCalledWith({ mode: 'soft' })
    })
  })
})
