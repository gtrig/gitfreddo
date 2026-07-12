/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { ExplainCommitModal } from './ExplainCommitWithAi'
import { renderWithProviders } from '@/test/render'
import { makeCommit } from '@/test/fixtures/commit'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

const mutateAsync = vi.fn()

vi.mock('@/hooks/useAiFill', () => ({
  useAiFill: () => ({ mutateAsync, isPending: false })
}))

vi.mock('@/hooks/useAppSettings', () => ({
  useAiEnabled: () => true
}))

describe('ExplainCommitModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    mutateAsync.mockReset()
    window.gitfreddo = createGitFreddoMock()
  })

  it('loads AI explanation when opened', async () => {
    mutateAsync.mockResolvedValue(
      JSON.stringify({
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
    )

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
})
