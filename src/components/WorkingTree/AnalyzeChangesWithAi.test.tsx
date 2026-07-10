/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalyzeChangesWithAi } from './AnalyzeChangesWithAi'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'

const analysisResponse = JSON.stringify({
  summary: 'Two related changes.',
  keyChanges: '- Feature A\n- Feature B',
  risks: 'None noted.',
  features: [
    { title: 'Feature A', commits: [1] },
    { title: 'Feature B', commits: [2] }
  ],
  commits: [
    {
      summary: 'Add feature A',
      description: 'Implements A.',
      files: ['src/a.ts'],
      rationale: 'Self-contained feature.'
    },
    {
      summary: 'Add feature B',
      description: 'Implements B.',
      files: ['src/b.ts'],
      rationale: 'Depends on A.'
    }
  ]
})

const refineResponse = JSON.stringify({
  message: 'Merged commits 1 and 2 into one commit.',
  commits: [
    {
      summary: 'Add features A and B',
      description: 'Combined implementation.',
      files: ['src/a.ts', 'src/b.ts'],
      rationale: 'Single cohesive change.'
    }
  ]
})

describe('AnalyzeChangesWithAi', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
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
      aiFill: vi.fn(async (params: { purpose?: string }) => {
        if (params?.purpose === 'refine_commit_plan') {
          return refineResponse
        }
        return analysisResponse
      }),
      invoke: vi.fn(async (method: string) => {
        if (method === 'stage.reset' || method === 'stage.add' || method === 'commit.create') {
          return undefined
        }
        return {}
      })
    })
  })

  async function openAnalysisModal() {
    const user = userEvent.setup()
    renderWithProviders(
      <AnalyzeChangesWithAi
        branch="main"
        stagedPaths={['src/a.ts']}
        unstagedPaths={['src/b.ts']}
      />
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^analyze$/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^analyze$/i }))
    await waitFor(() => {
      expect(screen.getByDisplayValue('Add feature A')).toBeInTheDocument()
    })
    return user
  }

  it('shows a checkbox for each proposed commit', async () => {
    await openAnalysisModal()
    const checkboxes = screen.getAllByRole('checkbox', { name: /include this commit/i })
    expect(checkboxes).toHaveLength(2)
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked()
    })
  })

  it('creates only selected commits and leaves other files unstaged', async () => {
    const user = await openAnalysisModal()
    const checkboxes = screen.getAllByRole('checkbox', { name: /include this commit/i })
    await user.click(checkboxes[1]!)

    await user.click(screen.getByRole('button', { name: /create 1 commit/i }))

    await waitFor(() => {
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith('stage.reset', { paths: [] })
    })
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('stage.add', { paths: ['src/a.ts'] })
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('commit.create', {
      message: 'Add feature A\n\nImplements A.'
    })
    expect(window.gitfreddo.invoke).not.toHaveBeenCalledWith('stage.add', { paths: ['src/b.ts'] })
    expect(window.gitfreddo.invoke).not.toHaveBeenCalledWith('commit.create', {
      message: 'Add feature B\n\nImplements B.'
    })
  })

  it('disables create when no commits are selected', async () => {
    const user = await openAnalysisModal()
    const checkboxes = screen.getAllByRole('checkbox', { name: /include this commit/i })
    await user.click(checkboxes[0]!)
    await user.click(checkboxes[1]!)

    expect(screen.getByRole('button', { name: /create 0 commit/i })).toBeDisabled()
  })

  it('shows feature group chips that toggle related commits', async () => {
    const user = await openAnalysisModal()

    expect(screen.getByRole('button', { name: /toggle feature a \(1 commit\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toggle feature b \(1 commit\)/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^feature a$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^feature b$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /toggle feature b \(1 commit\)/i }))

    const checkboxes = screen.getAllByRole('checkbox', { name: /include this commit/i })
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()
  })

  it('refines the commit plan through chat when merging selected commits', async () => {
    const user = await openAnalysisModal()

    const chatInput = screen.getByRole('textbox', { name: /merge the selected commits into one/i })
    await user.type(chatInput, 'Merge the selected commits into one')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    await waitFor(() => {
      expect(screen.getByText('Merged commits 1 and 2 into one commit.')).toBeInTheDocument()
    })

    expect(window.gitfreddo.aiFill).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'refine_commit_plan',
        context: expect.objectContaining({
          selectedCommitIndices: [0, 1],
          userMessage: 'Merge the selected commits into one'
        })
      })
    )

    expect(screen.getByDisplayValue('Add features A and B')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Add feature B')).not.toBeInTheDocument()
  })
})
