/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { HeaderToolsMenu } from './HeaderToolsMenu'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

describe('HeaderToolsMenu', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
  })
  it('renders tools navigation', () => {
    renderWithProviders(
      <HeaderToolsMenu onOpenSettings={vi.fn()} onOpenDocs={vi.fn()} />
    )
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })
})
