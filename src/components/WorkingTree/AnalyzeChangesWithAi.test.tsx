/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalyzeChangesWithAi } from './AnalyzeChangesWithAi'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
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

  it('stages the old path of a renamed file along with the new one', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <AnalyzeChangesWithAi
        branch="main"
        stagedPaths={['src/a.ts']}
        unstagedPaths={['src/b.ts']}
        renamedFrom={{ 'src/a.ts': 'src/old-a.ts' }}
      />
    )
    await user.click(await screen.findByRole('button', { name: /^analyze$/i }))
    await screen.findByDisplayValue('Add feature A')
    const checkboxes = screen.getAllByRole('checkbox', { name: /include this commit/i })
    await user.click(checkboxes[1]!)
    await user.click(screen.getByRole('button', { name: /create 1 commit/i }))

    await waitFor(() => {
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
        'stage.add',
        { paths: ['src/a.ts', 'src/old-a.ts'] },
        '/tmp/repo'
      )
    })
  })

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
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith('stage.reset', { paths: [] }, '/tmp/repo')
    })
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('stage.add', { paths: ['src/a.ts'] }, '/tmp/repo')
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('commit.create', {
      message: 'Add feature A\n\nImplements A.'
    }, '/tmp/repo')
    expect(window.gitfreddo.invoke).not.toHaveBeenCalledWith(
      'stage.add',
      { paths: ['src/b.ts'] },
      '/tmp/repo'
    )
    expect(window.gitfreddo.invoke).not.toHaveBeenCalledWith(
      'commit.create',
      { message: 'Add feature B\n\nImplements B.' },
      '/tmp/repo'
    )
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
      }), '/tmp/repo')

    expect(screen.getByDisplayValue('Add features A and B')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Add feature B')).not.toBeInTheDocument()
  })

  it('renders nothing when AI is disabled', async () => {
    window.gitfreddo = createGitFreddoMock({
      getSettings: vi.fn(async () => ({
        ...defaultMockSettings,
        aiEnabled: false
      }))
    })

    renderWithProviders(
      <AnalyzeChangesWithAi branch="main" stagedPaths={['src/a.ts']} unstagedPaths={[]} />
    )

    expect(screen.queryByRole('button', { name: /^analyze$/i })).not.toBeInTheDocument()
  })

  it('renders nothing when there are no changed files', () => {
    renderWithProviders(
      <AnalyzeChangesWithAi branch="main" stagedPaths={[]} unstagedPaths={[]} />
    )
    expect(screen.queryByRole('button', { name: /^analyze$/i })).not.toBeInTheDocument()
  })

  it('shows an error toast when analysis fails', async () => {
    const showToast = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })

    window.gitfreddo = createGitFreddoMock({
      getSettings: vi.fn(async () => ({
        ...defaultMockSettings,
        aiEnabled: true,
        aiBaseUrl: 'http://localhost:1234'
      })),
      aiFill: vi.fn(async () => {
        throw new Error('model unavailable')
      })
    })

    const user = userEvent.setup()
    renderWithProviders(
      <AnalyzeChangesWithAi branch="main" stagedPaths={['src/a.ts']} unstagedPaths={[]} />
    )
    await user.click(await screen.findByRole('button', { name: /^analyze$/i }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('model unavailable', 'error')
    })
  })

  it('creates multiple selected commits in order', async () => {
    const user = await openAnalysisModal()
    await user.click(screen.getByRole('button', { name: /create 2 commit/i }))

    await waitFor(() => {
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith('commit.create', {
        message: 'Add feature A\n\nImplements A.'
      }, '/tmp/repo')
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith('commit.create', {
        message: 'Add feature B\n\nImplements B.'
      }, '/tmp/repo')
    })
  })

  it('requires a summary on every selected commit before creating', async () => {
    const showToast = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    const user = await openAnalysisModal()

    const summaryInputs = screen.getAllByDisplayValue('Add feature A')
    await user.clear(summaryInputs[0]!)
    await user.click(screen.getByRole('button', { name: /create 2 commit/i }))

    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/summary/i), 'error')
  })

  it('re-runs analysis from the modal', async () => {
    const user = await openAnalysisModal()
    const aiFill = vi.mocked(window.gitfreddo.aiFill)
    aiFill.mockClear()

    await user.click(screen.getByRole('button', { name: /analyze again/i }))

    await waitFor(() => {
      expect(aiFill).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'analyze_changes' }), '/tmp/repo')
    })
  })

  it('edits descriptions, toggles commits and feature groups, and refines with Enter', async () => {
    const user = await openAnalysisModal()
    const description = screen.getAllByPlaceholderText('Optional description')[0]!
    await user.clear(description)
    await user.type(description, 'Rewritten')
    expect(description).toHaveValue('Rewritten')

    const checkboxes = screen.getAllByRole('checkbox', { name: /include this commit/i })
    await user.click(checkboxes[0]!)
    expect(checkboxes[0]).not.toBeChecked()
    await user.click(checkboxes[0]!)
    expect(checkboxes[0]).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Toggle Feature A (1 commit)' }))
    expect(screen.getAllByRole('checkbox', { name: /include this commit/i })[0]).not.toBeChecked()

    await user.type(screen.getByLabelText('Merge the selected commits into one…'), 'Merge them{Enter}')
    expect(await screen.findByText('Merged commits 1 and 2 into one commit.')).toBeInTheDocument()
  })

  it('restores the chat input and reports an error when refining fails', async () => {
    const showToast = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    const user = await openAnalysisModal()
    vi.mocked(window.gitfreddo.aiFill!).mockRejectedValueOnce(new Error('refine failed'))

    const chat = screen.getByLabelText('Merge the selected commits into one…')
    await user.type(chat, 'Merge them{Enter}')
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('refine failed', 'error'))
    expect(chat).toHaveValue('Merge them')
  })

  it('undoes commits already created when a later commit fails', async () => {
    const showToast = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    let commits = 0
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'commit.create' && ++commits === 2) throw new Error('hook rejected')
      return undefined
    })
    const user = await openAnalysisModal()
    await user.click(screen.getByRole('button', { name: /create 2 commits/i }))

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('hook rejected', 'error'))
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('undo.last', {}, '/tmp/repo')
  })

  it('explains how to recover when undoing the created commits also fails', async () => {
    const showToast = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    let commits = 0
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'commit.create' && ++commits === 2) throw new Error('hook rejected')
      if (method === 'undo.last') throw new Error('reflog busy')
      return undefined
    })
    const user = await openAnalysisModal()
    await user.click(screen.getByRole('button', { name: /create 2 commits/i }))

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('git reset --soft HEAD~1'), 'error')
    )
  })

  it('reports a failure before any commit was created without undoing', async () => {
    const showToast = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'stage.reset') throw new Error('index locked')
      return undefined
    })
    const user = await openAnalysisModal()
    await user.click(screen.getByRole('button', { name: /create 2 commits/i }))

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('index locked', 'error'))
    expect(window.gitfreddo.invoke).not.toHaveBeenCalledWith('undo.last', expect.anything(), expect.anything())
  })

  it('closes from Cancel, and from Close while an analysis is still running', async () => {
    const user = await openAnalysisModal()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    vi.mocked(window.gitfreddo.aiFill!).mockImplementationOnce(() => new Promise<string>(() => {}))
    await user.click(screen.getByRole('button', { name: /^analyze$/i }))
    const dialog = await screen.findByRole('dialog')
    const closeButtons = within(dialog).getAllByRole('button', { name: 'Close' })
    await user.click(closeButtons[closeButtons.length - 1]!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

