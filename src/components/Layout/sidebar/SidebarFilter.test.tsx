import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { SidebarFilter } from '@/components/Layout/sidebar/SidebarFilter'
import { renderWithProviders } from '@/test/render'

describe('SidebarFilter', () => {
  it('updates the filter value', () => {
    const onChange = vi.fn()
    renderWithProviders(<SidebarFilter value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'main' } })
    expect(onChange).toHaveBeenCalledWith('main')
  })
})
