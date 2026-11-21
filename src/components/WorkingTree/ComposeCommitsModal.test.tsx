/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { ComposeCommitsModal } from './ComposeCommitsModal'

const commitMutate = vi.fn(async () => undefined)
const stageAddMutate = vi.fn(async () => undefined)
const stageResetMutate = vi.fn(async () => undefined)
const composeMutate = vi.fn(async () => ({ created: 2 }))

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    commit: { mutateAsync: commitMutate, isPending: false },
    stageAdd: { mutateAsync: stageAddMutate, isPending: false },
    stageReset: { mutateAsync: stageResetMutate, isPending: false },
    composeCommits: { mutateAsync: composeMutate, isPending: false }
  })
}))

const proposals = [
  {
    summary: 'Add feature',
    description: 'Details here',
    files: ['src/a.ts', 'src/b.ts']
  },
  {
    summary: 'Fix bug',
    description: '',
    files: ['src/c.ts']
  }
]

describe('ComposeCommitsModal', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    commitMutate.mockClear()
    stageAddMutate.mockClear()
    stageResetMutate.mockClear()
    composeMutate.mockClear()
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
  })

  it('renders dialog', () => {
    renderWithProviders(<ComposeCommitsModal open proposals={[]} onClose={vi.fn()} onUseInPanel={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('lists proposal files and allows editing summaries', async () => {
    renderWithProviders(
      <ComposeCommitsModal open proposals={proposals} onClose={vi.fn()} onUseInPanel={vi.fn()} />
    )

    expect(screen.getByText('src/a.ts')).toBeInTheDocument()
    expect(screen.getByText('src/c.ts')).toBeInTheDocument()

    const summaryInputs = screen.getAllByPlaceholderText(/commit summary/i)
    await userEvent.clear(summaryInputs[0]!)
    await userEvent.type(summaryInputs[0]!, 'Updated summary')
    expect(summaryInputs[0]).toHaveValue('Updated summary')
  })

  it('creates all commits when create button is clicked', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <ComposeCommitsModal open proposals={proposals} onClose={onClose} onUseInPanel={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: /create 2 commit/i }))
    await waitFor(() => {
      expect(composeMutate).toHaveBeenCalledWith({
        proposals: [
          { files: ['src/a.ts', 'src/b.ts'], message: 'Add feature\n\nDetails here' },
          { files: ['src/c.ts'], message: 'Fix bug' }
        ]
      })
    })
    // Building commits from the index keeps partial staging; never reset + re-add.
    expect(stageResetMutate).not.toHaveBeenCalled()
    expect(stageAddMutate).not.toHaveBeenCalled()
    expect(commitMutate).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('unstages the other proposals and forwards a proposal to the commit panel', async () => {
    const onUseInPanel = vi.fn()
    const onClose = vi.fn()
    renderWithProviders(
      <ComposeCommitsModal
        open
        proposals={proposals}
        onClose={onClose}
        onUseInPanel={onUseInPanel}
      />
    )

    await userEvent.click(screen.getAllByRole('button', { name: /use in commit panel/i })[0]!)
    await waitFor(() => {
      expect(stageResetMutate).toHaveBeenCalledWith({ paths: ['src/c.ts'] })
    })
    expect(stageAddMutate).not.toHaveBeenCalled()
    expect(onUseInPanel).toHaveBeenCalledWith(proposals[0])
    expect(onClose).toHaveBeenCalled()
  })

  it('requires a summary on every commit before creating or using one', async () => {
    const show = vi.fn()
    useToastStore.setState({ show })
    renderWithProviders(
      <ComposeCommitsModal open proposals={proposals} onClose={vi.fn()} onUseInPanel={vi.fn()} />
    )
    await userEvent.clear(screen.getAllByPlaceholderText(/commit summary/i)[0]!)
    await userEvent.click(screen.getByRole('button', { name: /create 2 commits/i }))
    expect(show).toHaveBeenCalledWith('Every commit needs a summary.', 'error')
    await userEvent.click(screen.getAllByRole('button', { name: /use in commit panel/i })[0]!)
    expect(show).toHaveBeenLastCalledWith(expect.any(String), 'error')
    expect(composeMutate).not.toHaveBeenCalled()
    expect(stageResetMutate).not.toHaveBeenCalled()
  })

  it('edits a description and reports compose and staging failures', async () => {
    const show = vi.fn()
    useToastStore.setState({ show })
    const onClose = vi.fn()
    renderWithProviders(
      <ComposeCommitsModal open proposals={proposals} onClose={onClose} onUseInPanel={vi.fn()} />
    )
    const description = screen.getAllByPlaceholderText(/optional description/i)[1]!
    await userEvent.type(description, 'Why')
    expect(description).toHaveValue('Why')

    composeMutate.mockRejectedValueOnce(new Error('Created 0 of 2 commits: hook failed'))
    await userEvent.click(screen.getByRole('button', { name: /create 2 commits/i }))
    await waitFor(() => expect(show).toHaveBeenCalledWith('Created 0 of 2 commits: hook failed', 'error'))
    expect(onClose).not.toHaveBeenCalled()

    stageResetMutate.mockRejectedValueOnce(new Error('index locked'))
    await userEvent.click(screen.getAllByRole('button', { name: /use in commit panel/i })[0]!)
    await waitFor(() => expect(show).toHaveBeenCalledWith('index locked', 'error'))
  })
})

