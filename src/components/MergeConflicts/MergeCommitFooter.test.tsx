/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MergeCommitFooter } from './MergeCommitFooter'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import type { GitMergeStatus } from '@/lib/types'

const mergeContinue = { mutateAsync: vi.fn(async () => undefined), isPending: false }
const mergeAbort = { mutateAsync: vi.fn(async () => undefined), isPending: false }
const rebaseContinue = { mutateAsync: vi.fn(async () => undefined), isPending: false }
const rebaseAbort = { mutateAsync: vi.fn(async () => undefined), isPending: false }
const rebaseSkip = { mutateAsync: vi.fn(async () => undefined), isPending: false }
const cherryPickContinue = { mutateAsync: vi.fn(async () => undefined), isPending: false }
const cherryPickAbort = { mutateAsync: vi.fn(async () => undefined), isPending: false }
const cherryPickSkip = { mutateAsync: vi.fn(async () => undefined), isPending: false }
const showToast = vi.fn()

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    mergeContinue,
    mergeAbort,
    rebaseContinue,
    rebaseAbort,
    rebaseSkip,
    cherryPickContinue,
    cherryPickAbort,
    cherryPickSkip
  })
}))

function renderFooter(
  mergeStatus: GitMergeStatus,
  conflictedCount = 0
) {
  return renderWithProviders(
    <MergeCommitFooter mergeStatus={mergeStatus} conflictedCount={conflictedCount} />
  )
}

const mergeStatus: GitMergeStatus = {
  inProgress: true,
  kind: 'merge',
  conflictedPaths: [],
  currentBranch: 'main',
  incomingLabel: 'feature'
}

describe('MergeCommitFooter', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.clearAllMocks()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
  })

  it('renders complete merge button and default subject for merge', () => {
    renderFooter(mergeStatus)
    expect(screen.getByRole('button', { name: /complete merge/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue(/Merge branch 'feature'/)).toBeInTheDocument()
  })

  it('continues merge with summary and description', async () => {
    const user = userEvent.setup()
    renderFooter(mergeStatus)

    await user.clear(screen.getByPlaceholderText(/merge commit subject/i))
    await user.type(screen.getByPlaceholderText(/merge commit subject/i), 'Merge feature')
    await user.type(screen.getByRole('textbox', { name: /description/i }), 'Brings in feature work')
    await user.click(screen.getByRole('button', { name: /complete merge/i }))

    await waitFor(() => {
      expect(mergeContinue.mutateAsync).toHaveBeenCalledWith({
        message: 'Merge feature\n\nBrings in feature work'
      })
    })
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/continued/i), 'success')
  })

  it('shows error toast when continuing without a commit summary', async () => {
    const user = userEvent.setup()
    renderFooter(mergeStatus)

    await user.clear(screen.getByPlaceholderText(/merge commit subject/i))
    await user.click(screen.getByRole('button', { name: /complete merge/i }))

    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/summary/i), 'error')
    expect(mergeContinue.mutateAsync).not.toHaveBeenCalled()
  })

  it('disables continue while conflicts remain', () => {
    renderFooter(mergeStatus, 2)
    expect(screen.getByRole('button', { name: /resolve conflicts to continue/i })).toBeDisabled()
  })

  it('aborts an in-progress merge', async () => {
    const user = userEvent.setup()
    renderFooter(mergeStatus)

    await user.click(screen.getByRole('button', { name: /abort merge/i }))
    await waitFor(() => expect(mergeAbort.mutateAsync).toHaveBeenCalledWith({}))
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/aborted/i), 'success')
  })

  it('continues, skips, and aborts a rebase', async () => {
    const user = userEvent.setup()
    renderFooter(
      {
        inProgress: true,
        kind: 'rebase',
        conflictedPaths: [],
        currentBranch: 'main',
        incomingLabel: 'feature'
      },
      0
    )

    expect(screen.getByRole('button', { name: /continue rebase/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /continue rebase/i }))
    expect(rebaseContinue.mutateAsync).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /^skip$/i }))
    expect(rebaseSkip.mutateAsync).toHaveBeenCalledWith({})

    await user.click(screen.getByRole('button', { name: /abort rebase/i }))
    expect(rebaseAbort.mutateAsync).toHaveBeenCalledWith({})
  })

  it('continues, skips, and aborts a cherry-pick', async () => {
    const user = userEvent.setup()
    renderFooter(
      {
        inProgress: true,
        kind: 'cherry-pick',
        conflictedPaths: [],
        currentBranch: 'main'
      },
      0
    )

    expect(screen.getByRole('button', { name: /continue cherry-pick/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /continue cherry-pick/i }))
    expect(cherryPickContinue.mutateAsync).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /^skip$/i }))
    expect(cherryPickSkip.mutateAsync).toHaveBeenCalledWith({})

    await user.click(screen.getByRole('button', { name: /abort cherry-pick/i }))
    expect(cherryPickAbort.mutateAsync).toHaveBeenCalledWith({})
  })

  it('does not show skip for merge operations', () => {
    renderFooter(mergeStatus)
    expect(screen.queryByRole('button', { name: /^skip$/i })).not.toBeInTheDocument()
  })

  it('prefills summary and description from merge message', () => {
    renderFooter({
      ...mergeStatus,
      mergeMessage: 'Merge branch\n\nDetailed body'
    })
    expect(screen.getByDisplayValue('Merge branch')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Detailed body')).toBeInTheDocument()
  })

  it('collapses and expands the commit form', async () => {
    const user = userEvent.setup()
    renderFooter(mergeStatus)

    expect(screen.getByPlaceholderText(/merge commit subject/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /commit/i }))
    expect(screen.queryByPlaceholderText(/merge commit subject/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /commit/i }))
    expect(screen.getByPlaceholderText(/merge commit subject/i)).toBeInTheDocument()
  })

  it('shows error toast when continue mutation fails', async () => {
    mergeContinue.mutateAsync.mockRejectedValueOnce(new Error('merge failed'))
    const user = userEvent.setup()
    renderFooter(mergeStatus)

    await user.click(screen.getByRole('button', { name: /complete merge/i }))
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('merge failed', 'error')
    })
  })
})
