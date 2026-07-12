/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { SplitDiffView } from './SplitDiffView'
import { renderWithProviders } from '@/test/render'
import type { SplitDiffRow } from '@/lib/diff/unifiedDiff'

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
    measureElement: vi.fn()
  }))
}))

const rows: SplitDiffRow[] = [
  {
    leftLineNo: null,
    rightLineNo: 1,
    leftText: null,
    rightText: 'added line',
    leftKind: null,
    rightKind: 'add'
  },
  {
    leftLineNo: 1,
    rightLineNo: null,
    leftText: 'removed line',
    rightText: null,
    leftKind: 'remove',
    rightKind: null
  }
]

describe('SplitDiffView', () => {
  afterEach(() => cleanup())

  it('renders empty state message', () => {
    renderWithProviders(
      <SplitDiffView rows={[]} loading={false} emptyMessage="No split diff" />
    )
    expect(screen.getByText('No split diff')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    renderWithProviders(<SplitDiffView rows={[]} loading />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders split diff rows with add and remove styling', () => {
    renderWithProviders(<SplitDiffView rows={rows} />)
    expect(screen.getByText('added line')).toBeInTheDocument()
    expect(screen.getByText('removed line')).toBeInTheDocument()
  })

  it('invokes line comment handler when comment button is clicked', async () => {
    const onRequestLineComment = vi.fn()
    renderWithProviders(
      <SplitDiffView rows={rows} onRequestLineComment={onRequestLineComment} />
    )

    const buttons = screen.getAllByRole('button', { name: /comment on this line/i })
    buttons[0]?.click()
    expect(onRequestLineComment).toHaveBeenCalled()
  })
})
