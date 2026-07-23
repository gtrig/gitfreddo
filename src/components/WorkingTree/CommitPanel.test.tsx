/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommitPanel } from './CommitPanel'
import { useWorkspaceStore } from '@/stores/workspace'
import { COMMIT_PANEL_DEFAULT, useLayoutStore } from '@/stores/layout'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import type { GitWorkingStatus } from '@/lib/types'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useLogGraph, useRepoStatus } from '@/hooks/useGit'

const commitMutate = vi.fn(async () => undefined)
const stageAddMutate = vi.fn(async () => undefined)
const stashPushMutate = vi.fn(async () => undefined)
const pushRemote = vi.fn()
const aiFillMutate = vi.fn(async () => 'feat: filled\n\nBody text')
const showToast = vi.fn()

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    commit: { mutateAsync: commitMutate, isPending: false },
    stageAdd: { mutateAsync: stageAddMutate, isPending: false },
    stashPush: { mutateAsync: stashPushMutate, isPending: false }
  })
}))

vi.mock('@/hooks/usePushRemote', () => ({
  usePushRemote: () => ({
    pushRemote,
    isPushPending: false,
    forceConfirm: null,
    confirmForcePush: vi.fn(),
    cancelForcePush: vi.fn()
  })
}))

vi.mock('@/hooks/useAppSettings', () => ({
  useAiEnabled: vi.fn(() => true),
  useResolvedRemote: vi.fn(() => 'origin')
}))

vi.mock('@/hooks/useAiFill', () => ({
  useAiFill: () => ({
    mutateAsync: aiFillMutate,
    isPending: false
  })
}))

const headHash = 'abc123def4567890123456789012345678901234'
const mainTipHash = 'fff999aaa888777666555444333222111000ffff'

const defaultGraphCommits = [
  {
    hash: headHash,
    subject: 'Previous subject',
    message: 'Previous subject\n\nPrevious body',
    parents: [] as string[]
  }
]

vi.mock('@/hooks/useGit', () => ({
  useLogGraph: vi.fn(() => ({
    data: {
      commits: defaultGraphCommits,
      refs: []
    }
  })),
  useRepoStatus: vi.fn(() => ({
    data: { head: headHash, branch: 'main', isDetached: false, root: '/tmp/repo' }
  }))
}))

vi.mock('@/components/WorkingTree/ComposeCommitsModal', () => ({
  ComposeCommitsModal: ({
    open,
    onUseInPanel
  }: {
    open: boolean
    onUseInPanel: (proposal: { summary: string; description: string }) => void
  }) =>
    open ? (
      <div role="dialog">
        <button
          type="button"
          onClick={() => onUseInPanel({ summary: 'From modal', description: 'Modal body' })}
        >
          Use proposal
        </button>
      </div>
    ) : null
}))

vi.mock('@/components/Stash/StashPushModal', () => ({
  StashPushModal: ({ open }: { open: boolean }) => (open ? <div role="dialog">Stash modal</div> : null)
}))

const emptyWorking: GitWorkingStatus = {
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

function primaryButton() {
  return screen
    .getAllByRole('button')
    .find((button) => button.className.includes('emerald-600'))
}

describe('CommitPanel', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    commitMutate.mockClear()
    stageAddMutate.mockClear()
    stashPushMutate.mockClear()
    pushRemote.mockClear()
    aiFillMutate.mockClear()
    showToast.mockClear()
    vi.mocked(useAiEnabled).mockReturnValue(true)
    vi.mocked(useLogGraph).mockReturnValue({
      data: { commits: defaultGraphCommits, refs: [] }
    } as unknown as ReturnType<typeof useLogGraph>)
    vi.mocked(useRepoStatus).mockReturnValue({
      data: { head: headHash, branch: 'main', isDetached: false, root: '/tmp/repo' }
    } as unknown as ReturnType<typeof useRepoStatus>)

    useLayoutStore.setState({ commitPanelHeight: COMMIT_PANEL_DEFAULT })
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'config.get') return null
      if (method === 'branch.list') return []
      if (method === 'remote.list') return []
      if (method === 'log.graph') return { commits: [], refs: [] }
      return {}
    })
  })

  it('disables commit when summary is empty', () => {
    renderWithProviders(<CommitPanel working={emptyWorking} />)
    expect(primaryButton()).toBeDisabled()
  })

  it('sizes the description field from the resizable commit panel height', () => {
    useLayoutStore.setState({ commitPanelHeight: 320 })
    const view = renderWithProviders(<CommitPanel working={emptyWorking} />)
    expect(view.getByTestId('commit-panel')).toHaveStyle({ height: '320px' })
    expect(view.getByPlaceholderText('Description')).toHaveClass('flex-1')
  })

  it('enables commit when summary is provided and files are staged', async () => {
    const stagedWorking: GitWorkingStatus = {
      ...emptyWorking,
      staged: [{ path: 'ready.txt', status: 'added' }]
    }
    renderWithProviders(<CommitPanel working={stagedWorking} />)
    await userEvent.type(screen.getByPlaceholderText('Commit summary'), 'feat: add tests')
    expect(primaryButton()).toBeEnabled()
  })

  it('stages all unstaged files when the primary action is clicked', async () => {
    renderWithProviders(
      <CommitPanel
        working={{
          ...emptyWorking,
          isClean: false,
          unstaged: [{ path: 'dirty.txt', status: 'modified' }]
        }}
      />
    )

    await userEvent.click(primaryButton()!)
    expect(stageAddMutate).toHaveBeenCalledWith({ paths: [] })
  })

  it('commits staged changes and clears the form', async () => {
    renderWithProviders(
      <CommitPanel
        working={{
          ...emptyWorking,
          staged: [{ path: 'ready.txt', status: 'added' }]
        }}
      />
    )

    await userEvent.type(screen.getByPlaceholderText('Commit summary'), 'feat: ship it')
    await userEvent.click(primaryButton()!)

    await waitFor(() => {
      expect(commitMutate).toHaveBeenCalledWith({
        message: 'feat: ship it',
        amend: false
      })
    })
    expect(screen.getByPlaceholderText('Commit summary')).toHaveValue('')
  })

  it('seeds amend fields from the current HEAD commit', async () => {
    renderWithProviders(
      <CommitPanel
        working={{
          ...emptyWorking,
          staged: [{ path: 'ready.txt', status: 'modified' }]
        }}
      />
    )

    await userEvent.click(screen.getByRole('checkbox', { name: /amend previous commit/i }))
    expect(screen.getByPlaceholderText('Commit summary')).toHaveValue('Previous subject')
    expect(screen.getByPlaceholderText('Description')).toHaveValue('Previous body')
  })

  it('seeds amend from HEAD when the graph tip is a newer commit on another branch', async () => {
    vi.mocked(useLogGraph).mockReturnValue({
      data: {
        commits: [
          {
            hash: mainTipHash,
            subject: 'Main tip subject',
            message: 'Main tip subject\n\nMain tip body',
            parents: [headHash]
          },
          {
            hash: headHash,
            subject: 'Feature tip subject',
            message: 'Feature tip subject\n\nFeature tip body',
            parents: []
          }
        ],
        refs: []
      }
    } as unknown as ReturnType<typeof useLogGraph>)
    vi.mocked(useRepoStatus).mockReturnValue({
      data: { head: headHash, branch: 'feature', isDetached: false, root: '/tmp/repo' }
    } as unknown as ReturnType<typeof useRepoStatus>)

    renderWithProviders(
      <CommitPanel
        working={{
          ...emptyWorking,
          branch: 'feature',
          staged: [{ path: 'ready.txt', status: 'modified' }]
        }}
      />
    )

    await userEvent.click(screen.getByRole('checkbox', { name: /amend previous commit/i }))
    expect(screen.getByPlaceholderText('Commit summary')).toHaveValue('Feature tip subject')
    expect(screen.getByPlaceholderText('Description')).toHaveValue('Feature tip body')
  })

  it('pushes after commit when the option is enabled', async () => {
    renderWithProviders(
      <CommitPanel
        working={{
          ...emptyWorking,
          staged: [{ path: 'ready.txt', status: 'added' }]
        }}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /commit options/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /push after commit/i }))
    await userEvent.type(screen.getByPlaceholderText('Commit summary'), 'feat: push')
    await userEvent.click(primaryButton()!)

    await waitFor(() => {
      expect(pushRemote).toHaveBeenCalledWith({ remote: 'origin' })
    })
  })

  it('signs commits when the sign option is checked', async () => {
    renderWithProviders(
      <CommitPanel
        working={{
          ...emptyWorking,
          staged: [{ path: 'ready.txt', status: 'added' }]
        }}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /commit options/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /sign commit/i }))
    await userEvent.type(screen.getByPlaceholderText('Commit summary'), 'feat: signed')
    await userEvent.click(primaryButton()!)

    await waitFor(() => {
      expect(commitMutate).toHaveBeenCalledWith({
        message: 'feat: signed',
        amend: false,
        sign: true
      })
    })
  })

  it('enables GPG signing from repository config', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'config.get') return 'true'
      return {}
    })

    renderWithProviders(
      <CommitPanel
        working={{
          ...emptyWorking,
          staged: [{ path: 'ready.txt', status: 'added' }]
        }}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /commit options/i }))
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /sign commit/i })).toBeChecked()
    })
  })

  it('opens the stash modal when there are changes', async () => {
    renderWithProviders(
      <CommitPanel
        working={{
          ...emptyWorking,
          isClean: false,
          unstaged: [{ path: 'dirty.txt', status: 'modified' }]
        }}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /create stash/i }))
    expect(screen.getByText('Stash modal')).toBeInTheDocument()
  })

  it('shows a toast when stashing with no changes', async () => {
    renderWithProviders(<CommitPanel working={emptyWorking} />)
    expect(screen.getByRole('button', { name: /create stash/i })).toBeDisabled()
  })

  it('fills the summary with AI', async () => {
    renderWithProviders(
      <CommitPanel
        working={{
          ...emptyWorking,
          isClean: false,
          unstaged: [{ path: 'dirty.txt', status: 'modified' }]
        }}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /fill summary/i }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Commit summary')).toHaveValue('feat: filled')
      expect(screen.getByPlaceholderText('Description')).toHaveValue('Body text')
    })
  })

  it('opens compose commits modal from AI', async () => {
    aiFillMutate.mockResolvedValueOnce(
      JSON.stringify([{ message: 'feat: auth\n\nLogin flow.', files: ['src/auth.ts'] }])
    )

    renderWithProviders(
      <CommitPanel
        working={{
          ...emptyWorking,
          staged: [{ path: 'src/auth.ts', status: 'added' }]
        }}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /compose commits/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('uses a compose proposal in the panel', async () => {
    aiFillMutate.mockResolvedValueOnce(
      JSON.stringify([{ message: 'feat: auth', files: ['src/auth.ts'] }])
    )

    renderWithProviders(
      <CommitPanel
        working={{
          ...emptyWorking,
          staged: [{ path: 'src/auth.ts', status: 'added' }]
        }}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /compose commits/i }))
    await userEvent.click(screen.getByRole('button', { name: /use proposal/i }))
    expect(screen.getByPlaceholderText('Commit summary')).toHaveValue('From modal')
  })

  it('collapses and expands the commit section', async () => {
    renderWithProviders(<CommitPanel working={emptyWorking} />)
    const panel = screen.getByTestId('commit-panel')
    expect(screen.getByPlaceholderText('Commit summary')).toBeInTheDocument()

    await userEvent.click(within(panel).getAllByRole('button', { name: 'Commit' })[0]!)
    expect(screen.queryByPlaceholderText('Commit summary')).not.toBeInTheDocument()

    await userEvent.click(within(panel).getAllByRole('button', { name: 'Commit' })[0]!)
    expect(screen.getByPlaceholderText('Commit summary')).toBeInTheDocument()
  })

  it('shows an error toast when AI fill fails', async () => {
    aiFillMutate.mockRejectedValueOnce(new Error('AI unavailable'))
    renderWithProviders(
      <CommitPanel
        working={{
          ...emptyWorking,
          staged: [{ path: 'ready.txt', status: 'added' }]
        }}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /fill summary/i }))
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('AI unavailable', 'error')
    })
  })
})
