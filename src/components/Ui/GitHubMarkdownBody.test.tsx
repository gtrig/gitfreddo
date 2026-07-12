/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { GitHubMarkdownBody } from './GitHubMarkdownBody'
import { renderWithProviders } from '@/test/render'

describe('GitHubMarkdownBody', () => {
  afterEach(() => {
    cleanup()
  })

  it('returns null for blank content', () => {
    const { container } = renderWithProviders(<GitHubMarkdownBody content="   " />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders GitHub-flavored markdown lists', () => {
    renderWithProviders(<GitHubMarkdownBody content={'- item one\n- item two'} />)

    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('item one')).toBeInTheDocument()
    expect(screen.getByText('item two')).toBeInTheDocument()
  })

  it('renders headings, links, code, tables, and task lists', () => {
    renderWithProviders(
      <GitHubMarkdownBody
        content={[
          '## Section',
          '',
          'Visit [docs](https://example.com/docs).',
          '',
          'Inline `code` snippet.',
          '',
          '```ts',
          'const x = 1',
          '```',
          '',
          '| Col | Val |',
          '| --- | --- |',
          '| A | 1 |',
          '',
          '- [x] Done',
          '- [ ] Todo'
        ].join('\n')}
      />
    )

    expect(screen.getByRole('heading', { name: 'Section' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'docs' })).toHaveAttribute(
      'href',
      'https://example.com/docs'
    )
    expect(screen.getByText(/inline/i)).toBeInTheDocument()
    expect(screen.getAllByRole('code').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('const x = 1')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Todo')).toBeInTheDocument()
  })
})
