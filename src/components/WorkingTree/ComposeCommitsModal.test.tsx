/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
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
})
