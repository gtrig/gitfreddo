import { beforeEach, describe, expect, it } from 'vitest'
import { useCommitSearchStore } from '@/stores/commitSearch'

describe('useCommitSearchStore', () => {
  beforeEach(() => {
    useCommitSearchStore.setState({ open: false, query: '' })
  })

  it('toggles open state and stores the query', () => {
    useCommitSearchStore.getState().toggleOpen()
    expect(useCommitSearchStore.getState().open).toBe(true)

    useCommitSearchStore.getState().setQuery('fix bug')
    expect(useCommitSearchStore.getState().query).toBe('fix bug')

    useCommitSearchStore.getState().setOpen(false)
    expect(useCommitSearchStore.getState().open).toBe(false)
  })
})
