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
      aiFill: vi.fn(async () => analysisResponse),
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
})
