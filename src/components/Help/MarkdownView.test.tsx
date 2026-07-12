/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MarkdownView } from './MarkdownView'
import { renderWithProviders } from '@/test/render'

describe('MarkdownView', () => {
  afterEach(() => cleanup())

  it('renders markdown content', () => {
    renderWithProviders(
      <MarkdownView
        content={'# Hello\n\nWorld'}
        currentPath="docs/index.md"
        onNavigate={vi.fn()}
      />
    )
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    expect(screen.getByText('World')).toBeInTheDocument()
  })

  it('navigates via internal doc links', async () => {
    const onNavigate = vi.fn()
    renderWithProviders(
      <MarkdownView
        content={'See [setup](./getting-started.md) for details.'}
        currentPath="docs/README.md"
        onNavigate={onNavigate}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'setup' }))
    expect(onNavigate).toHaveBeenCalledWith('docs/getting-started.md')
  })

  it('opens external links in a new tab', () => {
    renderWithProviders(
      <MarkdownView
        content={'External [site](https://example.com)'}
        currentPath="docs/index.md"
        onNavigate={vi.fn()}
      />
    )
    const link = screen.getByRole('link', { name: 'site' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders block code and tables', () => {
    renderWithProviders(
      <MarkdownView
        content={[
          '```js',
          'export const ok = true',
          '```',
          '',
          '| Key | Value |',
          '| --- | ----- |',
          '| A | 1 |'
        ].join('\n')}
        currentPath="docs/index.md"
        onNavigate={vi.fn()}
      />
    )
    expect(screen.getByText('export const ok = true')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
