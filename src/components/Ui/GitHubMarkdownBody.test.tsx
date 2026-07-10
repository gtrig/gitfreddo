import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { GitHubMarkdownBody } from './GitHubMarkdownBody'
import { renderWithProviders } from '@/test/render'

describe('GitHubMarkdownBody', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders GitHub-flavored markdown', () => {
    renderWithProviders(<GitHubMarkdownBody content={'- item one\n- item two'} />)

    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('item one')).toBeInTheDocument()
    expect(screen.getByText('item two')).toBeInTheDocument()
  })
})
