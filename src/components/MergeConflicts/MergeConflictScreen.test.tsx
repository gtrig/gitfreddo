/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MergeConflictScreen } from './MergeConflictScreen'
import { useSelectionStore } from '@/stores/selection'
import { renderWithProviders } from '@/test/render'

vi.mock('@/components/DiffViewer/ConflictMergeOverlay', () => ({
  ConflictMergeOverlay: vi.fn(({ path, onClose }: { path: string; onClose: () => void }) => (
    <div data-testid="conflict-overlay">
      <span>{path}</span>
      <button type="button" onClick={onClose}>
        Close overlay
      </button>
    </div>
  ))
}))

describe('MergeConflictScreen', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    useSelectionStore.setState({ selectedConflictFile: null })
  })

  it('renders nothing when no conflict file is selected', () => {
    const { container } = renderWithProviders(<MergeConflictScreen />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders full-screen conflict overlay for the selected file', () => {
    useSelectionStore.setState({ selectedConflictFile: 'src/conflict.ts' })
    renderWithProviders(<MergeConflictScreen />)
    expect(screen.getByTestId('conflict-overlay')).toHaveTextContent('src/conflict.ts')
  })

  it('closes via selection store when overlay requests close', async () => {
    useSelectionStore.setState({ selectedConflictFile: 'file.txt' })
    renderWithProviders(<MergeConflictScreen />)
    await userEvent.click(screen.getByRole('button', { name: /close overlay/i }))
    expect(useSelectionStore.getState().selectedConflictFile).toBeNull()
  })
})
