/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { SplitDiffView } from './SplitDiffView'
import { renderWithProviders } from '@/test/render'

describe('SplitDiffView', () => {
  afterEach(() => cleanup())
  it('renders empty state message', () => {
    renderWithProviders(
      <SplitDiffView rows={[]} loading={false} emptyMessage="No split diff" />
    )
    expect(screen.getByText('No split diff')).toBeInTheDocument()
  })
})
