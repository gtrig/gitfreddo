import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { CommitSearch } from '@/components/Layout/CommitSearch'
import { useCommitSearchStore } from '@/stores/commitSearch'
import { renderWithProviders } from '@/test/render'

describe('CommitSearch', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    useCommitSearchStore.setState({ open: false, query: '' })
  })

  it('opens the search field when toggled', () => {
    renderWithProviders(<CommitSearch />)
    fireEvent.click(screen.getByRole('button', { name: /search commits/i }))
    expect(useCommitSearchStore.getState().open).toBe(true)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    useCommitSearchStore.setState({ open: true })
    renderWithProviders(<CommitSearch />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useCommitSearchStore.getState().open).toBe(false)
  })
})
