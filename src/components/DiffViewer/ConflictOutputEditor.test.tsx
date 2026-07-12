/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConflictOutputEditor } from './ConflictOutputEditor'
import { renderWithProviders } from '@/test/render'
import type { ConflictHunk } from '@/lib/conflicts/conflictMarkers'

const activeHunk: ConflictHunk = {
  id: 0,
  oursLabel: 'HEAD',
  theirsLabel: 'feature',
  ours: 'ours',
  theirs: 'theirs',
  resolved: ''
}

describe('ConflictOutputEditor', () => {
  afterEach(() => cleanup())

  it('shows empty state when there is no active hunk', () => {
    renderWithProviders(
      <ConflictOutputEditor
        activeHunk={null}
        resolvedText=""
        previewLines={[]}
        editMode="checkbox"
        onResolvedTextChange={vi.fn()}
        onTakeOurs={vi.fn()}
        onTakeTheirs={vi.fn()}
        onTakeBoth={vi.fn()}
        onResetToSelection={vi.fn()}
      />
    )
    expect(screen.getByText(/No conflicts in this file/i)).toBeInTheDocument()
  })

  it('renders resolution actions and preview lines for the active hunk', async () => {
    const onTakeOurs = vi.fn()
    const onTakeTheirs = vi.fn()
    const onTakeBoth = vi.fn()
    const onResolvedTextChange = vi.fn()

    renderWithProviders(
      <ConflictOutputEditor
        activeHunk={activeHunk}
        resolvedText="merged"
        previewLines={[
          { kind: 'context', text: 'before' },
          { kind: 'activeHunk', text: 'merged' },
          { kind: 'hunk', text: 'other hunk' }
        ]}
        editMode="checkbox"
        onResolvedTextChange={onResolvedTextChange}
        onTakeOurs={onTakeOurs}
        onTakeTheirs={onTakeTheirs}
        onTakeBoth={onTakeBoth}
        onResetToSelection={vi.fn()}
      />
    )

    expect(screen.getByText('before')).toBeInTheDocument()
    expect(screen.getByDisplayValue('merged')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^ours$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^theirs$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^both$/i }))
    expect(onTakeOurs).toHaveBeenCalled()
    expect(onTakeTheirs).toHaveBeenCalled()
    expect(onTakeBoth).toHaveBeenCalled()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'edited' } })
    expect(onResolvedTextChange).toHaveBeenCalledWith('edited')
  })

  it('renders a blank preview line as a space', () => {
    renderWithProviders(
      <ConflictOutputEditor
        activeHunk={activeHunk}
        resolvedText=""
        previewLines={[{ kind: 'context', text: '' }]}
        editMode="checkbox"
        onResolvedTextChange={vi.fn()}
        onTakeOurs={vi.fn()}
        onTakeTheirs={vi.fn()}
        onTakeBoth={vi.fn()}
        onResetToSelection={vi.fn()}
      />
    )

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Resolved text for conflict 1', { exact: false })).toBeInTheDocument()
  })

  it('shows reset to selection in manual edit mode', async () => {
    const onResetToSelection = vi.fn()
    renderWithProviders(
      <ConflictOutputEditor
        activeHunk={activeHunk}
        resolvedText=""
        previewLines={[]}
        editMode="manual"
        onResolvedTextChange={vi.fn()}
        onTakeOurs={vi.fn()}
        onTakeTheirs={vi.fn()}
        onTakeBoth={vi.fn()}
        onResetToSelection={onResetToSelection}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /reset to selection/i }))
    expect(onResetToSelection).toHaveBeenCalled()
  })
})
