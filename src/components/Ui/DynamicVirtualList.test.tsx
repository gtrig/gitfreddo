/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { DynamicVirtualList } from './DynamicVirtualList'
import { renderWithProviders } from '@/test/render'

describe('DynamicVirtualList', () => {
  afterEach(() => cleanup())
  it('renders list items', () => {
    renderWithProviders(
      <DynamicVirtualList
        items={['a', 'b', 'c']}
        estimateSize={() => 24}
        renderItem={(item, index) => <div key={index}>Item {item}</div>}
      />
    )
    expect(screen.getByText('Item a')).toBeInTheDocument()
  })
})
