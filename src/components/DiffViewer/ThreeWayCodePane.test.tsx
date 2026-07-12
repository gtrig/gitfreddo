/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThreeWayCodePane } from './ThreeWayCodePane'
import { renderWithProviders } from '@/test/render'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * estimateSize(),
        size: estimateSize()
      })),
    getTotalSize: () => count * estimateSize(),
    measureElement: vi.fn(),
    scrollToIndex: vi.fn()
  }))
}))

describe('ThreeWayCodePane', () => {
  afterEach(() => cleanup())

  it('renders pane label and content lines', () => {
    renderWithProviders(
      <ThreeWayCodePane
        label="Ours"
        sublabel="HEAD"
        content={'line one\nline two'}
        highlightRange={{ start: 1, end: 2 }}
      />
    )

    expect(screen.getByText('Ours')).toBeInTheDocument()
    expect(screen.getByText('HEAD')).toBeInTheDocument()
    expect(screen.getByText('line one')).toBeInTheDocument()
    expect(screen.getByText('line two')).toBeInTheDocument()
  })

  it('toggles line checkboxes when enabled', async () => {
    const onLineToggle = vi.fn()
    renderWithProviders(
      <ThreeWayCodePane
        label="Theirs"
        content={'alpha\nbeta'}
        highlightRange={{ start: 1, end: 2 }}
        checkedLines={new Set([1])}
        onLineToggle={onLineToggle}
        onSelectAll={vi.fn()}
        allSelected={false}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    await userEvent.click(checkboxes[1]!)
    expect(onLineToggle).toHaveBeenCalled()
  })
})
