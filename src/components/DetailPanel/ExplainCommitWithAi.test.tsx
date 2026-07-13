/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExplainCommitButton, ExplainCommitModal } from './ExplainCommitWithAi'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { makeCommit } from '@/test/fixtures/commit'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

const mutateAsync = vi.fn()
let aiPending = false

vi.mock('@/hooks/useAiFill', () => ({
  useAiFill: () => ({ mutateAsync, isPending: aiPending })
}))

const useAiEnabled = vi.fn(() => true)

vi.mock('@/hooks/useAppSettings', () => ({
  useAiEnabled: () => useAiEnabled()
}))

const explainPayload = JSON.stringify({
  summary: 'Auth updates',
  commits: [
    {
      shortHash: 'abc123d',
      summary: 'Added login helper',
      keyChanges: '- login() export',
      rationale: 'Shared auth entry point.'
    }
  ]
})

describe('ExplainCommitModal', () => {
  afterEach(() => {
    aiPending = false
    cleanup()
  })

  beforeEach(() => {
    mutateAsync.mockReset()
    useAiEnabled.mockReturnValue(true)
    window.gitfreddo = createGitFreddoMock()
  })

  it('loads AI explanation when opened', async () => {
    mutateAsync.mockResolvedValue(explainPayload)

    renderWithProviders(
      <ExplainCommitModal
        open
        onClose={vi.fn()}
        commits={[makeCommit({ shortHash: 'abc123d' })]}
      />
    )

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ purpose: 'explain_commit' })
      )
    })
    expect(await screen.findByText('Auth updates')).toBeInTheDocument()
    expect(screen.getByText('Added login helper')).toBeInTheDocument()
  })

  it('shows loading state while AI is pending', () => {
    aiPending = true
    mutateAsync.mockReturnValue(new Promise(() => undefined))

    renderWithProviders(
      <ExplainCommitModal
        open
        onClose={vi.fn()}
        commits={[makeCommit({ shortHash: 'abc123d' })]}
      />
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('uses plural title for multiple commits', async () => {
    mutateAsync.mockResolvedValue(
      JSON.stringify({
        summary: 'Batch update',
        commits: [
          { shortHash: 'abc123d', summary: 'First', keyChanges: '', rationale: '' },
          { shortHash: 'def456e', summary: 'Second', keyChanges: '', rationale: '' }
        ]
      })
    )

    renderWithProviders(
      <ExplainCommitModal
        open
        onClose={vi.fn()}
        commits={[
          makeCommit({ hash: 'abc123def456789012345678901234567890abcd', shortHash: 'abc123d' }),
          makeCommit({ hash: 'def456abc789012345678901234567890abcdef12', shortHash: 'def456e' })
        ]}
      />
    )

    expect(await screen.findByText(/2 commits/i)).toBeInTheDocument()
  })

  it('re-runs explanation when explain again is clicked', async () => {
    mutateAsync.mockResolvedValue(explainPayload)
    const user = userEvent.setup()

    renderWithProviders(
      <ExplainCommitModal
        open
        onClose={vi.fn()}
        commits={[makeCommit({ shortHash: 'abc123d' })]}
      />
    )

    await screen.findByText('Auth updates')
    await user.click(screen.getByRole('button', { name: /explain again/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(2)
    })
  })

  it('shows toast and closes when AI fill fails', async () => {
    mutateAsync.mockRejectedValue(new Error('Model unavailable'))
    const onClose = vi.fn()
    const show = vi.fn()
    useToastStore.setState({ show })

    renderWithProviders(
      <ExplainCommitModal
        open
        onClose={onClose}
        commits={[makeCommit({ shortHash: 'abc123d' })]}
      />
    )

    await waitFor(() => {
      expect(show).toHaveBeenCalledWith('Model unavailable', 'error')
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('stringifies non-Error AI failures for the toast', async () => {
    mutateAsync.mockRejectedValue('offline')
    const show = vi.fn()
    useToastStore.setState({ show })

    renderWithProviders(
      <ExplainCommitModal
        open
        onClose={vi.fn()}
        commits={[makeCommit({ shortHash: 'abc123d' })]}
      />
    )

    await waitFor(() => {
      expect(show).toHaveBeenCalledWith('offline', 'error')
    })
  })

  it('omits empty analysis sections', async () => {
    mutateAsync.mockResolvedValue(
      JSON.stringify({
        summary: 'Minimal',
        commits: [{ shortHash: 'abc123d', summary: 'Only overview', keyChanges: '  ', rationale: '' }]
      })
    )

    renderWithProviders(
      <ExplainCommitModal
        open
        onClose={vi.fn()}
        commits={[makeCommit({ shortHash: 'abc123d', subject: 'Fix auth' })]}
      />
    )

    await screen.findByText('Minimal')
    expect(screen.getByText('Only overview')).toBeInTheDocument()
    expect(screen.queryByText(/key changes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/rationale/i)).not.toBeInTheDocument()
  })
  it('passes per-commit file paths to the AI request', async () => {
    mutateAsync.mockResolvedValue(explainPayload)
    const hash = 'abc123def456789012345678901234567890abcd'

    renderWithProviders(
      <ExplainCommitModal
        open
        onClose={vi.fn()}
        commits={[makeCommit({ hash, shortHash: 'abc123d' })]}
        filePathsByHash={{ [hash]: ['src/auth.ts'] }}
      />
    )

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          context: {
            commits: [
              expect.objectContaining({
                hash,
                filePaths: ['src/auth.ts']
              })
            ]
          }
        })
      )
    })
  })

  it('does not call AI when modal is closed', async () => {
    renderWithProviders(
      <ExplainCommitModal
        open={false}
        onClose={vi.fn()}
        commits={[makeCommit({ shortHash: 'abc123d' })]}
      />
    )

    await waitFor(() => {
      expect(mutateAsync).not.toHaveBeenCalled()
    })
  })

  it('does not call AI when there are no commits', () => {
    renderWithProviders(<ExplainCommitModal open onClose={vi.fn()} commits={[]} />)
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('allows closing before the explanation returns', async () => {
    mutateAsync.mockReturnValue(new Promise(() => undefined))
    const onClose = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <ExplainCommitModal
        open
        onClose={onClose}
        commits={[makeCommit({ shortHash: 'abc123d' })]}
      />
    )

    const closeButtons = screen.getAllByRole('button', { name: /^close$/i })
    await user.click(closeButtons[closeButtons.length - 1]!)
    expect(onClose).toHaveBeenCalled()
  })
})

describe('ExplainCommitButton', () => {
  afterEach(() => {
    aiPending = false
    cleanup()
  })

  beforeEach(() => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue(explainPayload)
    useAiEnabled.mockReturnValue(true)
    window.gitfreddo = createGitFreddoMock()
  })

  it('opens the explain modal when clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ExplainCommitButton commits={[makeCommit({ shortHash: 'abc123d' })]} />
    )

    await user.click(screen.getByRole('button', { name: /^explain$/i }))
    expect(await screen.findByText('Auth updates')).toBeInTheDocument()
  })

  it('returns null when AI is disabled', () => {
    useAiEnabled.mockReturnValue(false)
    const { container } = renderWithProviders(
      <ExplainCommitButton commits={[makeCommit({ shortHash: 'abc123d' })]} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('returns null when there are no commits', () => {
    const { container } = renderWithProviders(<ExplainCommitButton commits={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows multi-commit label in the toolbar', () => {
    renderWithProviders(
      <ExplainCommitButton
        commits={[
          makeCommit({ hash: 'abc123def456789012345678901234567890abcd', shortHash: 'abc123d' }),
          makeCommit({ hash: 'def456abc789012345678901234567890abcdef12', shortHash: 'def456e' })
        ]}
      />
    )
    expect(screen.getByRole('button', { name: /explain \(2\)/i })).toBeInTheDocument()
  })

  it('renders pill variant without inline label text', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ExplainCommitButton
        variant="pill"
        commits={[makeCommit({ shortHash: 'abc123d' })]}
      />
    )

    const button = screen.getByRole('button', { name: /^explain$/i })
    expect(button.textContent?.trim()).toBe('')
    await user.click(button)
    expect(await screen.findByText('Auth updates')).toBeInTheDocument()
  })

  it('renders detail variant with the explain label', () => {
    renderWithProviders(
      <ExplainCommitButton variant="detail" commits={[makeCommit({ shortHash: 'abc123d' })]} />
    )
    expect(screen.getByRole('button', { name: /^explain$/i })).toHaveTextContent('Explain')
  })

  it('shows explaining label while AI is pending', () => {
    aiPending = true
    renderWithProviders(
      <ExplainCommitButton commits={[makeCommit({ shortHash: 'abc123d' })]} />
    )
    expect(screen.getByRole('button', { name: /explaining/i })).toBeDisabled()
  })

  it('shows explaining label for multiple commits while pending', () => {
    aiPending = true
    renderWithProviders(
      <ExplainCommitButton
        commits={[
          makeCommit({ hash: 'abc123def456789012345678901234567890abcd', shortHash: 'abc123d' }),
          makeCommit({ hash: 'def456abc789012345678901234567890abcdef12', shortHash: 'def456e' })
        ]}
      />
    )
    expect(screen.getByRole('button', { name: /explaining/i })).toBeDisabled()
  })
})
