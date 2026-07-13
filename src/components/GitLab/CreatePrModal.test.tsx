/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreatePrModal, MergePrButton } from './CreatePrModal'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'

const mockBranches = [
  { name: 'main', isCurrent: true, isRemote: false, head: 'abc' },
  { name: 'feature', isCurrent: false, isRemote: false, head: 'def' }
]

vi.mock('@/hooks/useGit', () => ({
  useBranches: vi.fn(() => ({
    data: mockBranches,
    isLoading: false
  }))
}))

const showToast = vi.fn()

describe('GitLab CreatePrModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock({
      getSettings: vi.fn(async () => ({
        ...defaultMockSettings,
        aiEnabled: true,
        aiBaseUrl: 'http://localhost:1234'
      })),
      aiFill: vi.fn(async () =>
        JSON.stringify({ title: 'Add feature', body: '## Summary\nDoes things.' })
      )
    })
  })

  it('renders create merge request dialog', () => {
    renderWithProviders(
      <CreatePrModal
        open
        defaultHead="feature"
        defaultBase="main"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('lists local branches in source and target dropdowns', async () => {
    renderWithProviders(
      <CreatePrModal
        open
        defaultHead="feature"
        defaultBase="main"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/^source$/i).querySelectorAll('option')).toHaveLength(2)
    })

    expect(screen.getByLabelText(/^source$/i)).toHaveValue('feature')
    expect(screen.getByLabelText(/^target$/i)).toHaveValue('main')
  })

  it('submits the form with title, body, and selected branches', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(async () => undefined)
    const onClose = vi.fn()

    renderWithProviders(
      <CreatePrModal
        open
        defaultHead="feature"
        defaultBase="main"
        onClose={onClose}
        onSubmit={onSubmit}
      />
    )

    await user.type(screen.getByLabelText(/^title$/i), 'My MR')
    await user.type(screen.getByLabelText(/^description$/i), 'Details here')
    await user.selectOptions(screen.getByLabelText(/^target$/i), 'feature')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'My MR',
        body: 'Details here',
        head: 'feature',
        base: 'feature'
      })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('fills title and body from AI response', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <CreatePrModal
        open
        defaultHead="feature"
        defaultBase="main"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    )

    await waitFor(() => screen.getByRole('button', { name: /fill with ai/i }))
    await user.click(screen.getByRole('button', { name: /fill with ai/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Add feature')).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue(/## Summary/)).toBeInTheDocument()
    expect(window.gitfreddo.aiFill).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'pull_request',
        context: expect.objectContaining({ headBranch: 'feature', baseBranch: 'main' })
      })
    )
  })

  it('does not submit when title is empty', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(async () => undefined)
    renderWithProviders(
      <CreatePrModal
        open
        defaultHead="feature"
        defaultBase="main"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onClose from cancel without submitting', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(
      <CreatePrModal
        open
        defaultHead="feature"
        defaultBase="main"
        onClose={onClose}
        onSubmit={vi.fn(async () => undefined)}
      />
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('includes preferred branches that are not in the branch list', async () => {
    renderWithProviders(
      <CreatePrModal
        open
        defaultHead="orphan-head"
        defaultBase="orphan-base"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/^source$/i).querySelector('option[value="orphan-head"]')).toBeTruthy()
    })
    expect(screen.getByLabelText(/^target$/i).querySelector('option[value="orphan-base"]')).toBeTruthy()
  })

  it('shows toast when AI fill fails', async () => {
    window.gitfreddo.aiFill = vi.fn(async () => {
      throw new Error('ai unavailable')
    })
    const user = userEvent.setup()
    renderWithProviders(
      <CreatePrModal
        open
        defaultHead="feature"
        defaultBase="main"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    )

    await waitFor(() => screen.getByRole('button', { name: /fill with ai/i }))
    await user.click(screen.getByRole('button', { name: /fill with ai/i }))
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('ai unavailable', 'error')
    })
  })
})

describe('MergePrButton', () => {
  afterEach(() => cleanup())

  it('merges with merge, squash, and rebase methods', async () => {
    const user = userEvent.setup()
    const onMerge = vi.fn(async () => undefined)
    renderWithProviders(<MergePrButton onMerge={onMerge} />)

    await user.click(screen.getByRole('button', { name: /^merge$/i }))
    expect(onMerge).toHaveBeenCalledWith('merge')

    await user.click(screen.getByRole('button', { name: /squash/i }))
    expect(onMerge).toHaveBeenCalledWith('squash')

    await user.click(screen.getByRole('button', { name: /^rebase$/i }))
    expect(onMerge).toHaveBeenCalledWith('rebase')
  })
})
