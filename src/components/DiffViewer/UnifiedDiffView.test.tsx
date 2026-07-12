/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { UnifiedDiffView } from './UnifiedDiffView'
import { renderWithProviders } from '@/test/render'

describe('UnifiedDiffView', () => {
  afterEach(() => cleanup())
  it('renders empty state message', () => {
    renderWithProviders(
      <UnifiedDiffView rows={[]} loading={false} emptyMessage="No diff available" />
    )
    expect(screen.getByText('No diff available')).toBeInTheDocument()
  })
})
