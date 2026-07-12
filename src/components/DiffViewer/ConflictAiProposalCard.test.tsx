/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ConflictAiProposalCard,
  confidenceBadgeClass
} from './ConflictAiProposalCard'
import { renderWithProviders } from '@/test/render'
import type { AiConflictResolutionProposal } from '@shared/ai'

const proposal: AiConflictResolutionProposal = {
  hunkId: 0,
  text: 'merged result',
  analysis: 'Combined both sides while keeping API compatibility.',
  confidence: 85
}

describe('ConflictAiProposalCard', () => {
  afterEach(() => cleanup())

  it('shows confidence badge and calls accept/reject handlers', async () => {
    const onAccept = vi.fn()
    const onReject = vi.fn()
    renderWithProviders(
      <ConflictAiProposalCard proposal={proposal} onAccept={onAccept} onReject={onReject} />
    )

    expect(screen.getByText(/85%/)).toBeInTheDocument()
    expect(screen.getByText(/Combined both sides/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /accept/i }))
    await userEvent.click(screen.getByRole('button', { name: /reject/i }))
    expect(onAccept).toHaveBeenCalledOnce()
    expect(onReject).toHaveBeenCalledOnce()
  })

  it('toggles analysis visibility when hide button is clicked', async () => {
    renderWithProviders(
      <ConflictAiProposalCard proposal={proposal} onAccept={vi.fn()} onReject={vi.fn()} />
    )

    expect(screen.getByText(/Combined both sides/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /hide/i }))
    expect(screen.queryByText(/Combined both sides/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /analysis/i }))
    expect(screen.getByText(/Combined both sides/)).toBeInTheDocument()
  })

  it('omits analysis toggle when proposal has no analysis text', () => {
    renderWithProviders(
      <ConflictAiProposalCard
        proposal={{ ...proposal, analysis: '' }}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /hide/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /analysis/i })).not.toBeInTheDocument()
  })

  it('maps confidence levels to badge tone classes', () => {
    expect(confidenceBadgeClass(90)).toMatch(/emerald/)
    expect(confidenceBadgeClass(80)).toMatch(/emerald/)
    expect(confidenceBadgeClass(60)).toMatch(/amber/)
    expect(confidenceBadgeClass(50)).toMatch(/amber/)
    expect(confidenceBadgeClass(20)).toMatch(/red/)
    expect(confidenceBadgeClass(49)).toMatch(/red/)
  })

  it('starts collapsed when analysis is hidden then re-expanded', async () => {
    const lowConfidence: AiConflictResolutionProposal = {
      ...proposal,
      confidence: 35,
      analysis: 'Low confidence merge notes.'
    }
    renderWithProviders(
      <ConflictAiProposalCard
        proposal={lowConfidence}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />
    )

    expect(screen.getByText(/35%/)).toBeInTheDocument()
    expect(screen.getByText(/Low confidence merge notes/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /hide/i }))
    expect(screen.queryByText(/Low confidence merge notes/)).not.toBeInTheDocument()
  })
})
