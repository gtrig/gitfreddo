/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreatePrModal, MergePrButton } from './CreatePrModal'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'

const mockBranches = [
  {
    name: 'main',
    head: 'abc',
    isCurrent: false,
    isRemote: false,
    ahead: 0,
    behind: 0
  },
  {
    name: 'feature',
    head: 'def',
    isCurrent: true,
    isRemote: false,
    ahead: 3,
    behind: 0
  },
  {
    name: 'origin/main',
    head: 'abc',
    isCurrent: false,
    isRemote: true,
    ahead: 0,
    behind: 0
  }
]

describe('CreatePrModal', () => {
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
      aiFill: vi.fn(async () =>
        JSON.stringify({ title: 'Add feature', body: '## Summary\nDoes things.' })
      ),
      invoke: vi.fn(async (method: string) => {
        if (method === 'branch.list') return mockBranches
        return {}
      })
    })
  })

  it('shows fill with AI button when AI is enabled', async () => {
    renderWithProviders(
      <CreatePrModal
        open
        onClose={() => undefined}
        defaultHead="feature"
        defaultBase="main"
        onSubmit={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /fill with ai/i })).toBeInTheDocument()
    })
  })

  it('fills title and body from AI response', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <CreatePrModal
        open
        onClose={() => undefined}
        defaultHead="feature"
        defaultBase="main"
        onSubmit={vi.fn()}
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

  it('lists local branches in head and base dropdowns', async () => {
    renderWithProviders(
      <CreatePrModal
        open
        onClose={() => undefined}
        defaultHead="feature"
        defaultBase="main"
        onSubmit={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/^head$/i).querySelectorAll('option')).toHaveLength(2)
    })

    const head = screen.getByLabelText(/^head$/i)
    const base = screen.getByLabelText(/^base$/i)
    const headOptions = Array.from(head.querySelectorAll('option')).map((option) => option.textContent)
    const baseOptions = Array.from(base.querySelectorAll('option')).map((option) => option.textContent)

    expect(headOptions).toEqual(['feature', 'main'])
    expect(baseOptions).toEqual(['feature', 'main'])
    expect(head).toHaveValue('feature')
    expect(base).toHaveValue('main')
  })

  it('uses selected branches when creating a pull request', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(async () => undefined)
    renderWithProviders(
      <CreatePrModal
        open
        onClose={() => undefined}
        defaultHead="feature"
        defaultBase="main"
        onSubmit={onSubmit}
      />
    )

    await waitFor(() => screen.getByLabelText(/^head$/i))
    await user.type(screen.getByLabelText(/^title$/i), 'My PR')
    await user.selectOptions(screen.getByLabelText(/^base$/i), 'feature')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'My PR',
        body: '',
        head: 'feature',
        base: 'feature'
      })
    })
  })
})

describe('MergePrButton', () => {
  afterEach(() => cleanup())

  it('calls onMerge with the selected merge method', async () => {
    const onMerge = vi.fn(async () => undefined)
    const user = userEvent.setup()
    renderWithProviders(<MergePrButton onMerge={onMerge} />)

    await user.click(screen.getByRole('button', { name: /^merge$/i }))
    await user.click(screen.getByRole('button', { name: /squash/i }))
    await user.click(screen.getByRole('button', { name: /rebase/i }))

    expect(onMerge).toHaveBeenNthCalledWith(1, 'merge')
    expect(onMerge).toHaveBeenNthCalledWith(2, 'squash')
    expect(onMerge).toHaveBeenNthCalledWith(3, 'rebase')
  })
})
