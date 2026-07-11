import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocsSidebar } from './DocsSidebar'
import { renderWithProviders } from '@/test/render'

describe('DocsSidebar', () => {
  afterEach(() => {
    cleanup()
  })

  it('filters documentation pages by title and content', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(
      <DocsSidebar activePath="README.md" onSelect={() => undefined} />
    )
    const scoped = within(container)

    expect(scoped.getByRole('button', { name: 'Getting started' })).toBeInTheDocument()

    await user.type(
      scoped.getByRole('searchbox', { name: 'Search documentation…' }),
      'authenticate git operations over HTTPS'
    )

    expect(scoped.getByRole('button', { name: 'GitHub integration' })).toBeInTheDocument()
    expect(scoped.queryByRole('button', { name: 'Getting started' })).not.toBeInTheDocument()
  })

  it('calls onSelect when a filtered page is chosen', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const { container } = renderWithProviders(
      <DocsSidebar activePath="README.md" onSelect={onSelect} />
    )
    const scoped = within(container)

    await user.type(
      scoped.getByRole('searchbox', { name: 'Search documentation…' }),
      'GitHub integration'
    )
    await user.click(scoped.getByRole('button', { name: 'GitHub integration' }))

    expect(onSelect).toHaveBeenCalledWith('setup/github.md')
  })
})
