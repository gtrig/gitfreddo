/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
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
})
